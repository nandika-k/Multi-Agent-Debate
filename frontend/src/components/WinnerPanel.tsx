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
        <span className="eyebrow">Page 6 adapted into the finish state</span>
        <h2>Choose the winner</h2>
        <p>
          The debate is finished. Pick the side that argued the case best, or review the transcript
          and evidence again before deciding.
        </p>
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
              {isWinner ? `${formatSide(side)} selected` : `Select ${formatSide(side)}`}
            </button>
          );
        })}
      </div>

      {winner ? (
        <div className="winner-summary">
          <strong>{formatSide(winner)} wins.</strong>
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
