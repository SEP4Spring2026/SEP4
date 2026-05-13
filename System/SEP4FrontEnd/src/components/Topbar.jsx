export function Topbar({ title, activeView, currentRole, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="muted">Dashboard &gt; {activeView}</p>
        <h2>{title}</h2>
      </div>
      <div className="topbar-actions">
        <div>
          <p className="muted">Signed in as</p>
          <strong>{currentRole.label}</strong>
        </div>
        <div className="profile">{currentRole.initials}</div>
        <button className="logout-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
