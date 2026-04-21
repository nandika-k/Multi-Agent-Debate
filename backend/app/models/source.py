from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import DebateSide, SourceType


class SourceCard(BaseModel):
    source_id: str
    title: str
    url: str
    publisher: str
    published_at: datetime | None = None
    source_type: SourceType
    summary: str
    supporting_snippets: list[str] = Field(default_factory=list)
    trust_score: float
    relevance_score: float = 0.0
    recency_score: float = 0.0
    body_excerpt: str | None = None


class EvidencePacket(BaseModel):
    packet_id: str
    side: DebateSide
    resolution: str
    source_ids: list[str] = Field(default_factory=list)
    key_claims: list[str] = Field(default_factory=list)
