import re

from app.models.common import RoundType
from app.models.generation import GeneratedRound
from app.models.source import EvidencePacket


class CitationValidator:
    citation_pattern = re.compile(r"\[(S\d+)\]")
    factual_signal_pattern = re.compile(
        r"(\b\d+(?:\.\d+)?%|\baccording to\b|\bfound that\b)",
        re.IGNORECASE,
    )

    def validate(
        self,
        generated: GeneratedRound,
        packet: EvidencePacket,
        char_limit: int,
        round_type: RoundType,
    ) -> None:
        text = generated.text.strip()
        cited_ids = set(self.citation_pattern.findall(text))
        if set(generated.citations) != cited_ids:
            raise ValueError("Structured citation list does not match inline citation usage")

        allowed_ids = set(packet.source_ids)
        unknown = cited_ids - allowed_ids
        if unknown:
            raise ValueError(f"Unknown citations used: {sorted(unknown)}")

        if not cited_ids:
            raise ValueError("At least one citation is required")

        if not generated.source_usage:
            raise ValueError("At least one source_usage item is required for validation")

        for usage in generated.source_usage:
            if usage.source_id not in allowed_ids:
                raise ValueError(f"source_usage references an unknown source: {usage.source_id}")

        self._validate_uncited_factual_claims(text)

    def _validate_uncited_factual_claims(self, text: str) -> None:
        sentences = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", text) if segment.strip()]
        for sentence in sentences:
            has_citation = bool(self.citation_pattern.search(sentence))
            if self.factual_signal_pattern.search(sentence) and not has_citation:
                raise ValueError(f"Likely factual claim is missing a citation: {sentence[:120]}")
