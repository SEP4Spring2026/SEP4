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
