import type {
  DebateDetailResponse,
  DebateSide,
  DebateSummary,
  SourceDetailResponse,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (/^https?:\/\//.test(API_BASE)) {
    return `${API_BASE}${normalizedPath}`;
  }
  return `${API_BASE}${normalizedPath}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Ignore JSON parsing errors and fall back to the status message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function createDebate(topic: string): Promise<DebateSummary> {
  return apiRequest<DebateSummary>("/debates", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

export function getDebate(debateId: string): Promise<DebateDetailResponse> {
  return apiRequest<DebateDetailResponse>(`/debates/${debateId}`);
}

export function confirmResolution(debateId: string, resolution: string): Promise<DebateSummary> {
  return apiRequest<DebateSummary>(`/debates/${debateId}/confirm-resolution`, {
    method: "POST",
    body: JSON.stringify({ resolution }),
  });
}

export function startDebate(debateId: string): Promise<DebateSummary> {
  return apiRequest<DebateSummary>(`/debates/${debateId}/start`, {
    method: "POST",
  });
}

export function pickWinner(debateId: string, winnerSide: DebateSide): Promise<DebateSummary> {
  return apiRequest<DebateSummary>(`/debates/${debateId}/winner`, {
    method: "POST",
    body: JSON.stringify({ winner_side: winnerSide }),
  });
}

export function getSourceDetail(debateId: string, sourceId: string): Promise<SourceDetailResponse> {
  return apiRequest<SourceDetailResponse>(`/debates/${debateId}/sources/${sourceId}`);
}

export function openDebateStream(debateId: string): EventSource {
  return new EventSource(buildApiUrl(`/debates/${debateId}/stream`));
}
