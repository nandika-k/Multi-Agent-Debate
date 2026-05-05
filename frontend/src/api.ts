import type {
  DebateSummary,
  DebateDetailResponse,
  SourceDetailResponse,
  DebateSide,
} from './types'

const BASE = '/api/debates'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function createDebate(topic: string): Promise<DebateSummary> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  })
  return json<DebateSummary>(res)
}

export async function getDebate(debateId: string): Promise<DebateDetailResponse> {
  const res = await fetch(`${BASE}/${debateId}`)
  return json<DebateDetailResponse>(res)
}

export async function confirmResolution(
  debateId: string,
  resolution: string,
): Promise<DebateSummary> {
  const res = await fetch(`${BASE}/${debateId}/confirm-resolution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution }),
  })
  return json<DebateSummary>(res)
}

export async function startDebate(debateId: string): Promise<DebateSummary> {
  const res = await fetch(`${BASE}/${debateId}/start`, { method: 'POST' })
  return json<DebateSummary>(res)
}

export async function pickWinner(
  debateId: string,
  winner_side: DebateSide,
): Promise<DebateSummary> {
  const res = await fetch(`${BASE}/${debateId}/winner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner_side }),
  })
  return json<DebateSummary>(res)
}

export async function getSourceDetail(
  debateId: string,
  sourceId: string,
): Promise<SourceDetailResponse> {
  const res = await fetch(`${BASE}/${debateId}/sources/${sourceId}`)
  return json<SourceDetailResponse>(res)
}

export function getAudioUrl(debateId: string, entryId: string): string {
  return `${BASE}/${debateId}/transcript/${entryId}/audio`
}
