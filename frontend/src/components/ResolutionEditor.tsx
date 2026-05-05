import { useState } from 'react'
import { confirmResolution, startDebate } from '../api'
import type { DebateSummary } from '../types'

interface Props {
  debate: DebateSummary
  onConfirmed: (debate: DebateSummary) => void
  onCancel: () => void
}

export function ResolutionEditor({ debate, onConfirmed, onCancel }: Props) {
  const [resolution, setResolution] = useState(debate.resolution_draft)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    const trimmed = resolution.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      await confirmResolution(debate.debate_id, trimmed)
      const started = await startDebate(debate.debate_id)
      onConfirmed(started)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="resolution-editor">
      <div className="resolution-card">
        <div className="resolution-card-header">
          <span style={{ fontSize: 28 }}>📋</span>
          <h2 className="resolution-card-title">RESOLUTION REVIEW</h2>
        </div>

        <div>
          <div className="resolution-label">Original Topic</div>
          <div className="resolution-topic-display">{debate.topic_raw}</div>
        </div>

        <div>
          <div className="resolution-label">Formal Resolution</div>
          <textarea
            className="resolution-textarea"
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            disabled={loading}
            rows={4}
            placeholder="Edit the resolution…"
          />
          <div className="resolution-hint">
            <span>✏️</span>
            <span>The AI drafted this resolution from your topic. Edit it or accept as-is.</span>
          </div>
        </div>

        {error && (
          <div className="composer-error">⚠️ {error}</div>
        )}

        <div className="resolution-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            ← BACK
          </button>
          <button
            className="btn-confirm"
            onClick={() => void handleConfirm()}
            disabled={loading || !resolution.trim()}
          >
            {loading ? '⏳ STARTING…' : '🥊 START DEBATE'}
          </button>
        </div>
      </div>
    </div>
  )
}
