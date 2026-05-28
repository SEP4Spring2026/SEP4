import { getRole } from "../../auth/accessControl.js";

export function RoleBadge({ role }) {
  const roleMeta = getRole(role);

  return (
    <span className="role-badge" title={roleMeta.description}>
      {roleMeta.shortLabel}
    </span>
  );
}
