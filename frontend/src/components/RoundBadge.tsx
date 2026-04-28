import type { RoundType } from '../types'

const ROUND_LABELS: Record<RoundType, string> = {
  opening: '⚡ OPENING',
  crossfire_questions: '🔥 CROSSFIRE Q',
  crossfire_answers: '💥 CROSSFIRE A',
  rebuttal: '⚔️ REBUTTAL',
  closing: '🏁 CLOSING',
}

interface Props {
  roundType: RoundType | null
  size?: 'sm' | 'md'
}

export function RoundBadge({ roundType, size = 'sm' }: Props) {
  if (!roundType) {
    return (
      <span className={`round-badge idle ${size}`}>
        ○ STANDBY
      </span>
    )
  }

  return (
    <span className={`round-badge ${roundType} ${size}`}>
      {ROUND_LABELS[roundType]}
    </span>
  )
}
