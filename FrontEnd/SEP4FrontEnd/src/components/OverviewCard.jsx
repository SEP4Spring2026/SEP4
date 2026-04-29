import { useState } from "react";

const chartValues = [62, 64, 60, 72, 66, 69, 58, 56];

export function OverviewCard({ summary }) {
  return (
    <article className="card large-card">
      <div className="card-header">
        <div>
          <h3>Current Sensor Values</h3>
          <p className="muted">Latest received sample</p>
        </div>
        <span className="tag">Live</span>
      </div>

      <div className="hero-stats">
        <div className="hero-stat">
          <span className="muted">Temperature</span>
          <strong>{summary.temp}</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">Humidity</span>
          <strong>{summary.hum}</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">CO2</span>
          <strong>{summary.co2}</strong>
        </div>
        <div className="hero-stat">
          <span className="muted">Payload length</span>
          <strong>{summary.payloadLength}</strong>
        </div>
      </div>

      <div className="chart">
        {chartValues.map((value, index) => (
          <div key={index} className="bar" style={{ height: `${value}%` }}></div>
        ))}
      </div>
    </article>
  );
}
