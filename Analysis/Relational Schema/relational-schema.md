# Relational Schema v2

Residence(residence_id PK, name, address)

Room(room_id PK, room_number, floor, room_type, occupancy_status, residence_id FK -> Residence.residence_id)

User(user_id PK, full_name, email UNIQUE, password_hash, phone_number, role)

Resident(user_id PK/FK -> User.user_id, student_id UNIQUE, room_id FK nullable -> Room.room_id)

Manager(user_id PK/FK -> User.user_id, employee_id UNIQUE, office_location, residence_id FK -> Residence.residence_id)

Sensors(SensorId PK, SerialNumber UNIQUE, SensorType, InstalledAt, Status, FirmwareVersion, RoomId FK -> Room.room_id)

Readings(ReadingId PK, Timestamp, Temperature, Humidity, Co2Level, SmokeLevel nullable, Tvoc nullable, Eco2 nullable, Aqi nullable, Classification nullable, SensorId FK -> Sensors.SensorId)

Predictions(PredictionId PK, PredictionTime, PredictedCategory, ConfidenceScore, RiskLevel, ReadingId FK UNIQUE -> Readings.ReadingId)

DetectionEvent(event_id PK, start_time, end_time nullable, event_status, severity_level, detected_as, suspected_cause, room_id FK -> Room.room_id, PredictionId FK nullable -> Predictions.PredictionId)

DetectionEventReading(event_id PK/FK -> DetectionEvent.event_id, ReadingId PK/FK -> Readings.ReadingId)

Alert(alert_id PK, created_at, alert_type, message, priority, status, detection_event_id FK -> DetectionEvent.event_id, manager_id FK nullable -> Manager.user_id, resident_id FK nullable -> Resident.user_id)

IncidentReport(report_id PK, created_at, description, outcome, cost_amount, detection_event_id FK UNIQUE -> DetectionEvent.event_id, resident_id FK nullable -> Resident.user_id, reviewed_by_id FK nullable -> Manager.user_id)
