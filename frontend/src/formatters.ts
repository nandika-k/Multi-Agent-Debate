import type { DebateEvent, DebateSide, DebateStatus, RoundType, SourceCard } from "./types";

const ROUND_LABELS: Record<RoundType, string> = {
  opening: "Opening statement",
  crossfire_questions: "Crossfire question",
  crossfire_answers: "Crossfire answer",
  rebuttal: "Rebuttal",
  closing: "Closing statement",
};

const STATUS_LABELS: Record<DebateStatus, string> = {
  awaiting_confirmation: "Awaiting resolution confirmation",
  ready: "Ready to start",
  researching: "Researching evidence",
  in_progress: "Debate in progress",
  completed: "Debate completed",
  failed: "Run failed",
};

export function formatRoundType(roundType: RoundType | null): string {
  return roundType ? ROUND_LABELS[roundType] : "Debate update";
}

export function formatStatus(status: DebateStatus): string {
  return STATUS_LABELS[status];
}

export function formatSide(side: DebateSide | null): string {
  if (!side) {
    return "Neutral";
  }
  return side === "pro" ? "Pro" : "Con";
}

export function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Not yet";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function eventDescription(event: DebateEvent): string {
  switch (event.event_type) {
    case "debate_created":
      return "Topic submitted and the initial resolution draft was created.";
    case "resolution_confirmed":
      return "The final resolution was locked in for the debate.";
    case "research_started":
      return "The research pass began.";
    case "sources_collected":
      return "Shared sources were collected for both sides.";
    case "packets_ready":
      return "Evidence packets were split into pro and con positions.";
    case "round_started":
      return `${formatSide(event.side)} is preparing the ${formatRoundType(event.round_type)}.`;
    case "round_completed":
      return `${formatSide(event.side)} completed the ${formatRoundType(event.round_type)}.`;
    case "debate_completed":
      return "All rounds completed successfully.";
    case "debate_failed":
      return event.error ?? "The debate run failed.";
    case "winner_selected":
      return `${formatSide(event.winner_side)} was selected as the winner.`;
    default:
      return "Debate update received.";
  }
}

export function sourceAccent(source: SourceCard): "pro" | "con" | "neutral" {
  if (source.source_type === "primary" || source.source_type === "data") {
    return "pro";
  }
  if (source.source_type === "analysis") {
    return "con";
  }
  return "neutral";
}
