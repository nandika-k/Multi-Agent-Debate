import { useEffect, useRef, useState } from 'react'

import type { SourceCard, TranscriptEntry as TEntry } from '../types'
import { RoundBadge } from './RoundBadge'

const CHARS_PER_TICK = 6
const TICK_MS = 16

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

interface Props {
  entry: TEntry
  sources: SourceCard[]
  isNew: boolean
  voiceReadingEnabled: boolean
  highlightedSourceId: string | null
  onCitationHover: (sourceId: string | null) => void
}

export function TranscriptEntry({
  entry,
  sources,
  isNew,
  voiceReadingEnabled,
  highlightedSourceId,
  onCitationHover,
}: Props) {
  const wasNewRef = useRef(isNew)
  const [displayedChars, setDisplayedChars] = useState(isNew ? 0 : entry.text.length)
  const [isTyping, setIsTyping] = useState(isNew)

  useEffect(() => {
    const wasNew = wasNewRef.current
    if (!wasNew) {
      setDisplayedChars(entry.text.length)
      setIsTyping(false)
      return
    }

    setDisplayedChars(0)
    setIsTyping(true)

    const id = setInterval(() => {
      setDisplayedChars(prev => {
        const next = Math.min(prev + CHARS_PER_TICK, entry.text.length)
        if (next >= entry.text.length) {
          clearInterval(id)
          setIsTyping(false)
        }
        return next
      })
    }, TICK_MS)

    return () => clearInterval(id)
  }, [entry.entry_id, entry.text.length])

  useEffect(() => {
    if (!voiceReadingEnabled) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      return
    }
    if (!wasNewRef.current) return
    if (!window.speechSynthesis) return

    const cleanText = entry.text.replace(/\[S\d+\]/g, '').trim()
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
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

    if (window.speechSynthesis.getVoices().length > 0) {
      applyVoice()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', applyVoice, { once: true } as EventListenerOptions)
    }

    window.speechSynthesis.speak(utterance)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [entry.entry_id, entry.side, entry.text, voiceReadingEnabled])

  const displayedText = entry.text.slice(0, displayedChars).replace(/\[S(\d+)\]/g, '[$1]')

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
