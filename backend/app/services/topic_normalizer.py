from app.models.debate import DebateScope


class TopicNormalizer:
    def normalize(self, topic: str) -> tuple[str, DebateScope]:
        clean_topic = topic.strip().rstrip('.')
        if clean_topic.lower().startswith('should '):
            resolution = f"Resolved: {clean_topic}."
        else:
            resolution = f"Resolved: {clean_topic} should be supported."

        scope = DebateScope(
            jurisdiction="General",
            timeframe="Current conditions",
            target_population="General public",
            definitions=[],
        )
        return resolution, scope
