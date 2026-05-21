import { useState } from "react";
import { login, register } from "../services/api";

export function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const fn = mode === "login" ? login : register;
      const data = await fn(username, password);

      onAuth({
        token: data.token,
        user: data.user ?? null,
      });

    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 320, margin: "100px auto" }}>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Please wait..." : mode}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p
        style={{ cursor: "pointer", color: "blue" }}
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login"
          ? "No account? Register"
          : "Already have an account? Login"}
      </p>
    </div>
  );
}