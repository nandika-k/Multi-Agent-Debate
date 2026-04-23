import { useEffect, useRef, useState } from "react";

import { formatRoundType, formatSide, formatTimestamp } from "../formatters";
import type { TranscriptEntry } from "../types";

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  onCitationHover: (sourceId: string | null) => void;
  onStreamingComplete?: () => void;
}

const CHUNK_SIZE = 3;   // words revealed per tick
const TICK_MS = 800;    // ~225 WPM — just above average reading speed

const CITATION_RE = /(\[S\d+\])/g;

function renderText(text: string, onCitationHover: (id: string | null) => void) {
  return text.split(CITATION_RE).map((part, i) => {
    const m = /^\[(S\d+)\]$/.exec(part);
    if (m) {
      return (
        <button
          className="citation-ref"
          key={i}
          onMouseEnter={() => onCitationHover(m[1])}
          onMouseLeave={() => onCitationHover(null)}
        >
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Split text into space-separated tokens while keeping [S#] tags intact.
function tokenize(text: string): string[] {
  return text.split(" ").filter((t) => t.length > 0);
}

export function TranscriptPanel({ transcript, onCitationHover, onStreamingComplete }: TranscriptPanelProps) {
  const lastEntry = transcript[transcript.length - 1] ?? null;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [visibleTokens, setVisibleTokens] = useState(0);
  const activeIdRef = useRef<string | null>(null);
  // Prevents onStreamingComplete from firing more than once per entry.
  const streamingDoneRef = useRef(false);

  // Start streaming whenever a new entry becomes the last one.
  useEffect(() => {
    if (!lastEntry || lastEntry.entry_id === activeId) return;
    activeIdRef.current = lastEntry.entry_id;
    setActiveId(lastEntry.entry_id);
    setVisibleTokens(0);
    streamingDoneRef.current = false;
  }, [lastEntry?.entry_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick: reveal CHUNK_SIZE more tokens until the entry is fully shown.
  useEffect(() => {
    if (!activeId || !lastEntry || lastEntry.entry_id !== activeId) return;
    const total = tokenize(lastEntry.text).length;
    if (visibleTokens >= total) {
      if (!streamingDoneRef.current) {
        streamingDoneRef.current = true;
        onStreamingComplete?.();
      }
      return;
    }
    const timer = setTimeout(
      () => setVisibleTokens((c) => Math.min(c + CHUNK_SIZE, total)),
      TICK_MS,
    );
    return () => clearTimeout(timer);
  }, [activeId, visibleTokens, lastEntry, onStreamingComplete]);

  function getDisplayText(entry: TranscriptEntry): { text: string; streaming: boolean } {
    if (entry.entry_id !== activeId) return { text: entry.text, streaming: false };
    const tokens = tokenize(entry.text);
    const done = visibleTokens >= tokens.length;
    return {
      text: tokens.slice(0, visibleTokens).join(" "),
      streaming: !done,
    };
  }

  return (
    <section className="panel transcript-panel">
      <div className="panel-heading">
        <span className="eyebrow">Pages 4-5 translated into readable argument flow</span>
        <h2>Transcript</h2>
        <p>Each round is rendered from the backend transcript and keeps citations visible.</p>
      </div>

      <div className="transcript-list">
        {transcript.length === 0 ? (
          <div className="empty-state">
            <p>No rounds yet. Once the debate starts, statements will appear here in order.</p>
          </div>
        ) : (
          transcript.map((entry) => {
            const { text, streaming } = getDisplayText(entry);
            return (
              <article
                className={`transcript-card transcript-card--${entry.side}`}
                key={entry.entry_id}
              >
                <header>
                  <div>
                    <span className={`side-pill side-pill--${entry.side}`}>
                      {formatSide(entry.side)}
                    </span>
                    <h3>{formatRoundType(entry.round_type)}</h3>
                  </div>
                  <span>{formatTimestamp(entry.created_at)}</span>
                </header>
                <p>
                  {renderText(text, onCitationHover)}
                  {streaming && <span className="typing-cursor" aria-hidden="true" />}
                </p>
                <footer>
                  <span>{entry.char_count} chars</span>
                  <span>{entry.citations.length} citations</span>
                </footer>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
