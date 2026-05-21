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
import { RestrictedNotice } from "./components/Dashboard/RestrictedNotice.jsx";
import { canAccessView, getDefaultView, getPermissions } from "./auth/accessControl.js";
import { connectReadingsStream, getDevices, getReadings, postAlarmTest, getRooms } from "./services/api.js";
import { RoomsView } from "./components/RoomsView.jsx";
import { login } from "./services/api.js";

/** Passed to GET /api/readings so charts cover the last day of data. */
const SAMPLE_WINDOW_HOURS = 168;
const SAMPLE_LIMIT_OPTIONS = [200, 500, 1000, 2500, 5000];
const DEFAULT_SAMPLE_LIMIT = 1000;
const OFFLINE_AFTER_SECONDS = 120;

const DISPLAY_TIMEZONE = "Europe/Rome";

/** ISO 8601 using Rome wall clock and offset (+01:00 / +02:00), matching MainServer LocalReadingTimestamp. */
function formatTimestampEuropeRome(date) {
  const d = date instanceof Date ? date : new Date(date);
  const instant = Number.isFinite(d.getTime()) ? d : new Date();

  const wall = new Intl.DateTimeFormat("sv-SE", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  const isoLocal = wall.replace(" ", "T");

  const tzName =
    new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIMEZONE,
      timeZoneName: "longOffset",
    })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+00";

  return `${isoLocal}${offsetLongGmtToIso(tzName)}`;
}

function offsetLongGmtToIso(label) {
  const s = String(label).trim();
  const bare = s.match(/^([+-])(\d{2}):(\d{2})$/);
  if (bare) return `${bare[1]}${bare[2]}:${bare[3]}`;
  const m = s.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
  if (!m) return "+00:00";
  const hh = m[2].padStart(2, "0");
  const mm = (m[3] ?? "00").padStart(2, "0");
  return `${m[1]}${hh}:${mm}`;
}

/** Same nested JSON shape as the IoT → backend contract (for display). */
function readingToContractPayload(r) {
  const ts = r.timestamp ? new Date(r.timestamp) : null;
  const timestamp =
    ts && Number.isFinite(ts.getTime())
      ? formatTimestampEuropeRome(ts)
      : formatTimestampEuropeRome(new Date());
  return {
    sensorId: r.sensorId,
    timestamp,
    sensors: {
      temperature: Number(r.temperature ?? 0),
      humidity: Number(r.humidity ?? 0),
      co2Level: Math.round(Number(r.co2Level ?? 0)),
      tvoc: Math.round(Number(r.tvoc ?? 0)),
      eco2: Math.round(Number(r.eco2 ?? 0)),
      aqi: Math.round(Number(r.aqi ?? 1)),
    },
    classification: r.classification ?? "Normal",
  };
}

function toSample(r) {
  const contract = readingToContractPayload(r);
  return {
    name: `Sample ${r.readingId}`,
    sensorId: r.sensorId,
    timestamp: r.timestamp,
    temp: r.temperature,
    hum: r.humidity,
    co2: r.co2Level,
    tvoc: r.tvoc ?? 0,
    eco2: r.eco2 ?? 0,
    aqi: r.aqi ?? 1,
    classification: r.classification ?? "Normal",
    payload: JSON.stringify(contract, null, 2),
    payloadLength: JSON.stringify(contract).length,
    dhtStatus: "online",
  };
}

function toDateMs(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "n/a";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatLastSeen(lastSeenSeconds) {
  if (!Number.isFinite(lastSeenSeconds)) return "never";
  if (lastSeenSeconds < 5) return "just now";
  if (lastSeenSeconds < 60) return `${lastSeenSeconds}s ago`;
  return `${Math.floor(lastSeenSeconds / 60)}m ago`;
}

function getDeviceHealth(device, nowMs) {
  const latestMs = toDateMs(device.latestTimestamp);
  const firstMs = toDateMs(device.firstTimestamp);
  const lastSeenSeconds = latestMs == null ? null : Math.max(0, Math.floor((nowMs - latestMs) / 1000));
  const isOnline = lastSeenSeconds != null && lastSeenSeconds <= OFFLINE_AFTER_SECONDS;
  const uptimeSeconds = firstMs != null && latestMs != null ? Math.max(0, Math.floor((latestMs - firstMs) / 1000)) : 0;
  return {
    isOnline,
    missingData: !isOnline,
    statusLabel: isOnline ? "online" : "offline",
    statusType: isOnline ? "success" : "danger",
    lastSeenLabel: formatLastSeen(lastSeenSeconds),
    uptimeLabel: formatDuration(uptimeSeconds),
  };
}

function Dashboard({ session, onLogout }) {
  const permissions = getPermissions(session.role);
  const [activeView, setActiveView] = useState(() => getDefaultView(session.role));
  const [samples, setSamples] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState(() =>
    permissions.canViewAllDevices ? "all" : session.assignedSensorId
  );
  const [selectedLimit, setSelectedLimit] = useState(DEFAULT_SAMPLE_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [alarmTestMessage, setAlarmTestMessage] = useState(null);
  const [alarmTestBusy, setAlarmTestBusy] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canAccessView(session.role, activeView)) {
      setActiveView(getDefaultView(session.role));
    }
  }, [activeView, session.role]);

  useEffect(() => {
    if (!permissions.canViewAllDevices && selectedSensorId !== session.assignedSensorId) {
      setSelectedSensorId(session.assignedSensorId);
    }
  }, [permissions.canViewAllDevices, selectedSensorId, session.assignedSensorId]);

  useEffect(() => {
    async function loadDevices() {
      try {
        const data = await getDevices();
        setDevices(data);
      } catch (err) {
        console.error("Device API error:", err);
      }
    }

    loadDevices();
  }, []);

  useEffect(() => {
  async function loadRooms() {
    try {
      const data = await getRooms();

      setRooms(data);

    } catch (err) {
      console.error("Room API error:", err);
    }
  }

  loadRooms();
  }, []);

  useEffect(() => {
    async function loadReadings() {
      try {
        setLoading(true);
        setError(null);
        const data = await getReadings(selectedSensorId, selectedLimit, SAMPLE_WINDOW_HOURS);
        const mappedSamples = data.map(toSample);

        setSamples(mappedSamples);
      } catch (err) {
        console.error("API error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadReadings();
  }, [selectedSensorId, selectedLimit]);

  useEffect(() => {
    const stream = connectReadingsStream(selectedSensorId);

    const onReading = (event) => {
      try {
        const reading = JSON.parse(event.data);
        setSamples((prev) => {
          const next = [toSample(reading), ...prev.filter((s) => s.name !== `Sample ${reading.readingId}`)];
          return next.slice(0, selectedLimit);
        });

        setDevices((prev) => {
          const idx = prev.findIndex((d) => d.sensorId === reading.sensorId);
          if (idx < 0) {
            return [
              ...prev,
              {
                sensorId: reading.sensorId,
                status: "active",
                readingCount: 1,
                firstTimestamp: reading.timestamp,
                latestTimestamp: reading.timestamp,
              },
            ].sort((a, b) => a.sensorId - b.sensorId);
          }

          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            status: "active",
            readingCount: (updated[idx].readingCount ?? 0) + 1,
            firstTimestamp: updated[idx].firstTimestamp ?? reading.timestamp,
            latestTimestamp: reading.timestamp,
          };
          return updated;
        });
      } catch (streamErr) {
        console.error("Stream parse error:", streamErr);
      }
    };

    const onError = () => {
      console.error("Readings SSE disconnected, browser will retry automatically.");
    };

    stream.addEventListener("reading", onReading);
    stream.onerror = onError;

    return () => {
      stream.removeEventListener("reading", onReading);
      stream.close();
    };
  }, [selectedSensorId, selectedLimit]);

  if (loading) {
    return <StatusScreen title="Loading dashboard" message="Preparing the latest sensor readings." />;
  }

  if (error) {
    return (
      <StatusScreen
        title="Dashboard offline"
        message="The frontend is running, but the backend API is not reachable right now."
        actionLabel="Back to sign in"
        onAction={onLogout}
      />
    );
  }

  if (!samples.length) {
    return (
      <StatusScreen
        title="No readings found"
        message="There are no readings for this device selection yet."
        actionLabel="Back to sign in"
        onAction={onLogout}
      />
    );
  }

  const latestSample = samples[0];
  const latestDeviceHealth = getDeviceHealth(
    devices.find((d) => d.sensorId === latestSample.sensorId) ?? {},
    nowMs
  );
  const offlineAlerts = devices
    .map((device) => ({ sensorId: device.sensorId, health: getDeviceHealth(device, nowMs) }))
    .filter((entry) => entry.health.missingData);

  const summary = {
  sensorId: latestSample.sensorId,
  
  temp: latestSample.temp,
  hum: latestSample.hum,
  co2: latestSample.co2,

  tvoc: latestSample.tvoc,
  eco2: latestSample.eco2,
  aqi: latestSample.aqi,
  };

  const pageTitles = {
    Home: "Home Overview",
    Sensors: "Sensor Details",
    Samples: "Sample History",
    Charts: "Charts & Trends",
    Payload: "Payload Viewer",
    Rooms: "Room Manager",
    Settings: "Settings",
  };

  function getRecommendation(sample) {
    if (!sample) return [];

    const recs = [];
    const co2 = Number(sample.co2 ?? 0);
    const temp = Number(sample.temp ?? 0);
    const hum = Number(sample.hum ?? 0);
    const tvoc = Number(sample.tvoc ?? 0);
    const eco2 = Number(sample.eco2 ?? 0);
    const aqi = Number(sample.aqi ?? 0);
    const classification = String(sample.classification ?? "Normal").toLowerCase();

    if (classification !== "normal") {
      recs.push({
        level: "danger",
        title: "Fire risk detected",
        message: `Current classification is ${sample.classification}. Check the room immediately.`,
      });
    }

    if (co2 > 2000) {
      recs.push({
        level: "danger",
        title: "Unsafe CO2 level",
        message: "CO2 is very high. Leave the room if symptoms occur and ventilate immediately.",
      });
    } else if (co2 > 1000) {
      recs.push({
        level: "warning",
        title: "High CO2 level",
        message: "Ventilate the room to improve air quality.",
      });
    }

    if (temp > 35) {
      recs.push({
        level: "danger",
        title: "Very high temperature",
        message: "Temperature is unusually high. Check for heat sources or fire risk.",
      });
    } else if (temp > 30) {
      recs.push({
        level: "warning",
        title: "High temperature",
        message: "Consider cooling or increasing ventilation.",
      });
    }

    if (hum > 70) {
      recs.push({
        level: "warning",
        title: "High humidity",
        message: "Humidity is high. This may reduce comfort and air quality.",
      });
    } else if (hum < 25) {
      recs.push({
        level: "info",
        title: "Low humidity",
        message: "Air is dry. Consider increasing humidity if people stay here longer.",
      });
    }

    if (tvoc > 500 || eco2 > 1500 || aqi > 3) {
      recs.push({
        level: "warning",
        title: "Air quality needs attention",
        message: "VOC/eCO2/AQI values suggest poorer air quality. Ventilation is recommended.",
      });
    }

    if (recs.length === 0) {
      recs.push({
        level: "success",
        title: "All readings look normal",
        message: "No immediate action is recommended.",
      });
    }

    return recs;
  }

  function HomeView() {
    const recommendations = getRecommendation(latestSample);
    return (
      <>
        <section className="grid top-grid">
          <OverviewCard summary={summary} />
          <PayloadCard payload={latestSample.payload} />
        </section>

        <div className="section-spacer" />

        <section className="grid">
          <article className="card">
            <h3>Room Environment Classification</h3>
              <p>
                {latestSample.classification ?? "No classification available yet"}
              </p>
          </article>
        </section>
        
        <div className="section-spacer" />

        <article className="card">
          <h3>Recommendations</h3>

          {recommendations.length === 0 ? (
            <p className="muted">Everything looks normal.</p>
          ) : (
            <div className="recommendation-list">
              {recommendations.map((rec, i) => (
                <div className={`recommendation-item ${rec.level}`} key={`${rec.title}-${i}`}>
                  <strong>{rec.title}</strong>
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          )}
        </article>



        <section className="grid stats-grid">
          <StatCard title="Device ID" value={summary.sensorId} status="selected" statusType="success" />
          <StatCard title="Temperature" value={summary.temp} status="stable" statusType="success" />
          <StatCard title="Humidity" value={summary.hum} status="stable" statusType="success" />
          <StatCard title="CO2" value={summary.co2} status="watch" statusType="danger" />
          <StatCard title="TVOC" value={summary.tvoc} status="watch" statusType="danger" />
          <StatCard title="eCO2" value={summary.eco2} status="watch" statusType="danger" />
          <StatCard title="AQI" value={summary.aqi ?? "-"} status="watch" statusType="danger" />
        </section>
      </>
    );
  }

  function SensorsView() {
    return (
      <section className="grid stats-grid">
        <StatCard title="Device ID" value={summary.sensorId} status="sensorId" statusType="success" />
        <StatCard title="Temperature" value={summary.temp} status="DHT sensor" statusType="success" />
        <StatCard title="Humidity" value={summary.hum} status="DHT sensor" statusType="success" />
        <StatCard title="CO2" value={summary.co2} status="air quality" statusType="danger" />
      </section>
    );
  }

  function SamplesView() {
    return (
      <section className="grid bottom-grid view-grid">
        {samples.map((sample) => (
          <SampleCard
            key={sample.name}
            sample={{
              ...sample,
              dhtStatus: getDeviceHealth(
                devices.find((d) => d.sensorId === sample.sensorId) ?? {},
                nowMs
              ).statusLabel,
            }}
          />
        ))}
      </section>
    );
  }

  function RoomsViewWrapper() {
    return <RoomsView />
  }

  function PayloadView() {
    return (
      <section className="grid payload-grid">
        <PayloadCard payload={latestSample.payload} />
        <article className="card">
          <h3>Payload Details</h3>
          <div className="summary-row">
            <span>Device ID</span>
            <strong>{latestSample.sensorId}</strong>
          </div>
          <div className="summary-row">
            <span>Length</span>
            <strong>{latestSample.payloadLength}</strong>
          </div>
          <div className="summary-row">
            <span>CO2</span>
            <strong>{latestSample.co2} ppm</strong>
          </div>
          <div className="summary-row">
            <span>Temperature</span>
            <strong>{latestSample.temp} C</strong>
          </div>
          <div className="summary-row">
            <span>Humidity</span>
            <strong>{latestSample.hum} %</strong>
          </div>
        </article>
      </section>
    );
  }

  function ChartsView() {
    /* API returns newest-first. Reverse for left-to-right time progression. */
    const series = [...samples].reverse();
    const tempData = series.map((s) => ({ t: s.timestamp, v: Number(s.temp) }));
    const humData = series.map((s) => ({ t: s.timestamp, v: Number(s.hum) }));
    const co2Data = series.map((s) => ({ t: s.timestamp, v: Number(s.co2) }));
    const stats = (arr) => {
      const vals = arr.map((d) => d.v).filter((v) => Number.isFinite(v));
      if (vals.length === 0) {
        return { avg: 0, min: 0, max: 0, latest: 0, count: 0 };
      }
      return {
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        min: Math.min(...vals),
        max: Math.max(...vals),
        latest: vals[vals.length - 1],
        count: vals.length,
      };
    };

    const tStats = stats(tempData);
    const hStats = stats(humData);
    const cStats = stats(co2Data);
    const totalCount = series.length;

    return (
      <section className="grid charts-grid">
        <ChartCard
          title="Temperature trend"
          unit="°C"
          stats={tStats}
          data={tempData}
          decimals={1}
        />
        <ChartCard
          title="Humidity trend"
          unit="%"
          stats={hStats}
          data={humData}
          decimals={1}
        />
        <ChartCard
          title="CO2 trend"
          unit=" ppm"
          stats={cStats}
          data={co2Data}
          decimals={0}
        />
        <article className="card chart-summary-card">
          <div className="card-header">
            <div>
              <h3>Averages over {totalCount} samples</h3>
              <p className="muted">Last 24 hours of readings (up to your sample cap)</p>
            </div>
            <span className="tag">Live</span>
          </div>
          <div className="summary-row">
            <span>Avg temperature</span>
            <strong>{tStats.avg.toFixed(1)} °C</strong>
          </div>
          <div className="summary-row">
            <span>Avg humidity</span>
            <strong>{hStats.avg.toFixed(1)} %</strong>
          </div>
          <div className="summary-row">
            <span>Avg CO2</span>
            <strong>{cStats.avg.toFixed(0)} ppm</strong>
          </div>
          <div className="summary-row">
            <span>Range CO2</span>
            <strong>
              {cStats.min.toFixed(0)} – {cStats.max.toFixed(0)} ppm
            </strong>
          </div>
        </article>
      </section>
    );
  }

  function ChartCard({ title, unit, stats, data, decimals = 1 }) {
    const fmt = (n) => Number(n).toFixed(decimals);
    return (
      <article className="card chart-card">
        <div className="card-header">
          <div>
            <h3>{title}</h3>
            <p className="muted">
              Avg / min / max over {stats.count} samples
            </p>
          </div>
          <span className="tag">
            {fmt(stats.avg)}
            {unit}
          </span>
        </div>
        <div className="chart-stats">
          <div>
            <span className="muted">Avg</span>
            <strong>
              {fmt(stats.avg)}
              {unit}
            </strong>
          </div>
          <div>
            <span className="muted">Min</span>
            <strong>
              {fmt(stats.min)}
              {unit}
            </strong>
          </div>
          <div>
            <span className="muted">Max</span>
            <strong>
              {fmt(stats.max)}
              {unit}
            </strong>
          </div>
          <div>
            <span className="muted">Latest</span>
            <strong>
              {fmt(stats.latest)}
              {unit}
            </strong>
          </div>
        </div>
        <LineChart data={data} unit={unit} />
      </article>
    );
  }

  async function runAlarmTest(level) {
    if (selectedSensorId === "all") {
      setAlarmTestMessage({ type: "error", text: "Choose a device in the sidebar first." });
      return;
    }
    setAlarmTestBusy(true);
    setAlarmTestMessage(null);
    try {
      await postAlarmTest(Number(selectedSensorId), level);
      setAlarmTestMessage({ type: "ok", text: "MQTT command sent to the board." });
    } catch (err) {
      setAlarmTestMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAlarmTestBusy(false);
    }
  }

  function SettingsView() {
    if (!permissions.canViewAdminControls) {
      return (
        <RestrictedNotice message="Residents can view their assigned sensor and warnings, but alarm test and reset actions are admin-only." />
      );
    }

    return (
      <section className="grid settings-grid">
        <AdminControls
          selectedSensorId={selectedSensorId}
          alarmTestBusy={alarmTestBusy}
          alarmTestMessage={alarmTestMessage}
          onAlarmTest={runAlarmTest}
        />
        <article className="card">
          <h3>Sensor Health</h3>
          <div className="summary-row">
            <span>Current device status</span>
            <strong className={latestDeviceHealth.statusType}>{latestDeviceHealth.statusLabel}</strong>
          </div>
          <div className="summary-row">
            <span>Last seen</span>
            <strong>{latestDeviceHealth.lastSeenLabel}</strong>
          </div>
          <div className="summary-row">
            <span>Uptime</span>
            <strong>{latestDeviceHealth.uptimeLabel}</strong>
          </div>
          <div className="summary-row">
            <span>Missing-data threshold</span>
            <strong>{OFFLINE_AFTER_SECONDS}s</strong>
          </div>
        </article>
        <article className="card">
          <h3>Offline Alerts ({offlineAlerts.length})</h3>
          {offlineAlerts.length === 0 ? (
            <p className="muted">No offline devices detected.</p>
          ) : (
            offlineAlerts.map((alert) => (
              <div className="summary-row" key={alert.sensorId}>
                <span>Device {alert.sensorId}</span>
                <strong className="danger">{alert.health.lastSeenLabel}</strong>
              </div>
            ))
          )}
        </article>
      </section>
    );
  }

  return (
    <div className="page">
      <Sidebar
        activeView={activeView}
        session={session}
        permissions={permissions}
        devices={devices}
        selectedSensorId={selectedSensorId}
        sampleLimit={selectedLimit}
        sampleLimitOptions={SAMPLE_LIMIT_OPTIONS}
        loadedCount={samples.length}
        latestDeviceHealth={latestDeviceHealth}
        offlineAlerts={offlineAlerts}
        onViewChange={setActiveView}
        onSensorChange={setSelectedSensorId}
        onSampleLimitChange={(value) => setSelectedLimit(Number(value))}
      />

      <main className="content">
        <Topbar title={pageTitles[activeView]} activeView={activeView} session={session} onLogout={onLogout} />

        {activeView === "Home" && <HomeView />}
        {activeView === "Sensors" && <SensorsView />}
        {activeView === "Samples" && <SamplesView />}
        {activeView === "Charts" && <ChartsView />}
        {activeView === "Payload" && <PayloadView />}
        {activeView === "Rooms" && <RoomsViewWrapper />}
        {activeView === "Settings" && <SettingsView />}
      </main>
    </div>
  );
}

function App() {
  const SESSION_STORAGE_KEY = "sep4-session";

  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // ✅ LOGIN (JWT VERSION)
  async function handleSignIn(data) {
  const newSession = {
    token: data.token,
    id: data.user.id,
    username: data.user.username,
    role: data.user.role,
  };

  setSession(newSession);

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
  localStorage.setItem("token", data.token);
}

  function handleLogout() {
    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem("token");
  }

  if (!session) {
    return <LoginPage onAuthIn={handleSignIn} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}

export default App;
