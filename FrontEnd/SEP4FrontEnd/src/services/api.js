export async function getReadings(sensorId = "all") {
  const query = sensorId === "all" ? "" : `?sensorId=${encodeURIComponent(sensorId)}`;
  const res = await fetch(`/api/readings${query}`);
  return await res.json();
}

export async function getDevices() {
  const res = await fetch("/api/readings/devices");
  return await res.json();
}