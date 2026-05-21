export function Sidebar({
  activeView,
  session,
  permissions,
  devices,
  selectedSensorId,
  sampleLimit,
  sampleLimitOptions,
  loadedCount,
  latestDeviceHealth,
  offlineAlerts,
  onViewChange,
  onSensorChange,
  onSampleLimitChange,
}) {
  const roleLabel = permissions.shortLabel ?? session.role ?? "User";
  const menuItems = permissions.views;
  const selectableDevices = permissions.canViewAllDevices
    ? devices
    : devices.filter((device) => String(device.sensorId) === String(session.assignedSensorId));

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-badge">S</div>
        <div>
          <p className="muted">Dashboard</p>
          <h1>SEP4 Web</h1>
        </div>
      </div>

      <nav className="menu">
        {menuItems.map((item) => (
          <button className={`menu-item${item === activeView ? " active" : ""}`} key={item} onClick={() => onViewChange(item)}>
            {item}
          </button>
        ))}
      </nav>

      <div className="status-card">
        <p className="muted">Current role</p>
        <strong>{roleLabel}</strong>
        <p className="device-meta">
          {permissions.canViewAllDevices ? "all devices allowed" : `assigned device ${session.assignedSensorId}`}
        </p>
      </div>

      <div className="status-card">
        <p className="muted">Sensor health</p>
        <strong className={latestDeviceHealth.statusType}>{latestDeviceHealth.statusLabel}</strong>
        <p className="device-meta">
          Last seen {latestDeviceHealth.lastSeenLabel}
        </p>
        <p className="device-meta">
          Uptime {latestDeviceHealth.uptimeLabel}
        </p>
      </div>

      <div className="status-card">
        <p className="muted">Offline alerts</p>
        <strong className={offlineAlerts.length ? "danger" : "success"}>
          {offlineAlerts.length}
        </strong>
        <p className="device-meta">
          {offlineAlerts.length ? "missing-data devices" : "all sensors reporting"}
        </p>
      </div>

      <div className="status-card device-card">
        <p className="muted">Device filter</p>
        <label className="device-select-label" htmlFor="device-select">
          Show readings from
        </label>
        <select
          id="device-select"
          className="device-select"
          value={selectedSensorId}
          onChange={(event) => onSensorChange(event.target.value)}
          disabled={!permissions.canViewAllDevices}
        >
          {permissions.canViewAllDevices ? <option value="all">All devices</option> : null}
          {selectableDevices.map((device) => (
            <option key={device.sensorId} value={device.sensorId}>
              Device {device.sensorId}
            </option>
          ))}
        </select>
        <p className="device-meta">
          {!permissions.canViewAllDevices
            ? `resident view: sensorId ${session.assignedSensorId}`
            : selectedSensorId === "all"
            ? `${devices.length} device${devices.length === 1 ? "" : "s"} available`
            : `sensorId ${selectedSensorId}`}
        </p>
      </div>

      <div className="status-card device-card">
        <p className="muted">Sample window</p>
        <label className="device-select-label" htmlFor="sample-limit-select">
          Max samples (last 7 days)
        </label>
        <select
          id="sample-limit-select"
          className="device-select"
          value={sampleLimit}
          onChange={(event) => onSampleLimitChange(event.target.value)}
        >
          {sampleLimitOptions.map((option) => (
            <option key={option} value={option}>
              {option} samples
            </option>
          ))}
        </select>
        <p className="device-meta">
          Showing {loadedCount} / {sampleLimit}
        </p>
      </div>
    </aside>
  );
}
