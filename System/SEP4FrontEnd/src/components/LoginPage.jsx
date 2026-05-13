import { useState } from "react";
import { roleOptions } from "../services/auth.js";

function LoginHeader() {
  return (
    <div className="login-header">
      <div className="logo-badge">S</div>
      <div>
        <p className="muted">Dashboard</p>
        <h1>SEP4 Web</h1>
      </div>
    </div>
  );
}

function RoleSelect({ selectedRole, onRoleChange }) {
  return (
    <div className="login-field">
      <label className="device-select-label" htmlFor="role-select">
        Access role
      </label>
      <select
        id="role-select"
        className="device-select"
        value={selectedRole}
        onChange={(event) => onRoleChange(event.target.value)}
      >
        {roleOptions.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LoginPanel({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(roleOptions[0].value);

  function handleSubmit(event) {
    event.preventDefault();
    onLogin(selectedRole);
  }

  return (
    <form className="card login-card" onSubmit={handleSubmit}>
      <LoginHeader />

      <div className="login-copy">
        <p className="muted">Local access</p>
        <h2>Sign in to dashboard</h2>
        <p className="muted">
          Continue to sensor readings and device status.
        </p>
      </div>

      <RoleSelect selectedRole={selectedRole} onRoleChange={setSelectedRole} />

      <button className="login-button" type="submit">
        Sign in
      </button>
    </form>
  );
}

export function LoginPage({ onLogin }) {
  return (
    <main className="login-page">
      <LoginPanel onLogin={onLogin} />
    </main>
  );
}
