Residence(residence_id PK, name, address)

Room(room_id PK, room_number, floor, room_type, occupancy_status, residence_id FK -> Residence.residence_id)

User(user_id PK, full_name, email, password_hash, phone_number, user_role)

Resident(user_id PK/FK -> User.user_id, student_id, room_id FK -> Room.room_id)

BuildingAdministrator(user_id PK/FK -> User.user_id, employee_id, office_location, residence_id FK -> Residence.residence_id)

SystemAdmin(user_id PK/FK -> User.user_id, admin_id)

SensorDevice(sensor_id PK, serial_number, sensor_type, installed_at, device_status, connection_status, firmware_version, room_id FK -> Room.room_id)

SensorReading(reading_id PK, timestamp, temperature, humidity, co2_level, smoke_level, sensor_id FK -> SensorDevice.sensor_id)

Prediction(prediction_id PK, prediction_time, prediction_type, predicted_category, confidence_score, risk_level)

PredictionReading(prediction_id PK/FK -> Prediction.prediction_id, reading_id PK/FK -> SensorReading.reading_id)

FireEvent(event_id PK, start_time, end_time, event_status, severity_level, classification, room_id FK -> Room.room_id, prediction_id FK -> Prediction.prediction_id)

Alert(alert_id PK, created_at, alert_type, message, priority, status, fire_event_id FK -> FireEvent.event_id)

Recommendation(recommendation_id PK, created_at, message, recommendation_type, status, prediction_id FK -> Prediction.prediction_id, resident_id FK -> Resident.user_id)

IncidentReport(report_id PK, created_at, description, outcome, cost_amount, fire_event_id FK -> FireEvent.event_id, resident_id FK -> Resident.user_id, reviewed_by_id FK -> BuildingAdministrator.user_id)

SystemLog(log_id PK, timestamp, log_level, message, source, system_admin_id FK -> SystemAdmin.user_id)