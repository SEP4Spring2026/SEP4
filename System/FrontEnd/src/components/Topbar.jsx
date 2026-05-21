import { UserMenu } from "./Auth/UserMenu.jsx";

export function Topbar({ title, activeView, session, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="muted">Dashboard &gt; {activeView}</p>
        <h2>{title}</h2>
      </div>
      <UserMenu session={session} onLogout={onLogout} />
    </header>
  );
}
