export function AdminControls({ selectedSensorId, alarmTestBusy, alarmTestMessage, onAlarmTest }) {
  return (
    <article className="card">
      <h3>Buzzer test</h3>
      <p className="muted">
        Sends the same MQTT payloads as ML alarms (<code>iot/alarm/</code> + device id). Pick a device in the
        sidebar.
      </p>
      <div className="button-row">
        <button
          type="button"
          className="menu-item inline-action"
          disabled={alarmTestBusy || selectedSensorId === "all"}
          onClick={() => onAlarmTest("critical")}
        >
          Critical pattern
        </button>
        <button
          type="button"
          className="menu-item inline-action"
          disabled={alarmTestBusy || selectedSensorId === "all"}
          onClick={() => onAlarmTest("warn")}
        >
          Short warn
        </button>
        <button
          type="button"
          className="menu-item inline-action"
          disabled={alarmTestBusy || selectedSensorId === "all"}
          onClick={() => onAlarmTest("off")}
        >
          Silence
        </button>
      </div>
      {selectedSensorId === "all" ? (
        <p className="muted action-hint">Alarm controls require one selected device.</p>
      ) : null}
      {alarmTestMessage ? (
        <p className={alarmTestMessage.type === "error" ? "danger action-hint" : "muted action-hint"}>
          {alarmTestMessage.text}
        </p>
      ) : null}
    </article>
  );
}
