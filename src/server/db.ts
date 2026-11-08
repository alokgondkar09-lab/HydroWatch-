import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Sensor,
  Reading,
  RoadZone,
  Alert,
  VehicleCheckRequest,
  VehicleCheckResult,
  OverviewStatistics,
  AnalyticsSummary,
  AnalyticsDataPoint,
  TrendStatus,
  SafetyStatus,
  SystemSettings,
} from '../types/hydrowatch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../hydrowatch.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// RVCE Campus Coordinates
export const RVCE_CAMPUS_BOUNDARY: [number, number][] = [
  [12.9264, 77.4965], // NW Gate 1 Arch / Mysore Road frontage
  [12.9268, 77.4998], // North Gate 1 Main entrance
  [12.9258, 77.5020], // NE Metro Pattanagere junction
  [12.9238, 77.5025], // East Sports Complex boundary
  [12.9210, 77.5015], // SE Cauvery Hostel perimeter
  [12.9202, 77.4975], // South Gate 2 / Pattanagere road
  [12.9215, 77.4952], // SW Mechanical workshop perimeter
  [12.9248, 77.4955], // West Civil/Workshop boundary
];

// Initialize Database Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sensors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      location_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      water_depth_cm REAL NOT NULL,
      water_level_cm REAL NOT NULL,
      water_level_percentage REAL NOT NULL,
      rainfall_mm REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(device_id) REFERENCES sensors(device_id)
    );

    CREATE INDEX IF NOT EXISTS idx_readings_device_time ON readings(device_id, timestamp);

    CREATE TABLE IF NOT EXISTS road_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      road_name TEXT NOT NULL,
      geometry TEXT NOT NULL,
      safety_thresholds TEXT NOT NULL,
      current_status TEXT NOT NULL,
      associated_device_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      road_id INTEGER,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      current_depth REAL,
      previous_depth REAL
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(resolved_at, created_at);

    CREATE TABLE IF NOT EXISTS historical_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      previous_depth REAL NOT NULL,
      current_depth REAL NOT NULL,
      rate_of_change REAL NOT NULL,
      trend_status TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Initialize Settings
  const defaultSettings: SystemSettings = {
    stale_sensor_minutes: 30,
    rising_water_consecutive_intervals: 3,
    rising_water_rate_threshold_cm_hr: 8.0,
    sample_interval_minutes: 15,
    global_thresholds: {
      very_safe_max: 5,
      normal_max: 15,
      warning_max: 25,
      critical_max: 40,
    },
  };

  const existingSettings = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('config');
  if (!existingSettings) {
    db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)').run('config', JSON.stringify(defaultSettings));
  }

  // Seed default RVCE sensors and roads if empty
  seedInitialCampusData();
}

export function getSettings(): SystemSettings {
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('config') as { value: string } | undefined;
  if (row) {
    return JSON.parse(row.value);
  }
  return {
    stale_sensor_minutes: 30,
    rising_water_consecutive_intervals: 3,
    rising_water_rate_threshold_cm_hr: 8.0,
    sample_interval_minutes: 15,
    global_thresholds: {
      very_safe_max: 5,
      normal_max: 15,
      warning_max: 25,
      critical_max: 40,
    },
  };
}

export function updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
  const current = getSettings();
  const merged = { ...current, ...newSettings };
  db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('config', JSON.stringify(merged));
  return merged;
}

function seedInitialCampusData() {
  const sensorCount = db.prepare('SELECT COUNT(*) as count FROM sensors').get() as { count: number };
  if (sensorCount.count > 0) return;

  const now = new Date();
  const isoNow = now.toISOString();

  // RVCE Campus Sensors
  const initialSensors = [
    {
      device_id: 'ESP32-RVCE-01',
      location_name: 'Gate 1 Main Entrance Arch & Security Post',
      latitude: 12.9262,
      longitude: 77.4985,
    },
    {
      device_id: 'ESP32-RVCE-02',
      location_name: 'Civil & Environmental Lab Low-Lying Culvert',
      latitude: 12.9234,
      longitude: 77.4968,
    },
    {
      device_id: 'ESP32-RVCE-03',
      location_name: 'Mechanical Workshop & IEM Bay Avenue',
      latitude: 12.9242,
      longitude: 77.4962,
    },
    {
      device_id: 'ESP32-RVCE-04',
      location_name: 'Krishna & Cauvery Hostels Connecting Boulevard',
      latitude: 12.9220,
      longitude: 77.5002,
    },
    {
      device_id: 'ESP32-RVCE-05',
      location_name: 'CS & Biotech Research Complex Circle',
      latitude: 12.9245,
      longitude: 77.5008,
    },
    {
      device_id: 'ESP32-RVCE-06',
      location_name: 'Cricket Pavilion & Gate 2 South Exit Road',
      latitude: 12.9215,
      longitude: 77.4988,
    },
  ];

  const insertSensor = db.prepare(`
    INSERT INTO sensors (device_id, location_name, latitude, longitude, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `);

  for (const s of initialSensors) {
    insertSensor.run(s.device_id, s.location_name, s.latitude, s.longitude, isoNow);
  }

  // RVCE Road Zones
  const initialRoads = [
    {
      road_name: 'Main Entrance Avenue (Gate 1 to Admin Block)',
      geometry: [
        [12.9265, 77.4985],
        [12.9255, 77.4986],
        [12.9245, 77.4988],
        [12.9238, 77.4989],
      ],
      safety_thresholds: { very_safe_max: 5, normal_max: 12, warning_max: 20, critical_max: 35 },
      current_status: 'Normal',
      associated_device_id: 'ESP32-RVCE-01',
    },
    {
      road_name: 'Civil Block Low-Lying Underpass & Culvert',
      geometry: [
        [12.9238, 77.4989],
        [12.9235, 77.4975],
        [12.9233, 77.4968],
        [12.9228, 77.4960],
      ],
      safety_thresholds: { very_safe_max: 4, normal_max: 10, warning_max: 18, critical_max: 30 },
      current_status: 'Warning',
      associated_device_id: 'ESP32-RVCE-02',
    },
    {
      road_name: 'Mechanical & IEM Bay Workshop Perimeter Road',
      geometry: [
        [12.9248, 77.4962],
        [12.9240, 77.4963],
        [12.9230, 77.4964],
        [12.9218, 77.4962],
      ],
      safety_thresholds: { very_safe_max: 5, normal_max: 15, warning_max: 25, critical_max: 40 },
      current_status: 'Very Safe',
      associated_device_id: 'ESP32-RVCE-03',
    },
    {
      road_name: 'Krishna & Cauvery Hostel Transit Boulevard',
      geometry: [
        [12.9230, 77.4990],
        [12.9222, 77.4995],
        [12.9215, 77.5005],
        [12.9212, 77.5012],
      ],
      safety_thresholds: { very_safe_max: 5, normal_max: 14, warning_max: 22, critical_max: 35 },
      current_status: 'Normal',
      associated_device_id: 'ESP32-RVCE-04',
    },
    {
      road_name: 'CS, IT & Biotech Research Avenue (Library Circle)',
      geometry: [
        [12.9245, 77.4988],
        [12.9248, 77.5002],
        [12.9246, 77.5012],
        [12.9242, 77.5018],
      ],
      safety_thresholds: { very_safe_max: 6, normal_max: 15, warning_max: 25, critical_max: 40 },
      current_status: 'Very Safe',
      associated_device_id: 'ESP32-RVCE-05',
    },
    {
      road_name: 'Sports Pavilion & Gate 2 South Exit Road',
      geometry: [
        [12.9235, 77.5015],
        [12.9225, 77.5010],
        [12.9212, 77.4990],
        [12.9205, 77.4975],
      ],
      safety_thresholds: { very_safe_max: 5, normal_max: 15, warning_max: 24, critical_max: 38 },
      current_status: 'Very Safe',
      associated_device_id: 'ESP32-RVCE-06',
    },
  ];

  const insertRoad = db.prepare(`
    INSERT INTO road_zones (road_name, geometry, safety_thresholds, current_status, associated_device_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const r of initialRoads) {
    insertRoad.run(
      r.road_name,
      JSON.stringify(r.geometry),
      JSON.stringify(r.safety_thresholds),
      r.current_status,
      r.associated_device_id
    );
  }

  // Generate 24 hours of 15-minute historical readings for each sensor
  const insertReading = db.prepare(`
    INSERT INTO readings (device_id, water_depth_cm, water_level_cm, water_level_percentage, rainfall_mm, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Baseline depths for sensors
  const baselines: Record<string, { baseDepth: number; rain: number; trendPattern: string }> = {
    'ESP32-RVCE-01': { baseDepth: 8.5, rain: 6.0, trendPattern: 'steady' },
    'ESP32-RVCE-02': { baseDepth: 16.2, rain: 18.5, trendPattern: 'rising' }, // culvert rising
    'ESP32-RVCE-03': { baseDepth: 2.1, rain: 2.0, trendPattern: 'steady' },
    'ESP32-RVCE-04': { baseDepth: 9.0, rain: 8.0, trendPattern: 'falling' },
    'ESP32-RVCE-05': { baseDepth: 3.4, rain: 3.0, trendPattern: 'steady' },
    'ESP32-RVCE-06': { baseDepth: 2.8, rain: 2.5, trendPattern: 'steady' },
  };

  const intervals = 96; // 96 * 15 min = 24 hours
  const startTime = now.getTime() - intervals * 15 * 60 * 1000;

  for (let i = 0; i <= intervals; i++) {
    const t = new Date(startTime + i * 15 * 60 * 1000);
    const timeIso = t.toISOString();

    for (const sensor of initialSensors) {
      const cfg = baselines[sensor.device_id] || { baseDepth: 4.0, rain: 4.0, trendPattern: 'steady' };
      let depth = cfg.baseDepth;
      let rain = cfg.rain;

      if (cfg.trendPattern === 'rising') {
        // Last 6 intervals show continuously rising water
        if (i >= intervals - 5) {
          const step = intervals - i;
          depth = 19.5 - step * 1.8; // e.g. 10.5, 12.3, 14.1, 15.9, 17.7, 19.5 cm
          rain = 22.0 + (5 - step) * 2.5;
        } else {
          depth = Math.max(1.0, cfg.baseDepth + Math.sin(i * 0.2) * 2.5);
          rain = Math.max(0, cfg.rain + Math.cos(i * 0.2) * 3);
        }
      } else if (cfg.trendPattern === 'falling') {
        // Gradual recession
        depth = Math.max(2.0, cfg.baseDepth - (i / intervals) * 3.5 + Math.sin(i * 0.15) * 1.0);
        rain = Math.max(0, cfg.rain - (i / intervals) * 4.0);
      } else {
        // Steady slight fluctuation
        depth = Math.max(0.5, cfg.baseDepth + Math.sin(i * 0.3) * 1.2);
        rain = Math.max(0, cfg.rain + Math.cos(i * 0.3) * 1.5);
      }

      depth = Math.round(depth * 10) / 10;
      rain = Math.round(rain * 10) / 10;
      const levelCm = Math.round((depth + 15.0) * 10) / 10; // total water column in drain/basin
      const levelPct = Math.min(100, Math.round((levelCm / 60.0) * 1000) / 10);

      insertReading.run(sensor.device_id, depth, levelCm, levelPct, rain, timeIso);
    }
  }

  // Insert initial alert for the rising culvert
  const insertAlert = db.prepare(`
    INSERT INTO alerts (device_id, road_id, alert_type, severity, message, created_at, current_depth, previous_depth)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAlert.run(
    'ESP32-RVCE-02',
    2,
    'RISING_WATER',
    'warning',
    'Continuous rising water detected at Civil Block Low-Lying Culvert (+3.6 cm/hr). Approaching Warning threshold.',
    new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
    19.5,
    15.9
  );
}

// Classify safety status based on depth and road thresholds
export function classifySafetyStatus(depthCm: number, thresholds: { very_safe_max: number; normal_max: number; warning_max: number; critical_max: number }): SafetyStatus {
  if (depthCm <= thresholds.very_safe_max) return 'Very Safe';
  if (depthCm <= thresholds.normal_max) return 'Normal';
  if (depthCm <= thresholds.warning_max) return 'Warning';
  if (depthCm <= thresholds.critical_max) return 'Critical';
  return 'Danger';
}

// Add a new sensor reading with full validation, trend detection, and automatic alerting
export function addReading(data: {
  device_id: string;
  water_depth_cm: number;
  water_level_cm?: number;
  water_level_percentage?: number;
  rainfall_mm?: number;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}): Reading {
  if (!data.device_id) throw new Error('device_id is required');
  if (typeof data.water_depth_cm !== 'number' || isNaN(data.water_depth_cm) || data.water_depth_cm < 0) {
    throw new Error('water_depth_cm must be a non-negative number');
  }

  const timestamp = data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString();
  const waterDepth = Math.round(data.water_depth_cm * 10) / 10;
  const waterLevel = typeof data.water_level_cm === 'number' ? Math.round(data.water_level_cm * 10) / 10 : Math.round((waterDepth + 15) * 10) / 10;
  const waterLevelPct = typeof data.water_level_percentage === 'number'
    ? Math.round(data.water_level_percentage * 10) / 10
    : Math.min(100, Math.round((waterLevel / 60) * 1000) / 10);
  const rainfall = typeof data.rainfall_mm === 'number' ? Math.max(0, Math.round(data.rainfall_mm * 10) / 10) : 0;

  // Ensure sensor exists or auto-register if new
  const existingSensor = db.prepare('SELECT * FROM sensors WHERE device_id = ?').get(data.device_id) as Sensor | undefined;
  if (!existingSensor) {
    db.prepare(`
      INSERT INTO sensors (device_id, location_name, latitude, longitude, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      data.device_id,
      `Sensor Location (${data.device_id})`,
      data.latitude || 12.9238,
      data.longitude || 77.4985,
      timestamp
    );
  }

  // Insert into readings
  const stmt = db.prepare(`
    INSERT INTO readings (device_id, water_depth_cm, water_level_cm, water_level_percentage, rainfall_mm, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(data.device_id, waterDepth, waterLevel, waterLevelPct, rainfall, timestamp);
  const readingId = Number(result.lastInsertRowid);

  // Retrieve last 5 readings for this device for trend analysis
  const recentReadings = db.prepare(`
    SELECT water_depth_cm, timestamp FROM readings
    WHERE device_id = ?
    ORDER BY timestamp DESC
    LIMIT 5
  `).all(data.device_id) as { water_depth_cm: number; timestamp: string }[];

  let trendStatus: TrendStatus = 'Stable';
  let rateOfChange = 0; // cm/hour
  let previousDepth = waterDepth;

  if (recentReadings.length >= 2) {
    const prev = recentReadings[1];
    previousDepth = prev.water_depth_cm;
    const timeDiffHours = (new Date(recentReadings[0].timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60);
    const depthDiff = recentReadings[0].water_depth_cm - prev.water_depth_cm;

    if (timeDiffHours > 0) {
      rateOfChange = Math.round((depthDiff / timeDiffHours) * 10) / 10;
    }

    const settings = getSettings();

    // Check consecutive increases
    let consecutiveIncreases = 0;
    for (let i = 0; i < recentReadings.length - 1; i++) {
      if (recentReadings[i].water_depth_cm > recentReadings[i + 1].water_depth_cm + 0.2) {
        consecutiveIncreases++;
      } else {
        break;
      }
    }

    if (rateOfChange >= settings.rising_water_rate_threshold_cm_hr || consecutiveIncreases >= settings.rising_water_consecutive_intervals) {
      trendStatus = rateOfChange >= 15 ? 'Rapidly Increasing' : 'Increasing';
    } else if (rateOfChange <= -2.0) {
      trendStatus = 'Decreasing';
    } else {
      trendStatus = 'Stable';
    }
  }

  // Record trend
  db.prepare(`
    INSERT INTO historical_trends (device_id, previous_depth, current_depth, rate_of_change, trend_status, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.device_id, previousDepth, waterDepth, rateOfChange, trendStatus, timestamp);

  // Update associated Road Zones
  const associatedRoads = db.prepare('SELECT * FROM road_zones WHERE associated_device_id = ?').all(data.device_id) as {
    id: number;
    road_name: string;
    safety_thresholds: string;
    current_status: string;
  }[];

  for (const road of associatedRoads) {
    const thresholds = JSON.parse(road.safety_thresholds);
    let newStatus = classifySafetyStatus(waterDepth, thresholds);

    // If rising rapidly and already at Warning, escalate to Critical / Danger
    if (trendStatus === 'Rapidly Increasing') {
      if (newStatus === 'Warning') newStatus = 'Critical';
      else if (newStatus === 'Critical') newStatus = 'Danger';
    }

    db.prepare('UPDATE road_zones SET current_status = ? WHERE id = ?').run(newStatus, road.id);

    // Alert Generation Logic
    handleAutomaticAlerts({
      road_id: road.id,
      road_name: road.road_name,
      device_id: data.device_id,
      previous_status: road.current_status as SafetyStatus,
      new_status: newStatus,
      current_depth: waterDepth,
      previous_depth: previousDepth,
      trend_status: trendStatus,
      rate_of_change: rateOfChange,
      timestamp,
    });
  }

  return {
    id: readingId,
    device_id: data.device_id,
    water_depth_cm: waterDepth,
    water_level_cm: waterLevel,
    water_level_percentage: waterLevelPct,
    rainfall_mm: rainfall,
    timestamp,
  };
}

// Smart non-duplicate alert handler
function handleAutomaticAlerts(params: {
  road_id: number;
  road_name: string;
  device_id: string;
  previous_status: SafetyStatus;
  new_status: SafetyStatus;
  current_depth: number;
  previous_depth: number;
  trend_status: TrendStatus;
  rate_of_change: number;
  timestamp: string;
}) {
  const recentAlerts = db.prepare(`
    SELECT * FROM alerts
    WHERE device_id = ? AND resolved_at IS NULL
    ORDER BY created_at DESC
    LIMIT 3
  `).all(params.device_id) as Alert[];

  const insertAlert = db.prepare(`
    INSERT INTO alerts (device_id, road_id, alert_type, severity, message, created_at, current_depth, previous_depth)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Status Escalation Alert
  const severityRank: Record<SafetyStatus, number> = {
    'Very Safe': 0,
    'Normal': 1,
    'Warning': 2,
    'Critical': 3,
    'Danger': 4,
  };

  if (severityRank[params.new_status] > severityRank[params.previous_status]) {
    const sevMap: Record<SafetyStatus, 'info' | 'warning' | 'critical' | 'danger'> = {
      'Very Safe': 'info',
      'Normal': 'info',
      'Warning': 'warning',
      'Critical': 'critical',
      'Danger': 'danger',
    };

    // Check if duplicate alert within last 15 minutes
    const hasRecentStatusAlert = recentAlerts.some(
      a => a.alert_type === 'STATUS_CHANGE' &&
      (new Date(params.timestamp).getTime() - new Date(a.created_at).getTime()) < 15 * 60 * 1000
    );

    if (!hasRecentStatusAlert) {
      insertAlert.run(
        params.device_id,
        params.road_id,
        'STATUS_CHANGE',
        sevMap[params.new_status],
        `Hazard level escalated to ${params.new_status} at ${params.road_name}. Current water depth is ${params.current_depth} cm.`,
        params.timestamp,
        params.current_depth,
        params.previous_depth
      );
    }
  }

  // 2. Rising Water Early Warning
  if (params.trend_status === 'Rapidly Increasing' || (params.trend_status === 'Increasing' && params.rate_of_change >= 8.0)) {
    const hasRecentRisingAlert = recentAlerts.some(
      a => a.alert_type === 'RISING_WATER' &&
      (new Date(params.timestamp).getTime() - new Date(a.created_at).getTime()) < 20 * 60 * 1000
    );

    if (!hasRecentRisingAlert) {
      insertAlert.run(
        params.device_id,
        params.road_id,
        'RISING_WATER',
        params.rate_of_change >= 12 ? 'danger' : 'warning',
        `EMERGING DANGER: Water rapidly rising at ${params.road_name} (+${params.rate_of_change} cm/hr). Immediate caution required.`,
        params.timestamp,
        params.current_depth,
        params.previous_depth
      );
    }
  }

  // 3. Danger Threshold Exceeded
  if (params.new_status === 'Danger') {
    const hasDangerAlert = recentAlerts.some(
      a => a.alert_type === 'CRITICAL_DANGER' &&
      (new Date(params.timestamp).getTime() - new Date(a.created_at).getTime()) < 30 * 60 * 1000
    );
    if (!hasDangerAlert) {
      insertAlert.run(
        params.device_id,
        params.road_id,
        'CRITICAL_DANGER',
        'danger',
        `EXTREME FLOOD HAZARD: Road impassable at ${params.road_name}. Water depth reached ${params.current_depth} cm. Avoid this route!`,
        params.timestamp,
        params.current_depth,
        params.previous_depth
      );
    }
  }
}

// Get all sensors with computed live values, online status, and trends
export function getSensors(): Sensor[] {
  const sensors = db.prepare('SELECT * FROM sensors ORDER BY id ASC').all() as Sensor[];
  const settings = getSettings();
  const staleThresholdMs = settings.stale_sensor_minutes * 60 * 1000;
  const now = Date.now();

  return sensors.map(s => {
    const latest = db.prepare(`
      SELECT water_depth_cm, water_level_cm, water_level_percentage, rainfall_mm, timestamp
      FROM readings
      WHERE device_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(s.device_id) as {
      water_depth_cm: number;
      water_level_cm: number;
      water_level_percentage: number;
      rainfall_mm: number;
      timestamp: string;
    } | undefined;

    const latestTrend = db.prepare(`
      SELECT trend_status, rate_of_change
      FROM historical_trends
      WHERE device_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(s.device_id) as { trend_status: TrendStatus; rate_of_change: number } | undefined;

    let isOnline = false;
    let safetyStatus: SafetyStatus = 'Normal';

    if (latest) {
      const ageMs = now - new Date(latest.timestamp).getTime();
      isOnline = ageMs < staleThresholdMs;

      // Find thresholds from associated road or defaults
      const road = db.prepare('SELECT safety_thresholds FROM road_zones WHERE associated_device_id = ? LIMIT 1').get(s.device_id) as { safety_thresholds: string } | undefined;
      const th = road ? JSON.parse(road.safety_thresholds) : settings.global_thresholds;
      safetyStatus = classifySafetyStatus(latest.water_depth_cm, th);
    }

    return {
      ...s,
      current_water_depth_cm: latest?.water_depth_cm ?? 0,
      current_water_level_cm: latest?.water_level_cm ?? 0,
      current_water_level_percentage: latest?.water_level_percentage ?? 0,
      current_rainfall_mm: latest?.rainfall_mm ?? 0,
      last_updated: latest?.timestamp ?? s.created_at,
      current_trend: latestTrend?.trend_status ?? 'Stable',
      rate_of_change: latestTrend?.rate_of_change ?? 0,
      current_safety_status: safetyStatus,
      is_online: isOnline,
    };
  });
}

// Get all Road Zones with current live geometry, safety status, and rising alert overlay
export function getRoadZones(): RoadZone[] {
  const rows = db.prepare('SELECT * FROM road_zones ORDER BY id ASC').all() as {
    id: number;
    road_name: string;
    geometry: string;
    safety_thresholds: string;
    current_status: string;
    associated_device_id: string;
  }[];

  return rows.map(r => {
    const thresholds = JSON.parse(r.safety_thresholds);
    const geometry = JSON.parse(r.geometry);

    const latest = db.prepare(`
      SELECT water_depth_cm, water_level_cm, rainfall_mm, timestamp
      FROM readings
      WHERE device_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(r.associated_device_id) as {
      water_depth_cm: number;
      water_level_cm: number;
      rainfall_mm: number;
      timestamp: string;
    } | undefined;

    const latestTrend = db.prepare(`
      SELECT trend_status, rate_of_change
      FROM historical_trends
      WHERE device_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(r.associated_device_id) as { trend_status: TrendStatus; rate_of_change: number } | undefined;

    const depth = latest?.water_depth_cm ?? 0;
    const computedStatus = classifySafetyStatus(depth, thresholds);
    const isRisingDanger = latestTrend?.trend_status === 'Rapidly Increasing' || (latestTrend?.rate_of_change ?? 0) >= 8.0;

    return {
      id: r.id,
      road_name: r.road_name,
      geometry,
      safety_thresholds: thresholds,
      current_status: computedStatus,
      associated_device_id: r.associated_device_id,
      current_depth_cm: depth,
      current_level_cm: latest?.water_level_cm ?? 0,
      current_rainfall_mm: latest?.rainfall_mm ?? 0,
      is_rising_danger: isRisingDanger,
      rate_of_change: latestTrend?.rate_of_change ?? 0,
      last_updated: latest?.timestamp,
    };
  });
}

// Get overview statistics for the main dashboard
export function getOverviewStatistics(): OverviewStatistics {
  const sensors = getSensors();
  const roadZones = getRoadZones();
  const settings = getSettings();
  const now = Date.now();
  const staleThresholdMs = settings.stale_sensor_minutes * 60 * 1000;

  let onlineCount = 0;
  let offlineCount = 0;
  let maxDepthSensor: Sensor | null = null;
  let maxDepth = -1;
  let latestTimestamp: string | null = null;

  for (const s of sensors) {
    if (s.is_online) onlineCount++;
    else offlineCount++;

    if (s.current_water_depth_cm !== undefined && s.current_water_depth_cm > maxDepth) {
      maxDepth = s.current_water_depth_cm;
      maxDepthSensor = s;
    }

    if (s.last_updated) {
      if (!latestTimestamp || new Date(s.last_updated).getTime() > new Date(latestTimestamp).getTime()) {
        latestTimestamp = s.last_updated;
      }
    }
  }

  // Active danger zones: status is Critical or Danger
  const activeDangerZones = roadZones.filter(r => r.current_status === 'Critical' || r.current_status === 'Danger').length;
  const risingWaterZones = roadZones.filter(r => r.is_rising_danger).length;

  // Campus Safety Status: Most severe among all zones
  let campusStatus: SafetyStatus = 'Very Safe';
  if (roadZones.some(r => r.current_status === 'Danger')) {
    campusStatus = 'Danger';
  } else if (roadZones.some(r => r.current_status === 'Critical')) {
    campusStatus = 'Critical';
  } else if (roadZones.some(r => r.current_status === 'Warning' || r.is_rising_danger)) {
    campusStatus = 'Warning';
  } else if (roadZones.some(r => r.current_status === 'Normal')) {
    campusStatus = 'Normal';
  }

  const activeAlertsCount = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE resolved_at IS NULL').get() as { count: number };

  return {
    latest_reading: maxDepthSensor
      ? {
          water_depth_cm: maxDepthSensor.current_water_depth_cm ?? 0,
          water_level_cm: maxDepthSensor.current_water_level_cm ?? 0,
          water_level_percentage: maxDepthSensor.current_water_level_percentage ?? 0,
          rainfall_mm: maxDepthSensor.current_rainfall_mm ?? 0,
          location_name: maxDepthSensor.location_name,
          device_id: maxDepthSensor.device_id,
          timestamp: maxDepthSensor.last_updated ?? new Date().toISOString(),
          trend: maxDepthSensor.current_trend ?? 'Stable',
          rate_of_change: maxDepthSensor.rate_of_change ?? 0,
        }
      : null,
    campus_safety_status: campusStatus,
    active_danger_zones_count: activeDangerZones,
    rising_water_zones_count: risingWaterZones,
    total_sensors: sensors.length,
    online_sensors: onlineCount,
    offline_sensors: offlineCount,
    last_updated: latestTimestamp,
    active_alerts_count: activeAlertsCount.count,
  };
}

// Vehicle Passability Calculator following Section 5 strictly
export function checkVehiclePassability(req: VehicleCheckRequest): VehicleCheckResult {
  const clearance = Number(req.ground_clearance_cm);
  if (!clearance || clearance <= 0) {
    throw new Error('Valid vehicle ground clearance in centimetres is required');
  }

  // Find road
  let road: RoadZone | undefined;
  const roads = getRoadZones();
  if (req.road_id) {
    road = roads.find(r => r.id === req.road_id);
  } else if (req.device_id) {
    road = roads.find(r => r.associated_device_id === req.device_id);
  }

  if (!road) {
    road = roads[0]; // fallback to main entrance
  }

  // Calculate threshold: D_limit = 0.20 * G
  const thresholdCm = Math.round(0.2 * clearance * 10) / 10;
  const waterDepth = road.current_depth_cm ?? 0;
  const differenceCm = Math.round((thresholdCm - waterDepth) * 10) / 10;

  // Stale check
  const settings = getSettings();
  const isStale = road.last_updated
    ? Date.now() - new Date(road.last_updated).getTime() > settings.stale_sensor_minutes * 60 * 1000
    : true;

  // Mathematical pass check: D < 0.20 * G
  let isPassable = waterDepth < thresholdCm;
  let safetyOverrideReason: string | undefined;

  // Safety Overrides
  if (road.current_status === 'Danger' || road.current_status === 'Critical') {
    isPassable = false;
    safetyOverrideReason = `CRITICAL ROAD HAZARD: The selected road (${road.road_name}) is currently under ${road.current_status} waterlogging status. Driving through is strictly prohibited regardless of vehicle ground clearance.`;
  } else if (road.is_rising_danger) {
    isPassable = false;
    safetyOverrideReason = `RISING WATER SURGE: Rapidly rising water detected (+${road.rate_of_change} cm/hr) at ${road.road_name}. Road could become impassable within minutes. Passing is unsafe.`;
  } else if (isStale) {
    isPassable = false;
    safetyOverrideReason = `DATA STALE OR UNAVAILABLE: Last sensor transmission for ${road.road_name} is outdated or offline. Safety clearance cannot be verified. Do not proceed without visual inspection.`;
  }

  const passabilityLabel = isPassable
    ? 'PASSABILITY THRESHOLD MET – PROVISIONAL PASS'
    : 'DO NOT PASS – WATER DEPTH EXCEEDS YOUR THRESHOLD';

  let detailedExplanation = '';
  if (isPassable) {
    detailedExplanation = `Measured water depth (${waterDepth} cm) is below your vehicle's safety threshold of ${thresholdCm} cm (20% of ${clearance} cm ground clearance) by ${differenceCm} cm. Current road condition is ${road.current_status}.`;
  } else if (safetyOverrideReason) {
    detailedExplanation = safetyOverrideReason;
  } else {
    detailedExplanation = `Measured water depth of ${waterDepth} cm exceeds your vehicle's 20% ground clearance threshold of ${thresholdCm} cm by ${Math.abs(differenceCm)} cm. Water is likely to reach sensitive undercarriage components or exhaust.`;
  }

  return {
    vehicle_type: req.vehicle_type || 'Car',
    ground_clearance_cm: clearance,
    water_depth_cm: waterDepth,
    threshold_cm: thresholdCm,
    difference_cm: differenceCm,
    is_passable: isPassable,
    passability_label: passabilityLabel,
    road_name: road.road_name,
    road_safety_status: road.current_status,
    is_rising_water: !!road.is_rising_danger,
    is_stale_data: isStale,
    last_updated: road.last_updated || new Date().toISOString(),
    safety_override_reason: safetyOverrideReason,
    detailed_explanation: detailedExplanation,
    disclaimer: 'DISCLAIMER: This calculation is a screening rule based on calm water depth and does not guarantee complete passage safety. Hidden potholes, floating debris, bow waves from oncoming vehicles, and engine air intake position significantly affect water fording capability.',
  };
}

// 15-Minute Historical Analytics with Aggregation
export function getAnalytics(deviceId?: string, hours: number = 24): AnalyticsSummary {
  const sensor = deviceId
    ? (db.prepare('SELECT * FROM sensors WHERE device_id = ?').get(deviceId) as Sensor | undefined)
    : (db.prepare('SELECT * FROM sensors ORDER BY id ASC LIMIT 1').get() as Sensor | undefined);

  if (!sensor) {
    throw new Error('No sensor found for analytics');
  }

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Fetch readings in time window
  const rawReadings = db.prepare(`
    SELECT water_depth_cm, water_level_cm, rainfall_mm, timestamp
    FROM readings
    WHERE device_id = ? AND timestamp >= ?
    ORDER BY timestamp ASC
  `).all(sensor.device_id, cutoff) as {
    water_depth_cm: number;
    water_level_cm: number;
    rainfall_mm: number;
    timestamp: string;
  }[];

  // Aggregate into 15-minute buckets (taking the latest valid reading in each 15-min interval)
  const bucketMap = new Map<string, { depth: number; level: number; rain: number; timestamp: string }>();

  for (const r of rawReadings) {
    const d = new Date(r.timestamp);
    const ms = d.getTime();
    const bucketMs = Math.floor(ms / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const bucketKey = new Date(bucketMs).toISOString();

    bucketMap.set(bucketKey, {
      depth: r.water_depth_cm,
      level: r.water_level_cm,
      rain: r.rainfall_mm,
      timestamp: bucketKey,
    });
  }

  const sortedBuckets = Array.from(bucketMap.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const dataPoints: AnalyticsDataPoint[] = sortedBuckets.map((b, idx) => {
    let rate: number | undefined;
    if (idx > 0) {
      const prev = sortedBuckets[idx - 1];
      const hoursDiff = (new Date(b.timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 0) {
        rate = Math.round(((b.depth - prev.depth) / hoursDiff) * 10) / 10;
      }
    }

    const d = new Date(b.timestamp);
    const displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      timestamp: b.timestamp,
      display_time: displayTime,
      water_depth_cm: b.depth,
      water_level_cm: b.level,
      rainfall_mm: b.rain,
      rate_of_change: rate,
    };
  });

  const depths = dataPoints.map(p => p.water_depth_cm);
  const currentDepth = depths.length > 0 ? depths[depths.length - 1] : 0;
  const previousDepth = depths.length > 1 ? depths[depths.length - 2] : currentDepth;
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const minDepth = depths.length > 0 ? Math.min(...depths) : 0;
  const avgDepth = depths.length > 0 ? Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10 : 0;
  const changeInDepth = Math.round((currentDepth - previousDepth) * 10) / 10;

  // Recent trend
  const latestTrend = db.prepare(`
    SELECT trend_status, rate_of_change FROM historical_trends
    WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1
  `).get(sensor.device_id) as { trend_status: TrendStatus; rate_of_change: number } | undefined;

  return {
    device_id: sensor.device_id,
    location_name: sensor.location_name,
    current_depth: currentDepth,
    previous_depth: previousDepth,
    change_in_depth: changeInDepth,
    max_depth: maxDepth,
    min_depth: minDepth,
    avg_depth: avgDepth,
    rate_of_change: latestTrend?.rate_of_change ?? 0,
    trend_status: latestTrend?.trend_status ?? 'Stable',
    data_points: dataPoints,
  };
}

// Alerts helpers
export function getAlerts(activeOnly: boolean = false): Alert[] {
  const query = activeOnly
    ? `
      SELECT a.*, r.road_name
      FROM alerts a
      LEFT JOIN road_zones r ON a.road_id = r.id
      WHERE a.resolved_at IS NULL
      ORDER BY a.created_at DESC
    `
    : `
      SELECT a.*, r.road_name
      FROM alerts a
      LEFT JOIN road_zones r ON a.road_id = r.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `;

  return db.prepare(query).all() as Alert[];
}

export function resolveAlert(alertId: number): boolean {
  const res = db.prepare('UPDATE alerts SET resolved_at = ? WHERE id = ?').run(new Date().toISOString(), alertId);
  return res.changes > 0;
}

// Reset or seed simulation scenario
export function triggerSimulationScenario(scenario: 'heavy_monsoon' | 'flash_flood' | 'receding' | 'sensor_offline' | 'reset_normal') {
  const now = new Date();
  const timeIso = now.toISOString();

  if (scenario === 'flash_flood') {
    // Escalate Civil underpass to 36 cm and Gate 1 to 28 cm rapidly
    addReading({
      device_id: 'ESP32-RVCE-02',
      water_depth_cm: 32.5,
      water_level_cm: 48.0,
      water_level_percentage: 80.0,
      rainfall_mm: 45.0,
      timestamp: timeIso,
    });
    addReading({
      device_id: 'ESP32-RVCE-01',
      water_depth_cm: 26.0,
      water_level_cm: 41.0,
      water_level_percentage: 68.3,
      rainfall_mm: 38.0,
      timestamp: timeIso,
    });
  } else if (scenario === 'heavy_monsoon') {
    // Increase depths across campus
    const sensors = getSensors();
    for (const s of sensors) {
      addReading({
        device_id: s.device_id,
        water_depth_cm: (s.current_water_depth_cm ?? 2) + 6.5,
        rainfall_mm: 30.0,
        timestamp: timeIso,
      });
    }
  } else if (scenario === 'receding') {
    const sensors = getSensors();
    for (const s of sensors) {
      addReading({
        device_id: s.device_id,
        water_depth_cm: Math.max(1.0, (s.current_water_depth_cm ?? 5) - 5.0),
        rainfall_mm: 1.0,
        timestamp: timeIso,
      });
    }
  } else if (scenario === 'reset_normal') {
    db.prepare('DELETE FROM alerts').run();
    db.prepare('DELETE FROM readings').run();
    db.prepare('DELETE FROM historical_trends').run();
    seedInitialCampusData();
  }
}
