import { getRole } from "../../auth/accessControl.js";
import { RoleBadge } from "./RoleBadge.jsx";

export function UserMenu({ session, onLogout }) {
  const role = getRole(session.role);

  return (
    <div className="user-menu">
      <div className="profile">{role.initials}</div>
      <div className="user-menu-copy">
        <RoleBadge role={session.role} />
        <button className="logout-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
