export async function getReadings() {
  const res = await fetch("/api/readings");
  return await res.json();
}