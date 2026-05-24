import { describe, expect, it } from "vitest";
import {
  canAccessView,
  createDemoSession,
  getDefaultView,
  getPermissions,
  getRole,
} from "./accessControl.js";

describe("accessControl", () => {
  it("falls back to resident role for unknown role values", () => {
    const role = getRole("unknown-role");

    expect(role.value).toBe("resident");
    expect(role.assignedSensorId).toBe("101");
  });

  it("maps role aliases to the real role values", () => {
    expect(getRole("building-admin").value).toBe("building-administrator");
    expect(getRole("system-admin").value).toBe("admin");
  });

  it("returns restricted permissions for residents", () => {
    const permissions = getPermissions("resident");

    expect(permissions.canViewAllDevices).toBe(false);
    expect(permissions.canViewAdminControls).toBe(false);
    expect(canAccessView("resident", "Settings")).toBe(false);
    expect(canAccessView("resident", "Payload")).toBe(true);
  });

  it("returns admin permissions for system admins", () => {
    const permissions = getPermissions("admin");

    expect(permissions.canViewAllDevices).toBe(true);
    expect(permissions.canUseAlarmControls).toBe(true);
    expect(canAccessView("admin", "Settings")).toBe(true);
  });

  it("creates a demo session from a selected role", () => {
    expect(createDemoSession("building-admin")).toEqual({
      role: "building-administrator",
      displayName: "Building administrator",
      assignedSensorId: "all",
    });
  });

  it("uses the first allowed view as default view", () => {
    expect(getDefaultView("resident")).toBe("Home");
    expect(getDefaultView("system-admin")).toBe("Home");
  });
});
