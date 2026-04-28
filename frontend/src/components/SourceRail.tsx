import type { SourceCard } from '../types'


function StarRating({ score }: { score: number }) {
  const filled = Math.round(score * 5)
  return (
    <span className="source-stars" aria-label={`Trust: ${Math.round(score * 100)}%`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < filled ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}>
          ★
        </span>
      ))}
    </span>
  )
}

interface Props {
  sources: SourceCard[]
  highlightedSourceId: string | null
  onSourceHover: (sourceId: string | null) => void
}

export function SourceRail({ sources, highlightedSourceId, onSourceHover }: Props) {
  if (sources.length === 0) return null

  return (
    <div className="source-rail-wrapper">
      <div className="source-rail-header">
        <span className="source-rail-title">SOURCES</span>
        <span className="source-count">{sources.length}</span>
      </div>
      <div className="source-rail-scroll">
        {sources.map(source => {
          const num = source.source_id.match(/\d+/)?.[0] ?? source.source_id
          return (
            <a
              key={source.source_id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`source-card ${highlightedSourceId === source.source_id ? 'highlighted-pro' : ''}`}
              onMouseEnter={() => onSourceHover(source.source_id)}
              onMouseLeave={() => onSourceHover(null)}
              title={source.summary}
            >
              <div className="source-card-title">
                <span className="source-card-num">[{num}]</span> {source.title}
              </div>
              <div className="source-card-pub">{source.publisher}</div>
              <div className="source-card-meta">
                <span className={`source-type-badge ${source.source_type}`}>
                  {source.source_type}
                </span>
                <StarRating score={source.trust_score} />
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
