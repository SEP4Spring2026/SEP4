import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { OverviewCard } from "./components/OverviewCard.jsx";
import { PayloadCard } from "./components/PayloadCard.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { SampleCard } from "./components/SampleCard.jsx";
import { LineChart } from "./components/LineChart.jsx";
import { connectReadingsStream, getDevices, getReadings } from "./services/api.js";

const SAMPLE_LIMIT_OPTIONS = [50, 100, 200, 500, 1000];
const DEFAULT_SAMPLE_LIMIT = 200;
const OFFLINE_AFTER_SECONDS = 120;

function toSample(r) {
  return {
    name: `Sample ${r.readingId}`,
    sensorId: r.sensorId,
    timestamp: r.timestamp,
    temp: r.temperature,
    hum: r.humidity,
    co2: r.co2Level,
    payload: JSON.stringify(r, null, 2),
    payloadLength: JSON.stringify(r).length,
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

function App() {
  const [activeView, setActiveView] = useState("Home");
  const [samples, setSamples] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState("all");
  const [selectedLimit, setSelectedLimit] = useState(DEFAULT_SAMPLE_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

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
    async function loadReadings() {
      try {
        setLoading(true);
        setError(null);
        const data = await getReadings(selectedSensorId, selectedLimit);
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

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (error) return <div style={{ padding: 24 }}>Failed to reach the API. Is the main server running?</div>;
  if (!samples.length) return <div style={{ padding: 24 }}>No readings found for this device selection.</div>;

  const latestSample = samples[0];
  const latestDeviceHealth = getDeviceHealth(
    devices.find((d) => d.sensorId === latestSample.sensorId) ?? {},
    nowMs
  );
  const offlineAlerts = devices
    .map((device) => ({ sensorId: device.sensorId, health: getDeviceHealth(device, nowMs) }))
    .filter((entry) => entry.health.missingData);

  const summary = {
    temp: latestSample.temp,
    hum: latestSample.hum,
    co2: latestSample.co2,
    sensorId: latestSample.sensorId,
    payloadLength: latestSample.payloadLength
  };

  const pageTitles = {
    Home: "Home Overview",
    Sensors: "Sensor Details",
    Samples: "Sample History",
    Charts: "Charts & Trends",
    Payload: "Payload Viewer",
    Settings: "Settings",
  };

  function getRecommendation(sample) {
  if (!sample) return [];

  const recs = [];

  if (sample.co2 > 1000) {
    recs.push("High CO2 detected — ventilate the room");
  }

  if (sample.temp > 30) {
    recs.push("High temperature — consider cooling or ventilation");
  }

  if (sample.hum > 70) {
    recs.push("High humidity — risk of poor air quality");
  }

  if (sample.co2 > 2000) {
    recs.push("⚠ Possible unsafe air quality — take immediate action");
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

        <article className="card">
          <h3>Recommendations</h3>

          {recommendations.length === 0 ? (
            <p className="muted">Everything looks normal.</p>
          ) : (
            recommendations.map((rec, i) => (
              <div className="summary-row" key={i}>
                <span>•</span>
                <strong>{rec}</strong>
              </div>
            ))
          )}
        </article>

        <section className="grid stats-grid">
          <StatCard title="Device ID" value={summary.sensorId} status="selected" statusType="success" />
          <StatCard title="Temperature" value={summary.temp} status="stable" statusType="success" />
          <StatCard title="Humidity" value={summary.hum} status="stable" statusType="success" />
          <StatCard title="CO2" value={summary.co2} status="watch" statusType="danger" />
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
              <p className="muted">Aggregated from the latest readings on the broker</p>
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

  function SettingsView() {
    return (
      <section className="grid settings-grid">
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
        <Topbar title={pageTitles[activeView]} activeView={activeView} />

        {activeView === "Home" && <HomeView />}
        {activeView === "Sensors" && <SensorsView />}
        {activeView === "Samples" && <SamplesView />}
        {activeView === "Charts" && <ChartsView />}
        {activeView === "Payload" && <PayloadView />}
        {activeView === "Settings" && <SettingsView />}
      </main>
    </div>
  );
}

export default App;