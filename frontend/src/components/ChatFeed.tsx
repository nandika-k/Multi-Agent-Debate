import { useEffect, useRef } from 'react'

import type { RoundType, SourceCard, TranscriptEntry as TEntry } from '../types'
import { TranscriptEntry } from './TranscriptEntry'

interface Props {
  transcript: TEntry[]
  sources: SourceCard[]
  currentRound: RoundType | null
  newEntryIds: string[]
  voiceReadingEnabled: boolean
  highlightedSourceId: string | null
  onCitationHover: (sourceId: string | null) => void
}

export function ChatFeed({
  transcript,
  sources,
  currentRound,
  newEntryIds,
  voiceReadingEnabled,
  highlightedSourceId,
  onCitationHover,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript.length])

  return (
    <div className="chat-feed">
      {transcript.length === 0 ? (
        <div className="chat-empty">
          <span className="chat-empty-icon">READY</span>
          <span>{currentRound ? 'Round in progress...' : 'Waiting for fighters...'}</span>
        </div>
      ) : (
        transcript.map(entry => (
          <div key={entry.entry_id} className={`chat-row ${entry.side}`}>
            <div className="chat-side-label">
              {entry.side.toUpperCase()}
            </div>
            <TranscriptEntry
              entry={entry}
              sources={sources}
              isNew={newEntryIds.includes(entry.entry_id)}
              voiceReadingEnabled={voiceReadingEnabled}
              highlightedSourceId={highlightedSourceId}
              onCitationHover={onCitationHover}
            />
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
