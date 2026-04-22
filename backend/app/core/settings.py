from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.models.common import RoundType


class Settings(BaseSettings):
    app_name: str = "Multi-Agent Debate Backend"
    data_dir: Path = Path(__file__).resolve().parents[2] / "data"
    db_filename: str = "debates.db"
    groq_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("GROQ_API_KEY", "DEBATE_GROQ_API_KEY"),
    )
    groq_model: str = "llama-3.3-70b-versatile"
    enable_live_generation: bool = True
    enable_live_retrieval: bool = True
    generation_retry_limit: int = 3
    search_results_per_query: int = 5
    shared_pool_target_min: int = 4
    shared_pool_target_max: int = 8
    packet_target_size: int = 4
    packet_min_size: int = 3
    retrieval_timeout_seconds: float = 10.0
    retrieval_connect_timeout_seconds: float = 5.0
    sse_poll_interval_seconds: float = 1.0
    character_limit_opening: int = 1200
    character_limit_crossfire_questions: int = 300
    character_limit_crossfire_answers: int = 500
    character_limit_rebuttal: int = 1000
    character_limit_closing: int = 800
    trusted_domains: tuple[str, ...] = (
        "apnews.com",
        "reuters.com",
        "nytimes.com",
        "npr.org",
        "bbc.com",
        "pbs.org",
        "gov",
        "edu",
        "who.int",
        "oecd.org",
        "worldbank.org",
        "imf.org",
    )

    model_config = SettingsConfigDict(
        env_prefix="DEBATE_",
        env_file=".env",
        extra="ignore",
    )

    @property
    def db_path(self) -> Path:
        return self.data_dir / self.db_filename

    @property
    def character_limits(self) -> dict[RoundType, int]:
        return {
            RoundType.OPENING: self.character_limit_opening,
            RoundType.CROSSFIRE_QUESTIONS: self.character_limit_crossfire_questions,
            RoundType.CROSSFIRE_ANSWERS: self.character_limit_crossfire_answers,
            RoundType.REBUTTAL: self.character_limit_rebuttal,
            RoundType.CLOSING: self.character_limit_closing,
        }

    def validate_runtime(self) -> None:
        if self.enable_live_generation and not self.groq_api_key:
            raise RuntimeError(
                "GROQ_API_KEY (or DEBATE_GROQ_API_KEY) is required when live generation is enabled"
            )


settings = Settings()
