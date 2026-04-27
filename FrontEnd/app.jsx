import React, { useState } from "../WEB/node_modules/react/index.js";
import { createRoot } from "../WEB/node_modules/react-dom/client.js";
import { Sidebar } from "./components/Sidebar.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { OverviewCard } from "./components/OverviewCard.jsx";
import { PayloadCard } from "./components/PayloadCard.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { SampleCard } from "./components/SampleCard.jsx";
import { samples, summary } from "./data/sensorSamples.js";

function App() {
  const [activeView, setActiveView] = useState("Home");
  const latestSample = samples[samples.length - 1];
  const pageTitles = {
    Home: "Home Overview",
    Sensors: "Sensor Details",
    Samples: "Sample History",
    Payload: "Payload Viewer",
    Settings: "Settings",
  };

  return (
    <div className="page">
      <Sidebar activeView={activeView} latestSample={latestSample} onViewChange={setActiveView} />

      <main className="content">
        <Topbar title={pageTitles[activeView]} activeView={activeView} />

        {activeView === "Home" && <HomeView latestSample={latestSample} />}
        {activeView === "Sensors" && <SensorsView />}
        {activeView === "Samples" && <SamplesView />}
        {activeView === "Payload" && <PayloadView latestSample={latestSample} />}
        {activeView === "Settings" && <SettingsView />}
      </main>
    </div>
  );
}

function HomeView({ latestSample }) {
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
      <StatCard title="DHT status" value={samples[samples.length - 1].dhtStatus} status="online" statusType="success" />
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

function PayloadView({ latestSample }) {
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
          <strong>{latestSample.hum.toFixed(1)} %</strong>
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
          <strong>{samples[samples.length - 1].name}</strong>
        </div>
      </article>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
