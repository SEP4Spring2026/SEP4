import { useState } from "react";

const menuItems = ["Home", "Sensors", "Samples", "Payload", "Settings"];

export function Sidebar({ activeView, latestSample, onViewChange }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-badge">S</div>
        <div>
          <p className="muted">Dashboard</p>
          <h1>SEP4 Web</h1>
        </div>
      </div>

      <nav className="menu">
        {menuItems.map((item) => (
          <button className={`menu-item${item === activeView ? " active" : ""}`} key={item} onClick={() => onViewChange(item)}>
            {item}
          </button>
        ))}
      </nav>

      <div className="status-card">
        <p className="muted">DHT status</p>
        <strong>{latestSample.dhtStatus}</strong>
      </div>
    </aside>
  );
}
