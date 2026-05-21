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
  const query = params.toString();
  const res = await fetch(`/api/readings${query ? `?${query}` : ""}`);
  if (!res.ok) {
    throw new Error(`Readings request failed with ${res.status}`);
  }
  return await res.json();
}

export async function getDevices() {
  const res = await fetch("/api/readings/devices");
  if (!res.ok) {
    throw new Error(`Devices request failed with ${res.status}`);
  }
  return await res.json();
}

/** Buzzer test → MQTT iot/alarm/{sensorId}; requires server ALLOW_ALARM_TEST=true */
export async function postAlarmTest(sensorId, level = "critical") {
  const params = new URLSearchParams({
    sensorId: String(sensorId),
    level,
  });
  const res = await fetch(`/api/readings/alarm-test?${params}`, { method: "POST" });
  if (!res.ok) {
    let detail = `Alarm test failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

export function connectReadingsStream(sensorId = "all") {
  const params = new URLSearchParams();
  if (sensorId !== "all") {
    params.set("sensorId", String(sensorId));
  }
  const query = params.toString();
  return new EventSource(`/api/readings/stream${query ? `?${query}` : ""}`);
}

export async function getRooms() {
  const res = await fetch("/api/room");
  return res.json();
}

export async function createRoom(name) {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return res.json();
}

export async function assignSensorToRoom(roomId, sensorId) {
  const res = await fetch(`/api/room/${roomId}/assign-sensor`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sensorId }),
  });

  return res.json();
}

export async function unassignSensor(sensorId) {
  const res = await fetch(`/api/room/unassign-sensor/${sensorId}`, {
    method: "PUT",
  });

  return res.json();
}