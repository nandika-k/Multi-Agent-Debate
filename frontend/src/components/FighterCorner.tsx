import { useRef, useEffect } from 'react'
import { BoxingGloveIcon } from './BoxingGloveIcon'
import type { DebateSide, TranscriptEntry as TEntry, SourceCard, RoundType } from '../types'
import { TranscriptEntry } from './TranscriptEntry'

interface Props {
  side: DebateSide
  transcript: TEntry[]
  sources: SourceCard[]
  currentRound: RoundType | null
  activeSide: DebateSide | null
  newEntryIds: string[]
  voiceReadingEnabled: boolean
  highlightedSourceId: string | null
  onCitationHover: (sourceId: string | null) => void
}

const CORNER_LABELS: Record<DebateSide, string> = { pro: 'PRO', con: 'CON' }
const EMPTY_QUIPS: Record<DebateSide, string> = {
  pro: 'Red corner warming up…',
  con: 'Blue corner warming up…',
}

export function FighterCorner({
  side,
  transcript,
  sources,
  currentRound,
  activeSide,
  newEntryIds,
  voiceReadingEnabled,
  highlightedSourceId,
  onCitationHover,
}: Props) {
  const entries = transcript.filter(e => e.side === side)
  const isActive = activeSide === side || (currentRound !== null && entries.length > 0 && entries[entries.length - 1].round_type === currentRound)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className={`fighter-corner ${side}`}>
      <div className="corner-header">
        <span className="corner-gloves"><BoxingGloveIcon size={18} side={side} /></span>
        <span className="corner-label">{CORNER_LABELS[side]}</span>
        {isActive && entries.length > 0 && (
          <span className="active-badge">SPEAKING</span>
        )}
      </div>

      <div className="corner-transcript">
        {entries.length === 0 ? (
          <div className="corner-empty">
            <span className={`corner-empty-dot ${side}`} />
            <span>{EMPTY_QUIPS[side]}</span>
          </div>
        ) : (
          entries.map(entry => (
            <TranscriptEntry
              key={entry.entry_id}
              entry={entry}
              sources={sources}
              shouldAnimate={newEntryIds.includes(entry.entry_id)}
              voiceReadingEnabled={voiceReadingEnabled}
              highlightedSourceId={highlightedSourceId}
              onCitationHover={onCitationHover}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
