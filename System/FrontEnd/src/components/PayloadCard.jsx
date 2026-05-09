export function PayloadCard({ payload }) {
  return (
    <article className="card side-card">
      <div className="card-header">
        <div>
          <h3>Payload</h3>
          <p className="muted">sensorId, timestamp, nested sensors, classification</p>
        </div>
        <span className="success">OK</span>
      </div>

      <pre className="payload-box">{payload}</pre>
    </article>
  );
}
