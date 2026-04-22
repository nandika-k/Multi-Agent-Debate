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
    <section className="composer-panel">
      <h1 className="pick-topic-heading" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
        Lock the Resolution
      </h1>

      <div className="scroll-banner" style={{ maxWidth: "680px" }}>
        <label className="field">
          <span>Final resolution — edit before confirming</span>
          <textarea
            rows={6}
            value={resolution}
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
      </div>

      <p style={{ color: "rgba(255,255,255,0.85)", margin: "0.75rem 0 0", fontSize: "0.9rem" }}>
        {formatStatus(debate.status)}
      </p>

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
