import { useEffect, useRef, useState } from "react";

import { openDebateStream } from "./api";
import type { DebateEvent, EventType } from "./types";

const REFETCH_EVENTS = new Set<EventType>([
  "sources_collected",
  "packets_ready",
  "round_completed",
  "debate_completed",
  "debate_failed",
]);

export type StreamState = "idle" | "connecting" | "live" | "disconnected";

interface UseDebateStreamArgs {
  debateId: string | null;
  enabled: boolean;
  onRelevantEvent: (event: DebateEvent) => void;
}

export function useDebateStream({
  debateId,
  enabled,
  onRelevantEvent,
}: UseDebateStreamArgs): { streamState: StreamState; lastEvent: DebateEvent | null } {
  const onRelevantEventRef = useRef(onRelevantEvent);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [lastEvent, setLastEvent] = useState<DebateEvent | null>(null);

  useEffect(() => {
    onRelevantEventRef.current = onRelevantEvent;
  }, [onRelevantEvent]);

  useEffect(() => {
    if (!enabled || !debateId) {
      setStreamState("idle");
      setLastEvent(null);
      return undefined;
    }

    setStreamState("connecting");
    const source = openDebateStream(debateId);

    source.onopen = () => {
      setStreamState("live");
    };

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as DebateEvent;
      setLastEvent(event);
      if (REFETCH_EVENTS.has(event.event_type)) {
        onRelevantEventRef.current(event);
      }
    };

    source.onerror = () => {
      setStreamState("disconnected");
    };

    return () => {
      source.close();
      setStreamState("idle");
    };
  }, [debateId, enabled]);

  return { streamState, lastEvent };
}
