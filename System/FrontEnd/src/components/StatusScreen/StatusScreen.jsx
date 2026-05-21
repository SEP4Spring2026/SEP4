import "./StatusScreen.css";

export function StatusScreen({ title, message, actionLabel, onAction }) {
  return (
    <main className="status-screen">
      <section className="status-panel">
        <div className="status-panel-badge">S</div>
        <p className="muted">SEP4 Web</p>
        <h1>{title}</h1>
        <p className="status-panel-copy">{message}</p>

        {actionLabel && onAction ? (
          <button className="status-panel-button" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}
