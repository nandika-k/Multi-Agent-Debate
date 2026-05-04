import { useEffect, useMemo, useRef, useState } from 'react'

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
  const seenIdsRef = useRef<Set<string>>(new Set())
  const [revealedIds, setRevealedIds] = useState<string[]>([])
  const [queuedIds, setQueuedIds] = useState<string[]>([])
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (transcript.length === 0) {
      seenIdsRef.current = new Set()
      setRevealedIds([])
      setQueuedIds([])
      setActiveEntryId(null)
      return
    }

    const transcriptIds = transcript.map(entry => entry.entry_id)
    const transcriptIdSet = new Set(transcriptIds)
    const incomingNewIds = new Set(newEntryIds)

    seenIdsRef.current = new Set([...seenIdsRef.current].filter(id => transcriptIdSet.has(id)))

    const existingIds = transcriptIds.filter(id => !incomingNewIds.has(id))
    const unseenExistingIds = existingIds.filter(id => !seenIdsRef.current.has(id))

    if (unseenExistingIds.length > 0) {
      unseenExistingIds.forEach(id => seenIdsRef.current.add(id))
      setRevealedIds(prev => {
        const merged = new Set(prev)
        unseenExistingIds.forEach(id => merged.add(id))
        return transcriptIds.filter(id => merged.has(id))
      })
    }

    const unseenNewIds = transcriptIds.filter(id => incomingNewIds.has(id) && !seenIdsRef.current.has(id))
    if (unseenNewIds.length === 0) return

    unseenNewIds.forEach(id => seenIdsRef.current.add(id))

    if (!voiceReadingEnabled) {
      setRevealedIds(prev => {
        const merged = new Set(prev)
        unseenNewIds.forEach(id => merged.add(id))
        return transcriptIds.filter(id => merged.has(id))
      })
      return
    }

    setQueuedIds(prev => {
      const merged = [...prev]
      for (const id of unseenNewIds) {
        if (id !== activeEntryId && !merged.includes(id)) {
          merged.push(id)
        }
      }
      return merged
    })
  }, [activeEntryId, newEntryIds, transcript, voiceReadingEnabled])

  useEffect(() => {
    if (!voiceReadingEnabled) {
      setQueuedIds([])
      setActiveEntryId(null)
      setRevealedIds(transcript.map(entry => entry.entry_id))
      return
    }

    if (activeEntryId || queuedIds.length === 0) return

    const nextId = queuedIds[0]
    setQueuedIds(prev => prev.slice(1))
    setActiveEntryId(nextId)
    setRevealedIds(prev => {
      const merged = new Set(prev)
      merged.add(nextId)
      return transcript.map(entry => entry.entry_id).filter(id => merged.has(id))
    })
  }, [activeEntryId, queuedIds, transcript, voiceReadingEnabled])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [revealedIds.length, activeEntryId])

  const visibleEntries = useMemo(() => {
    const revealedSet = new Set(revealedIds)
    return transcript.filter(entry => revealedSet.has(entry.entry_id))
  }, [revealedIds, transcript])

  return (
    <div className="chat-feed">
      {visibleEntries.length === 0 ? (
        <div className="chat-empty">
          <span className="chat-empty-icon">READY</span>
          <span>{currentRound ? 'Round in progress...' : 'Waiting for fighters...'}</span>
        </div>
      ) : (
        visibleEntries.map(entry => (
          <div key={entry.entry_id} className={`chat-row ${entry.side}`}>
            <div className="chat-side-label">
              {entry.side.toUpperCase()}
            </div>
            <TranscriptEntry
              entry={entry}
              sources={sources}
              shouldAnimate={activeEntryId === entry.entry_id}
              voiceReadingEnabled={voiceReadingEnabled}
              highlightedSourceId={highlightedSourceId}
              onCitationHover={onCitationHover}
              onPlaybackComplete={entryId => {
                if (activeEntryId === entryId) {
                  setActiveEntryId(null)
                }
              }}
            />
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
