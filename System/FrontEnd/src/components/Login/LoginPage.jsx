import { useState } from "react";
import { login, register } from "../../services/api";
import "./Login.css";

export function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const data =
      mode === "login"
        ? await login(username, password)
        : await register(username, password);

    onAuth(data);
  }

  return (
  <main className="login-page">
    <div className="login-box">

      <h2 className="login-title">
        {mode === "login" ? "Sign In" : "Register"}
      </h2>

      <input
        className="login-input"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        className="login-input"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="login-button"
        onClick={handleSubmit}
      >
        {mode === "login" ? "Login" : "Register"}
      </button>

      <p
        className="login-switch"
        onClick={() =>
          setMode(mode === "login" ? "register" : "login")
        }
      >
        Switch to {mode === "login" ? "Register" : "Login"}
      </p>

    </div>
  </main>
);
}