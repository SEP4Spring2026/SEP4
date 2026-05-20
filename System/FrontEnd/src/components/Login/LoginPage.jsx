import { useState } from "react";
import { LoginHeader } from "./LoginHeader.jsx";
import { LoginRoleSelect } from "./LoginRoleSelect.jsx";
import { accessRoles } from "./roles.js";
import "./Login.css";

export function LoginPage({ onSignIn }) {
  const [selectedRole, setSelectedRole] = useState(accessRoles[0].value);

  function handleSubmit(event) {
    event.preventDefault();
    onSignIn(selectedRole);
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <LoginHeader />

        <section className="login-content">
          <p className="muted">Local access</p>
          <h2>Sign in to dashboard</h2>
          <p className="login-copy">Continue to sensor readings and device status.</p>

          <LoginRoleSelect
            roles={accessRoles}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
          />

          <button className="login-button" type="submit">
            Sign in
          </button>
        </section>
      </form>
    </main>
  );
}
