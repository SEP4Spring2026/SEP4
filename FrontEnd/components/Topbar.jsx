import React from "../../WEB/node_modules/react/index.js";

export function Topbar({ title, activeView }) {
  return (
    <header className="topbar">
      <div>
        <p className="muted">Dashboard &gt; {activeView}</p>
        <h2>{title}</h2>
      </div>
      <div className="profile">RP</div>
    </header>
  );
}
