import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import {
  confirmResolution,
  createDebate,
  getDebate,
  getSourceDetail,
  pickWinner,
  startDebate,
} from "./api";
import { EventTimeline } from "./components/EventTimeline";
import { ResolutionEditor } from "./components/ResolutionEditor";
import { SourceRail } from "./components/SourceRail";
import { StatusBanner } from "./components/StatusBanner";
import { TopicComposer } from "./components/TopicComposer";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { WinnerPanel } from "./components/WinnerPanel";
import { formatStatus, formatTimestamp } from "./formatters";
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

  const handleRelevantStreamEvent = useCallback(
    async () => {
      if (!debateId) {
        return;
      }
      try {
        await refreshDebate(debateId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to refresh live debate data.");
      }
    },
    [debateId, refreshDebate],
  );

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

  return (
    <div className="app-shell">
      <div className="background-orb background-orb--left" />
      <div className="background-orb background-orb--right" />

      <header className="hero">
        <div className="hero__copy">
          <span className="eyebrow">Multi-Agent Debate</span>
          <h1>Debate architecture with a Canva-style front stage.</h1>
          <p>
            A single-screen workspace for drafting a resolution, launching the run, tracking live
            evidence, and naming the winner.
          </p>
        </div>
        <div className="hero__meta panel">
          <div>
            <span className="meta-label">Current view</span>
            <strong>{view}</strong>
          </div>
          <div>
            <span className="meta-label">Status</span>
            <strong>{activeDebate ? formatStatus(activeDebate.status) : "Not started"}</strong>
          </div>
          <div>
            <span className="meta-label">Last update</span>
            <strong>{activeDebate ? formatTimestamp(activeDebate.updated_at) : "Not yet"}</strong>
          </div>
        </div>
      </header>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <main className="app-grid">
        <section className="main-column">
          {view === "topic" ? (
            <TopicComposer
              busy={busyAction === "create"}
              topic={topicInput}
              onSubmit={handleCreateDebate}
              onTopicChange={setTopicInput}
            />
          ) : null}

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
              <StatusBanner currentEvent={lastEvent} debate={activeDebate} streamState={streamState} />
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
                <span className="eyebrow">Important elements only</span>
                <h2>What this UI keeps from the prototype</h2>
              </div>
              <ul className="notes-list">
                <li>One strong headline card instead of separate slides.</li>
                <li>Red and blue opposition cues for pro and con structure.</li>
                <li>Large editorial panels for transcript, evidence, and result states.</li>
                <li>Live backend state rather than placeholder copy.</li>
              </ul>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
