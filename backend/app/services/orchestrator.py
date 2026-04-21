from app.models.common import DebateSide, DebateStatus, EventType, RoundType, utc_now
from app.models.debate import DebateDetailResponse, DebateRecord, DebateSummary, SourceDetailResponse
from app.models.event import DebateEvent, WinningAnimationState
from app.models.transcript import TranscriptEntry
from app.core.settings import settings
from app.db.repository import DebateRepository
from app.services.evidence_builder import EvidenceBuilder
from app.services.research_manager import ResearchManager
from app.services.round_runner import RoundRunner
from app.services.topic_normalizer import TopicNormalizer
from uuid import uuid4


class DebateOrchestrator:
    def __init__(self) -> None:
        self.repository = DebateRepository()
        self.normalizer = TopicNormalizer()
        self.research_manager = ResearchManager()
        self.evidence_builder = EvidenceBuilder()
        self.round_runner = RoundRunner()

    def create_debate(self, topic: str) -> DebateSummary:
        topic = topic.strip()
        if not topic:
            raise ValueError("Topic cannot be empty")
        resolution, scope = self.normalizer.normalize(topic)
        now = utc_now()
        debate = DebateRecord(
            debate_id=str(uuid4()),
            topic_raw=topic,
            resolution_draft=resolution,
            scope=scope,
            status=DebateStatus.AWAITING_CONFIRMATION,
            created_at=now,
            updated_at=now,
        )
        saved = self.repository.save_debate(debate)
        self._append_event(
            debate_id=debate.debate_id,
            event_type=EventType.DEBATE_CREATED,
            status=saved.status,
        )
        return saved

    def get_debate_detail(self, debate_id: str) -> DebateDetailResponse | None:
        return self.repository.get_debate_detail(debate_id)

    def get_source_detail(self, debate_id: str, source_id: str) -> SourceDetailResponse | None:
        debate = self.repository.get_debate(debate_id)
        if debate is None:
            return None
        source = self.repository.get_source(debate_id, source_id)
        if source is None:
            return None
        return SourceDetailResponse(
            debate_id=debate_id,
            source=source,
            used_by_sides=self.repository.get_source_sides(debate_id, source_id),
        )

    def confirm_resolution(self, debate_id: str, resolution: str) -> DebateSummary | None:
        debate = self.repository.get_debate(debate_id)
        if debate is None:
            return None
        if debate.status not in {DebateStatus.AWAITING_CONFIRMATION, DebateStatus.READY}:
            raise ValueError("Resolution can only be confirmed before the debate starts")
        resolution = resolution.strip()
        if not resolution:
            raise ValueError("Resolution cannot be empty")

        debate.resolution_final = resolution
        debate.status = DebateStatus.READY
        debate.error_message = None
        debate.updated_at = utc_now()
        saved = self.repository.save_debate(debate)
        self._append_event(
            debate_id=debate_id,
            event_type=EventType.RESOLUTION_CONFIRMED,
            status=saved.status,
            resolution_final=debate.resolution_final,
        )
        return saved

    def queue_debate(self, debate_id: str) -> DebateSummary | None:
        debate = self.repository.get_debate(debate_id)
        if debate is None:
            return None
        if not debate.resolution_final:
            raise ValueError("Resolution must be confirmed before starting the debate")
        if debate.status != DebateStatus.READY:
            raise ValueError("Debate can only be started from the ready state")
        if not settings.enable_live_retrieval:
            raise ValueError("Live retrieval is disabled; enable DEBATE_ENABLE_LIVE_RETRIEVAL to start debates")

        now = utc_now()
        debate.status = DebateStatus.RESEARCHING
        debate.error_message = None
        debate.started_at = now
        debate.completed_at = None
        debate.updated_at = now
        saved = self.repository.save_debate(debate)
        self._append_event(
            debate_id=debate_id,
            event_type=EventType.RESEARCH_STARTED,
            status=saved.status,
        )
        return saved

    def run_debate(self, debate_id: str) -> DebateDetailResponse | None:
        debate = self.repository.get_debate(debate_id)
        if debate is None:
            return None
        if not debate.resolution_final:
            raise ValueError("Resolution must be confirmed before running the debate")
        if debate.status != DebateStatus.RESEARCHING:
            raise ValueError("Debate must be queued before running")

        try:
            shared_sources = self.research_manager.build_shared_source_pool(debate.resolution_final)
            self.repository.replace_shared_sources(debate_id, shared_sources)
            source_index = {source.source_id: source for source in shared_sources}
            self._append_event(
                debate_id=debate_id,
                event_type=EventType.SOURCES_COLLECTED,
                status=DebateStatus.RESEARCHING,
                metadata={"source_count": len(shared_sources), "source_ids": [source.source_id for source in shared_sources]},
            )

            packet_sources = self.research_manager.split_sources_by_side(shared_sources)
            packets = {}
            for side, sources in packet_sources.items():
                packet = self.evidence_builder.build_packet(debate_id, side, debate.resolution_final, sources)
                packets[side] = packet
                self.repository.save_packet(debate_id, packet)
                self.repository.replace_packet_source_links(debate_id, packet.packet_id, packet.source_ids)

            debate.status = DebateStatus.IN_PROGRESS
            debate.updated_at = utc_now()
            self.repository.save_debate(debate)
            self._append_event(
                debate_id=debate_id,
                event_type=EventType.PACKETS_READY,
                status=debate.status,
                metadata={
                    "packet_sizes": {side.value: len(packet.source_ids) for side, packet in packets.items()}
                },
            )

            self.round_runner.run(
                resolution=debate.resolution_final,
                packets=packets,
                source_index=source_index,
                on_round_started=lambda side, round_type: self._record_round_started(debate_id, side, round_type),
                on_round_completed=lambda entry: self._record_round_completed(debate_id, entry),
            )

            debate.status = DebateStatus.COMPLETED
            debate.completed_at = utc_now()
            debate.updated_at = debate.completed_at
            debate.error_message = None
            self.repository.save_debate(debate)
            self._append_event(
                debate_id=debate_id,
                event_type=EventType.DEBATE_COMPLETED,
                status=debate.status,
            )
        except Exception as exc:
            debate.status = DebateStatus.FAILED
            debate.completed_at = utc_now()
            debate.updated_at = debate.completed_at
            debate.error_message = str(exc)
            self.repository.save_debate(debate)
            self._append_event(
                debate_id=debate_id,
                event_type=EventType.DEBATE_FAILED,
                status=debate.status,
                error=str(exc),
            )
            raise

        return self.repository.get_debate_detail(debate_id)

    def pick_winner(self, debate_id: str, winner_side: DebateSide) -> DebateSummary | None:
        debate = self.repository.get_debate(debate_id)
        if debate is None:
            return None
        if debate.status != DebateStatus.COMPLETED:
            raise ValueError("Winner can only be selected after the debate is completed")
        if debate.winner_side is not None and debate.winner_side != winner_side:
            raise ValueError("Winner has already been selected for this debate")
        if debate.winner_side == winner_side:
            if debate.winning_animation_state is None:
                debate.winning_animation_state = WinningAnimationState()
                debate.updated_at = utc_now()
                return self.repository.save_debate(debate)
            return DebateSummary.model_validate(debate.model_dump())

        debate.winner_side = winner_side
        debate.winning_animation_state = WinningAnimationState()
        debate.updated_at = utc_now()
        saved = self.repository.save_debate(debate)
        self._append_event(
            debate_id=debate_id,
            event_type=EventType.WINNER_SELECTED,
            status=saved.status,
            winner_side=winner_side,
            animation_state=debate.winning_animation_state,
        )
        return saved

    def get_events(self, debate_id: str) -> list[DebateEvent] | None:
        debate = self.repository.get_debate(debate_id)
        if debate is None:
            return None
        return self.repository.get_events(debate_id)

    def _record_round_started(self, debate_id: str, side: DebateSide, round_type: RoundType) -> None:
        self._append_event(
            debate_id=debate_id,
            event_type=EventType.ROUND_STARTED,
            status=DebateStatus.IN_PROGRESS,
            side=side,
            round_type=round_type,
        )

    def _record_round_completed(self, debate_id: str, entry: TranscriptEntry) -> None:
        self.repository.append_transcript_entry(debate_id, entry)
        self._append_event(
            debate_id=debate_id,
            event_type=EventType.ROUND_COMPLETED,
            status=DebateStatus.IN_PROGRESS,
            side=entry.side,
            round_type=entry.round_type,
            entry_id=entry.entry_id,
        )

    def _append_event(
        self,
        debate_id: str,
        event_type: EventType,
        status: DebateStatus | None = None,
        side: DebateSide | None = None,
        round_type: RoundType | None = None,
        entry_id: str | None = None,
        winner_side: DebateSide | None = None,
        error: str | None = None,
        resolution_final: str | None = None,
        animation_state: WinningAnimationState | None = None,
        metadata: dict | None = None,
    ) -> DebateEvent:
        event = DebateEvent(
            debate_id=debate_id,
            event_type=event_type,
            created_at=utc_now(),
            status=status,
            side=side,
            round_type=round_type,
            entry_id=entry_id,
            winner_side=winner_side,
            error=error,
            resolution_final=resolution_final,
            animation_state=animation_state,
            metadata=metadata or {},
        )
        return self.repository.append_event(event)
