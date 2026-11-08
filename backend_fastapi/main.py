"""
HydroWatch - FastAPI Backend Server for ESP32 IoT Sensors & RVCE Flood Mapping
Can be executed directly via: uvicorn backend_fastapi.main:app --host 0.0.0.0 --port 8000 --reload
"""

import sqlite3
import json
import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="HydroWatch API",
    description="RV College of Engineering (RVCE) Smart Waterlogging & IoT Early Warning System",
    version="1.0.0",
)

# Enable CORS for React frontend and local IoT testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "hydrowatch.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ----------------- Pydantic Models -----------------
class SensorReadingInput(BaseModel):
    device_id: str = Field(..., example="ESP32-RVCE-01")
    water_depth_cm: float = Field(..., ge=0, example=12.5)
    water_level_cm: Optional[float] = Field(None, example=27.5)
    water_level_percentage: Optional[float] = Field(None, example=45.8)
    rainfall_mm: Optional[float] = Field(None, example=8.2)
    latitude: Optional[float] = Field(None, example=12.9262)
    longitude: Optional[float] = Field(None, example=77.4985)
    timestamp: Optional[str] = None

class VehicleCheckRequest(BaseModel):
    vehicle_type: str = Field("Car", example="Car")
    ground_clearance_cm: float = Field(..., gt=0, example=18.0)
    road_id: Optional[int] = None
    device_id: Optional[str] = None

class SystemSettingsUpdate(BaseModel):
    stale_sensor_minutes: Optional[int] = None
    rising_water_consecutive_intervals: Optional[int] = None
    rising_water_rate_threshold_cm_hr: Optional[float] = None
    sample_interval_minutes: Optional[int] = None

# ----------------- Helper Functions -----------------
def classify_safety(depth: float, thresholds: Dict[str, float]) -> str:
    if depth <= thresholds.get("very_safe_max", 5.0):
        return "Very Safe"
    if depth <= thresholds.get("normal_max", 15.0):
        return "Normal"
    if depth <= thresholds.get("warning_max", 25.0):
        return "Warning"
    if depth <= thresholds.get("critical_max", 40.0):
        return "Critical"
    return "Danger"

# ----------------- API Endpoints -----------------
@app.get("/")
def read_root():
    return {
        "app": "HydroWatch - RVCE Smart Waterlogging System",
        "status": "online",
        "documentation": "/docs",
    }

@app.post("/sensor-data", status_code=status.HTTP_201_CREATED)
@app.post("/api/sensor-data", status_code=status.HTTP_201_CREATED)
def receive_sensor_data(reading: SensorReadingInput):
    """
    Receives real-time IoT waterlogging data from ESP32 microcontrollers.
    Validates, saves to SQLite database, analyzes trends, and updates road zones.
    """
    conn = get_db()
    cursor = conn.cursor()

    ts = reading.timestamp or datetime.now(timezone.utc).isoformat()
    depth = round(reading.water_depth_cm, 1)
    level_cm = round(reading.water_level_cm if reading.water_level_cm is not None else (depth + 15.0), 1)
    level_pct = round(reading.water_level_percentage if reading.water_level_percentage is not None else min(100.0, (level_cm / 60.0) * 100), 1)
    rain = round(reading.rainfall_mm or 0.0, 1)

    # Ensure sensor is registered
    cursor.execute("SELECT id FROM sensors WHERE device_id = ?", (reading.device_id,))
    sensor_row = cursor.fetchone()
    if not sensor_row:
        cursor.execute(
            "INSERT INTO sensors (device_id, location_name, latitude, longitude, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
            (reading.device_id, f"Sensor ({reading.device_id})", reading.latitude or 12.9238, reading.longitude or 77.4985, ts)
        )

    # Insert Reading
    cursor.execute(
        """
        INSERT INTO readings (device_id, water_depth_cm, water_level_cm, water_level_percentage, rainfall_mm, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (reading.device_id, depth, level_cm, level_pct, rain, ts)
    )
    reading_id = cursor.lastrowid

    # Retrieve last 4 readings for trend calculation
    cursor.execute(
        "SELECT water_depth_cm, timestamp FROM readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 4",
        (reading.device_id,)
    )
    history = cursor.fetchall()

    trend = "Stable"
    rate_of_change = 0.0
    prev_depth = depth

    if len(history) >= 2:
        prev_depth = history[1]["water_depth_cm"]
        # calculate rate
        rate_of_change = round((depth - prev_depth) * 4.0, 1) # ~15 min intervals -> 4 intervals per hour
        if rate_of_change >= 8.0:
            trend = "Rapidly Increasing" if rate_of_change >= 15.0 else "Increasing"
        elif rate_of_change <= -2.0:
            trend = "Decreasing"

    cursor.execute(
        """
        INSERT INTO historical_trends (device_id, previous_depth, current_depth, rate_of_change, trend_status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (reading.device_id, prev_depth, depth, rate_of_change, trend, ts)
    )

    # Update associated road zones
    cursor.execute("SELECT * FROM road_zones WHERE associated_device_id = ?", (reading.device_id,))
    roads = cursor.fetchall()
    for road in roads:
        thresholds = json.loads(road["safety_thresholds"])
        new_status = classify_safety(depth, thresholds)
        if trend == "Rapidly Increasing" and new_status == "Warning":
            new_status = "Critical"

        cursor.execute("UPDATE road_zones SET current_status = ? WHERE id = ?", (new_status, road["id"]))

        # Generate alert if danger or rapid rise
        if new_status in ["Critical", "Danger"] or trend == "Rapidly Increasing":
            cursor.execute(
                """
                INSERT INTO alerts (device_id, road_id, alert_type, severity, message, created_at, current_depth, previous_depth)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (reading.device_id, road["id"], "HAZARD_DETECTED", "danger" if new_status == "Danger" else "warning",
                 f"Water level at {road['road_name']} reached {depth} cm ({trend})", ts, depth, prev_depth)
            )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "reading_id": reading_id,
        "device_id": reading.device_id,
        "water_depth_cm": depth,
        "trend": trend,
        "rate_of_change_cm_hr": rate_of_change,
        "timestamp": ts,
    }

@app.get("/sensors")
@app.get("/api/sensors")
def get_sensors():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensors ORDER BY id ASC")
    sensors = cursor.fetchall()
    conn.close()
    return [dict(s) for s in sensors]

@app.get("/map/zones")
@app.get("/api/map/zones")
def get_map_zones():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM road_zones ORDER BY id ASC")
    zones = cursor.fetchall()
    conn.close()
    return [
        {
            "id": z["id"],
            "road_name": z["road_name"],
            "geometry": json.loads(z["geometry"]),
            "safety_thresholds": json.loads(z["safety_thresholds"]),
            "current_status": z["current_status"],
            "associated_device_id": z["associated_device_id"],
        }
        for z in zones
    ]

@app.post("/vehicle/check")
@app.post("/api/vehicle/check")
def check_vehicle(req: VehicleCheckRequest):
    """
    Vehicle Passability Screening Rule:
    Maximum permitted water depth = 20% of vehicle ground clearance (D_limit = 0.20 * G)
    """
    conn = get_db()
    cursor = conn.cursor()

    if req.road_id:
        cursor.execute("SELECT * FROM road_zones WHERE id = ?", (req.road_id,))
    elif req.device_id:
        cursor.execute("SELECT * FROM road_zones WHERE associated_device_id = ?", (req.device_id,))
    else:
        cursor.execute("SELECT * FROM road_zones LIMIT 1")

    road = cursor.fetchone()
    if not road:
        conn.close()
        raise HTTPException(status_code=404, detail="Road location not found")

    cursor.execute(
        "SELECT water_depth_cm, timestamp FROM readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1",
        (road["associated_device_id"],)
    )
    latest = cursor.fetchone()
    conn.close()

    water_depth = latest["water_depth_cm"] if latest else 0.0
    threshold = round(0.20 * req.ground_clearance_cm, 1)
    diff = round(threshold - water_depth, 1)

    is_passable = water_depth < threshold
    safety_override = None

    if road["current_status"] in ["Critical", "Danger"]:
        is_passable = False
        safety_override = f"CRITICAL ROAD HAZARD: {road['road_name']} is currently in {road['current_status']} state. Avoid route."

    label = "PASSABILITY THRESHOLD MET – PROVISIONAL PASS" if is_passable else "DO NOT PASS – WATER DEPTH EXCEEDS YOUR THRESHOLD"

    return {
        "vehicle_type": req.vehicle_type,
        "ground_clearance_cm": req.ground_clearance_cm,
        "water_depth_cm": water_depth,
        "threshold_cm": threshold,
        "difference_cm": diff,
        "is_passable": is_passable,
        "passability_label": label,
        "road_name": road["road_name"],
        "road_safety_status": road["current_status"],
        "safety_override_reason": safety_override,
        "disclaimer": "Screening calculation based on calm water depth. Actual passage depends on current, potholes, and air intake position.",
    }
