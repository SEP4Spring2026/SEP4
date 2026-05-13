export function SampleCard({ sample }) {
  const hum = Number(sample.hum);
  const humLabel = Number.isFinite(hum) ? hum.toFixed(1) : String(sample.hum);

  return (
    <article className="card sample-card">
      <h3>{sample.name}</h3>
      <div className="summary-row">
        <span>Device ID</span>
        <strong>{sample.sensorId}</strong>
      </div>
      <div className="summary-row">
        <span>Device status</span>
        <strong>{sample.dhtStatus}</strong>
      </div>
      <div className="summary-row">
        <span>Classification</span>
        <strong>{sample.classification ?? "Normal"}</strong>
      </div>
      <div className="summary-row">
        <span>Temperature</span>
        <strong>{sample.temp} °C</strong>
      </div>
      <div className="summary-row">
        <span>Humidity</span>
        <strong>{humLabel} %</strong>
      </div>
      <div className="summary-row">
        <span>CO2</span>
        <strong>{sample.co2} ppm</strong>
      </div>
      <div className="summary-row">
        <span>TVOC</span>
        <strong>{sample.tvoc} ppb</strong>
      </div>
      <div className="summary-row">
        <span>eCO2</span>
        <strong>{sample.eco2} ppm</strong>
      </div>
      <div className="summary-row">
        <span>AQI</span>
        <strong>{sample.aqi}</strong>
      </div>
      <div className="summary-row">
        <span>Payload length</span>
        <strong>{sample.payloadLength}</strong>
      </div>
      <div className="summary-row payload-row">
        <span>Payload</span>
        <code>{sample.payload}</code>
      </div>
    </article>
  );
}
