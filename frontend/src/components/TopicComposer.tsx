import type { FormEvent } from "react";

interface TopicComposerProps {
  topic: string;
  busy: boolean;
  onTopicChange: (value: string) => void;
  onSubmit: () => void;
}

export function TopicComposer({ topic, busy, onTopicChange, onSubmit }: TopicComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy && topic.trim()) {
      onSubmit();
    }
  }

  return (
    <form className="composer-panel" onSubmit={handleSubmit}>
      <div className="topic-scroll" aria-label="Topic entry banner">
        <label className="topic-scroll__field topic-scroll__field--top">
          <span className="visually-hidden">Debate topic</span>
          <input
            autoFocus
            className="topic-scroll__input topic-scroll__input--top"
            onChange={(event) => onTopicChange(event.target.value)}
            placeholder="Pick a topic ..."
            value={topic}
          />
        </label>

        <img
          alt=""
          aria-hidden="true"
          className="topic-scroll__art"
          src="/images/topic-scroll.png"
        />
      </div>

      <button className="visually-hidden" disabled={busy || !topic.trim()} type="submit">
        Submit topic
      </button>
    </form>
  );
}
