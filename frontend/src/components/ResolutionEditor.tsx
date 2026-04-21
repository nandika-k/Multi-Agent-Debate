import { formatStatus } from "../formatters";
import type { DebateScope, DebateSummary } from "../types";

interface ResolutionEditorProps {
  debate: DebateSummary;
  scope: DebateScope | null;
  resolution: string;
  busyAction: string | null;
  onResolutionChange: (value: string) => void;
  onConfirm: () => void;
  onStart: () => void;
}

function buildScopeItems(scope: DebateScope | null): string[] {
  if (!scope) {
    return [];
  }

  return [
    scope.jurisdiction ? `Jurisdiction: ${scope.jurisdiction}` : null,
    scope.timeframe ? `Timeframe: ${scope.timeframe}` : null,
    scope.target_population ? `Population: ${scope.target_population}` : null,
    ...scope.definitions.map((definition) => `Definition: ${definition}`),
  ].filter((item): item is string => Boolean(item));
}

export function ResolutionEditor({
  debate,
  scope,
  resolution,
  busyAction,
  onResolutionChange,
  onConfirm,
  onStart,
}: ResolutionEditorProps) {
  const scopeItems = buildScopeItems(scope);
  const canStart = debate.status === "ready";

  return (
    <section className="panel resolution-panel">
      <div className="panel-heading">
        <span className="eyebrow">Resolution workshop</span>
        <h2>Lock the framing before the agents begin.</h2>
        <p>{formatStatus(debate.status)}</p>
      </div>

      <label className="field">
        <span>Final resolution</span>
        <textarea
          value={resolution}
          rows={6}
          onChange={(event) => onResolutionChange(event.target.value)}
        />
      </label>

      {scopeItems.length > 0 ? (
        <div className="scope-grid" aria-label="Debate scope">
          {scopeItems.map((item) => (
            <span className="scope-pill" key={item}>
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div className="resolution-actions">
        <button
          className="secondary-button"
          disabled={busyAction === "confirm" || !resolution.trim()}
          onClick={onConfirm}
        >
          {busyAction === "confirm" ? "Confirming..." : "Confirm resolution"}
        </button>
        <button
          className="primary-button"
          disabled={!canStart || busyAction === "start"}
          onClick={onStart}
        >
          {busyAction === "start" ? "Launching..." : "Start debate"}
        </button>
      </div>
    </section>
  );
}
