import React from "../../WEB/node_modules/react/index.js";

export function SampleCard({ sample }) {
  return (
    <article className="card sample-card">
      <h3>{sample.name}</h3>
      <div className="summary-row">
        <span>DHT status</span>
        <strong>{sample.dhtStatus}</strong>
      </div>
      <div className="summary-row">
        <span>DHT raw</span>
        <strong>{`T=${sample.temp} C, H=${sample.hum.toFixed(1)} %`}</strong>
      </div>
      <div className="summary-row">
        <span>CO2</span>
        <strong>{sample.co2} ppm</strong>
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
