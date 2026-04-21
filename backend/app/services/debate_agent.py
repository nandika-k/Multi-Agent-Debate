from app.core.settings import settings
from app.models.common import DebateSide, RoundType
from app.models.generation import GeneratedRound, SourceUsage
from app.models.source import SourceCard, EvidencePacket
from app.models.transcript import TranscriptEntry

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - handled in runtime dependency setup
    OpenAI = None


def get_character_limits() -> dict[RoundType, int]:
    return settings.character_limits


class DebateAgent:
    def __init__(self) -> None:
        self.client = None

    def generate_round(
        self,
        side: DebateSide,
        round_type: RoundType,
        resolution: str,
        packet: EvidencePacket,
        packet_sources: list[SourceCard],
        transcript: list[TranscriptEntry],
        validation_feedback: str | None = None,
    ) -> GeneratedRound:
        if not settings.enable_live_generation:
            return self._stub_round(side, round_type, resolution, packet_sources)

        client = self._get_client()
        response = client.responses.parse(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": self._system_prompt(round_type)}],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": self._user_prompt(
                                side=side,
                                round_type=round_type,
                                resolution=resolution,
                                packet=packet,
                                packet_sources=packet_sources,
                                transcript=transcript,
                                validation_feedback=validation_feedback,
                            ),
                        }
                    ],
                },
            ],
            text_format=GeneratedRound,
        )
        parsed = response.output_parsed
        if parsed is None:
            raise ValueError("OpenAI returned no structured round output")
        return parsed

    def _get_client(self):
        if self.client is not None:
            return self.client
        if OpenAI is None:
            raise RuntimeError("openai package is required when live generation is enabled")
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        self.client = OpenAI(api_key=settings.openai_api_key)
        return self.client

    def _stub_round(
        self,
        side: DebateSide,
        round_type: RoundType,
        resolution: str,
        packet_sources: list[SourceCard],
    ) -> GeneratedRound:
        stance = "supports" if side == DebateSide.PRO else "opposes"
        citation_ids = [source.source_id for source in packet_sources[:2]]
        citation_suffix = "".join(f"[{citation}]" for citation in citation_ids)
        templates = {
            RoundType.OPENING: f"The {side.value} side {stance} the resolution '{resolution}' by grounding its case in the strongest evidence from its packet.",
            RoundType.CROSSFIRE_QUESTIONS: f"The {side.value} side asks concise clarifying questions that test assumptions, evidence quality, and consequences.",
            RoundType.CROSSFIRE_ANSWERS: f"The {side.value} side answers the opponent directly and reinforces its strongest cited evidence.",
            RoundType.REBUTTAL: f"The {side.value} side rebuts the opposing case and re-centers the debate on its best supported claims.",
            RoundType.CLOSING: f"The {side.value} side closes by summarizing why its evidence makes the stronger case overall.",
        }
        text = f"{templates[round_type]} {citation_suffix}".strip()
        return GeneratedRound(
            text=text[: get_character_limits()[round_type]],
            citations=citation_ids,
            claim_notes=[f"Stubbed {round_type.value} output for local testing."],
            source_usage=[
                SourceUsage(source_id=source.source_id, rationale="Used as supporting packet evidence")
                for source in packet_sources[:2]
            ],
        )

    def _system_prompt(self, round_type: RoundType) -> str:
        round_rules = {
            RoundType.OPENING: "Build a clear case and cite factual claims.",
            RoundType.CROSSFIRE_QUESTIONS: "Ask concise clarifying questions only; do not deliver a speech.",
            RoundType.CROSSFIRE_ANSWERS: "Answer the opponent directly and briefly.",
            RoundType.REBUTTAL: "Respond to the opponent's best claims and defend your own.",
            RoundType.CLOSING: "Summarize the strongest supported points and avoid introducing major new evidence.",
        }
        return (
            "You are one side of a formal debate. "
            "Use only the provided evidence packet for factual claims. "
            "Never invent facts, studies, quotes, dates, or institutions. "
            "Return structured JSON with fields: text, citations, claim_notes, source_usage. "
            "Every factual claim in text must include inline citations like [S1] or [S1][S2]. "
            "The citations field must list only source IDs actually used inline. "
            f"Round-specific rule: {round_rules[round_type]}"
        )

    def _user_prompt(
        self,
        side: DebateSide,
        round_type: RoundType,
        resolution: str,
        packet: EvidencePacket,
        packet_sources: list[SourceCard],
        transcript: list[TranscriptEntry],
        validation_feedback: str | None,
    ) -> str:
        transcript_text = "\n".join(
            f"{entry.side.value.upper()} {entry.round_type.value}: {entry.text}"
            for entry in transcript
        ) or "No prior transcript."
        source_packet = "\n".join(
            (
                f"{source.source_id}: {source.title} | {source.publisher} | {source.summary} | "
                f"Snippets: {' || '.join(source.supporting_snippets[:2])}"
            )
            for source in packet_sources
        )
        retry_note = ""
        if validation_feedback:
            retry_note = (
                f"\nValidation feedback from the previous attempt: {validation_feedback}\n"
                "Tighten the response to satisfy that requirement.\n"
            )
        return (
            f"Resolution: {resolution}\n"
            f"Assigned side: {side.value}\n"
            f"Round: {round_type.value}\n"
            f"Character limit: {get_character_limits()[round_type]}\n"
            f"Packet source ids: {packet.source_ids}\n"
            f"Key claims to emphasize: {packet.key_claims}\n\n"
            f"Private evidence packet:\n{source_packet}\n\n"
            f"Public transcript so far:\n{transcript_text}\n"
            f"{retry_note}\n"
            "Return only the structured output. Keep it debate-style, concise, and citation-disciplined."
        )
