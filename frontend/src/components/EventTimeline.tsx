import { eventDescription, formatTimestamp } from "../formatters";
import type { DebateEvent } from "../types";

interface EventTimelineProps {
  events: DebateEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <span className="eyebrow">Event timeline</span>
        <h2>Run history</h2>
        <p>This is driven from the backend event log, including SSE-triggered updates.</p>
      </div>

      <ol className="timeline-list">
        {events.length === 0 ? (
          <li className="empty-state">
            <p>No events yet.</p>
          </li>
        ) : (
          [...events]
            .sort((left, right) => right.created_at.localeCompare(left.created_at))
            .map((event) => (
              <li className="timeline-item" key={`${event.event_id ?? event.created_at}-${event.event_type}`}>
                <div>
                  <strong>{event.event_type.replaceAll("_", " ")}</strong>
                  <p>{eventDescription(event)}</p>
                </div>
                <time>{formatTimestamp(event.created_at)}</time>
              </li>
            ))
        )}
      </ol>
    </section>
  );
}
