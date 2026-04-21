from app.models.common import DebateSide
from app.models.source import EvidencePacket, SourceCard


class EvidenceBuilder:
    def build_packet(
        self,
        debate_id: str,
        side: DebateSide,
        resolution: str,
        sources: list[SourceCard],
    ) -> EvidencePacket:
        claims = {
            DebateSide.PRO: [
                "Argue that the resolution produces more public benefit than harm.",
                "Use trusted reporting and stronger evidence to frame the affirmative case.",
            ],
            DebateSide.CON: [
                "Argue that the resolution carries stronger risks, tradeoffs, or weak evidence.",
                "Challenge feasibility, fairness, or unintended consequences using the packet evidence.",
            ],
        }
        return EvidencePacket(
            packet_id=f"{debate_id}_{side.value}_packet",
            side=side,
            resolution=resolution,
            source_ids=[source.source_id for source in sources],
            key_claims=claims[side],
        )
