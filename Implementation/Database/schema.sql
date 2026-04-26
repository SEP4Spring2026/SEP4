CREATE TABLE residences (
    residence_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL
);

CREATE TABLE rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) NOT NULL,
    floor INT NOT NULL,
    room_type VARCHAR(50),
    occupancy_status VARCHAR(50),
    residence_id INT NOT NULL,
    CONSTRAINT fk_rooms_residence
        FOREIGN KEY (residence_id)
        REFERENCES residences(residence_id)
        ON DELETE CASCADE
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE residents (
    user_id INT PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL UNIQUE,
    room_id INT NOT NULL,
    CONSTRAINT fk_residents_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_residents_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(room_id)
);

CREATE TABLE building_managers (
    user_id INT PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL UNIQUE,
    office_location VARCHAR(100),
    residence_id INT NOT NULL,
    CONSTRAINT fk_managers_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_managers_residence
        FOREIGN KEY (residence_id)
        REFERENCES residences(residence_id)
);

CREATE TABLE system_admins (
    user_id INT PRIMARY KEY,
    admin_id VARCHAR(100) NOT NULL UNIQUE,
    CONSTRAINT fk_admins_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE sensor_devices (
    sensor_id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    sensor_type VARCHAR(100) NOT NULL,
    installed_at DATETIME NOT NULL,
    device_status VARCHAR(50) NOT NULL,
    connection_status VARCHAR(50) NOT NULL,
    firmware_version VARCHAR(50),
    room_id INT NOT NULL,
    CONSTRAINT fk_devices_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(room_id)
);

CREATE TABLE sensor_readings (
    reading_id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    temperature DECIMAL(6,2),
    humidity DECIMAL(6,2),
    co2_level DECIMAL(8,2),
    smoke_level DECIMAL(8,2),
    sensor_id INT NOT NULL,
    CONSTRAINT fk_readings_device
        FOREIGN KEY (sensor_id)
        REFERENCES sensor_devices(sensor_id)
        ON DELETE CASCADE
);

CREATE TABLE predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    reading_id INT NOT NULL,
    prediction_time DATETIME NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,
    predicted_category VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(5,2),
    risk_level VARCHAR(50),
    CONSTRAINT fk_predictions_reading
        FOREIGN KEY (reading_id)
        REFERENCES sensor_readings(reading_id)
        ON DELETE CASCADE
);

CREATE TABLE fire_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    event_status VARCHAR(50) NOT NULL,
    severity_level VARCHAR(50),
    classification VARCHAR(100),
    room_id INT NOT NULL,
    prediction_id INT NULL,
    CONSTRAINT fk_events_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(room_id),
    CONSTRAINT fk_events_prediction
        FOREIGN KEY (prediction_id)
        REFERENCES predictions(prediction_id)
);

CREATE TABLE alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    message VARCHAR(500) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    fire_event_id INT NOT NULL,
    CONSTRAINT fk_alerts_event
        FOREIGN KEY (fire_event_id)
        REFERENCES fire_events(event_id)
        ON DELETE CASCADE
);

CREATE TABLE recommendations (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME NOT NULL,
    message VARCHAR(500) NOT NULL,
    recommendation_type VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    prediction_id INT NOT NULL,
    resident_id INT NOT NULL,
    CONSTRAINT fk_recommendations_prediction
        FOREIGN KEY (prediction_id)
        REFERENCES predictions(prediction_id),
    CONSTRAINT fk_recommendations_resident
        FOREIGN KEY (resident_id)
        REFERENCES residents(user_id)
);

CREATE TABLE incident_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME NOT NULL,
    description VARCHAR(1000) NOT NULL,
    outcome VARCHAR(255),
    cost_amount DECIMAL(10,2),
    fire_event_id INT NOT NULL,
    resident_id INT NULL,
    reviewed_by_id INT NULL,
    CONSTRAINT fk_reports_event
        FOREIGN KEY (fire_event_id)
        REFERENCES fire_events(event_id),
    CONSTRAINT fk_reports_resident
        FOREIGN KEY (resident_id)
        REFERENCES residents(user_id),
    CONSTRAINT fk_reports_manager
        FOREIGN KEY (reviewed_by_id)
        REFERENCES building_managers(user_id)
);

CREATE TABLE device_commands (
    command_id INT AUTO_INCREMENT PRIMARY KEY,
    command_type VARCHAR(100) NOT NULL,
    payload VARCHAR(1000),
    status VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    sent_at DATETIME NULL,
    sensor_id INT NOT NULL,
    created_by_id INT NULL,
    CONSTRAINT fk_commands_sensor
        FOREIGN KEY (sensor_id)
        REFERENCES sensor_devices(sensor_id),
    CONSTRAINT fk_commands_manager
        FOREIGN KEY (created_by_id)
        REFERENCES building_managers(user_id)
);

CREATE TABLE system_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    log_level VARCHAR(50) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    source VARCHAR(100),
    user_id INT NULL,
    CONSTRAINT fk_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);