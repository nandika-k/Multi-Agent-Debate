import { useEffect, useMemo, useRef, useState } from 'react'

import type { SourceCard, TranscriptEntry as TEntry } from '../types'
import { RoundBadge } from './RoundBadge'

const CHARS_PER_TICK = 6
const TICK_MS = 16
const FALLBACK_CHARS_PER_SECOND = 16
const FALLBACK_CHARS_PER_TICK = Math.max(1, Math.ceil(FALLBACK_CHARS_PER_SECOND * (TICK_MS / 1000)))

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

function formatCitationLabel(sourceId: string): string {
  return sourceId.match(/\d+/)?.[0] ?? sourceId
}

function buildSpeechSyncState(rawText: string) {
  const citationPattern = /\[S(\d+)\]/g
  let cleanText = ''
  let displayText = ''
  const charMap: number[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = citationPattern.exec(rawText)) !== null) {
    const segment = rawText.slice(cursor, match.index)
    for (const char of segment) {
      cleanText += char
      displayText += char
      charMap.push(displayText.length)
    }

    displayText += `[${match[1]}]`
    cursor = match.index + match[0].length
  }

  const trailing = rawText.slice(cursor)
  for (const char of trailing) {
    cleanText += char
    displayText += char
    charMap.push(displayText.length)
  }

  return { cleanText: cleanText.trim(), displayText, charMap }
}

interface Props {
  entry: TEntry
  sources: SourceCard[]
  shouldAnimate: boolean
  voiceReadingEnabled: boolean
  highlightedSourceId: string | null
  onCitationHover: (sourceId: string | null) => void
  onPlaybackComplete?: (entryId: string) => void
}

export function TranscriptEntry({
  entry,
  sources,
  shouldAnimate,
  voiceReadingEnabled,
  highlightedSourceId,
  onCitationHover,
  onPlaybackComplete,
}: Props) {
  const speechState = useMemo(() => buildSpeechSyncState(entry.text), [entry.text])
  const [displayedChars, setDisplayedChars] = useState(shouldAnimate ? 0 : speechState.displayText.length)
  const [isTyping, setIsTyping] = useState(shouldAnimate)
  const onPlaybackCompleteRef = useRef(onPlaybackComplete)
  useEffect(() => { onPlaybackCompleteRef.current = onPlaybackComplete })

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedChars(speechState.displayText.length)
      setIsTyping(false)
      return
    }

    if (!voiceReadingEnabled) {
      setDisplayedChars(0)
      setIsTyping(true)

      const id = setInterval(() => {
        setDisplayedChars(prev => {
          const next = Math.min(prev + CHARS_PER_TICK, speechState.displayText.length)
          if (next >= speechState.displayText.length) {
            clearInterval(id)
            setIsTyping(false)
            onPlaybackCompleteRef.current?.(entry.entry_id)
          }
          return next
        })
      }, TICK_MS)

      return () => clearInterval(id)
    }

    if (!window.speechSynthesis || !speechState.cleanText) {
      setDisplayedChars(speechState.displayText.length)
      setIsTyping(false)
      onPlaybackComplete?.(entry.entry_id)
      return
    }

    let cancelled = false
    let boundarySeen = false
    let fallbackTimer: number | null = null

    setDisplayedChars(0)
    setIsTyping(true)
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(speechState.cleanText)
    utterance.rate = 0.92
    utterance.pitch = entry.side === 'pro' ? 0.82 : 1.18

    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      const picked = voices.find(v =>
        entry.side === 'pro'
          ? /male|david|mark|guy|james/i.test(v.name)
          : /female|zira|susan|samantha|karen/i.test(v.name)
      )
      if (picked) utterance.voice = picked
    }

    const finish = () => {
      if (cancelled) return
      cancelled = true
      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer)
      }
      setDisplayedChars(speechState.displayText.length)
      setIsTyping(false)
      onPlaybackComplete?.(entry.entry_id)
    }

    utterance.onboundary = event => {
      if (event.name && event.name !== 'word' && event.name !== 'sentence') return
      boundarySeen = true
      const index = Math.max(0, Math.min(event.charIndex, speechState.charMap.length - 1))
      const nextChars = speechState.charMap[index] ?? speechState.displayText.length
      setDisplayedChars(prev => Math.max(prev, nextChars))
    }

    utterance.onend = finish
    utterance.onerror = finish

    if (window.speechSynthesis.getVoices().length > 0) {
      applyVoice()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', applyVoice, { once: true } as EventListenerOptions)
    }

    window.speechSynthesis.speak(utterance)

    fallbackTimer = window.setInterval(() => {
      if (boundarySeen) return
      setDisplayedChars(prev => {
        const next = Math.min(prev + FALLBACK_CHARS_PER_TICK, speechState.displayText.length)
        return next
      })
    }, TICK_MS)

    return () => {
      cancelled = true
      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer)
      }
      window.speechSynthesis.cancel()
    }
  }, [entry.entry_id, entry.side, shouldAnimate, speechState, voiceReadingEnabled])

  const displayedText = speechState.displayText.slice(0, displayedChars)

  return (
    <div className={`transcript-entry ${entry.side} ${isTyping ? 'typing' : ''}`}>
      <div className="entry-meta">
        <RoundBadge roundType={entry.round_type} />
        <span className="entry-time">{formatTime(entry.created_at)}</span>
      </div>

      <div className="entry-text">
        {displayedText}
        {isTyping && <span className="typing-cursor" aria-hidden="true" />}
      </div>

      {entry.citations.length > 0 && !isTyping && (
        <div className="entry-citations">
          {entry.citations.map(sourceId => {
            const source = sources.find(s => s.source_id === sourceId)
            return (
              <span
                key={sourceId}
                className={`citation-chip ${highlightedSourceId === sourceId ? 'highlighted' : ''}`}
                onMouseEnter={() => onCitationHover(sourceId)}
                onMouseLeave={() => onCitationHover(null)}
                title={source?.title ?? sourceId}
              >
                [{formatCitationLabel(sourceId)}] {source?.publisher ?? ''}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
