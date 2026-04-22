import { formatRoundType, formatSide, formatTimestamp } from "../formatters";
import type { TranscriptEntry } from "../types";
import { BlobMascot } from "./BlobMascot";

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  return (
    <section className="panel transcript-panel">
      <div className="panel-heading">
        <h2>Transcript</h2>
        <p>Each round rendered in order with citations.</p>
      </div>

      <div className="transcript-list">
        {transcript.length === 0 ? (
          <div className="empty-state">
            <p>No rounds yet. Once the debate starts, statements will appear here.</p>
          </div>
        ) : (
          transcript.map((entry) => (
            <div
              className={`transcript-entry transcript-entry--${entry.side}`}
              key={entry.entry_id}
            >
              <BlobMascot side={entry.side} size={52} />

              <article className={`speech-bubble speech-bubble--${entry.side}`}>
                <header>
                  <div>
                    <span className={`side-pill side-pill--${entry.side}`}>
                      {formatSide(entry.side)}
                    </span>
                    <h3>{formatRoundType(entry.round_type)}</h3>
                  </div>
                  <time>{formatTimestamp(entry.created_at)}</time>
                </header>
                <p>{entry.text}</p>
                <footer>
                  <span>{entry.char_count} chars</span>
                  <span>{entry.citations.length} citations</span>
                </footer>
              </article>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
