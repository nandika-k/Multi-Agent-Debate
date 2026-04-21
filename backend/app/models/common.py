from datetime import UTC, datetime
from enum import Enum


def utc_now() -> datetime:
    return datetime.now(UTC)


class DebateStatus(str, Enum):
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    READY = "ready"
    RESEARCHING = "researching"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class DebateSide(str, Enum):
    PRO = "pro"
    CON = "con"


class SourceType(str, Enum):
    NEWS = "news"
    PRIMARY = "primary"
    DATA = "data"
    RESEARCH = "research"
    ANALYSIS = "analysis"


class RoundType(str, Enum):
    OPENING = "opening"
    CROSSFIRE_QUESTIONS = "crossfire_questions"
    CROSSFIRE_ANSWERS = "crossfire_answers"
    REBUTTAL = "rebuttal"
    CLOSING = "closing"


class EventType(str, Enum):
    DEBATE_CREATED = "debate_created"
    RESOLUTION_CONFIRMED = "resolution_confirmed"
    RESEARCH_STARTED = "research_started"
    SOURCES_COLLECTED = "sources_collected"
    PACKETS_READY = "packets_ready"
    ROUND_STARTED = "round_started"
    ROUND_COMPLETED = "round_completed"
    DEBATE_COMPLETED = "debate_completed"
    DEBATE_FAILED = "debate_failed"
    WINNER_SELECTED = "winner_selected"
