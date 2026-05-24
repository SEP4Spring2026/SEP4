import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAlerts, getDevices, getReadings, postAlarmTest } from "./api.js";

describe("api service", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads readings with query parameters and auth header", async () => {
    localStorage.setItem("token", "test-token");
    const readings = [{ sensorId: 101, temp: 22.5 }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => readings,
    });

    const result = await getReadings("101", 25, 2);

    expect(result).toEqual(readings);
    expect(fetch).toHaveBeenCalledWith(
      "/api/readings?sensorId=101&limit=25&hours=2",
      { headers: { Authorization: "Bearer test-token" } },
    );
  });

  it("omits sensorId and invalid hours when loading all readings", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await getReadings("all", 10, 0);

    expect(fetch).toHaveBeenCalledWith("/api/readings?limit=10", { headers: {} });
  });

  it("throws a readable error when readings request fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(getReadings()).rejects.toThrow("Readings request failed (500)");
  });

  it("loads devices from the devices endpoint", async () => {
    const devices = [{ sensorId: 101, status: "active" }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => devices,
    });

    await expect(getDevices()).resolves.toEqual(devices);
    expect(fetch).toHaveBeenCalledWith("/api/readings/devices", { headers: {} });
  });

  it("loads alerts with sensorId and limit parameters", async () => {
    const alerts = [{ sensorId: 101, classification: "Fire" }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => alerts,
    });

    await expect(getAlerts(101, 5)).resolves.toEqual(alerts);
    expect(fetch).toHaveBeenCalledWith("/api/readings/alerts?sensorId=101&limit=5", { headers: {} });
  });

  it("sends alarm test requests with the selected level", async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await postAlarmTest(101, "warn");

    expect(fetch).toHaveBeenCalledWith(
      "/api/readings/alarm-test?sensorId=101&level=warn",
      { method: "POST", headers: {} },
    );
  });

  it("uses backend message when alarm test request fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Sensor is offline" }),
    });

    await expect(postAlarmTest(101)).rejects.toThrow("Sensor is offline");
  });
});
