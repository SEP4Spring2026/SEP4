import { ACCESS_LEVELS } from "../../auth/accessControl.js";

export function AccessNotice() {
  return (
    <div className="access-notice" role="note">
      <strong>Demo access</strong>
      <span>{ACCESS_LEVELS.prototype}</span>
    </div>
  );
}
