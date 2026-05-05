import type { RoundType } from '../types'
import { ArenaBang, ArenaFire, ArenaLightning } from './ArenaIcons'

interface Props {
  roundType: RoundType | null
  size?: 'sm' | 'md'
}

function roundIconSize(size: 'sm' | 'md') {
  return size === 'md' ? 16 : 14
}

function roundLabel(roundType: RoundType): string {
  switch (roundType) {
    case 'opening':
      return 'OPENING'
    case 'crossfire_questions':
      return 'CROSSFIRE Q'
    case 'crossfire_answers':
      return 'CROSSFIRE A'
    case 'rebuttal':
      return 'REBUTTAL'
    case 'closing':
      return 'CLOSING'
  }
}

export function RoundBadge({ roundType, size = 'sm' }: Props) {
  if (!roundType) {
    return (
      <span className={`round-badge idle ${size}`}>
        STANDBY
      </span>
    )
  }

  const iconSize = roundIconSize(size)

  return (
    <span className={`round-badge ${roundType} ${size}`}>
      {roundType === 'opening' && <ArenaLightning size={iconSize} />}
      {roundType === 'crossfire_questions' && <ArenaFire size={iconSize} />}
      {roundType === 'crossfire_answers' && <ArenaBang size={iconSize} />}
      {roundLabel(roundType)}
    </span>
  )
}
