import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { OverviewCard } from "./components/OverviewCard.jsx";
import { PayloadCard } from "./components/PayloadCard.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { SampleCard } from "./components/SampleCard.jsx";
import { LineChart } from "./components/LineChart.jsx";
import { LoginPage } from "./components/Login/index.js";
import { StatusScreen } from "./components/StatusScreen/index.js";
import { AdminControls } from "./components/Dashboard/AdminControls.jsx";
import { RoomsView } from "./components/Dashboard/RoomsView.jsx";
import {
  connectReadingsStream,
  getDevices,
  getReadings,
  postAlarmTest,
  getAlerts,
  getUsers,
  changeUserRole,
  assignSensorToUser,
  deleteUser,
  getLogs,
} from "./services/api.js";

const SAMPLE_WINDOW_HOURS = 336;
const SAMPLE_LIMIT_OPTIONS = [200, 500, 1000, 2500, 5000];
const DEFAULT_SAMPLE_LIMIT = 1000;
const OFFLINE_AFTER_SECONDS = 120;
const DISPLAY_TIMEZONE = "Europe/Rome";
const SESSION_STORAGE_KEY = "sep4-session";

// ---------------------------------------------------------------------------
// Role config â€” drives nav tabs and feature flags
// ---------------------------------------------------------------------------
const ROLE_CONFIG = {
  resident: {
    shortLabel: "Resident",
    initials: "RS",
    views: ["Home", "Sensors", "Samples", "Payload", "Alarm", "Settings"],
    canViewAllDevices: false,
    canUseAlarmControls: true,
    canViewAdminControls: false,
    canManageRooms: false,
    canViewAlerts: false,
    canManageUsers: false,
    canViewLogs: false,
    canManageDevices: false,
  },
  "building-administrator": {
    shortLabel: "Building Admin",
    initials: "BA",
    views: ["Home", "Sensors", "Samples", "Payload", "Rooms", "Alerts", "Alarm", "Settings"],
    canViewAllDevices: true,
    canUseAlarmControls: true,
    canViewAdminControls: true,
    canManageRooms: true,
    canViewAlerts: true,
    canManageUsers: false,
    canViewLogs: false,
    canManageDevices: false,
  },
  admin: {
    shortLabel: "System Admin",
    initials: "SA",
    views: ["Home", "Sensors", "Samples", "Payload", "Rooms", "Alerts", "Alarm", "Settings", "Users", "Devices", "Logs"],
    canViewAllDevices: true,
    canUseAlarmControls: true,
    canViewAdminControls: true,
    canManageRooms: true,
    canViewAlerts: true,
    canManageUsers: true,
    canViewLogs: true,
    canManageDevices: true,
  },
  default: {
    shortLabel: "User",
    initials: "U",
    views: ["Home"],
    canViewAllDevices: false,
    canUseAlarmControls: false,
    canViewAdminControls: false,
    canManageRooms: false,
    canViewAlerts: false,
    canManageUsers: false,
    canViewLogs: false,
    canManageDevices: false,
  },
};

function getPermissions(role) {
  return ROLE_CONFIG[(role ?? "").toLowerCase()] ?? ROLE_CONFIG.default;
}

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------
function formatTimestampEuropeRome(date) {
  const d = date instanceof Date ? date : new Date(date);
  const instant = Number.isFinite(d.getTime()) ? d : new Date();
  const wall = new Intl.DateTimeFormat("sv-SE", {
    timeZone: DISPLAY_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(instant);
  const tzName = new Intl.DateTimeFormat("en-US", { timeZone: DISPLAY_TIMEZONE, timeZoneName: "longOffset" })
    .formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT+00";
  return `${wall.replace(" ", "T")}${offsetLongGmtToIso(tzName)}`;
}
function offsetLongGmtToIso(label) {
  const s = String(label).trim();
  const bare = s.match(/^([+-])(\d{2}):(\d{2})$/);
  if (bare) return `${bare[1]}${bare[2]}:${bare[3]}`;
  const m = s.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
  if (!m) return "+00:00";
  return `${m[1]}${m[2].padStart(2,"0")}:${(m[3]??"00").padStart(2,"0")}`;
}
function readingToContractPayload(r) {
  const ts = r.timestamp ? new Date(r.timestamp) : null;
  const timestamp = ts && Number.isFinite(ts.getTime())
    ? formatTimestampEuropeRome(ts) : formatTimestampEuropeRome(new Date());
  return {
    sensorId: r.sensorId, timestamp,
    sensors: {
      temperature: Number(r.temperature ?? 0), humidity: Number(r.humidity ?? 0),
      co2Level: Math.round(Number(r.co2Level ?? 0)), tvoc: Math.round(Number(r.tvoc ?? 0)),
      eco2: Math.round(Number(r.eco2 ?? 0)), aqi: Math.round(Number(r.aqi ?? 1)),
    },
    classification: r.classification ?? "Normal",
  };
}
function toSample(r) {
  const contract = readingToContractPayload(r);
  return {
    name: `Sample ${r.readingId}`, sensorId: r.sensorId, timestamp: r.timestamp,
    temp: r.temperature, hum: r.humidity, co2: r.co2Level,
    tvoc: r.tvoc ?? 0, eco2: r.eco2 ?? 0, aqi: r.aqi ?? 1,
    classification: r.classification ?? "Normal",
    payload: JSON.stringify(contract, null, 2),
    payloadLength: JSON.stringify(contract).length,
    dhtStatus: "online",
  };
}
function toDateMs(v) { if (!v) return null; const ms = Date.parse(v); return Number.isFinite(ms) ? ms : null; }
function formatDuration(s) {
  if (!Number.isFinite(s) || s < 0) return "n/a";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`; if (h > 0) return `${h}h ${m}m`; return `${m}m`;
}
function formatLastSeen(s) {
  if (!Number.isFinite(s)) return "never"; if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`; return `${Math.floor(s / 60)}m ago`;
}
function getDeviceHealth(device, nowMs) {
  const latestMs = toDateMs(device.latestTimestamp);
  const firstMs  = toDateMs(device.firstTimestamp);
  const lastSeenSeconds = latestMs == null ? null : Math.max(0, Math.floor((nowMs - latestMs) / 1000));
  const isOnline = lastSeenSeconds != null && lastSeenSeconds <= OFFLINE_AFTER_SECONDS;
  const uptimeSeconds = firstMs != null && latestMs != null ? Math.max(0, Math.floor((latestMs - firstMs) / 1000)) : 0;
  return {
    isOnline, missingData: !isOnline,
    statusLabel: isOnline ? "online" : "offline",
    statusType: isOnline ? "success" : "danger",
    lastSeenLabel: formatLastSeen(lastSeenSeconds),
    uptimeLabel: formatDuration(uptimeSeconds),
  };
}

// ---------------------------------------------------------------------------
// Recommendation engine (shared)
// ---------------------------------------------------------------------------
function getRecommendations(sample) {
  if (!sample) return [];
  const recs = [];
  const co2 = Number(sample.co2 ?? 0), temp = Number(sample.temp ?? 0);
  const hum = Number(sample.hum ?? 0), tvoc = Number(sample.tvoc ?? 0);
  const eco2 = Number(sample.eco2 ?? 0), aqi = Number(sample.aqi ?? 0);
  const cls = String(sample.classification ?? "Normal").toLowerCase();

  if (cls !== "normal") recs.push({ level: "danger", title: "Fire risk detected", message: `Classification is ${sample.classification}. Check the room immediately.` });
  if (co2 > 2000) recs.push({ level: "danger", title: "Unsafe CO2 level", message: "CO2 is very high. Evacuate and ventilate immediately." });
  else if (co2 > 1000) recs.push({ level: "warning", title: "High CO2 level", message: "Ventilate the room to improve air quality." });
  if (temp > 35) recs.push({ level: "danger", title: "Very high temperature", message: "Check for heat sources or fire risk." });
  else if (temp > 30) recs.push({ level: "warning", title: "High temperature", message: "Consider cooling or increasing ventilation." });
  if (hum > 70) recs.push({ level: "warning", title: "High humidity", message: "Humidity may reduce comfort and air quality." });
  else if (hum < 25) recs.push({ level: "info", title: "Low humidity", message: "Consider increasing humidity for comfort." });
  if (tvoc > 500 || eco2 > 1500 || aqi > 3) recs.push({ level: "warning", title: "Air quality needs attention", message: "Ventilation recommended. VOC/eCO2/AQI are elevated." });
  if (recs.length === 0) recs.push({ level: "success", title: "All readings normal", message: "No immediate action needed." });
  return recs;
}

function getReadingStatus(type, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { label: "unknown", className: "reading-unknown" };

  if (type === "temperature") {
    if (n > 35) return { label: "high", className: "reading-danger" };
    if (n > 30) return { label: "watch", className: "reading-warning" };
    return { label: "normal", className: "reading-success" };
  }

  if (type === "humidity") {
    if (n > 70 || n < 25) return { label: "watch", className: "reading-warning" };
    return { label: "normal", className: "reading-success" };
  }

  if (type === "co2") {
    if (n > 2000) return { label: "critical", className: "reading-danger" };
    if (n > 1000) return { label: "watch", className: "reading-warning" };
    return { label: "normal", className: "reading-success" };
  }

  if (type === "tvoc") {
    if (n > 500) return { label: "watch", className: "reading-warning" };
    return { label: "normal", className: "reading-success" };
  }

  if (type === "eco2") {
    if (n > 1500) return { label: "watch", className: "reading-warning" };
    return { label: "normal", className: "reading-success" };
  }

  if (type === "aqi") {
    if (n > 3) return { label: "high", className: "reading-danger" };
    if (n >= 3) return { label: "watch", className: "reading-warning" };
    return { label: "normal", className: "reading-success" };
  }

  return { label: "normal", className: "reading-success" };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ session, onLogout }) {
  const permissions = getPermissions(session.role);
  const defaultView = permissions.views[0] ?? "Home";

  const [activeView, setActiveView]       = useState(defaultView);
  const [samples, setSamples]             = useState([]);
  const [devices, setDevices]             = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState(
    () => permissions.canViewAllDevices ? "all" : (session.assignedSensorId ?? "")
  );
  const [selectedLimit, setSelectedLimit] = useState(DEFAULT_SAMPLE_LIMIT);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [nowMs, setNowMs]                 = useState(() => Date.now());
  const [alarmTestMessage, setAlarmTestMessage] = useState(null);
  const [alarmTestBusy, setAlarmTestBusy]       = useState(false);
  const [expandedChartSensorId, setExpandedChartSensorId] = useState(null);
  const hasSensorAccess = permissions.canViewAllDevices || session.assignedSensorId != null;

  useEffect(() => { const t = window.setInterval(() => setNowMs(Date.now()), 10000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!permissions.views.includes(activeView)) setActiveView(defaultView);
  }, [activeView, permissions.views, defaultView]);

  useEffect(() => {
    if (!permissions.canViewAllDevices && selectedSensorId !== session.assignedSensorId)
      setSelectedSensorId(session.assignedSensorId ?? "");
  }, [permissions.canViewAllDevices, selectedSensorId, session.assignedSensorId]);

  useEffect(() => {
    if (!permissions.canViewAllDevices) return; // residents get devices from readings
    getDevices().then(setDevices).catch((e) => console.error("Device API error:", e));
  }, [permissions.canViewAllDevices]);

  useEffect(() => {
    async function load() {
      if (!hasSensorAccess) {
        setSamples([]);
        setDevices([]);
        setError(null);
        setLoading(false);
        return;
      }

      try { setLoading(true); setError(null);
        const data = await getReadings(selectedSensorId, selectedLimit, SAMPLE_WINDOW_HOURS);
        setSamples(data.map(toSample));
      } catch (e) { setError(e); } finally { setLoading(false); }
    }
    load();
  }, [hasSensorAccess, selectedSensorId, selectedLimit]);

  useEffect(() => {
    if (!hasSensorAccess) return;

    const stream = connectReadingsStream(selectedSensorId);
    const onReading = (event) => {
      try {
        const r = JSON.parse(event.data);
        setSamples((prev) => [toSample(r), ...prev.filter((s) => s.name !== `Sample ${r.readingId}`)].slice(0, selectedLimit));
        setDevices((prev) => {
          const idx = prev.findIndex((d) => d.sensorId === r.sensorId);
          if (idx < 0) return [...prev, { sensorId: r.sensorId, status: "active", readingCount: 1, firstTimestamp: r.timestamp, latestTimestamp: r.timestamp }].sort((a,b) => a.sensorId - b.sensorId);
          const u = [...prev];
          u[idx] = { ...u[idx], status: "active", readingCount: (u[idx].readingCount ?? 0) + 1, firstTimestamp: u[idx].firstTimestamp ?? r.timestamp, latestTimestamp: r.timestamp };
          return u;
        });
      } catch (e) { console.error("Stream parse error:", e); }
    };
    stream.addEventListener("reading", onReading);
    stream.onerror = () => console.error("SSE disconnected, will retry.");
    return () => { stream.removeEventListener("reading", onReading); stream.close(); };
  }, [hasSensorAccess, selectedSensorId, selectedLimit]);

  if (loading) return <StatusScreen title="Loading dashboard" message="Preparing sensor readings." />;
  if (error)   return <StatusScreen title="Dashboard offline" message="Backend API not reachable." actionLabel="Sign out" onAction={onLogout} />;

  const latestSample = samples[0] ?? null;
  const selectedDevice = selectedSensorId === "all"
    ? devices.find((d) => String(d.sensorId) === String(latestSample?.sensorId))
    : devices.find((d) => String(d.sensorId) === String(selectedSensorId));
  const latestDeviceHealth = getDeviceHealth(selectedDevice ?? {}, nowMs);
  const offlineAlerts = devices.map((d) => ({ sensorId: d.sensorId, health: getDeviceHealth(d, nowMs) })).filter((e) => e.health.missingData);
  const summary = latestSample
    ? {
      sensorId: latestSample.sensorId,
      temp: latestSample.temp,
      hum: latestSample.hum,
      co2: latestSample.co2,
      tvoc: latestSample.tvoc,
      eco2: latestSample.eco2,
      aqi: latestSample.aqi,
      classification: latestSample.classification,
      selectedSensorId,
    }
    : {
      sensorId: selectedSensorId === "all" ? "none" : selectedSensorId,
      temp: "-",
      hum: "-",
      co2: "-",
      tvoc: "-",
      eco2: "-",
      aqi: "-",
      classification: "No data",
      selectedSensorId,
    };

  const pageTitles = {
    Home: "Home Overview", Sensors: "Sensor Details", Samples: "Sample History",
    Payload: "Payload Viewer", Rooms: "Room Management",
    Alerts: "Alert History", Alarm: "Alarm Controls", Settings: "Settings",
    Users: "User Management",
    Devices: "Device Management", Logs: "System Logs",
  };

  // â”€â”€ Sub-views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const stats = (arr) => {
    const vals = arr.map((d) => d.v).filter(Number.isFinite);
    if (!vals.length) return { avg: 0, min: 0, max: 0, latest: 0, count: 0 };
    return {
      avg: vals.reduce((a,b)=>a+b,0)/vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      latest: vals[vals.length-1],
      count: vals.length,
    };
  };
  const fmt = (n, d) => Number(n).toFixed(d);
  const buildTrendModel = (sourceSamples) => {
    const series = [...sourceSamples].reverse();
    const tempData = series.map((s) => ({ t: s.timestamp, v: Number(s.temp) }));
    const humData = series.map((s) => ({ t: s.timestamp, v: Number(s.hum) }));
    const co2Data = series.map((s) => ({ t: s.timestamp, v: Number(s.co2) }));
    return {
      series,
      tempData,
      humData,
      co2Data,
      tS: stats(tempData),
      hS: stats(humData),
      cS: stats(co2Data),
    };
  };

  function TrendChartCard({ title, unit, s, data, decimals = 1, embedded = false }) {
    return (
      <article className={`${embedded ? "chart-panel" : "card"} chart-card`}>
        <div className="card-header">
          <div><h3>{title}</h3><p className="muted">Avg / min / max over {s.count} samples</p></div>
          <span className="tag">{fmt(s.avg, decimals)}{unit}</span>
        </div>
        <div className="chart-stats">
          {[["Avg", s.avg], ["Min", s.min], ["Max", s.max], ["Latest", s.latest]].map(([label, val]) => (
            <div key={label}><span className="muted">{label}</span><strong>{fmt(val, decimals)}{unit}</strong></div>
          ))}
        </div>
        <LineChart data={data} unit={unit} />
      </article>
    );
  }

  function DeviceCharts({ deviceSamples }) {
    const { tempData, humData, co2Data, tS, hS, cS } = buildTrendModel(deviceSamples);
    return (
      <div className="grid charts-grid sensor-charts-grid">
        <TrendChartCard title="Temperature trend" unit={"\u00b0C"} s={tS} data={tempData} decimals={1} embedded />
        <TrendChartCard title="Humidity trend" unit="%" s={hS} data={humData} decimals={1} embedded />
        <TrendChartCard title="CO2 trend" unit=" ppm" s={cS} data={co2Data} decimals={0} embedded />
      </div>
    );
  }

  function NoReadingsCard() {
    const deviceLabel = selectedSensorId === "all" ? "this selection" : `Device ${selectedSensorId}`;
    return (
      <article className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>No readings found</h3>
        <p className="muted">No readings available for {deviceLabel}.</p>
      </article>
    );
  }

  function HomeView() {
    const recs = latestSample
      ? getRecommendations(latestSample)
      : [{ level: "info", title: "No readings found", message: "No readings available for this device yet." }];
    const isAdmin = permissions.canViewAllDevices;
    return (
      <>
        <section className="grid top-grid">
          <OverviewCard summary={summary} />
        </section>
        <div className="section-spacer" />
        {/* Classification + recommendations â€” relevant to all roles */}
        <section className="grid home-action-grid">
          <article className="card">
            <h3>Recommendations</h3>
            <div className="recommendation-list" style={{ marginTop: 8 }}>
              {recs.map((rec, i) => (
                <div className={`recommendation-item ${rec.level}`} key={i}>
                  <strong>{rec.title}</strong>
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <h3>Room Classification</h3>
            <p style={{ marginTop: 8 }}>
              Current status:{" "}
              <strong className={latestSample?.classification === "Normal" ? "success" : latestSample ? "danger" : ""}>
                {latestSample?.classification ?? "No data"}
              </strong>
            </p>
            {latestSample?.classification === "Cooking" && (
              <p className="muted" style={{ marginTop: 8 }}>
                Cooking activity detected. Ventilate if needed.
              </p>
            )}
            {latestSample?.classification === "Fire" && (
              <p className="danger" style={{ marginTop: 8, fontWeight: 600 }}>
                Possible fire detected. Verify the room immediately and trigger the alarm if necessary.
              </p>
            )}
          </article>
        </section>
        <div className="section-spacer" />

        {/* Multi-room overview for admins */}
        {isAdmin && offlineAlerts.length > 0 && (
          <>
            <article className="card" style={{ marginBottom: 24 }}>
              <h3>Offline Devices ({offlineAlerts.length})</h3>
              <p className="muted">These devices have not reported within {OFFLINE_AFTER_SECONDS}s.</p>
              <div style={{ marginTop: 12 }}>
                {offlineAlerts.map((a) => (
                  <div className="summary-row" key={a.sensorId}>
                    <span>Device {a.sensorId}</span>
                    <strong className="danger">{a.health.lastSeenLabel}</strong>
                  </div>
                ))}
              </div>
            </article>
          </>
        )}

      </>
    );
  }

  function SensorsView() {
    const deviceMap = new Map(devices.map((device) => [String(device.sensorId), device]));
    for (const sample of samples) {
      const key = String(sample.sensorId);
      if (!deviceMap.has(key)) {
        deviceMap.set(key, {
          sensorId: sample.sensorId,
          status: "active",
          readingCount: samples.filter((s) => String(s.sensorId) === String(sample.sensorId)).length,
          firstTimestamp: sample.timestamp,
          latestTimestamp: sample.timestamp,
        });
      }
    }

    const deviceList = [...deviceMap.values()]
      .filter((device) => selectedSensorId === "all" || String(device.sensorId) === String(selectedSensorId))
      .sort((a, b) => Number(a.sensorId) - Number(b.sensorId));

    return (
      <section className="grid sensors-device-list">
        {deviceList.length === 0 && <NoReadingsCard />}
        {deviceList.map((device) => {
          const deviceSamples = samples.filter((sample) => String(sample.sensorId) === String(device.sensorId));
          const latestForDevice = samples.find((sample) => String(sample.sensorId) === String(device.sensorId));
          const health = getDeviceHealth(device, nowMs);
          const isChartExpanded = String(expandedChartSensorId) === String(device.sensorId);
          const readings = latestForDevice ? [
            { label: "Temperature", type: "temperature", value: latestForDevice.temp, unit: "\u00b0C" },
            { label: "Humidity", type: "humidity", value: latestForDevice.hum, unit: "%" },
            { label: "CO2", type: "co2", value: latestForDevice.co2, unit: "ppm" },
            { label: "TVOC", type: "tvoc", value: latestForDevice.tvoc, unit: "ppb" },
            { label: "eCO2", type: "eco2", value: latestForDevice.eco2, unit: "ppm" },
            { label: "AQI", type: "aqi", value: latestForDevice.aqi ?? "-", unit: "" },
          ] : [];

          return (
            <article className="card sensor-device-card" key={device.sensorId}>
              <div className="card-header">
                <div>
                  <h3>Device {device.sensorId}</h3>
                  <p className="muted">
                    {latestForDevice
                      ? `${device.readingCount ?? 0} readings. Last seen ${health.lastSeenLabel}.`
                      : "No readings available for this device."}
                  </p>
                </div>
                <div className="sensor-device-actions">
                  <span className={health.statusType}>{health.statusLabel}</span>
                  {latestForDevice && (
                    <button
                      type="button"
                      className="menu-item inline-action"
                      onClick={() => setExpandedChartSensorId(isChartExpanded ? null : device.sensorId)}
                    >
                      {isChartExpanded ? "Hide charts" : "Show charts"}
                    </button>
                  )}
                </div>
              </div>

              {latestForDevice ? (
                <>
                  <div className="sensor-reading-grid">
                    {readings.map((reading) => {
                      const status = getReadingStatus(reading.type, reading.value);
                      return (
                        <div className={`sensor-reading ${status.className}`} key={reading.type}>
                          <span className="muted">{reading.label}</span>
                          <strong>{reading.value} {reading.unit}</strong>
                          <small>{status.label}</small>
                        </div>
                      );
                    })}
                  </div>
                  {isChartExpanded && <DeviceCharts deviceSamples={deviceSamples} />}
                </>
              ) : (
                <p className="muted sensor-empty-state">Waiting for the first reading from this device.</p>
              )}
            </article>
          );
        })}
      </section>
    );
  }
  function AlertsView() {
    return (
      <section className="grid alerts-grid">
        <article className="card alerts-summary-card">
          <div className="card-header">
            <div>
              <h3>Active Alerts</h3>
              <p className="muted">Generated from latest readings and device health</p>
            </div>
            <span className={displayAlerts.length ? "danger" : "success"}>
              {displayAlerts.length}
            </span>
          </div>
        </article>

        {displayAlerts.length === 0 ? (
          <article className="card">
            <h3>No active alerts</h3>
            <p className="muted">All current readings are within the configured alert rules.</p>
          </article>
        ) : (
          displayAlerts.map((alert) => (
            <article className={`card alert-card ${alert.severity}`} key={alert.id}>
              <div>
                <div className="alert-heading">
                  <span className={`alert-severity ${alert.severity}`}>
                    {alert.severity}
                  </span>
                  <span className="muted">Device {alert.sensorId}</span>
                </div>
                <h3>{alert.title}</h3>
                <p>{alert.message}</p>
              </div>
              <button
                type="button"
                className="alert-dismiss"
                onClick={() => setDismissedAlertIds((prev) => [...prev, alert.id])}
              >
                Dismiss
              </button>
            </article>
          ))
        )}
      </section>
    );
  }

  function SamplesView() {
    if (!samples.length) {
      return (
        <section className="grid bottom-grid view-grid">
          <NoReadingsCard />
        </section>
      );
    }

    return (
      <section className="grid bottom-grid view-grid">
        {samples.map((sample) => (
          <SampleCard key={sample.name} sample={{ ...sample, dhtStatus: getDeviceHealth(devices.find((d) => d.sensorId === sample.sensorId) ?? {}, nowMs).statusLabel }} />
        ))}
      </section>
    );
  }

  function PayloadView() {
    if (!latestSample) {
      return (
        <section className="grid payload-grid">
          <NoReadingsCard />
        </section>
      );
    }

    const payloadDetails = [
      ["Device ID", latestSample.sensorId],
      ["Timestamp", latestSample.timestamp],
      ["Length", latestSample.payloadLength],
      ["Temperature", `${latestSample.temp} \u00b0C`],
      ["Humidity", `${latestSample.hum} %`],
      ["CO2", `${latestSample.co2} ppm`],
      ["TVOC", `${latestSample.tvoc} ppb`],
      ["eCO2", `${latestSample.eco2} ppm`],
      ["AQI", latestSample.aqi],
      ["Classification", latestSample.classification],
    ];

    return (
      <section className="grid payload-grid">
        <PayloadCard payload={latestSample.payload} />
        <article className="card">
          <h3>Payload Details</h3>
          {payloadDetails.map(([k, v]) => (
            <div className="summary-row" key={k}><span>{k}</span><strong>{v}</strong></div>
          ))}
        </article>
      </section>
    );
  }

  // â”€â”€ Alarm view: available to ALL roles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function AlarmView() {
    return (
      <section className="grid settings-grid">
        {permissions.canUseAlarmControls ? (
          <AdminControls
            selectedSensorId={selectedSensorId}
            alarmTestBusy={alarmTestBusy}
            alarmTestMessage={alarmTestMessage}
            onAlarmTest={runAlarmTest}
          />
        ) : null}

        <article className="card">
          <h3>Current room status</h3>
          {latestSample ? (
            <div className="summary-row"><span>Classification</span>
              <strong className={latestSample.classification === "Normal" ? "success" : "danger"}>
                {latestSample.classification ?? "Unknown"}
              </strong>
            </div>
          ) : (
            <div className="summary-row"><span>Classification</span><strong>n/a</strong></div>
          )}
          <div className="summary-row"><span>Device status</span>
            <strong className={latestDeviceHealth.statusType}>{latestDeviceHealth.statusLabel}</strong>
          </div>
          <div className="summary-row"><span>Last seen</span><strong>{latestDeviceHealth.lastSeenLabel}</strong></div>
          <div className="summary-row"><span>Uptime</span><strong>{latestDeviceHealth.uptimeLabel}</strong></div>
        </article>
      </section>
    );
  }

  // â”€â”€ Alerts view: building-admin + system-admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function AlertsView() {
    const [alerts, setAlerts]     = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [alertsError, setAlertsError]     = useState(null);

    useEffect(() => {
      getAlerts(permissions.canViewAllDevices ? null : selectedSensorId, 100)
        .then(setAlerts)
        .catch((e) => setAlertsError(e.message))
        .finally(() => setAlertsLoading(false));
    }, []);

    if (alertsLoading) return <p className="muted">Loading alertsâ€¦</p>;
    if (alertsError)   return <p className="danger">{alertsError}</p>;

    return (
      <section className="grid">
        <article className="card" style={{ gridColumn: "1 / -1" }}>
          <h3>Alert History ({alerts.length})</h3>
          <p className="muted">Readings where classification was not Normal.</p>
          {alerts.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>No alerts recorded.</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              {alerts.map((a) => (
                <div key={a.readingId} className="summary-row" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <span>
                    Device {a.sensorId} &mdash;{" "}
                    <span className="muted">{new Date(a.timestamp).toLocaleString()}</span>
                  </span>
                  <strong className="danger">{a.classification}</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    );
  }

  // â”€â”€ Users view: system-admin only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function UsersView() {
    const [users, setUsers]       = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError]     = useState(null);
    const [busy, setBusy]         = useState({});
    const [sensorInputs, setSensorInputs] = useState({});
    const ROLES = ["resident", "building-administrator", "admin"];

    useEffect(() => {
      getUsers().then(setUsers).catch((e) => setUsersError(e.message)).finally(() => setUsersLoading(false));
    }, []);

    async function handleRoleChange(userId, newRole) {
      const targetUser = users.find((u) => u.id === userId);
      const isSelf = userId === session.userId;
      const isAdminDemotion = targetUser?.role === "admin" && newRole !== "admin";

      if (isAdminDemotion && isSelf) {
        const adminCount = users.filter((u) => u.role === "admin").length;
        if (adminCount <= 1) {
          alert("You cannot remove the only admin. Assign admin role to another user first.");
          return;
        }

        const confirmed = window.confirm(
          "You are changing your own admin role. You will be signed out and must sign in again with the new permissions. Continue?"
        );
        if (!confirmed) return;
      }

      setBusy((p) => ({ ...p, [userId]: true }));
      try {
        const updated = await changeUserRole(userId, newRole);
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: updated.role } : u));
        if (isSelf && updated.role !== session.role) {
          alert("Your role has changed. Sign in again to refresh permissions.");
          onLogout();
        }
      } catch (e) { alert(e.message); }
      finally { setBusy((p) => ({ ...p, [userId]: false })); }
    }

    async function handleSensorAssign(userId) {
      const raw = sensorInputs[userId] ?? "";
      if (!raw) {
        alert("Select a sensor.");
        return;
      }
      const sensorId = raw === "none" ? null : parseInt(raw, 10);
      if (sensorId !== null && (Number.isNaN(sensorId) || sensorId < 1)) {
        alert("Select a valid sensor.");
        return;
      }

      setBusy((p) => ({ ...p, [userId]: true }));
      try {
        const updated = await assignSensorToUser(userId, sensorId);
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, assignedSensorId: updated.assignedSensorId } : u));
        setSensorInputs((prev) => ({ ...prev, [userId]: "" }));
      } catch (e) { alert(e.message); }
      finally { setBusy((p) => ({ ...p, [userId]: false })); }
    }

    async function handleDelete(userId, username) {
      if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
      setBusy((p) => ({ ...p, [userId]: true }));
      try {
        await deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (e) { alert(e.message); }
      finally { setBusy((p) => ({ ...p, [userId]: false })); }
    }

    if (usersLoading) return <p className="muted">Loading usersâ€¦</p>;
    if (usersError)   return <p className="danger">{usersError}</p>;

    return (
      <section className="grid">
        <article className="card" style={{ gridColumn: "1 / -1" }}>
          <h3>User Accounts ({users.length})</h3>
          <p className="muted">Change roles or remove accounts. New registrations default to Resident.</p>
          <div className="users-table">
            <div className="users-row users-row-header">
              <span>User</span>
              <span>Role</span>
              <span>Assigned sensor</span>
              <span>New sensor</span>
              <span>Actions</span>
            </div>
            {users.map((u) => (
              <div key={u.id} className="users-row">
                <span className="users-name"><strong>{u.username}</strong></span>
                <select
                  className="device-select"
                  value={u.role}
                  disabled={busy[u.id] || (u.role === "admin" && u.id !== session.userId)}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <span className="muted users-sensor">
                  {u.role === "resident" ? `Sensor: ${u.assignedSensorId ?? "none"}` : "-"}
                </span>
                <div className="users-assign">
                  {u.role === "resident" && (
                    <>
                      <select
                        className="device-select"
                        value={sensorInputs[u.id] ?? ""}
                        disabled={busy[u.id]}
                        onChange={(e) => setSensorInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      >
                        <option value="">Select sensor</option>
                        <option value="none">No sensor</option>
                        {devices.map((device) => (
                          <option key={device.sensorId} value={device.sensorId}>
                            Sensor {device.sensorId}
                          </option>
                        ))}
                      </select>
                      <button
                        className="menu-item inline-action"
                        type="button"
                        disabled={busy[u.id]}
                        onClick={() => handleSensorAssign(u.id)}
                      >
                        Assign
                      </button>
                    </>
                  )}
                </div>
                <div className="users-actions">
                  <button
                    className="menu-item inline-action"
                    type="button"
                    disabled={busy[u.id] || u.id === session.userId}
                    onClick={() => handleDelete(u.id, u.username)}
                    style={{ background: "rgba(239,68,68,.15)", color: "#f87171", borderColor: "rgba(239,68,68,.3)" }}
                  >
                    Delete
                  </button>
                  {u.id === session.userId && <span className="muted">(you)</span>}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  // â”€â”€ Devices view: system-admin only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function DevicesView() {
    return (
      <section className="grid stats-grid">
        <article className="card" style={{ gridColumn: "1 / -1" }}>
          <h3>IoT Devices ({devices.length})</h3>
          <p className="muted">Live connectivity status for all registered sensors.</p>
          <div style={{ marginTop: 16 }}>
            {devices.length === 0 ? <p className="muted">No devices registered.</p> : devices.map((d) => {
              const health = getDeviceHealth(d, nowMs);
              return (
                <div key={d.sensorId} className="summary-row" style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <span>Device {d.sensorId}</span>
                  <span className="muted">{d.readingCount} readings</span>
                  <span className="muted">First: {d.firstTimestamp ? new Date(d.firstTimestamp).toLocaleDateString() : "â€”"}</span>
                  <span className="muted">Last: {health.lastSeenLabel}</span>
                  <strong className={health.statusType}>{health.statusLabel}</strong>
                </div>
              );
            })}
          </div>
        </article>
        <article className="card">
          <h3>Offline Alerts ({offlineAlerts.length})</h3>
          {offlineAlerts.length === 0
            ? <p className="muted">All devices reporting.</p>
            : offlineAlerts.map((a) => (
                <div className="summary-row" key={a.sensorId}>
                  <span>Device {a.sensorId}</span>
                  <strong className="danger">{a.health.lastSeenLabel}</strong>
                </div>
              ))}
        </article>
      </section>
    );
  }

  // â”€â”€ Logs view: system-admin only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function LogsView() {
    const [logs, setLogs]       = useState("");
    const [logsLoading, setLogsLoading] = useState(true);
    const [logsError, setLogsError]     = useState(null);

    useEffect(() => {
      getLogs().then(setLogs).catch((e) => setLogsError(e.message)).finally(() => setLogsLoading(false));
    }, []);

    if (logsLoading) return <p className="muted">Loading logsâ€¦</p>;
    if (logsError)   return <p className="danger">{logsError}</p>;

    return (
      <section className="grid">
        <article className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <h3>System Logs</h3>
            <button className="menu-item inline-action" onClick={() => { setLogsLoading(true); getLogs().then(setLogs).catch((e)=>setLogsError(e.message)).finally(()=>setLogsLoading(false)); }}>
              Refresh
            </button>
          </div>
          <pre style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6, color: "#9ca3af", maxHeight: 600, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {logs || "No log entries."}
          </pre>
        </article>
      </section>
    );
  }

  // â”€â”€ Alarm helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function runAlarmTest(level) {
    const targetSensor = permissions.canViewAllDevices ? selectedSensorId : session.assignedSensorId;
    if (!targetSensor || targetSensor === "all") {
      setAlarmTestMessage({ type: "error", text: "Choose a specific device first." });
      return;
    }
    setAlarmTestBusy(true);
    setAlarmTestMessage(null);
    try {
      await postAlarmTest(Number(targetSensor), level);
      setAlarmTestMessage({ type: "ok", text: "MQTT command sent to the board." });
    } catch (e) {
      setAlarmTestMessage({ type: "error", text: e instanceof Error ? e.message : String(e) });
    } finally { setAlarmTestBusy(false); }
  }

  function SettingsView() {
    return (
      <section className="grid settings-grid">
        {permissions.canUseAlarmControls ? (
          <AdminControls
            selectedSensorId={selectedSensorId}
            alarmTestBusy={alarmTestBusy}
            alarmTestMessage={alarmTestMessage}
            onAlarmTest={runAlarmTest}
          />
        ) : null}
        <article className="card">
          <h3>Sensor Health</h3>
          {[["Status", <strong className={latestDeviceHealth.statusType}>{latestDeviceHealth.statusLabel}</strong>],
            ["Last seen", latestDeviceHealth.lastSeenLabel],
            ["Uptime", latestDeviceHealth.uptimeLabel],
            ["Offline threshold", `${OFFLINE_AFTER_SECONDS}s`]].map(([k,v]) => (
              <div className="summary-row" key={k}><span>{k}</span>{typeof v === "string" ? <strong>{v}</strong> : v}</div>
          ))}
        </article>
        <article className="card">
          <h3>Offline Alerts ({offlineAlerts.length})</h3>
          {offlineAlerts.length === 0 ? <p className="muted">All sensors reporting.</p>
            : offlineAlerts.map((a) => (
                <div className="summary-row" key={a.sensorId}><span>Device {a.sensorId}</span><strong className="danger">{a.health.lastSeenLabel}</strong></div>
              ))}
        </article>
      </section>
    );
  }

  // â”€â”€ Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sidebarSession = { role: session.role, assignedSensorId: session.assignedSensorId ?? null };
  const sidebarPermissions = {
    views: permissions.views,
    shortLabel: permissions.shortLabel,
    canViewAllDevices: permissions.canViewAllDevices,
    canViewAdminControls: permissions.canViewAdminControls
  };

  return (
    <div className="page">
      <Sidebar
        activeView={activeView}
        session={sidebarSession}
        permissions={sidebarPermissions}
        devices={devices}
        selectedSensorId={selectedSensorId}
        sampleLimit={selectedLimit}
        sampleLimitOptions={SAMPLE_LIMIT_OPTIONS}
        loadedCount={samples.length}
        latestDeviceHealth={latestDeviceHealth}
        offlineAlerts={offlineAlerts}
        onViewChange={setActiveView}
        onSensorChange={setSelectedSensorId}
        onSampleLimitChange={(v) => setSelectedLimit(Number(v))}
      />
      <main className="content">
        <Topbar title={pageTitles[activeView] ?? activeView} activeView={activeView} session={sidebarSession} onLogout={onLogout} />
        {activeView === "Home"    && <HomeView />}
        {activeView === "Sensors" && <SensorsView />}
        {activeView === "Samples" && <SamplesView />}
        {activeView === "Payload" && <PayloadView />}
        {activeView === "Rooms"   && <RoomsView devices={devices} />}
        {activeView === "Alerts"  && <AlertsView />}
        {activeView === "Alarm"   && <AlarmView />}
        {activeView === "Settings" && <SettingsView />}
        {activeView === "Users"   && <UsersView />}
        {activeView === "Devices" && <DevicesView />}
        {activeView === "Logs"    && <LogsView />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
function App() {
  const [session, setSession] = useState(() => {
    try { const s = window.localStorage.getItem(SESSION_STORAGE_KEY); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  function handleAuth(data) {
    if (!data?.token || !data?.user) { console.error("Bad auth response:", data); return; }
    window.localStorage.setItem("token", data.token);
    const next = {
      token: data.token,
      userId: data.user.id,
      username: data.user.username,
      role: (data.user.role ?? "resident").toLowerCase(),
      assignedSensorId: data.user.assignedSensorId ?? null,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }

  function handleLogout() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem("token");
    setSession(null);
  }

  if (!session) return <LoginPage onAuth={handleAuth} />;
  return <Dashboard session={session} onLogout={handleLogout} />;
}

export default App;
