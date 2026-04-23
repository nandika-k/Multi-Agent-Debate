import { formatRoundType, formatSide, formatTimestamp } from "../formatters";
import type { TranscriptEntry } from "../types";

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  onCitationHover: (sourceId: string | null) => void;
}

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

export function TranscriptPanel({ transcript, onCitationHover }: TranscriptPanelProps) {
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
          transcript.map((entry) => (
            <article className={`transcript-card transcript-card--${entry.side}`} key={entry.entry_id}>
              <header>
                <div>
                  <span className={`side-pill side-pill--${entry.side}`}>{formatSide(entry.side)}</span>
                  <h3>{formatRoundType(entry.round_type)}</h3>
                </div>
                <span>{formatTimestamp(entry.created_at)}</span>
              </header>
              <p>{renderText(entry.text, onCitationHover)}</p>
              <footer>
                <span>{entry.char_count} chars</span>
                <span>{entry.citations.length} citations</span>
              </footer>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
