import { useCallback, useMemo, useState } from 'react'

import type { DebateSide, DebateSummary, RoundType } from './types'

const PRO_COLORS = ['#8b3535', '#b04040', '#c75555', '#d4637a', '#e89090', '#f0b8b0']
const CON_COLORS = ['#2b3666', '#3d4f8a', '#4a6aa8', '#6080c0', '#8090d0', '#a0aee0']

function FullscreenConfetti({ side }: { side: DebateSide }) {
  const particles = useMemo(() => {
    const colors = side === 'pro' ? PRO_COLORS : CON_COLORS
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 3.5,
      duration: 2.8 + Math.random() * 2.2,
      width: 5 + Math.random() * 9,
      height: 6 + Math.random() * 14,
    }))
  }, [side])

  return (
    <div className="confetti-fullscreen" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-full-particle"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
import { BoxingRing } from './components/BoxingRing'
import { ResolutionEditor } from './components/ResolutionEditor'
import { SourceRail } from './components/SourceRail'
import { StatusBanner } from './components/StatusBanner'
import { TopicComposer } from './components/TopicComposer'
import { WinnerPanel } from './components/WinnerPanel'
import { useDebateStream } from './useDebateStream'

type AppView = 'topic' | 'resolution' | 'debate' | 'failed'

export default function App() {
  const [view, setView] = useState<AppView>('topic')
  const [debateId, setDebateId] = useState<string | null>(null)
  const [pendingDebate, setPendingDebate] = useState<DebateSummary | null>(null)
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null)
  const [voiceReadingEnabled, setVoiceReadingEnabled] = useState(true)
  const [visibleRound, setVisibleRound] = useState<RoundType | null>(null)
  const [playbackActive, setPlaybackActive] = useState(false)

  const {
    debate,
    transcript,
    sources,
    currentRound,
    lastEvent,
    newEntryIds,
  } = useDebateStream(view === 'debate' ? debateId : null)

  const effectiveDebate = debate ?? pendingDebate
  const isCompleted = effectiveDebate?.status === 'completed'
  const isFailed = effectiveDebate?.status === 'failed' || view === 'failed'

  function handleDebateCreated(d: DebateSummary) {
    setPendingDebate(d)
    setDebateId(d.debate_id)
    setView('resolution')
  }

  function handleResolutionConfirmed(d: DebateSummary) {
    setPendingDebate(d)
    setView('debate')
  }

  function handleCancelResolution() {
    setPendingDebate(null)
    setDebateId(null)
    setView('topic')
  }

  function handlePickWinner(updated: DebateSummary) {
    setPendingDebate(updated)
  }

  function handleNewDebate() {
    setPendingDebate(null)
    setDebateId(null)
    setView('topic')
    setHighlightedSourceId(null)
    setVisibleRound(null)
    setPlaybackActive(false)
  }

  const handleCitationHover = useCallback((sourceId: string | null) => {
    setHighlightedSourceId(sourceId)
  }, [])

  const handleVisibleRoundChange = useCallback((round: RoundType | null) => {
    setVisibleRound(round)
  }, [])

  const handlePlaybackActiveChange = useCallback((active: boolean) => {
    setPlaybackActive(active)
  }, [])

  const isResearching = effectiveDebate?.status === 'researching'
  const researchEvents = [
    { label: 'Gathering sources from the web', type: 'research_started' },
    { label: 'Evaluating source quality', type: 'sources_collected' },
    { label: 'Building evidence packets', type: 'packets_ready' },
    { label: 'Fighters step into the ring...', type: 'round_started' },
  ]

  function getResearchStepState(eventType: string) {
    if (!lastEvent) return 'pending' as const
    const types = ['research_started', 'sources_collected', 'packets_ready', 'round_started', 'round_completed', 'debate_completed']
    const lastIdx = types.indexOf(lastEvent.event_type)
    const myIdx = types.indexOf(eventType)
    if (lastIdx > myIdx) return 'done' as const
    if (lastIdx === myIdx) return 'active' as const
    return 'pending' as const
  }

  if (view === 'topic') {
    return <TopicComposer onDebateCreated={handleDebateCreated} />
  }

  if (view === 'resolution' && pendingDebate) {
    return (
      <ResolutionEditor
        debate={pendingDebate}
        onConfirmed={handleResolutionConfirmed}
        onCancel={handleCancelResolution}
      />
    )
  }

  if (isFailed) {
    return (
      <div className="failed-state">
        <div className="failed-icon">STOP</div>
        <div className="failed-title">FIGHT STOPPED</div>
        <div className="failed-msg">
          {effectiveDebate?.error_message ?? 'An error occurred during the debate.'}
        </div>
        <button className="btn-retry" onClick={handleNewDebate}>
          + NEW DEBATE
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {!playbackActive && effectiveDebate?.winner_side && (
        <FullscreenConfetti side={effectiveDebate.winner_side} />
      )}
      <StatusBanner
        topic={effectiveDebate?.resolution_final ?? effectiveDebate?.topic_raw ?? null}
        status={playbackActive && effectiveDebate?.status === 'completed' ? 'in_progress' : (effectiveDebate?.status ?? null)}
        currentRound={visibleRound ?? currentRound}
        voiceReadingEnabled={voiceReadingEnabled}
        onToggleVoiceReading={() => setVoiceReadingEnabled(enabled => !enabled)}
      />

      {isResearching ? (
        <div className="researching-overlay">
          <div className="researching-title">WARMING UP THE RING...</div>
          <div className="researching-steps">
            {researchEvents.map(step => {
              const state = getResearchStepState(step.type)
              return (
                <div key={step.type} className={`research-step ${state}`}>
                  <div className="step-icon">
                    {state === 'done' ? 'DONE' : state === 'active' ? 'LIVE' : 'NEXT'}
                  </div>
                  <span>{step.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="arena-wrapper">
          <div className="arena-main">
            <BoxingRing
              transcript={transcript}
              sources={sources}
              currentRound={currentRound}
              newEntryIds={newEntryIds}
              voiceReadingEnabled={voiceReadingEnabled}
              highlightedSourceId={highlightedSourceId}
              onCitationHover={handleCitationHover}
              onVisibleRoundChange={handleVisibleRoundChange}
              onPlaybackActiveChange={handlePlaybackActiveChange}
            />
            <SourceRail
              sources={sources}
              highlightedSourceId={highlightedSourceId}
              onSourceHover={setHighlightedSourceId}
            />
          </div>
          {isCompleted && !playbackActive && effectiveDebate && (
            <WinnerPanel
              debate={effectiveDebate}
              onPickWinner={handlePickWinner}
              onNewDebate={handleNewDebate}
            />
          )}
        </div>
      )}
    </div>
  )
}
