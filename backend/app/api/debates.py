import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import Response, StreamingResponse

from app.core.settings import settings
from app.models.debate import (
    ConfirmResolutionRequest,
    CreateDebateRequest,
    DebateDetailResponse,
    DebateSummary,
    PickWinnerRequest,
    SourceDetailResponse,
)
from app.models.event import DebateEvent
from app.services.execution_service import DebateExecutionService
from app.services.orchestrator import DebateOrchestrator
from app.services.tts_service import TTSService

router = APIRouter(prefix="/debates", tags=["debates"])
orchestrator = DebateOrchestrator()
execution_service = DebateExecutionService(orchestrator)
tts_service = TTSService()


@router.post("", response_model=DebateSummary, status_code=status.HTTP_201_CREATED)
def create_debate(payload: CreateDebateRequest) -> DebateSummary:
    return orchestrator.create_debate(payload.topic)


@router.get("/{debate_id}", response_model=DebateDetailResponse)
def get_debate(debate_id: str) -> DebateDetailResponse:
    debate = orchestrator.get_debate_detail(debate_id)
    if debate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    return debate


@router.post("/{debate_id}/confirm-resolution", response_model=DebateSummary)
def confirm_resolution(debate_id: str, payload: ConfirmResolutionRequest) -> DebateSummary:
    try:
        debate = orchestrator.confirm_resolution(debate_id, payload.resolution)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if debate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    return debate


@router.post("/{debate_id}/start", response_model=DebateSummary)
def start_debate(debate_id: str, background_tasks: BackgroundTasks) -> DebateSummary:
    try:
        debate = execution_service.queue_start(debate_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if debate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")

    background_tasks.add_task(execution_service.run, debate_id)
    return debate


@router.post("/{debate_id}/winner", response_model=DebateSummary)
def pick_winner(debate_id: str, payload: PickWinnerRequest) -> DebateSummary:
    try:
        debate = orchestrator.pick_winner(debate_id, payload.winner_side)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if debate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    return debate


@router.get("/{debate_id}/events", response_model=list[DebateEvent])
def get_debate_events(debate_id: str) -> list[DebateEvent]:
    events = orchestrator.get_events(debate_id)
    if events is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    return events


@router.get("/{debate_id}/stream")
async def stream_debate_events(debate_id: str) -> StreamingResponse:
    if orchestrator.get_debate_detail(debate_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")

    async def event_generator():
        sent = 0
        while True:
            events = orchestrator.get_events(debate_id) or []
            for event in events[sent:]:
                yield f"data: {json.dumps(event.model_dump(mode='json'))}\n\n"
            sent = len(events)

            detail = orchestrator.get_debate_detail(debate_id)
            if detail is None or detail.debate.status.value in {"completed", "failed"}:
                break
            await asyncio.sleep(settings.sse_poll_interval_seconds)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{debate_id}/transcript/{entry_id}/audio")
def get_transcript_audio(debate_id: str, entry_id: str) -> Response:
    if not settings.enable_tts:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="TTS is disabled")
    entry = orchestrator.repository.get_transcript_entry(debate_id, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript entry not found")
    try:
        audio = tts_service.synthesize(entry_id, entry.text, entry.side)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"TTS unavailable: {exc}") from exc
    return Response(content=audio, media_type="audio/mpeg")


@router.get("/{debate_id}/sources/{source_id}", response_model=SourceDetailResponse)
def get_source_detail(debate_id: str, source_id: str) -> SourceDetailResponse:
    source = orchestrator.get_source_detail(debate_id, source_id)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return source
