from __future__ import annotations

import time
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

import app.api.debates as debates_api
from app.core.settings import settings
from app.db.repository import DebateRepository
from app.models.common import DebateSide, DebateStatus, RoundType, SourceType, utc_now
from app.models.debate import DebateRecord, DebateScope
from app.models.generation import GeneratedRound, SourceUsage
from app.models.source import EvidencePacket, SourceCard
from app.services.execution_service import DebateExecutionService
from app.services.orchestrator import DebateOrchestrator
from app.services.round_runner import RoundRunner
from app.main import app


def build_shared_sources() -> list[SourceCard]:
    now = datetime.now(UTC)
    return [
        SourceCard(
            source_id="S1",
            title="Trusted news source",
            url="https://apnews.com/story-1",
            publisher="apnews.com",
            published_at=now,
            source_type=SourceType.NEWS,
            summary="Trusted news summary",
            supporting_snippets=["Trusted news snippet"],
            trust_score=0.95,
            relevance_score=0.85,
            recency_score=1.0,
            body_excerpt="Trusted news excerpt",
        ),
        SourceCard(
            source_id="S2",
            title="Primary source",
            url="https://www.fcc.gov/report",
            publisher="fcc.gov",
            published_at=now,
            source_type=SourceType.PRIMARY,
            summary="Primary source summary",
            supporting_snippets=["Primary source snippet"],
            trust_score=0.98,
            relevance_score=0.82,
            recency_score=0.95,
            body_excerpt="Primary source excerpt",
        ),
        SourceCard(
            source_id="S3",
            title="Research paper",
            url="https://www.mit.edu/paper",
            publisher="mit.edu",
            published_at=now,
            source_type=SourceType.RESEARCH,
            summary="Research summary",
            supporting_snippets=["Research snippet"],
            trust_score=0.9,
            relevance_score=0.8,
            recency_score=0.9,
            body_excerpt="Research excerpt",
        ),
        SourceCard(
            source_id="S4",
            title="Second news source",
            url="https://www.reuters.com/world/story",
            publisher="reuters.com",
            published_at=now,
            source_type=SourceType.NEWS,
            summary="Second news summary",
            supporting_snippets=["Second news snippet"],
            trust_score=0.94,
            relevance_score=0.79,
            recency_score=0.88,
            body_excerpt="Second news excerpt",
        ),
        SourceCard(
            source_id="S5",
            title="Data source",
            url="https://www.oecd.org/data",
            publisher="oecd.org",
            published_at=now,
            source_type=SourceType.DATA,
            summary="Data summary",
            supporting_snippets=["Data snippet"],
            trust_score=0.92,
            relevance_score=0.78,
            recency_score=0.87,
            body_excerpt="Data excerpt",
        ),
    ]


@pytest.fixture
def client(workspace_tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", workspace_tmp_path / "data")
    monkeypatch.setattr(settings, "db_filename", "test.db")
    monkeypatch.setattr(settings, "enable_live_generation", False)
    monkeypatch.setattr(settings, "enable_live_retrieval", True)
    monkeypatch.setattr(settings, "generation_retry_limit", 2)
    monkeypatch.setattr(settings, "sse_poll_interval_seconds", 0.01)

    debates_api.orchestrator = DebateOrchestrator()
    debates_api.execution_service = DebateExecutionService(debates_api.orchestrator)
    monkeypatch.setattr(
        debates_api.orchestrator.research_manager,
        "build_shared_source_pool",
        lambda resolution: build_shared_sources(),
    )

    with TestClient(app) as test_client:
        yield test_client


def wait_for_completion(client: TestClient, debate_id: str) -> dict:
    for _ in range(20):
        payload = client.get(f"/debates/{debate_id}")
        assert payload.status_code == 200
        detail = payload.json()
        if detail["debate"]["status"] in {"completed", "failed"}:
            return detail
        time.sleep(0.05)
    raise AssertionError("debate did not finish in time")


def test_settings_runtime_validation_requires_api_key_when_live_generation_enabled(monkeypatch):
    monkeypatch.setattr(settings, "enable_live_generation", True)
    monkeypatch.setattr(settings, "groq_api_key", None)
    with pytest.raises(RuntimeError):
        settings.validate_runtime()


def test_settings_accept_standard_anthropic_env_var(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.delenv("DEBATE_GROQ_API_KEY", raising=False)

    assert settings.__class__().groq_api_key == "test-key"


def test_repository_source_membership_lookup(workspace_tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", workspace_tmp_path / "data")
    monkeypatch.setattr(settings, "db_filename", "repo.db")
    repository = DebateRepository()
    repository.initialize()

    now = utc_now()
    debate = DebateRecord(
        debate_id="deb-1",
        topic_raw="Should cities ban cars?",
        resolution_draft="Resolved: cities should ban cars.",
        resolution_final="Resolved: cities should ban cars.",
        scope=DebateScope(),
        status=DebateStatus.READY,
        created_at=now,
        updated_at=now,
    )
    repository.save_debate(debate)
    sources = build_shared_sources()[:2]
    repository.replace_shared_sources("deb-1", sources)
    repository.save_packet(
        "deb-1",
        EvidencePacket(packet_id="deb-1_pro_packet", side=DebateSide.PRO, resolution=debate.resolution_final, source_ids=["S1", "S2"]),
    )
    repository.save_packet(
        "deb-1",
        EvidencePacket(packet_id="deb-1_con_packet", side=DebateSide.CON, resolution=debate.resolution_final, source_ids=["S2"]),
    )
    repository.replace_packet_source_links("deb-1", "deb-1_pro_packet", ["S1", "S2"])
    repository.replace_packet_source_links("deb-1", "deb-1_con_packet", ["S2"])

    assert repository.get_source("deb-1", "S2").publisher == "fcc.gov"
    assert repository.get_source_sides("deb-1", "S2") == [DebateSide.CON, DebateSide.PRO]


def test_debate_lifecycle_events_sources_and_stream(client: TestClient):
    created = client.post("/debates", json={"topic": "Should cities ban cars?"})
    assert created.status_code == 201
    debate_id = created.json()["debate_id"]
    assert created.json()["status"] == "awaiting_confirmation"

    confirmed = client.post(
        f"/debates/{debate_id}/confirm-resolution",
        json={"resolution": "Resolved: cities should ban most cars in dense downtown areas."},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "ready"

    started = client.post(f"/debates/{debate_id}/start")
    assert started.status_code == 200
    assert started.json()["status"] == "researching"

    detail = wait_for_completion(client, debate_id)
    assert detail["debate"]["status"] == "completed"
    assert len(detail["transcript"]) == 10
    assert len(detail["sources"]) >= 4
    assert all(packet["source_ids"] for packet in detail["packets"])

    source_id = detail["sources"][0]["source_id"]
    source_detail = client.get(f"/debates/{debate_id}/sources/{source_id}")
    assert source_detail.status_code == 200
    assert source_detail.json()["source"]["source_id"] == source_id
    assert source_detail.json()["used_by_sides"]

    events = client.get(f"/debates/{debate_id}/events")
    assert events.status_code == 200
    event_types = [event["event_type"] for event in events.json()]
    for required in [
        "debate_created",
        "resolution_confirmed",
        "research_started",
        "sources_collected",
        "packets_ready",
        "round_started",
        "round_completed",
        "debate_completed",
    ]:
        assert required in event_types

    with client.stream("GET", f"/debates/{debate_id}/stream") as response:
        body = "".join(chunk.decode() if isinstance(chunk, bytes) else chunk for chunk in response.iter_text())
    assert "round_completed" in body
    assert "debate_completed" in body


def test_winner_selection_is_idempotent_and_returns_animation_state(client: TestClient):
    debate_id = client.post("/debates", json={"topic": "Should schools require uniforms?"}).json()["debate_id"]
    client.post(
        f"/debates/{debate_id}/confirm-resolution",
        json={"resolution": "Resolved: schools should require uniforms."},
    )
    client.post(f"/debates/{debate_id}/start")
    wait_for_completion(client, debate_id)

    winner = client.post(f"/debates/{debate_id}/winner", json={"winner_side": "pro"})
    assert winner.status_code == 200
    assert winner.json()["winner_side"] == "pro"
    assert winner.json()["winning_animation_state"]["winner_pose"] == "raise_hand"

    winner_repeat = client.post(f"/debates/{debate_id}/winner", json={"winner_side": "pro"})
    assert winner_repeat.status_code == 200

    winner_change = client.post(f"/debates/{debate_id}/winner", json={"winner_side": "con"})
    assert winner_change.status_code == 400

    events = client.get(f"/debates/{debate_id}/events").json()
    winner_events = [event for event in events if event["event_type"] == "winner_selected"]
    assert len(winner_events) == 1
    winner_event = winner_events[0]
    assert winner_event["animation_state"]["animation"] == "decision_celebration"
    assert winner_event["winner_side"] == "pro"


def test_start_fails_clearly_when_live_retrieval_disabled(client: TestClient, monkeypatch):
    debate_id = client.post("/debates", json={"topic": "Should cities ban cars?"}).json()["debate_id"]
    client.post(
        f"/debates/{debate_id}/confirm-resolution",
        json={"resolution": "Resolved: cities should ban most cars in dense downtown areas."},
    )
    monkeypatch.setattr(settings, "enable_live_retrieval", False)

    started = client.post(f"/debates/{debate_id}/start")

    assert started.status_code == 400
    assert "Live retrieval is disabled" in started.json()["detail"]


def test_empty_topic_and_resolution_are_rejected(client: TestClient):
    created = client.post("/debates", json={"topic": "   "})
    assert created.status_code == 422

    debate_id = client.post("/debates", json={"topic": "Should schools require uniforms?"}).json()["debate_id"]
    confirmed = client.post(f"/debates/{debate_id}/confirm-resolution", json={"resolution": "   "})
    assert confirmed.status_code == 422


def test_round_runner_retries_after_validation_failure(monkeypatch):
    monkeypatch.setattr(settings, "enable_live_generation", False)
    monkeypatch.setattr(settings, "generation_retry_limit", 2)

    runner = RoundRunner()
    shared_sources = build_shared_sources()[:4]
    source_index = {source.source_id: source for source in shared_sources}
    packets = {
        DebateSide.PRO: EvidencePacket(packet_id="p1", side=DebateSide.PRO, resolution="Resolved: test.", source_ids=["S1", "S2"]),
        DebateSide.CON: EvidencePacket(packet_id="p2", side=DebateSide.CON, resolution="Resolved: test.", source_ids=["S3", "S4"]),
    }

    calls = {"count": 0}
    original_generate = runner.agent.generate_round

    def flaky_generate(*args, **kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            return GeneratedRound(text="This sentence cites nothing.", citations=[], claim_notes=[], source_usage=[])
        return original_generate(*args, **kwargs)

    monkeypatch.setattr(runner.agent, "generate_round", flaky_generate)
    transcript = runner.run("Resolved: test.", packets, source_index)

    assert len(transcript) == 10
    assert calls["count"] > 1
    assert transcript[0].citations
