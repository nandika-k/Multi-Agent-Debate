import { formatPercent, formatSide, sourceAccent } from "../formatters";
import type { EvidencePacket, SourceCard } from "../types";

interface SourceRailProps {
  packets: EvidencePacket[];
  sources: SourceCard[];
  highlightedSourceId: string | null;
}

export function SourceRail({ packets, sources, highlightedSourceId }: SourceRailProps) {
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
          <a
            className={`source-card source-card--${sourceAccent(source)} ${
              highlightedSourceId === source.source_id ? "is-highlighted" : ""
            }`}
            data-source-id={source.source_id}
            href={source.url}
            key={source.source_id}
            rel="noreferrer"
            target="_blank"
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
          </a>
        ))}
      </div>
    </section>
  );
}
