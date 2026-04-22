import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import {
  confirmResolution,
  createDebate,
  getDebate,
  getSourceDetail,
  pickWinner,
  startDebate,
} from "./api";
import { BlobMascot } from "./components/BlobMascot";
import { EventTimeline } from "./components/EventTimeline";
import { ResolutionEditor } from "./components/ResolutionEditor";
import { SourceRail } from "./components/SourceRail";
import { StatusBanner } from "./components/StatusBanner";
import { TopicComposer } from "./components/TopicComposer";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { WinnerPanel } from "./components/WinnerPanel";
import type {
  AppView,
  DebateDetailResponse,
  DebateSide,
  DebateSummary,
  SourceDetailResponse,
} from "./types";
import { useDebateStream } from "./useDebateStream";

function resolveView(summary: DebateSummary | null): AppView {
  if (!summary) {
    return "topic";
  }
  if (summary.status === "awaiting_confirmation" || summary.status === "ready") {
    return "resolution";
  }
  if (summary.status === "researching" || summary.status === "in_progress") {
    return "running";
  }
  return "completed";
}

export default function App() {
  const [topicInput, setTopicInput] = useState("");
  const [resolutionInput, setResolutionInput] = useState("");
  const [debateId, setDebateId] = useState<string | null>(null);
  const [debateSummary, setDebateSummary] = useState<DebateSummary | null>(null);
  const [debateDetail, setDebateDetail] = useState<DebateDetailResponse | null>(null);
  const [sourceDetails, setSourceDetails] = useState<Record<string, SourceDetailResponse>>({});
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeDebate = debateDetail?.debate ?? debateSummary;
  const view = resolveView(activeDebate);

  const refreshDebate = useCallback(async (id: string) => {
    const detail = await getDebate(id);
    startTransition(() => {
      setDebateSummary(detail.debate);
      setDebateDetail(detail);
    });
    return detail;
  }, []);

  useEffect(() => {
    if (!activeDebate) {
      setResolutionInput("");
      return;
    }
    setResolutionInput(activeDebate.resolution_final ?? activeDebate.resolution_draft);
  }, [activeDebate?.debate_id, activeDebate?.resolution_draft, activeDebate?.resolution_final]);

  const handleCreateDebate = useCallback(async () => {
    setBusyAction("create");
    setErrorMessage(null);
    try {
      const summary = await createDebate(topicInput.trim());
      setDebateId(summary.debate_id);
      setDebateSummary(summary);
      await refreshDebate(summary.debate_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create debate.");
    } finally {
      setBusyAction(null);
    }
  }, [refreshDebate, topicInput]);

  const handleConfirmResolution = useCallback(async () => {
    if (!debateId) {
      return;
    }
    setBusyAction("confirm");
    setErrorMessage(null);
    try {
      const summary = await confirmResolution(debateId, resolutionInput.trim());
      setDebateSummary(summary);
      await refreshDebate(summary.debate_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to confirm the resolution.");
    } finally {
      setBusyAction(null);
    }
  }, [debateId, refreshDebate, resolutionInput]);

  const handleStartDebate = useCallback(async () => {
    if (!debateId) {
      return;
    }
    setBusyAction("start");
    setErrorMessage(null);
    try {
      const summary = await startDebate(debateId);
      setDebateSummary(summary);
      await refreshDebate(summary.debate_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start the debate.");
    } finally {
      setBusyAction(null);
    }
  }, [debateId, refreshDebate]);

  const handlePickWinner = useCallback(
    async (winnerSide: DebateSide) => {
      if (!debateId) {
        return;
      }
      setBusyAction("winner");
      setErrorMessage(null);
      try {
        const summary = await pickWinner(debateId, winnerSide);
        setDebateSummary(summary);
        await refreshDebate(summary.debate_id);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save the winner.");
      } finally {
        setBusyAction(null);
      }
    },
    [debateId, refreshDebate],
  );

  const handleSelectSource = useCallback(
    async (sourceId: string) => {
      if (!debateId) {
        return;
      }
      setSelectedSourceId(sourceId);
      if (sourceDetails[sourceId]) {
        return;
      }
      setLoadingSourceId(sourceId);
      try {
        const detail = await getSourceDetail(debateId, sourceId);
        setSourceDetails((current) => ({ ...current, [sourceId]: detail }));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to fetch the source detail.");
      } finally {
        setLoadingSourceId(null);
      }
    },
    [debateId, sourceDetails],
  );

  const handleRelevantStreamEvent = useCallback(async () => {
    if (!debateId) {
      return;
    }
    try {
      await refreshDebate(debateId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to refresh live debate data.");
    }
  }, [debateId, refreshDebate]);

  const { lastEvent, streamState } = useDebateStream({
    debateId,
    enabled: view === "running",
    onRelevantEvent: handleRelevantStreamEvent,
  });

  const selectedSourceDetail = useMemo(() => {
    if (!selectedSourceId) {
      return null;
    }
    return sourceDetails[selectedSourceId] ?? null;
  }, [selectedSourceId, sourceDetails]);

  if (view === "topic") {
    return (
      <div className="app-shell app-shell--topic">
        <div className="topic-shell">
          {errorMessage ? <div className="error-banner topic-error-banner">{errorMessage}</div> : null}
          <TopicComposer
            busy={busyAction === "create"}
            topic={topicInput}
            onSubmit={handleCreateDebate}
            onTopicChange={setTopicInput}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Gold bookmark decoration */}
      <span aria-hidden className="bookmark" />

      {/* Blob mascots */}
      <BlobMascot className="mascot mascot--left" side="con" size={140} />
      <BlobMascot className="mascot mascot--right" side="pro" size={140} />

      {/* Main content */}
      <div className="content-wrapper">
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

        <main className="app-grid">
          <section className="main-column">
            {activeDebate && view === "resolution" ? (
              <ResolutionEditor
                busyAction={busyAction}
                debate={activeDebate}
                resolution={resolutionInput}
                scope={debateDetail?.scope ?? null}
                onConfirm={handleConfirmResolution}
                onResolutionChange={setResolutionInput}
                onStart={handleStartDebate}
              />
            ) : null}

            {activeDebate && (view === "running" || view === "completed") ? (
              <>
                <StatusBanner
                  currentEvent={lastEvent}
                  debate={activeDebate}
                  streamState={streamState}
                />
                <TranscriptPanel transcript={debateDetail?.transcript ?? []} />
                {view === "completed" ? (
                  <WinnerPanel
                    busyAction={busyAction}
                    debate={activeDebate}
                    onPickWinner={handlePickWinner}
                  />
                ) : null}
              </>
            ) : null}
          </section>

          <aside className="side-column">
            {activeDebate && debateDetail ? (
              <>
                <SourceRail
                  loadingSourceId={loadingSourceId}
                  packets={debateDetail.packets}
                  selectedSourceDetail={selectedSourceDetail}
                  selectedSourceId={selectedSourceId}
                  sources={debateDetail.sources}
                  onSelectSource={handleSelectSource}
                />
                <EventTimeline events={debateDetail.events} />
              </>
            ) : (
              <section className="panel notes-panel">
                <div className="panel-heading">
                  <h2>How it works</h2>
                </div>
                <ul className="notes-list">
                  <li>Enter a debate topic and the AI drafts a formal resolution.</li>
                  <li>Review and refine the resolution before launching.</li>
                  <li>Watch both sides debate in real time with live evidence.</li>
                  <li>Review the transcript and pick the winning side.</li>
                </ul>
              </section>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
