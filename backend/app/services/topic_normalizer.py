from groq import Groq

from app.core.settings import settings
from app.models.debate import DebateScope

_SYSTEM_PROMPT = """\
You are a debate topic formatter. Given a raw user-supplied topic, rewrite it as a formal debate resolution in the style:
"Resolved: <topic as a normative claim>."

Rules:
- The resolution must be a single, clear, debatable normative statement.
- Use formal academic language.
- Do not add commentary or explanation — output only the resolution string, nothing else.
- The output must start with "Resolved: " and end with a period.

Examples:
  Input: "should the US ban tiktok"
  Output: Resolved: The United States federal government should ban TikTok.

  Input: "universal basic income"
  Output: Resolved: The United States federal government should implement a universal basic income.

  Input: "Is nuclear energy good?"
  Output: Resolved: Nuclear energy should be expanded as a primary source of electricity generation.
"""


class TopicNormalizer:
    def __init__(self) -> None:
        self.client = None

    def normalize(self, topic: str) -> tuple[str, DebateScope]:
        if settings.enable_live_generation:
            resolution = self._llm_normalize(topic.strip())
        else:
            resolution = self._fallback_normalize(topic.strip())

        scope = DebateScope(
            jurisdiction="General",
            timeframe="Current conditions",
            target_population="General public",
            definitions=[],
        )
        return resolution, scope

    def _llm_normalize(self, topic: str) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_tokens=256,
            temperature=0.3,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": topic},
            ],
        )
        resolution = response.choices[0].message.content.strip()
        if not resolution.startswith("Resolved:"):
            resolution = f"Resolved: {resolution.rstrip('.')}."
        return resolution

    def _get_client(self) -> Groq:
        if self.client is not None:
            return self.client
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not configured")
        self.client = Groq(api_key=settings.groq_api_key)
        return self.client

    def _fallback_normalize(self, topic: str) -> str:
        clean = topic.rstrip('.')
        if clean.lower().startswith('should '):
            return f"Resolved: {clean}."
        return f"Resolved: {clean} should be supported."
