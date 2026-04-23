import { formatPercent, formatSide, sourceAccent } from "../formatters";
import type { EvidencePacket, SourceCard, SourceDetailResponse } from "../types";

interface SourceRailProps {
  packets: EvidencePacket[];
  sources: SourceCard[];
  selectedSourceId: string | null;
  highlightedSourceId: string | null;
  selectedSourceDetail: SourceDetailResponse | null;
  loadingSourceId: string | null;
  onSelectSource: (sourceId: string) => void;
}

export function SourceRail({
  packets,
  sources,
  selectedSourceId,
  highlightedSourceId,
  selectedSourceDetail,
  loadingSourceId,
  onSelectSource,
}: SourceRailProps) {
  return (
    <section className="panel source-panel">
      <div className="panel-heading">
        <span className="eyebrow">Evidence rail</span>
        <h2>Sources and side packets</h2>
        <p>The debate shares one source pool, then splits it into argument packets for each side.</p>
      </div>

      <div className="packet-grid">
        {packets.map((packet) => (
          <article className={`packet-card packet-card--${packet.side}`} key={packet.packet_id}>
            <header>
              <span className={`side-pill side-pill--${packet.side}`}>{formatSide(packet.side)}</span>
              <strong>{packet.source_ids.length} linked sources</strong>
            </header>
            <p>{packet.resolution}</p>
            {packet.key_claims.length > 0 ? (
              <ul>
                {packet.key_claims.map((claim) => (
                  <li key={claim}>{claim}</li>
                ))}
              </ul>
            ) : (
              <p className="muted-copy">Claims are generated inside the packet but not yet exposed in this run.</p>
            )}
          </article>
        ))}
      </div>

      <div className="source-list">
        {sources.map((source) => (
          <button
            className={`source-card source-card--${sourceAccent(source)} ${
              selectedSourceId === source.source_id ? "is-selected" : ""
            } ${highlightedSourceId === source.source_id ? "is-highlighted" : ""}`}
            data-source-id={source.source_id}
            key={source.source_id}
            onClick={() => onSelectSource(source.source_id)}
          >
            <div className="source-card__topline">
              <span>{source.publisher}</span>
              <span>{source.source_type}</span>
            </div>
            <h3>{source.title}</h3>
            <p>{source.summary}</p>
            <div className="source-card__scores">
              <span>Trust {formatPercent(source.trust_score)}</span>
              <span>Relevance {formatPercent(source.relevance_score)}</span>
            </div>
            {loadingSourceId === source.source_id ? <small>Loading source detail...</small> : null}
          </button>
        ))}
      </div>

      <aside className="source-detail" aria-live="polite">
        {selectedSourceDetail ? (
          <>
            <span className="eyebrow">Selected source</span>
            <h3>{selectedSourceDetail.source.title}</h3>
            <p>{selectedSourceDetail.source.body_excerpt ?? selectedSourceDetail.source.summary}</p>
            <ul>
              {selectedSourceDetail.source.supporting_snippets.map((snippet) => (
                <li key={snippet}>{snippet}</li>
              ))}
            </ul>
            <p>
              Used by:{" "}
              {selectedSourceDetail.used_by_sides.length > 0
                ? selectedSourceDetail.used_by_sides.map(formatSide).join(" and ")
                : "Not assigned yet"}
            </p>
            <a href={selectedSourceDetail.source.url} rel="noreferrer" target="_blank">
              Open original source
            </a>
          </>
        ) : (
          <p>Select a source to inspect how it supports the debate.</p>
        )}
      </aside>
    </section>
  );
}
