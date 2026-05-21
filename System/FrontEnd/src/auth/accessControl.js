export const ROLES = {
  resident: {
    value: "resident",
    label: "Resident",
    shortLabel: "Resident",
    initials: "RE",
    assignedSensorId: "101",
    description: "Can view assigned room readings, warnings, and payload details.",
  },
  "building-admin": {
    value: "building-admin",
    label: "Building administrator",
    shortLabel: "Building admin",
    initials: "BA",
    assignedSensorId: "all",
    description: "Can view all rooms, devices, alerts, and alarm controls.",
  },
  "system-admin": {
    value: "system-admin",
    label: "System admin",
    shortLabel: "System admin",
    initials: "SA",
    assignedSensorId: "all",
    description: "Demo role for full dashboard and system-level controls.",
  },
};

export const accessRoles = Object.values(ROLES);

export const ACCESS_LEVELS = {
  prototype: "Prototype role selection only. No backend authentication or JWT is implemented.",
};

const ROLE_PERMISSIONS = {
  resident: {
    views: ["Home", "Sensors", "Samples", "Charts", "Payload"],
    canViewAllDevices: false,
    canUseAlarmControls: false,
    canViewAdminControls: false,
  },
  "building-admin": {
    views: ["Home", "Sensors", "Samples", "Charts", "Payload", "Settings"],
    canViewAllDevices: true,
    canUseAlarmControls: true,
    canViewAdminControls: true,
  },
  "system-admin": {
    views: ["Home", "Sensors", "Samples", "Charts", "Payload", "Settings"],
    canViewAllDevices: true,
    canUseAlarmControls: true,
    canViewAdminControls: true,
  },
};

export function getRole(roleValue) {
  return ROLES[roleValue] ?? ROLES.resident;
}

export function getPermissions(roleValue) {
  return ROLE_PERMISSIONS[getRole(roleValue).value] ?? ROLE_PERMISSIONS.resident;
}

export function createDemoSession(roleValue) {
  const role = getRole(roleValue);
  return {
    role: role.value,
    displayName: role.label,
    assignedSensorId: role.assignedSensorId,
  };
}

export function canAccessView(roleValue, viewName) {
  return getPermissions(roleValue).views.includes(viewName);
}

export function getDefaultView(roleValue) {
  return getPermissions(roleValue).views[0] ?? "Home";
}
