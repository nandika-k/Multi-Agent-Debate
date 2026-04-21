from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import DebateSide, RoundType


class TranscriptEntry(BaseModel):
    entry_id: str
    round_type: RoundType
    side: DebateSide
    text: str
    citations: list[str] = Field(default_factory=list)
    char_count: int
    created_at: datetime
