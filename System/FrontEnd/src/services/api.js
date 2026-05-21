// =======================
// AUTH HELPERS
// =======================

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// =======================
// READINGS
// =======================

export async function getReadings(sensorId = "all", limit = 200, hours = null) {
  const params = new URLSearchParams();

  if (sensorId !== "all") {
    params.set("sensorId", sensorId);
  }
  if (limit) {
    params.set("limit", String(limit));
  }
  if (hours != null && Number.isFinite(hours) && hours > 0) {
    params.set("hours", String(hours));
  }

  const res = await fetch(`/api/readings?${params.toString()}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Readings request failed with ${res.status}`);
  }

  return res.json();
}

// =======================
// DEVICES
// =======================

export async function getDevices() {
  const res = await fetch("/api/readings/devices", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Devices request failed with ${res.status}`);
  }

  return res.json();
}

// =======================
// ALARM TEST
// =======================

export async function postAlarmTest(sensorId, level = "critical") {
  const params = new URLSearchParams({
    sensorId: String(sensorId),
    level,
  });

  const res = await fetch(`/api/readings/alarm-test?${params}`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    let detail = `Alarm test failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) detail = body.message;
    } catch {}
    throw new Error(detail);
  }
}

// =======================
// STREAM (SSE)
// =======================

export function connectReadingsStream(sensorId = "all") {
  const params = new URLSearchParams();

  if (sensorId !== "all") {
    params.set("sensorId", String(sensorId));
  }

  // EventSource doesn't support custom headers, so we append the token as a
  // query param. The backend needs to accept ?token= if auth is enabled on
  // the stream endpoint; if the stream is unauthenticated this is harmless.
  const token = getToken();
  if (token) {
    params.set("token", token);
  }

  return new EventSource(`/api/readings/stream?${params.toString()}`);
}

// =======================
// ROOMS
// =======================

export async function getRooms() {
  const res = await fetch("/api/room", {
    headers: authHeaders(),
  });

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
  // Backend: PUT /api/room/{roomId}/assign-sensor  body: { sensorId }
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
// LOGIN / REGISTER
// =======================

export async function login(username, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    // Try to surface the backend error message
    let message = "Invalid username or password.";
    try {
      const body = await res.json();
      if (typeof body === "string") message = body;
      else if (body?.message) message = body.message;
      else if (body?.title) message = body.title;
    } catch {}
    throw new Error(message);
  }

  return res.json(); // { token, user: { id, username, role } }
}

export async function register(username, password) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let message = "Registration failed.";
    try {
      const body = await res.json();
      if (typeof body === "string") message = body;
      else if (body?.message) message = body.message;
      else if (body?.title) message = body.title;
    } catch {}
    throw new Error(message);
  }

  return res.json(); // { token, user: { id, username, role } }
}