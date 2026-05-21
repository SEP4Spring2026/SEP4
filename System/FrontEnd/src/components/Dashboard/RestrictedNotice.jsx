export function RestrictedNotice({ title = "Restricted area", message }) {
  return (
    <article className="card restricted-card">
      <h3>{title}</h3>
      <p className="muted">
        {message ?? "This action is available only to building administrators in the demo role model."}
      </p>
    </article>
  );
}
