INSERT INTO residences (name, address)
VALUES
('Kamtjatka Student Residence', 'Kamtjatka 1, Denmark');

INSERT INTO rooms (room_number, floor, room_type, occupancy_status, residence_id)
VALUES
('101', 1, 'Student Room', 'Occupied', 1),
('102', 1, 'Student Room', 'Available', 1),
('201', 2, 'Student Room', 'Occupied', 1);

INSERT INTO users (full_name, email, password_hash, phone_number, role)
VALUES
('Ali Resident', 'ali.resident@example.com', 'hashed_password_demo', '+4511111111', 'Resident'),
('Sara Manager', 'sara.manager@example.com', 'hashed_password_demo', '+4522222222', 'BuildingManager'),
('System Admin', 'admin@example.com', 'hashed_password_demo', '+4533333333', 'SystemAdmin');

INSERT INTO residents (user_id, student_id, room_id)
VALUES
(1, 'S123456', 1);

INSERT INTO building_managers (user_id, employee_id, office_location, residence_id)
VALUES
(2, 'EMP001', 'Main Office', 1);

INSERT INTO system_admins (user_id, admin_id)
VALUES
(3, 'ADM001');

INSERT INTO sensor_devices
(serial_number, sensor_type, installed_at, device_status, connection_status, firmware_version, room_id)
VALUES
('SENSOR-ROOM-101', 'MultiSensor', NOW(), 'Active', 'Online', '1.0.0', 1),
('SENSOR-ROOM-102', 'MultiSensor', NOW(), 'Active', 'Online', '1.0.0', 2),
('SENSOR-ROOM-201', 'MultiSensor', NOW(), 'Maintenance', 'Offline', '1.0.0', 3);

INSERT INTO sensor_readings
(timestamp, temperature, humidity, co2_level, smoke_level, sensor_id)
VALUES
(NOW(), 22.50, 45.00, 650.00, 10.00, 1),
(NOW(), 28.20, 70.00, 950.00, 120.00, 1),
(NOW(), 24.00, 50.00, 700.00, 15.00, 2);

INSERT INTO predictions
(reading_id, prediction_time, prediction_type, predicted_category, confidence_score, risk_level)
VALUES
(1, NOW(), 'Classification', 'Normal', 92.50, 'Low'),
(2, NOW(), 'Classification', 'Cooking Smoke', 87.30, 'Medium'),
(3, NOW(), 'Classification', 'Normal', 90.00, 'Low');

INSERT INTO fire_events
(start_time, end_time, event_status, severity_level, classification, room_id, prediction_id)
VALUES
(NOW(), NULL, 'Open', 'Medium', 'Possible False Alarm', 1, 2);

INSERT INTO alerts
(created_at, alert_type, message, priority, status, fire_event_id)
VALUES
(NOW(), 'Smoke Alert', 'Smoke detected in Room 101. Possible cooking smoke.', 'Medium', 'Active', 1);

INSERT INTO recommendations
(created_at, message, recommendation_type, status, prediction_id, resident_id)
VALUES
(NOW(), 'Please ventilate the room by opening a window.', 'Ventilation', 'Active', 2, 1);

INSERT INTO incident_reports
(created_at, description, outcome, cost_amount, fire_event_id, resident_id, reviewed_by_id)
VALUES
(NOW(), 'Smoke alarm triggered during food heating in Room 101.', 'Marked as false alarm after review.', 0.00, 1, 1, 2);

INSERT INTO device_commands
(command_type, payload, status, created_at, sent_at, sensor_id, created_by_id)
VALUES
('MuteAlarm', '{"durationSeconds":300}', 'Pending', NOW(), NULL, 1, 2);

INSERT INTO system_logs
(timestamp, log_level, message, source, user_id)
VALUES
(NOW(), 'Info', 'Initial seed data inserted.', 'DatabaseSeed', 3);