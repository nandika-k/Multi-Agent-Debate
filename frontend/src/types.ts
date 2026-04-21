export type DebateStatus =
  | "awaiting_confirmation"
  | "ready"
  | "researching"
  | "in_progress"
  | "completed"
  | "failed";

export type DebateSide = "pro" | "con";

export type SourceType = "news" | "primary" | "data" | "research" | "analysis";

export type RoundType =
  | "opening"
  | "crossfire_questions"
  | "crossfire_answers"
  | "rebuttal"
  | "closing";

export type EventType =
  | "debate_created"
  | "resolution_confirmed"
  | "research_started"
  | "sources_collected"
  | "packets_ready"
  | "round_started"
  | "round_completed"
  | "debate_completed"
  | "debate_failed"
  | "winner_selected";

export interface DebateScope {
  jurisdiction: string | null;
  timeframe: string | null;
  target_population: string | null;
  definitions: string[];
}

export interface WinningAnimationState {
  animation: string;
  winner_pose: string;
  loser_pose: string;
}

export interface DebateSummary {
  debate_id: string;
  topic_raw: string;
  resolution_draft: string;
  resolution_final: string | null;
  status: DebateStatus;
  winner_side: DebateSide | null;
  winning_animation_state: WinningAnimationState | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceCard {
  source_id: string;
  title: string;
  url: string;
  publisher: string;
  published_at: string | null;
  source_type: SourceType;
  summary: string;
  supporting_snippets: string[];
  trust_score: number;
  relevance_score: number;
  recency_score: number;
  body_excerpt: string | null;
}

export interface EvidencePacket {
  packet_id: string;
  side: DebateSide;
  resolution: string;
  source_ids: string[];
  key_claims: string[];
}

export interface TranscriptEntry {
  entry_id: string;
  round_type: RoundType;
  side: DebateSide;
  text: string;
  citations: string[];
  char_count: number;
  created_at: string;
}

export interface DebateEvent {
  event_id: number | null;
  debate_id: string;
  event_type: EventType;
  created_at: string;
  status: DebateStatus | null;
  round_type: RoundType | null;
  side: DebateSide | null;
  entry_id: string | null;
  winner_side: DebateSide | null;
  error: string | null;
  resolution_final: string | null;
  animation_state: WinningAnimationState | null;
  metadata: Record<string, unknown>;
}

export interface DebateDetailResponse {
  debate: DebateSummary;
  scope: DebateScope;
  packets: EvidencePacket[];
  transcript: TranscriptEntry[];
  sources: SourceCard[];
  events: DebateEvent[];
}

export interface SourceDetailResponse {
  debate_id: string;
  source: SourceCard;
  used_by_sides: DebateSide[];
}

export type AppView = "topic" | "resolution" | "running" | "completed";
