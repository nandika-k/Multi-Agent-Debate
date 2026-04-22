import { formatRoundType, formatStatus, formatTimestamp } from "../formatters";
import type { DebateEvent, DebateSummary } from "../types";

interface StatusBannerProps {
  debate: DebateSummary;
  streamState: "idle" | "connecting" | "live" | "disconnected";
  currentEvent: DebateEvent | null;
}

function RibbonBanner({ text }: { text: string }) {
  return (
    <svg
      aria-label={text}
      fill="none"
      overflow="visible"
      style={{ maxWidth: "100%", height: "auto" }}
      viewBox="0 0 700 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left ribbon tail - lower fold */}
      <path
        d="M 90 95 Q 55 105 10 120 Q 40 90 10 62 Q 55 72 90 80 Z"
        fill="#c4a26a"
        stroke="#3d2000"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      {/* Right ribbon tail - lower fold */}
      <path
        d="M 610 95 Q 645 105 690 120 Q 660 90 690 62 Q 645 72 610 80 Z"
        fill="#c4a26a"
        stroke="#3d2000"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      {/* Main ribbon body - arcs upward in the center */}
      <path
        d="M 90 80
           Q 200 25, 350 32
           Q 500 25, 610 80
           Q 500 120, 350 112
           Q 200 120, 90 80
           Z"
        fill="#f5e6c8"
        stroke="#3d2000"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      {/* Left ribbon tail - upper fold */}
      <path
        d="M 90 80 Q 55 72 10 62 Q 42 75 30 90 Q 55 84 90 88 Z"
        fill="#e0c898"
        stroke="#3d2000"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      {/* Right ribbon tail - upper fold */}
      <path
        d="M 610 80 Q 645 72 690 62 Q 658 75 670 90 Q 645 84 610 88 Z"
        fill="#e0c898"
        stroke="#3d2000"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      {/* Banner text */}
      <text
        dominantBaseline="middle"
        fontFamily="'Bangers', 'Impact', cursive"
        fontSize="34"
        letterSpacing="3"
        textAnchor="middle"
        x="350"
        y="72"
      >
        {text}
      </text>
    </svg>
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
