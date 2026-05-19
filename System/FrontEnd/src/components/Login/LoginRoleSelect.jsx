export function LoginRoleSelect({ roles, selectedRole, onRoleChange }) {
  return (
    <label className="login-field" htmlFor="login-role">
      <span>Access role</span>
      <select
        id="login-role"
        className="login-select"
        value={selectedRole}
        onChange={(event) => onRoleChange(event.target.value)}
      >
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </label>
  );
}
