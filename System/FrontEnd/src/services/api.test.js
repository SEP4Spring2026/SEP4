import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignSensorToRoom,
  changeUserRole,
  connectReadingsStream,
  createRoom,
  deleteUser,
  getAlerts,
  getDevices,
  getLogs,
  getReadings,
  getRooms,
  getUsers,
  login,
  postAlarmTest,
  register,
  unassignSensor,
} from "./api.js";

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

  it("creates an EventSource stream URL with sensorId and token", () => {
    localStorage.setItem("token", "stream-token");
    const eventSource = vi.fn();
    globalThis.EventSource = eventSource;

    connectReadingsStream("101");

    expect(eventSource).toHaveBeenCalledWith("/api/readings/stream?sensorId=101&token=stream-token");
  });

  it("loads rooms with auth headers", async () => {
    localStorage.setItem("token", "room-token");
    const rooms = [{ id: 1, name: "Kitchen" }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => rooms,
    });

    await expect(getRooms()).resolves.toEqual(rooms);
    expect(fetch).toHaveBeenCalledWith("/api/room", { headers: { Authorization: "Bearer room-token" } });
  });

  it("creates a room with JSON body", async () => {
    const room = { id: 1, name: "Kitchen" };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => room,
    });

    await expect(createRoom("Kitchen")).resolves.toEqual(room);
    expect(fetch).toHaveBeenCalledWith("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kitchen" }),
    });
  });

  it("assigns and unassigns sensors through room endpoints", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, sensorId: 101 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sensorId: 101 }),
      });

    await expect(assignSensorToRoom(1, 101)).resolves.toEqual({ id: 1, sensorId: 101 });
    await expect(unassignSensor(101)).resolves.toEqual({ sensorId: 101 });

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/room/1/assign-sensor", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensorId: 101 }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/room/unassign-sensor/101", {
      method: "PUT",
      headers: {},
    });
  });

  it("loads users and logs from admin endpoints", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, username: "admin" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "system log",
      });

    await expect(getUsers()).resolves.toEqual([{ id: 1, username: "admin" }]);
    await expect(getLogs()).resolves.toBe("system log");
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/users", { headers: {} });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/logs", { headers: {} });
  });

  it("uses backend message when changing a user role fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: "Only admins can change roles" }),
    });

    await expect(changeUserRole(7, "resident")).rejects.toThrow("Only admins can change roles");
  });

  it("uses fallback message when deleting a user fails without JSON body", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    await expect(deleteUser(7)).rejects.toThrow("Failed to delete user (404)");
  });

  it("logs in with username and password", async () => {
    const authResponse = { token: "jwt-token", user: { username: "piotr" } };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => authResponse,
    });

    await expect(login("piotr", "secret")).resolves.toEqual(authResponse);
    expect(fetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "piotr", password: "secret" }),
    });
  });

  it("uses backend message when login fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Account is locked" }),
    });

    await expect(login("piotr", "wrong")).rejects.toThrow("Account is locked");
  });

  it("registers new users and handles fallback registration errors", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: "new-user" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

    await expect(register("new-user", "secret")).resolves.toEqual({ id: 1, username: "new-user" });
    await expect(register("new-user", "secret")).rejects.toThrow("Registration failed.");
  });
});
