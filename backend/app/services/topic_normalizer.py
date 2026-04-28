from groq import Groq

from app.core.settings import settings
from app.models.debate import DebateScope
from app.services.gemini_fallback import build_gemini_client

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
        self._groq_client = None
        self._gemini_client = None

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
        resolution = None
        if settings.groq_api_key:
            try:
                client = self._get_groq_client()
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
            except Exception:
                if not settings.google_api_key:
                    raise

        if resolution is None:
            if not settings.google_api_key:
                raise ValueError("No live generation provider is configured")
            client = self._get_gemini_client()
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=f"{_SYSTEM_PROMPT}\n\nTopic: {topic}",
            )
            resolution = response.text.strip()

        if not resolution.startswith("Resolved:"):
            resolution = f"Resolved: {resolution.rstrip('.')}."
        return resolution

    def _get_groq_client(self) -> Groq:
        if self._groq_client is not None:
            return self._groq_client
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not configured")
        self._groq_client = Groq(api_key=settings.groq_api_key)
        return self._groq_client

    def _get_gemini_client(self):
        if self._gemini_client is not None:
            return self._gemini_client
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not configured")
        self._gemini_client = build_gemini_client(settings.google_api_key)
        return self._gemini_client

    def _fallback_normalize(self, topic: str) -> str:
        clean = topic.rstrip('.')
        if clean.lower().startswith('should '):
            return f"Resolved: {clean}."
        return f"Resolved: {clean} should be supported."
