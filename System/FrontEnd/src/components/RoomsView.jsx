import { useEffect, useState } from "react";
import {
  getRooms,
  createRoom,
  assignSensorToRoom,
  unassignSensor,
} from "../services/api.js";

export function RoomsView() {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [sensorId, setSensorId] = useState("");

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

  async function handleCreateRoom() {
    if (!roomName.trim()) return;

    try {
      await createRoom(roomName);
      setRoomName("");
      loadRooms();
    } catch (err) {
      console.error("Create room failed:", err);
    }
  }

  async function handleAssign(roomId) {
    if (!sensorId) return;

    try {
      await assignSensorToRoom(roomId, Number(sensorId));
      setSensorId("");
      loadRooms();
    } catch (err) {
      console.error("Assign failed:", err);
    }
  }

  async function handleUnassign(sensorId) {
    try {
      await unassignSensor(sensorId);
      loadRooms();
    } catch (err) {
      console.error("Unassign failed:", err);
    }
  }

  return (
    <section className="grid">
      {/* CREATE ROOM */}
      <article className="card">
        <h3>Create Room</h3>

        <input
          className="input"
          placeholder="Room name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />

        <button onClick={handleCreateRoom}>
          Create
        </button>
      </article>

      {/* ROOMS LIST */}
      <article className="card">
        <h3>Rooms</h3>

        {rooms.length === 0 ? (
          <p className="muted">No rooms created yet.</p>
        ) : (
          rooms.map((room) => (
            <div key={room.roomId} className="room-card">
              <h4>{room.name}</h4>

              {/* sensors */}
              <div>
                {room.sensors?.length ? (
                  room.sensors.map((s) => (
                    <div key={s.sensorId} className="row">
                      <span>Sensor {s.sensorId}</span>
                      <button onClick={() => handleUnassign(s.sensorId)}>
                        Unassign
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted">No sensors assigned</p>
                )}
              </div>

              {/* assign */}
              <div className="row">
                <input
                  placeholder="Sensor ID"
                  value={sensorId}
                  onChange={(e) => setSensorId(e.target.value)}
                />

                <button onClick={() => handleAssign(room.roomId)}>
                  Assign
                </button>
              </div>
            </div>
          ))
        )}
      </article>
    </section>
  );
}