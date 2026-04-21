from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.common import DebateSide, DebateStatus, EventType, RoundType


class WinningAnimationState(BaseModel):
    animation: str = "decision_celebration"
    winner_pose: str = "raise_hand"
    loser_pose: str = "look_down"


class DebateEvent(BaseModel):
    event_id: int | None = None
    debate_id: str
    event_type: EventType
    created_at: datetime
    status: DebateStatus | None = None
    round_type: RoundType | None = None
    side: DebateSide | None = None
    entry_id: str | None = None
    winner_side: DebateSide | None = None
    error: str | None = None
    resolution_final: str | None = None
    animation_state: WinningAnimationState | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
