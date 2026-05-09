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

export function connectReadingsStream(sensorId = "all") {
  const params = new URLSearchParams();
  if (sensorId !== "all") {
    params.set("sensorId", String(sensorId));
  }
  const query = params.toString();
  return new EventSource(`/api/readings/stream${query ? `?${query}` : ""}`);
}
