import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { DebateDetailResponse, DebateEvent, DebateSummary } from "./types";

const now = "2026-04-20T23:00:00Z";

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  emit(event: DebateEvent) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
  }
}

function makeSummary(overrides: Partial<DebateSummary> = {}): DebateSummary {
  return {
    debate_id: "deb-1",
    topic_raw: "Should AI judge debates?",
    resolution_draft: "Resolved: AI systems should judge structured debates.",
    resolution_final: null,
    status: "awaiting_confirmation",
    winner_side: null,
    winning_animation_state: null,
    error_message: null,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<DebateDetailResponse> = {}): DebateDetailResponse {
  const summary = makeSummary(overrides.debate);
  return {
    debate: summary,
    scope: {
      jurisdiction: "United States",
      timeframe: "2026",
      target_population: "Debate judges",
      definitions: ["Structured debate means timed opening, rebuttal, and closing rounds."],
    },
    packets: [
      {
        packet_id: "deb-1_pro_packet",
        side: "pro",
        resolution: summary.resolution_final ?? summary.resolution_draft,
        source_ids: ["S1", "S2"],
        key_claims: ["Automation can improve consistency."],
      },
      {
        packet_id: "deb-1_con_packet",
        side: "con",
        resolution: summary.resolution_final ?? summary.resolution_draft,
        source_ids: ["S3"],
        key_claims: ["Human context still matters."],
      },
    ],
    transcript: [
      {
        entry_id: "entry-1",
        round_type: "opening",
        side: "pro",
        text: "AI judges can evaluate every round against the same rubric.",
        citations: ["S1"],
        char_count: 65,
        created_at: now,
      },
    ],
    sources: [
      {
        source_id: "S1",
        title: "Judging at scale",
        url: "https://example.com/source-1",
        publisher: "example.com",
        published_at: now,
        source_type: "primary",
        summary: "A primary source about scoring consistency.",
        supporting_snippets: ["Scoring reliability increased after standardization."],
        trust_score: 0.94,
        relevance_score: 0.87,
        recency_score: 0.66,
        body_excerpt: "Primary source excerpt.",
      },
    ],
    events: [
      {
        event_id: 1,
        debate_id: "deb-1",
        event_type: "debate_created",
        created_at: now,
        status: summary.status,
        round_type: null,
        side: null,
        entry_id: null,
        winner_side: null,
        error: null,
        resolution_final: summary.resolution_final,
        animation_state: null,
        metadata: {},
      },
    ],
    ...overrides,
  };
}

function queueJsonResponses(...payloads: unknown[]) {
  const fetchMock = vi.fn();
  for (const payload of payloads) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("creates a debate from the topic composer", async () => {
    const awaiting = makeSummary();
    const awaitingDetail = makeDetail();
    const fetchMock = queueJsonResponses(awaiting, awaitingDetail);

    render(<App />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Should governments require watermarking/i), "Should AI judge debates?");
    await user.click(screen.getByRole("button", { name: /draft resolution/i }));

    await screen.findByDisplayValue(awaiting.resolution_draft);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/debates",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/debates/deb-1", expect.anything());
  });

  it("confirms an edited resolution", async () => {
    const awaiting = makeSummary();
    const awaitingDetail = makeDetail();
    const ready = makeSummary({
      resolution_final: "Resolved: AI should judge structured debates in competitive settings.",
      status: "ready",
    });
    const readyDetail = makeDetail({ debate: ready });
    const fetchMock = queueJsonResponses(awaiting, awaitingDetail, ready, readyDetail);

    render(<App />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Should governments require watermarking/i), "Should AI judge debates?");
    await user.click(screen.getByRole("button", { name: /draft resolution/i }));

    const textarea = await screen.findByDisplayValue(awaiting.resolution_draft);
    await user.clear(textarea);
    await user.type(textarea, ready.resolution_final!);
    await user.click(screen.getByRole("button", { name: /confirm resolution/i }));

    await screen.findByRole("button", { name: /start debate/i });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/debates/deb-1/confirm-resolution",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ resolution: ready.resolution_final }),
      }),
    );
  });

  it("transitions from ready into the running workspace", async () => {
    const awaiting = makeSummary();
    const awaitingDetail = makeDetail();
    const ready = makeSummary({
      resolution_final: "Resolved: AI should judge structured debates in competitive settings.",
      status: "ready",
    });
    const readyDetail = makeDetail({ debate: ready });
    const researching = makeSummary({
      resolution_final: ready.resolution_final,
      status: "researching",
      started_at: now,
    });
    const runningDetail = makeDetail({ debate: researching });
    queueJsonResponses(awaiting, awaitingDetail, ready, readyDetail, researching, runningDetail);

    render(<App />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Should governments require watermarking/i), "Should AI judge debates?");
    await user.click(screen.getByRole("button", { name: /draft resolution/i }));
    await user.click(await screen.findByRole("button", { name: /confirm resolution/i }));
    await user.click(await screen.findByRole("button", { name: /start debate/i }));

    await screen.findByText(/Round 1: Opening statement/i);
    expect(screen.getByText(/Researching evidence/i)).toBeInTheDocument();
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("refreshes debate detail when a relevant SSE event arrives", async () => {
    const awaiting = makeSummary();
    const awaitingDetail = makeDetail();
    const ready = makeSummary({
      resolution_final: "Resolved: AI should judge structured debates in competitive settings.",
      status: "ready",
    });
    const readyDetail = makeDetail({ debate: ready });
    const running = makeSummary({
      resolution_final: ready.resolution_final,
      status: "in_progress",
      started_at: now,
    });
    const runningDetail = makeDetail({
      debate: running,
      events: [
        ...makeDetail({ debate: running }).events,
        {
          event_id: 2,
          debate_id: "deb-1",
          event_type: "research_started",
          created_at: now,
          status: "researching",
          round_type: null,
          side: null,
          entry_id: null,
          winner_side: null,
          error: null,
          resolution_final: running.resolution_final,
          animation_state: null,
          metadata: {},
        },
      ],
    });
    const refreshedDetail = makeDetail({
      debate: running,
      transcript: [
        ...runningDetail.transcript,
        {
          entry_id: "entry-2",
          round_type: "rebuttal",
          side: "con",
          text: "Humans still catch contextual mistakes.",
          citations: ["S1"],
          char_count: 41,
          created_at: now,
        },
      ],
    });
    const fetchMock = queueJsonResponses(
      awaiting,
      awaitingDetail,
      ready,
      readyDetail,
      running,
      runningDetail,
      refreshedDetail,
    );

    render(<App />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Should governments require watermarking/i), "Should AI judge debates?");
    await user.click(screen.getByRole("button", { name: /draft resolution/i }));
    await user.click(await screen.findByRole("button", { name: /confirm resolution/i }));
    await user.click(await screen.findByRole("button", { name: /start debate/i }));

    await screen.findByText(/Researching evidence/i);

    MockEventSource.instances[0].emit({
      event_id: 3,
      debate_id: "deb-1",
      event_type: "packets_ready",
      created_at: now,
      status: "in_progress",
      round_type: null,
      side: null,
      entry_id: null,
      winner_side: null,
      error: null,
      resolution_final: running.resolution_final,
      animation_state: null,
      metadata: {},
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(7));
    await screen.findByText(/Humans still catch contextual mistakes/i);
  });

  it("renders transcript, packets, and sources from the detail payload", async () => {
    const awaiting = makeSummary();
    const awaitingDetail = makeDetail();
    const ready = makeSummary({
      resolution_final: "Resolved: AI should judge structured debates in competitive settings.",
      status: "ready",
    });
    const readyDetail = makeDetail({ debate: ready });
    const running = makeSummary({
      resolution_final: ready.resolution_final,
      status: "in_progress",
      started_at: now,
    });
    const runningDetail = makeDetail({ debate: running });
    queueJsonResponses(awaiting, awaitingDetail, ready, readyDetail, running, runningDetail);

    render(<App />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Should governments require watermarking/i), "Should AI judge debates?");
    await user.click(screen.getByRole("button", { name: /draft resolution/i }));
    await user.click(await screen.findByRole("button", { name: /confirm resolution/i }));
    await user.click(await screen.findByRole("button", { name: /start debate/i }));

    await screen.findByText(/AI judges can evaluate every round/i);
    expect(screen.getByText(/Automation can improve consistency/i)).toBeInTheDocument();
    expect(screen.getByText(/Judging at scale/i)).toBeInTheDocument();
  });

  it("supports winner selection and shows the idempotent completed-state UI", async () => {
    const awaiting = makeSummary();
    const awaitingDetail = makeDetail();
    const ready = makeSummary({
      resolution_final: "Resolved: AI should judge structured debates in competitive settings.",
      status: "ready",
    });
    const readyDetail = makeDetail({ debate: ready });
    const completed = makeSummary({
      resolution_final: ready.resolution_final,
      status: "completed",
      started_at: now,
      completed_at: now,
    });
    const completedDetail = makeDetail({ debate: completed });
    const withWinner = makeSummary({
      ...completed,
      winner_side: "pro",
      winning_animation_state: {
        animation: "decision_celebration",
        winner_pose: "raise_hand",
        loser_pose: "look_down",
      },
    });
    const withWinnerDetail = makeDetail({ debate: withWinner });
    const fetchMock = queueJsonResponses(
      awaiting,
      awaitingDetail,
      ready,
      readyDetail,
      completed,
      completedDetail,
      withWinner,
      withWinnerDetail,
    );

    render(<App />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Should governments require watermarking/i), "Should AI judge debates?");
    await user.click(screen.getByRole("button", { name: /draft resolution/i }));
    await user.click(await screen.findByRole("button", { name: /confirm resolution/i }));
    await user.click(await screen.findByRole("button", { name: /start debate/i }));
    await user.click(await screen.findByRole("button", { name: /select pro/i }));

    await screen.findByText(/Pro wins/i);
    const selectedWinner = screen.getByRole("button", { name: /pro selected/i });
    const otherWinner = screen.getByRole("button", { name: /select con/i });

    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "/api/debates/deb-1/winner",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ winner_side: "pro" }),
      }),
    );
    expect(selectedWinner).toBeDisabled();
    expect(otherWinner).toBeDisabled();
  });
});
