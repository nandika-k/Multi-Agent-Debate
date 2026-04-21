from pydantic import BaseModel, Field


class SourceUsage(BaseModel):
    source_id: str
    rationale: str


class GeneratedRound(BaseModel):
    text: str
    citations: list[str] = Field(default_factory=list)
    claim_notes: list[str] = Field(default_factory=list)
    source_usage: list[SourceUsage] = Field(default_factory=list)
