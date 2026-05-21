export function StatCard({ title, value, status, statusType }) {
  return (
    <article className="card small-card">
      <h3>{title}</h3>
      <p className="value">{value}</p>
      <p className={statusType}>{status}</p>
    </article>
  );
}
