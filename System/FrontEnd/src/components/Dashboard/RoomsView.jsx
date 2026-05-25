import { useEffect, useState } from "react";
import {
  getRooms,
  createRoom,
  assignSensorToRoom,
  unassignSensor,
} from "../../services/api.js";

export function RoomsView({ devices = [] }) {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Per-room selected sensor: { [roomId]: string }
  const [sensorInputs, setSensorInputs] = useState({});
  const [assignErrors, setAssignErrors] = useState({});
  const [assignBusy, setAssignBusy] = useState({});

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!roomName.trim()) return;

    setCreating(true);
    setCreateError(null);

    try {
      await createRoom(roomName.trim());
      setRoomName("");
      await loadRooms();
    } catch (err) {
      setCreateError(err.message || "Failed to create room.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAssign(roomId) {
    const raw = sensorInputs[roomId] ?? "";
    const sensorId = parseInt(raw, 10);

    if (!raw || isNaN(sensorId) || sensorId < 1) {
      setAssignErrors((prev) => ({ ...prev, [roomId]: "Select a sensor." }));
      return;
    }

    setAssignBusy((prev) => ({ ...prev, [roomId]: true }));
    setAssignErrors((prev) => ({ ...prev, [roomId]: null }));

    try {
      await assignSensorToRoom(roomId, sensorId);
      setSensorInputs((prev) => ({ ...prev, [roomId]: "" }));
      await loadRooms();
    } catch (err) {
      setAssignErrors((prev) => ({ ...prev, [roomId]: err.message || "Failed to assign sensor." }));
    } finally {
      setAssignBusy((prev) => ({ ...prev, [roomId]: false }));
    }
  }

  const assignedSensorIds = new Set(
    rooms.flatMap((room) => room.sensors?.map((sensor) => sensor.sensorId) ?? [])
  );
  const availableDevices = devices.filter((device) => !assignedSensorIds.has(device.sensorId));

  async function handleUnassign(sensorId) {
    try {
      await unassignSensor(sensorId);
      await loadRooms();
    } catch (err) {
      console.error("Unassign failed:", err);
    }
  }

  return (
    <section className="grid rooms-grid">
      {/* ── Create Room ── */}
      <article className="card">
        <h3>Create Room</h3>
        <p className="muted">Add a new room and assign sensors to it for grouped monitoring.</p>

        <form onSubmit={handleCreateRoom} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <div className="login-field">
            <label className="device-select-label" htmlFor="room-name-input">
              Room name
            </label>
            <input
              id="room-name-input"
              className="device-select"
              placeholder="e.g. Lab 2B, Server Room"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
            />
          </div>

          {createError && <p className="danger" style={{ margin: 0 }}>{createError}</p>}

          <button
            className="login-button"
            type="submit"
            disabled={creating || !roomName.trim()}
          >
            {creating ? "Creating…" : "Create room"}
          </button>
        </form>
      </article>

      {/* ── Room List ── */}
      <article className="card">
        <h3>Rooms ({rooms.length})</h3>

        {rooms.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>No rooms created yet. Use the form to add one.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 12 }}>
            {rooms.map((room) => (
              <div key={room.roomId} className="card" style={{ padding: 16 }}>
                <h4 style={{ margin: "0 0 8px" }}>{room.name}</h4>

                {/* Assigned sensors */}
                {room.sensors?.length ? (
                  room.sensors.map((s) => (
                    <div key={s.sensorId} className="summary-row" style={{ marginBottom: 4 }}>
                      <span>Sensor {s.sensorId}</span>
                      <button
                        className="menu-item inline-action"
                        type="button"
                        onClick={() => handleUnassign(s.sensorId)}
                      >
                        Unassign
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ margin: "4px 0 8px" }}>No sensors assigned</p>
                )}

                {/* Assign a new sensor */}
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <select
                    className="device-select"
                    style={{ flex: 1 }}
                    value={sensorInputs[room.roomId] ?? ""}
                    onChange={(e) =>
                      setSensorInputs((prev) => ({ ...prev, [room.roomId]: e.target.value }))
                    }
                    disabled={assignBusy[room.roomId] || availableDevices.length === 0}
                  >
                    <option value="">
                      {availableDevices.length === 0 ? "No sensors available" : "Select sensor"}
                    </option>
                    {availableDevices.map((device) => (
                      <option key={device.sensorId} value={device.sensorId}>
                        Sensor {device.sensorId}
                      </option>
                    ))}
                  </select>
                  <button
                    className="menu-item inline-action"
                    type="button"
                    disabled={assignBusy[room.roomId] || !sensorInputs[room.roomId]}
                    onClick={() => handleAssign(room.roomId)}
                  >
                    {assignBusy[room.roomId] ? "…" : "Assign"}
                  </button>
                </div>

                {assignErrors[room.roomId] && (
                  <p className="danger" style={{ margin: "4px 0 0", fontSize: 13 }}>
                    {assignErrors[room.roomId]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
