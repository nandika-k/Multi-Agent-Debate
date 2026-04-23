from app.core.settings import settings
from app.models.common import DebateSide, SourceType
from app.models.source import SourceCard
from app.services.retrieval import RetrievalService


class ResearchManager:
    def __init__(self) -> None:
        self.retrieval = RetrievalService(
            trusted_domains=settings.trusted_domains,
            results_per_query=settings.search_results_per_query,
            timeout_seconds=settings.retrieval_timeout_seconds,
            connect_timeout_seconds=settings.retrieval_connect_timeout_seconds,
        )

    def build_shared_source_pool(self, resolution: str) -> list[SourceCard]:
        if not settings.enable_live_retrieval:
            raise RuntimeError("Live retrieval is disabled; enable DEBATE_ENABLE_LIVE_RETRIEVAL to start debates")

        documents = self.retrieval.search_documents(resolution, settings.shared_pool_target_max)
        if len(documents) < settings.shared_pool_target_min:
            raise ValueError("Not enough usable sources were found for this debate topic")

        cards: list[SourceCard] = []
        for index, document in enumerate(documents, start=1):
            cards.append(
                SourceCard(
                    source_id=f"S{index}",
                    title=document.title,
                    url=document.url,
                    publisher=document.publisher,
                    published_at=document.published_at,
                    source_type=document.source_type,
                    summary=document.summary,
                    supporting_snippets=document.snippets,
                    trust_score=document.trust_score,
                    relevance_score=document.relevance_score,
                    recency_score=document.recency_score,
                    body_excerpt=document.body_excerpt,
                )
            )
        return cards

    def split_sources_by_side(self, sources: list[SourceCard]) -> dict[DebateSide, list[SourceCard]]:
        ranked = sorted(
            sources,
            key=lambda source: (source.trust_score + source.relevance_score + source.recency_score),
            reverse=True,
        )
        if len(ranked) < settings.packet_min_size:
            raise ValueError("Shared source pool is too small to build evidence packets")

        core = self._build_diverse_core(ranked)
        remaining = [source for source in ranked if source.source_id not in {item.source_id for item in core}]

        pro_packet = self._fill_packet(core, remaining[::2] + remaining[1::2])
        con_packet = self._fill_packet(core, remaining[1::2] + remaining[::2])

        self._validate_packet(pro_packet, "pro")
        self._validate_packet(con_packet, "con")
        return {DebateSide.PRO: pro_packet, DebateSide.CON: con_packet}

    def _build_diverse_core(self, ranked: list[SourceCard]) -> list[SourceCard]:
        core: list[SourceCard] = []
        news = next((source for source in ranked if source.source_type == SourceType.NEWS), None)
        evidence = next(
            (
                source
                for source in ranked
                if source.source_type in {SourceType.PRIMARY, SourceType.RESEARCH, SourceType.DATA}
            ),
            None,
        )

        for candidate in (news, evidence):
            if candidate and candidate.source_id not in {source.source_id for source in core}:
                core.append(candidate)

        for source in ranked:
            if len(core) >= min(2, settings.packet_target_size):
                break
            if source.source_id not in {item.source_id for item in core}:
                core.append(source)
        return core

    def _fill_packet(self, core: list[SourceCard], candidates: list[SourceCard]) -> list[SourceCard]:
        packet = list(core)
        seen = {source.source_id for source in packet}
        for source in candidates:
            if len(packet) >= settings.packet_target_size:
                break
            if source.source_id in seen:
                continue
            packet.append(source)
            seen.add(source.source_id)
        return packet

    def _validate_packet(self, packet: list[SourceCard], side_label: str) -> None:
        if len(packet) < settings.packet_min_size:
            raise ValueError(f"{side_label.title()} packet does not have enough evidence")
