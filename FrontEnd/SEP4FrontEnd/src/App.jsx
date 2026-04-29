import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { OverviewCard } from "./components/OverviewCard.jsx";
import { PayloadCard } from "./components/PayloadCard.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { SampleCard } from "./components/SampleCard.jsx";

function App() {
  const [activeView, setActiveView] = useState("Home");
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8080/api/readings");
        const data = await res.json();

        const mappedSamples = data.map((r) => ({
          name: `Sample ${r.readingId}`,
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

    load();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (error) return <div style={{ padding: 24 }}>Failed to reach the API at http://localhost:8080. Is the main server running?</div>;
  if (!samples.length) return <div style={{ padding: 24 }}>No readings in the database yet. POST one to /api/readings, then refresh.</div>;

  const latestSample = samples[0];

  const summary = {
    temp: latestSample.temp,
    hum: latestSample.hum,
    co2: latestSample.co2,
    payloadLength: latestSample.payloadLength
  };

  const pageTitles = {
    Home: "Home Overview",
    Sensors: "Sensor Details",
    Samples: "Sample History",
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
          <StatCard title="Temperature" value={summary.temp} status="stable" statusType="success" />
          <StatCard title="Humidity" value={summary.hum} status="stable" statusType="success" />
          <StatCard title="CO2" value={summary.co2} status="watch" statusType="danger" />
          <StatCard title="Payload length" value={summary.payloadLength} status="bytes" statusType="success" />
        </section>
      </>
    );
  }

  function SensorsView() {
    return (
      <section className="grid stats-grid">
        <StatCard title="Temperature" value={summary.temp} status="DHT sensor" statusType="success" />
        <StatCard title="Humidity" value={summary.hum} status="DHT sensor" statusType="success" />
        <StatCard title="CO2" value={summary.co2} status="air quality" statusType="danger" />
        <StatCard title="DHT status" value={latestSample.dhtStatus} status="online" statusType="success" />
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
        onViewChange={setActiveView}
      />

      <main className="content">
        <Topbar title={pageTitles[activeView]} activeView={activeView} />

        {activeView === "Home" && <HomeView />}
        {activeView === "Sensors" && <SensorsView />}
        {activeView === "Samples" && <SamplesView />}
        {activeView === "Payload" && <PayloadView />}
        {activeView === "Settings" && <SettingsView />}
      </main>
    </div>
  );
}

export default App;