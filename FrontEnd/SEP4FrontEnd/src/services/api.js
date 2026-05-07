export async function getReadings(sensorId = "all", limit = 200) {
  const params = new URLSearchParams();
  if (sensorId !== "all") {
    params.set("sensorId", sensorId);
  }
  if (limit) {
    params.set("limit", String(limit));
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
