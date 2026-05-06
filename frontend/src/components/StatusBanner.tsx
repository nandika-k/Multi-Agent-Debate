import type { DebateStatus, RoundType } from '../types'
import { RoundBadge } from './RoundBadge'

const STATUS_LABELS: Record<DebateStatus, string> = {
  awaiting_confirmation: 'AWAITING CONFIRMATION',
  ready: 'READY',
  researching: 'RESEARCHING',
  in_progress: 'LIVE',
  completed: 'FINAL',
  failed: 'FAILED',
}

function getStatusClass(status: DebateStatus) {
  if (status === 'in_progress') return 'live'
  if (status === 'researching') return 'researching'
  if (status === 'failed') return 'failed'
  return ''
}

interface Props {
  topic: string | null
  status: DebateStatus | null
  currentRound: RoundType | null
  voiceReadingEnabled: boolean
  onToggleVoiceReading: () => void
}

export function StatusBanner({
  topic,
  status,
  currentRound,
  voiceReadingEnabled,
  onToggleVoiceReading,
}: Props) {
  const statusClass = status ? getStatusClass(status) : ''
  const statusLabel = status ? STATUS_LABELS[status] : 'COUNTER'

  return (
    <header className="status-banner">
      <div className="banner-brand">ARENA</div>

      <div className="banner-center">
        {topic && (
          <div className="banner-topic" title={topic}>
            {topic}
          </div>
        )}
        <div className="banner-status-row">
          <span className={`status-dot ${statusClass}`} />
          <span className={`status-label ${statusClass}`}>{statusLabel}</span>
          {currentRound && <RoundBadge roundType={currentRound} />}
        </div>
      </div>

      <div className="banner-right">
        <button
          type="button"
          className={`voice-toggle ${voiceReadingEnabled ? 'active' : ''}`}
          onClick={onToggleVoiceReading}
          aria-pressed={voiceReadingEnabled}
          title={voiceReadingEnabled ? 'Turn voice reading off' : 'Turn voice reading on'}
        >
          {voiceReadingEnabled ? 'VOICE ON' : 'VOICE OFF'}
        </button>
      </div>
    </header>
  )
}
