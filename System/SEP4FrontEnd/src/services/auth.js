const LOGIN_KEY = "sep4LoggedIn";
const ROLE_KEY = "sep4Role";

export const roleOptions = [
  { value: "resident", label: "Resident", initials: "R" },
  { value: "building-administrator", label: "Building administrator", initials: "BA" },
  { value: "system-admin", label: "System admin", initials: "SA" },
];

export function getRoleByValue(value) {
  return roleOptions.find((role) => role.value === value) ?? roleOptions[0];
}

export function getStoredLogin() {
  const isLoggedIn = window.localStorage.getItem(LOGIN_KEY) === "true";
  const role = getRoleByValue(window.localStorage.getItem(ROLE_KEY));

  return { isLoggedIn, role };
}

export function saveLogin(roleValue) {
  const role = getRoleByValue(roleValue);
  window.localStorage.setItem(LOGIN_KEY, "true");
  window.localStorage.setItem(ROLE_KEY, role.value);

  return role;
}

export function clearLogin() {
  window.localStorage.removeItem(LOGIN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}
