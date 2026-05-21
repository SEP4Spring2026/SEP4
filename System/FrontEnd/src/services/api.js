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

  return await res.json();
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

  return await res.json();
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

  return new EventSource(`/api/readings/stream?${params.toString()}`);
}

// =======================
// ROOMS
// =======================

export async function getRooms() {
  const res = await fetch("/api/room", {
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error("Failed to load rooms");

  return res.json();
}

export async function createRoom(name) {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) throw new Error("Failed to create room");

  return res.json();
}

export async function assignSensorToRoom(roomId, sensorId) {
  const res = await fetch(`/api/room/${roomId}/assign`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(sensorId),
  });

  if (!res.ok) throw new Error("Failed to assign sensor");

  return res.json();
}

export async function unassignSensor(sensorId) {
  const res = await fetch(`/api/room/unassign-sensor/${sensorId}`, {
    method: "PUT",
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error("Failed to unassign sensor");

  return res.json();
}

// =======================
// LOGIN
// =======================

export async function login(username, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}

export async function register(username, password) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error("Register failed");

  return res.json();
}