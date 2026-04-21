from concurrent.futures import ThreadPoolExecutor
from typing import Callable
from uuid import uuid4

from app.core.settings import settings
from app.models.common import DebateSide, RoundType, utc_now
from app.models.source import EvidencePacket, SourceCard
from app.models.transcript import TranscriptEntry
from app.services.citation_validator import CitationValidator
from app.services.debate_agent import DebateAgent, get_character_limits


class RoundRunner:
    def __init__(self) -> None:
        self.agent = DebateAgent()
        self.validator = CitationValidator()

    def run(
        self,
        resolution: str,
        packets: dict[DebateSide, EvidencePacket],
        source_index: dict[str, SourceCard],
        on_round_started: Callable[[DebateSide, RoundType], None] | None = None,
        on_round_completed: Callable[[TranscriptEntry], None] | None = None,
    ) -> list[TranscriptEntry]:
        transcript: list[TranscriptEntry] = []

        transcript.append(
            self._generate_entry(DebateSide.PRO, RoundType.OPENING, resolution, packets, source_index, list(transcript), on_round_started)
        )
        if on_round_completed:
            on_round_completed(transcript[-1])

        transcript.append(
            self._generate_entry(DebateSide.CON, RoundType.OPENING, resolution, packets, source_index, list(transcript), on_round_started)
        )
        if on_round_completed:
            on_round_completed(transcript[-1])

        for round_type in (RoundType.CROSSFIRE_QUESTIONS, RoundType.CROSSFIRE_ANSWERS):
            entries = self._generate_parallel_entries(round_type, resolution, packets, source_index, list(transcript), on_round_started)
            transcript.extend(entries)
            if on_round_completed:
                for entry in entries:
                    on_round_completed(entry)

        for side, round_type in (
            (DebateSide.PRO, RoundType.REBUTTAL),
            (DebateSide.CON, RoundType.REBUTTAL),
            (DebateSide.PRO, RoundType.CLOSING),
            (DebateSide.CON, RoundType.CLOSING),
        ):
            entry = self._generate_entry(side, round_type, resolution, packets, source_index, list(transcript), on_round_started)
            transcript.append(entry)
            if on_round_completed:
                on_round_completed(entry)

        return transcript

    def _generate_parallel_entries(
        self,
        round_type: RoundType,
        resolution: str,
        packets: dict[DebateSide, EvidencePacket],
        source_index: dict[str, SourceCard],
        transcript_snapshot: list[TranscriptEntry],
        on_round_started: Callable[[DebateSide, RoundType], None] | None,
    ) -> list[TranscriptEntry]:
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {
                side: executor.submit(
                    self._generate_entry,
                    side,
                    round_type,
                    resolution,
                    packets,
                    source_index,
                    transcript_snapshot,
                    on_round_started,
                )
                for side in (DebateSide.PRO, DebateSide.CON)
            }
            return [futures[DebateSide.PRO].result(), futures[DebateSide.CON].result()]

    def _generate_entry(
        self,
        side: DebateSide,
        round_type: RoundType,
        resolution: str,
        packets: dict[DebateSide, EvidencePacket],
        source_index: dict[str, SourceCard],
        transcript_snapshot: list[TranscriptEntry],
        on_round_started: Callable[[DebateSide, RoundType], None] | None,
    ) -> TranscriptEntry:
        if on_round_started:
            on_round_started(side, round_type)

        packet = packets[side]
        packet_sources = [source_index[source_id] for source_id in packet.source_ids]
        last_error: Exception | None = None
        feedback: str | None = None

        for _attempt in range(1, settings.generation_retry_limit + 1):
            try:
                generated = self.agent.generate_round(
                    side=side,
                    round_type=round_type,
                    resolution=resolution,
                    packet=packet,
                    packet_sources=packet_sources,
                    transcript=transcript_snapshot,
                    validation_feedback=feedback,
                )
                self.validator.validate(generated, packet, get_character_limits()[round_type], round_type)
                return TranscriptEntry(
                    entry_id=str(uuid4()),
                    round_type=round_type,
                    side=side,
                    text=generated.text,
                    citations=generated.citations,
                    char_count=len(generated.text),
                    created_at=utc_now(),
                )
            except Exception as exc:  # pragma: no cover - exercised via retry behavior tests
                last_error = exc
                feedback = str(exc)

        raise ValueError(
            f"Failed to generate a valid {round_type.value} round for {side.value}: {last_error}"
        ) from last_error
