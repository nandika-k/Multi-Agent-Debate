import { formatRoundType, formatStatus, formatTimestamp } from "../formatters";
import type { DebateEvent, DebateSummary } from "../types";

interface StatusBannerProps {
  debate: DebateSummary;
  streamState: "idle" | "connecting" | "live" | "disconnected";
  currentEvent: DebateEvent | null;
}

export function RibbonBanner({ text }: { text: string }) {
  return (
    <div aria-label={text} className="ribbon-banner" role="img">
      <img
        alt=""
        aria-hidden="true"
        className="ribbon-banner__img"
        src="/images/round_banner.png"
      />
      <span aria-hidden="true" className="ribbon-banner__text">
        {text}
      </span>
    </div>
  );
}

export function StatusBanner({ debate, streamState, currentEvent }: StatusBannerProps) {
  const roundTitle = currentEvent?.round_type
    ? `Round: ${formatRoundType(currentEvent.round_type)}`
    : "Debate in Progress";

  return (
    <section className="ribbon-banner-wrap">
      <RibbonBanner text={roundTitle} />

      <dl className="status-metrics">
        <div className="status-metric-pill">
          <dt>Status</dt>
          <dd>{formatStatus(debate.status)}</dd>
        </div>
        <div className="status-metric-pill">
          <dt>Stream</dt>
          <dd>{streamState}</dd>
        </div>
        <div className="status-metric-pill">
          <dt>Started</dt>
          <dd>{formatTimestamp(debate.started_at)}</dd>
        </div>
        <div className="status-metric-pill">
          <dt>Updated</dt>
          <dd>{formatTimestamp(debate.updated_at)}</dd>
        </div>
      </dl>
    </section>
  );
}
