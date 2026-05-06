import { useState, type FormEvent } from 'react'
import { HourglassIcon } from '@phosphor-icons/react'
import { ArenaBang } from './ArenaIcons'
import { Icons8Bell } from './Icons8Bell'
import { BoxingGloveIcon } from './BoxingGloveIcon'
import { createDebate } from '../api'
import type { DebateSummary } from '../types'

interface Props {
  onDebateCreated: (debate: DebateSummary) => void
}

const TOPIC_SUGGESTIONS = [
  'Social media does more harm than good',
  'GMOs are safe and beneficial for society',
  'College education should be free for everyone'
]

export function TopicComposer({ onDebateCreated }: Props) {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = topic.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      const debate = await createDebate(trimmed)
      onDebateCreated(debate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create debate. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function useSuggestion(s: string) {
    setTopic(s)
  }

  return (
    <div className="topic-composer">
      {/* Decorative ring art */}
      <div className="composer-ring-art" aria-hidden="true">
        <div className="art-post left" />
        <div className="art-post right" />
        <div className="art-rope" style={{ bottom: 100 }} />
        <div className="art-rope" style={{ bottom: 86 }} />
        <div className="art-rope" style={{ bottom: 72 }} />
        <div className="art-mat" />
        <div className="art-fighters">
          <span className="art-fighter-pro"><BoxingGloveIcon size={28} side="pro" /></span>
          <span className="art-fighter-con"><BoxingGloveIcon size={28} side="con" /></span>
        </div>
      </div>

      <h1 className="composer-title">
        <span className="word-debate">COUNTER</span>
      </h1>
      <p className="composer-subtitle">AI-Powered Debate • Enter the Ring</p>

      <form className="composer-form" onSubmit={e => void handleSubmit(e)}>
        <div className="composer-input-wrap">
          <input
            className="composer-input"
            type="text"
            placeholder="Enter a debate topic…"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            disabled={loading}
            maxLength={300}
            autoFocus
          />
        </div>

        <button className="composer-btn" type="submit" disabled={loading || !topic.trim()}>
          {loading ? <><HourglassIcon size={16} /> CREATING…</> : <><Icons8Bell size={16} color="#F5A623" /> DING DING!</>}
        </button>

        {error && <div className="composer-error"><ArenaBang size={15} /> {error}</div>}
      </form>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginTop: 12,
          maxWidth: 600,
        }}
      >
        {TOPIC_SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => useSuggestion(s)}
            disabled={loading}
            style={{
              padding: '5px 12px',
              background: 'transparent',
              border: '2px solid rgba(0,0,0,0.22)',
              borderRadius: '999px',
              color: 'var(--text-mid)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'none',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-bright)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.40)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-mid)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.22)'
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
