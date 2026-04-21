interface TopicComposerProps {
  topic: string;
  busy: boolean;
  onTopicChange: (value: string) => void;
  onSubmit: () => void;
}

export function TopicComposer({ topic, busy, onTopicChange, onSubmit }: TopicComposerProps) {
  return (
    <section className="panel composer-panel">
      <div className="panel-heading">
        <span className="eyebrow">Page 2 translated into product flow</span>
        <h2>Pick a topic</h2>
        <p>
          Start with a question that has real tension. The backend will normalize it into a formal
          resolution before the debate begins.
        </p>
      </div>
      <label className="field">
        <span>Debate topic</span>
        <textarea
          value={topic}
          rows={4}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder="Should governments require watermarking for AI-generated media?"
        />
      </label>
      <div className="composer-actions">
        <button className="primary-button" disabled={busy || !topic.trim()} onClick={onSubmit}>
          {busy ? "Drafting resolution..." : "Draft resolution"}
        </button>
        <p className="support-copy">The first pass stays editable. You can refine the wording before launch.</p>
      </div>
    </section>
  );
}
