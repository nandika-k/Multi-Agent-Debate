import type { RoundType, SourceCard, TranscriptEntry } from '../types'
import { ChatFeed } from './ChatFeed'

interface Props {
  transcript: TranscriptEntry[]
  sources: SourceCard[]
  currentRound: RoundType | null
  newEntryIds: string[]
  voiceReadingEnabled: boolean
  highlightedSourceId: string | null
  onCitationHover: (sourceId: string | null) => void
}

function RopeSet({ variant }: { variant: 'pro' | 'con' }) {
  return (
    <div className="ring-ropes">
      {[0, 1, 2].map(i => (
        <div key={i} className={`rope-line ${variant}-ropes`} />
      ))}
    </div>
  )
}

export function BoxingRing({
  transcript,
  sources,
  currentRound,
  newEntryIds,
  voiceReadingEnabled,
  highlightedSourceId,
  onCitationHover,
}: Props) {
  return (
    <div className="ring-container">
      <RopeSet variant="pro" />
      <div className="ring-mat ring-mat--chat">
        <ChatFeed
          transcript={transcript}
          sources={sources}
          currentRound={currentRound}
          newEntryIds={newEntryIds}
          voiceReadingEnabled={voiceReadingEnabled}
          highlightedSourceId={highlightedSourceId}
          onCitationHover={onCitationHover}
        />
      </div>
      <RopeSet variant="con" />
    </div>
  )
}
