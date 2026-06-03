import { useState } from "react";
import { login, register } from "../../services/api";
import "./Login.css";

export function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = mode === "login"
        ? await login(username, password)
        : await register(username, password);

      // data = { token, user: { id, username, role } }
      onAuth(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        {/* Header */}
        <div className="login-header">
          <div className="logo-badge">S</div>
          <div>
            <p className="muted">Dashboard</p>
            <h1>SEP4 Web</h1>
          </div>
        </div>

        {/* Copy */}
        <div className="login-copy">
          <p className="muted">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </p>
          <h2>{mode === "login" ? "Sign in" : "Register"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Continue to sensor readings and device status."
              : "Create an account to access the dashboard."}
          </p>
        </div>

        {/* Fields */}
        <div className="login-field">
          <label className="device-select-label" htmlFor="login-username">
            Username
          </label>
          <input
            id="login-username"
            className="device-select"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="login-field">
          <label className="device-select-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="device-select"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </div>

        {/* Error */}
        {error && (
          <p className="login-error">{error}</p>
        )}

        {/* Submit */}
        <button className="login-button" type="submit" disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>

        {/* Toggle */}
        <p className="login-switch" onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}>
          {mode === "login"
            ? "No account? Register here"
            : "Already have an account? Sign in"}
        </p>
      </form>
    </main>
  );
}