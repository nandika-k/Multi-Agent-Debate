import { useMemo } from 'react'
import { CrownIcon, ScalesIcon } from '@phosphor-icons/react'
import { BoxingGloveIcon } from './BoxingGloveIcon'
import type { DebateSide, DebateSummary } from '../types'
import { pickWinner } from '../api'

function ConfettiParticles() {
  const particles = useMemo(() => {
    const confettiColors = ['#dc2626', '#2563eb', '#f59e0b', '#22c55e', '#e879f9', '#fb923c']
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      delay: Math.random() * 1.5,
      duration: 1.2 + Math.random() * 1,
      size: 5 + Math.random() * 6,
    }))
  }, [])

  return (
    <div className="confetti-wrap" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

interface Props {
  debate: DebateSummary
  onPickWinner: (debate: DebateSummary) => void
  onNewDebate: () => void
}

export function WinnerPanel({ debate, onPickWinner, onNewDebate }: Props) {
  const winner = debate.winner_side

  async function handlePick(side: DebateSide) {
    try {
      const updated = await pickWinner(debate.debate_id, side)
      onPickWinner(updated)
    } catch {
      // ignore
    }
  }

  return (
    <div className={`winner-bar ${winner ?? 'neutral'}`}>
      {winner && <ConfettiParticles />}

      <div className="winner-bar-inner">
        {winner ? (
          <>
            <span className="winner-bar-crown"><CrownIcon size={28} weight="fill" /></span>
            <div className="winner-bar-text">
              <span className="winner-bar-label">WINNER BY DECISION</span>
              <span className={`winner-bar-name ${winner}`}>{winner.toUpperCase()}</span>
            </div>
          </>
        ) : (
          <>
            <ScalesIcon size={22} weight="fill" />
            <div className="winner-bar-text">
              <span className="winner-bar-label">DEBATE COMPLETE — WHO WON?</span>
            </div>
            <div className="winner-pick-buttons">
              <button className="btn-pick-pro" onClick={() => void handlePick('pro')}>
                <BoxingGloveIcon size={16} side="pro" /> PRO
              </button>
              <button className="btn-pick-con" onClick={() => void handlePick('con')}>
                CON <BoxingGloveIcon size={16} side="con" />
              </button>
            </div>
          </>
        )}

        <button className="winner-new-btn" onClick={onNewDebate}>
          + NEW DEBATE
        </button>
      </div>
    </div>
  )
}
