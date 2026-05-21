
export function OverviewCard({ summary }) {
  return (
    <article className="card large-card">
      <div className="card-header">
        <div>
          <h3>Latest Sensor Readings</h3>
          <p className="muted">Current values from the selected device filter</p>
        </div>
        <div className="reading-device-badge">
          <span className="muted">Showing</span>
          <strong>Device {summary.sensorId}</strong>
          {summary.selectedSensorId === "all" && <span className="muted">newest from all devices</span>}
        </div>
      </div>

      <div className="hero-stats sensor-readings-grid">
        <div className="hero-stat">
          <span className="muted">Temperature</span>
          <strong>{summary.temp} °C</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">Humidity</span>
          <strong>{summary.hum} %</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">CO2</span>
          <strong>{summary.co2} ppm</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">TVOC</span>
          <strong>{summary.tvoc} ppb</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">eCO2</span>
          <strong>{summary.eco2} ppm</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">AQI</span>
          <strong>{summary.aqi ?? "-"}</strong>
        </div>
      </div>

    </article>
  );
}
