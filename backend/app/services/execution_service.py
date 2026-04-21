from collections import defaultdict
from threading import Lock

from app.models.debate import DebateSummary
from app.services.orchestrator import DebateOrchestrator


class DebateExecutionService:
    def __init__(self, orchestrator: DebateOrchestrator) -> None:
        self.orchestrator = orchestrator
        self._locks: defaultdict[str, Lock] = defaultdict(Lock)

    def queue_start(self, debate_id: str) -> DebateSummary | None:
        with self._locks[debate_id]:
            return self.orchestrator.queue_debate(debate_id)

    def run(self, debate_id: str) -> None:
        with self._locks[debate_id]:
            self.orchestrator.run_debate(debate_id)
