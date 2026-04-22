import { formatSide } from "../formatters";
import type { DebateSide, DebateSummary } from "../types";

interface WinnerPanelProps {
  debate: DebateSummary;
  busyAction: string | null;
  onPickWinner: (winnerSide: DebateSide) => void;
}

export function WinnerPanel({ debate, busyAction, onPickWinner }: WinnerPanelProps) {
  const winner = debate.winner_side;

  return (
    <section className="panel winner-panel">
      <div className="panel-heading">
        <h2>Choose the Winner</h2>
        <p>Pick the side that argued the case best.</p>
      </div>

      <div className="winner-actions">
        {(["pro", "con"] as const).map((side) => {
          const isWinner = winner === side;
          return (
            <button
              className={`winner-button winner-button--${side} ${isWinner ? "is-selected" : ""}`}
              disabled={busyAction === "winner" || winner !== null}
              key={side}
              onClick={() => onPickWinner(side)}
            >
              {isWinner ? `${formatSide(side)} wins!` : `Select ${formatSide(side)}`}
            </button>
          );
        })}
      </div>

      {winner ? (
        <div className="winner-summary">
          <strong>{formatSide(winner)} wins the debate.</strong>
          {debate.winning_animation_state ? (
            <p>
              Animation: {debate.winning_animation_state.animation} with{" "}
              {debate.winning_animation_state.winner_pose}.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
