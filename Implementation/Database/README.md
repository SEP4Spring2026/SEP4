# Kamtjatka Database Layer

## Overview

This folder contains database-related artifacts for the Kamtjatka Smart Fire Detection System.

The database is designed to support sensor monitoring, fire prediction, false alarm reduction, alerts, recommendations, and incident management for student residences.

MySQL is used as the relational database system.

---

## Technology Stack

- MySQL 8
- Entity Framework Core (code-first mapping in backend)
- Docker Compose for containerized database deployment

---

## Contents

## schema.sql

Contains the relational database schema generated from the EER model.

Includes:

- Tables
- Primary keys
- Foreign keys
- Constraints
- Indexes

---

## seed.sql

Contains initial seed data for development and testing.

Current seed data includes:

- Sample residence
- Sample room
- Sample sensor devices
- Sample sensor readings

Used for proof-of-concept testing.

---

## Data Model Scope

Core entities include:

- Residence
- Room
- SensorDevice
- SensorReading
- Prediction
- FireEvent
- Alert
- Recommendation
- IncidentReport
- SystemLog

For the current proof of concept, focus is primarily on:

- Temperature readings
- Humidity readings
- CO₂ monitoring

---

## Database Deployment

The database runs through Docker:

```bash
docker compose up -d