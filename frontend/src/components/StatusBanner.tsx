import { formatRoundType, formatStatus, formatTimestamp } from "../formatters";
import type { DebateEvent, DebateSummary } from "../types";

interface StatusBannerProps {
  debate: DebateSummary;
  streamState: "idle" | "connecting" | "live" | "disconnected";
  currentEvent: DebateEvent | null;
}

export function StatusBanner({ debate, streamState, currentEvent }: StatusBannerProps) {
  const bannerTitle = currentEvent?.round_type
    ? `Round update: ${formatRoundType(currentEvent.round_type)}`
    : "Round 1: Opening statement";

  return (
    <section className="status-banner">
      <div>
        <span className="eyebrow">Page 3 adapted into a live control bar</span>
        <h2>{bannerTitle}</h2>
        <p>{formatStatus(debate.status)}</p>
      </div>
      <dl className="status-metrics">
        <div>
          <dt>Stream</dt>
          <dd>{streamState}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatTimestamp(debate.started_at)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatTimestamp(debate.updated_at)}</dd>
        </div>
      </dl>
    </section>
  );
}
