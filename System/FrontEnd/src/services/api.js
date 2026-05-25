// =======================
// AUTH HELPERS
// =======================
function getToken() { return localStorage.getItem("token"); }

function authHeaders(extra = {}) {
  const token = getToken();
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// =======================
// READINGS
// =======================
export async function getReadings(sensorId = "all", limit = 200, hours = null) {
  const params = new URLSearchParams();
  if (sensorId !== "all") params.set("sensorId", sensorId);
  if (limit) params.set("limit", String(limit));
  if (hours != null && Number.isFinite(hours) && hours > 0) params.set("hours", String(hours));
  const res = await fetch(`/api/readings?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Readings request failed (${res.status})`);
  return res.json();
}

// =======================
// DEVICES
// =======================
export async function getDevices() {
  const res = await fetch("/api/readings/devices", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Devices request failed (${res.status})`);
  return res.json();
}

// =======================
// ALERTS
// =======================
export async function getAlerts(sensorId = null, limit = 50) {
  const params = new URLSearchParams();
  if (sensorId != null) params.set("sensorId", String(sensorId));
  params.set("limit", String(limit));
  const res = await fetch(`/api/readings/alerts?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Alerts request failed (${res.status})`);
  return res.json();
}

// =======================
// ALARM TEST
// =======================
export async function postAlarmTest(sensorId, level = "critical") {
  const params = new URLSearchParams({ sensorId: String(sensorId), level });
  const res = await fetch(`/api/readings/alarm-test?${params}`, { method: "POST", headers: authHeaders() });
  if (!res.ok) {
    let detail = `Alarm test failed (${res.status})`;
    try { const b = await res.json(); if (b?.message) detail = b.message; } catch {}
    throw new Error(detail);
  }
}

// =======================
// STREAM (SSE)
// =======================
export function connectReadingsStream(sensorId = "all") {
  const params = new URLSearchParams();
  if (sensorId !== "all") params.set("sensorId", String(sensorId));
  const token = getToken();
  if (token) params.set("token", token);
  return new EventSource(`/api/readings/stream?${params}`);
}

// =======================
// ROOMS
// =======================
export async function getRooms() {
  const res = await fetch("/api/room", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load rooms (${res.status})`);
  return res.json();
}

export async function createRoom(name) {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create room (${res.status})`);
  return res.json();
}

export async function assignSensorToRoom(roomId, sensorId) {
  const res = await fetch(`/api/room/${roomId}/assign-sensor`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sensorId }),
  });
  if (!res.ok) throw new Error(`Failed to assign sensor (${res.status})`);
  return res.json();
}

export async function unassignSensor(sensorId) {
  const res = await fetch(`/api/room/unassign-sensor/${sensorId}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to unassign sensor (${res.status})`);
  return res.json();
}

// =======================
// USERS (system-admin only)
// =======================
export async function getUsers() {
  const res = await fetch("/api/users", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
  return res.json();
}

export async function changeUserRole(userId, role) {
  const res = await fetch(`/api/users/${userId}/role`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    let msg = `Failed to change role (${res.status})`;
    try { const b = await res.json(); if (b?.message) msg = b.message; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function assignSensorToUser(userId, sensorId) {
  const res = await fetch(`/api/users/${userId}/assign-sensor`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sensorId }),
  });
  if (!res.ok) {
    let msg = `Failed to assign sensor (${res.status})`;
    try { const b = await res.json(); if (b?.message) msg = b.message; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteUser(userId) {
  const res = await fetch(`/api/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let msg = `Failed to delete user (${res.status})`;
    try { const b = await res.json(); if (b?.message) msg = b.message; } catch {}
    throw new Error(msg);
  }
}

// =======================
// LOGS (system-admin only)
// =======================
export async function getLogs() {
  const res = await fetch("/api/logs", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load logs (${res.status})`);
  return res.text();
}

// =======================
// LOGIN / REGISTER
// =======================
export async function login(username, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let message = "Invalid username or password.";
    try { const b = await res.json(); if (b?.message) message = b.message; } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function register(username, password) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let message = "Registration failed.";
    try { const b = await res.json(); if (b?.message) message = b.message; } catch {}
    throw new Error(message);
  }
  return res.json();
}
