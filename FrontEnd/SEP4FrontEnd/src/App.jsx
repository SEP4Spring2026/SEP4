import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { OverviewCard } from "./components/OverviewCard.jsx";
import { PayloadCard } from "./components/PayloadCard.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { SampleCard } from "./components/SampleCard.jsx";
import { LineChart } from "./components/LineChart.jsx";

function App() {
  const [activeView, setActiveView] = useState("Home");
  const [samples, setSamples] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await fetch("/api/readings/devices");
        if (!res.ok) {
          throw new Error(`Devices request failed with ${res.status}`);
        }
        const data = await res.json();
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
        const query =
          selectedSensorId === "all"
            ? ""
            : `?sensorId=${encodeURIComponent(selectedSensorId)}`;
        const res = await fetch(`/api/readings${query}`);
        if (!res.ok) {
          throw new Error(`Readings request failed with ${res.status}`);
        }
        const data = await res.json();
        const mappedSamples = data.map((r) => ({
          name: `Sample ${r.readingId}`,
          sensorId: r.sensorId,
          timestamp: r.timestamp,
          temp: r.temperature,
          hum: r.humidity,
          co2: r.co2Level,
          payload: JSON.stringify(r, null, 2),
          payloadLength: JSON.stringify(r).length,
          dhtStatus: "online"
        }));

        setSamples(mappedSamples);
      } catch (err) {
        console.error("API error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadReadings();
  }, [selectedSensorId]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (error) return <div style={{ padding: 24 }}>Failed to reach the API. Is the main server running?</div>;
  if (!samples.length) return <div style={{ padding: 24 }}>No readings found for this device selection.</div>;

  const latestSample = samples[0];

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

  function HomeView() {
    return (
      <>
        <section className="grid top-grid">
          <OverviewCard summary={summary} />
          <PayloadCard payload={latestSample.payload} />
        </section>

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
          <SampleCard key={sample.name} sample={sample} />
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
          <h3>Display</h3>
          <div className="summary-row">
            <span>Language</span>
            <strong>English</strong>
          </div>
          <div className="summary-row">
            <span>Theme</span>
            <strong>Dark</strong>
          </div>
        </article>
        <article className="card">
          <h3>Refresh</h3>
          <div className="summary-row">
            <span>Sensor status</span>
            <strong>Live</strong>
          </div>
          <div className="summary-row">
            <span>Last sample</span>
            <strong>{latestSample.name}</strong>
          </div>
        </article>
      </section>
    );
  }

  return (
    <div className="page">
      <Sidebar
        activeView={activeView}
        latestSample={latestSample}
        devices={devices}
        selectedSensorId={selectedSensorId}
        onViewChange={setActiveView}
        onSensorChange={setSelectedSensorId}
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