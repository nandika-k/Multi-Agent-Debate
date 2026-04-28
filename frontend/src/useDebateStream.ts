import { useState, useEffect, useRef, useCallback } from 'react'
import { getDebate } from './api'
import type { DebateSummary, TranscriptEntry, SourceCard, DebateEvent, RoundType } from './types'

interface StreamState {
  debate: DebateSummary | null
  transcript: TranscriptEntry[]
  sources: SourceCard[]
  currentRound: RoundType | null
  lastEvent: DebateEvent | null
  isStreaming: boolean
  newEntryIds: string[]
}

export function useDebateStream(debateId: string | null) {
  const [state, setState] = useState<StreamState>({
    debate: null,
    transcript: [],
    sources: [],
    currentRound: null,
    lastEvent: null,
    isStreaming: false,
    newEntryIds: [],
  })

  const esRef = useRef<EventSource | null>(null)
  const fetchingRef = useRef(false)
  const seenEntriesRef = useRef<Set<string>>(new Set())

  const fetchDetail = useCallback(async (id: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const detail = await getDebate(id)
      const newIds: string[] = []
      for (const entry of detail.transcript) {
        if (!seenEntriesRef.current.has(entry.entry_id)) {
          seenEntriesRef.current.add(entry.entry_id)
          newIds.push(entry.entry_id)
        }
      }
      setState(prev => ({
        ...prev,
        debate: detail.debate,
        transcript: detail.transcript,
        sources: detail.sources,
        newEntryIds: newIds,
      }))
    } catch {
      // silently ignore fetch errors during stream
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!debateId) return

    seenEntriesRef.current = new Set()
    setState({
      debate: null,
      transcript: [],
      sources: [],
      currentRound: null,
      lastEvent: null,
      isStreaming: true,
      newEntryIds: [],
    })

    void fetchDetail(debateId)

    const es = new EventSource(`/api/debates/${debateId}/stream`)
    esRef.current = es

    es.onmessage = (evt: MessageEvent) => {
      const event = JSON.parse(evt.data as string) as DebateEvent

      setState(prev => ({
        ...prev,
        lastEvent: event,
        currentRound: event.round_type ?? prev.currentRound,
      }))

      if (event.entry_id || event.event_type === 'round_completed' || event.event_type === 'sources_collected' || event.event_type === 'packets_ready') {
        void fetchDetail(debateId)
      }

      if (event.event_type === 'debate_completed' || event.event_type === 'debate_failed') {
        void fetchDetail(debateId)
        setState(prev => ({ ...prev, isStreaming: false }))
        es.close()
      }

      if (event.winner_side) {
        setState(prev => ({
          ...prev,
          debate: prev.debate
            ? { ...prev.debate, winner_side: event.winner_side }
            : prev.debate,
        }))
      }
    }

    es.onerror = () => {
      setState(prev => ({ ...prev, isStreaming: false }))
      es.close()
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [debateId, fetchDetail])

  return state
}
