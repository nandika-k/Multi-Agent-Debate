from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.common import DebateSide, DebateStatus
from app.models.event import DebateEvent, WinningAnimationState
from app.models.source import EvidencePacket, SourceCard
from app.models.transcript import TranscriptEntry


class DebateScope(BaseModel):
    jurisdiction: str | None = None
    timeframe: str | None = None
    target_population: str | None = None
    definitions: list[str] = Field(default_factory=list)


class DebateRecord(BaseModel):
    debate_id: str
    topic_raw: str
    resolution_draft: str
    resolution_final: str | None = None
    scope: DebateScope = Field(default_factory=DebateScope)
    status: DebateStatus
    winner_side: DebateSide | None = None
    winning_animation_state: WinningAnimationState | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DebateSummary(BaseModel):
    debate_id: str
    topic_raw: str
    resolution_draft: str
    resolution_final: str | None = None
    status: DebateStatus
    winner_side: DebateSide | None = None
    winning_animation_state: WinningAnimationState | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DebateDetailResponse(BaseModel):
    debate: DebateSummary
    scope: DebateScope
    packets: list[EvidencePacket] = Field(default_factory=list)
    transcript: list[TranscriptEntry] = Field(default_factory=list)
    sources: list[SourceCard] = Field(default_factory=list)
    events: list[DebateEvent] = Field(default_factory=list)


class SourceDetailResponse(BaseModel):
    debate_id: str
    source: SourceCard
    used_by_sides: list[DebateSide] = Field(default_factory=list)


class CreateDebateRequest(BaseModel):
    topic: str

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Topic cannot be empty")
        return cleaned


class ConfirmResolutionRequest(BaseModel):
    resolution: str

    @field_validator("resolution")
    @classmethod
    def validate_resolution(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Resolution cannot be empty")
        return cleaned


class PickWinnerRequest(BaseModel):
    winner_side: DebateSide
