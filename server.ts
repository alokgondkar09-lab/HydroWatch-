import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  initDatabase,
  addReading,
  getSensors,
  getRoadZones,
  getOverviewStatistics,
  checkVehiclePassability,
  getAnalytics,
  getAlerts,
  resolveAlert,
  getSettings,
  updateSettings,
  triggerSimulationScenario,
  RVCE_CAMPUS_BOUNDARY,
} from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
initDatabase();

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for external ESP32 microcontrollers and development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// SSE (Server-Sent Events) for instant live push to frontend
type SSEClient = { id: number; res: Response };
let sseClients: SSEClient[] = [];
let nextClientId = 1;

export function broadcastUpdate(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch {
      // ignore
    }
  });
}

// SSE stream endpoint
app.get(['/api/events', '/events'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = nextClientId++;
  const newClient: SSEClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

/* ==========================================================================
   REST API Endpoints (Mounting both /api/* and root /* for ESP32 firmware)
   ========================================================================== */

// 1. ESP32 Sensor Ingestion
app.post(['/sensor-data', '/api/sensor-data'], (req: Request, res: Response) => {
  try {
    const { device_id, water_depth_cm, water_level_cm, water_level_percentage, rainfall_mm, latitude, longitude, timestamp } = req.body;

    if (!device_id || water_depth_cm === undefined) {
      return res.status(400).json({ error: 'device_id and water_depth_cm are required' });
    }

    const savedReading = addReading({
      device_id: String(device_id),
      water_depth_cm: Number(water_depth_cm),
      water_level_cm: water_level_cm !== undefined ? Number(water_level_cm) : undefined,
      water_level_percentage: water_level_percentage !== undefined ? Number(water_level_percentage) : undefined,
      rainfall_mm: rainfall_mm !== undefined ? Number(rainfall_mm) : undefined,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      timestamp,
    });

    // Broadcast to live dashboards
    broadcastUpdate('new_reading', {
      reading: savedReading,
      overview: getOverviewStatistics(),
      roadZones: getRoadZones(),
    });

    return res.status(201).json({
      success: true,
      message: 'Sensor reading recorded successfully',
      data: savedReading,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to record reading' });
  }
});

// 2. Overview Statistics
app.get(['/api/overview', '/overview'], (req: Request, res: Response) => {
  try {
    const stats = getOverviewStatistics();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Sensors list & status
app.get(['/sensors', '/api/sensors'], (req: Request, res: Response) => {
  try {
    const sensors = getSensors();
    res.json(sensors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/sensors/status', '/api/sensors/status'], (req: Request, res: Response) => {
  try {
    const sensors = getSensors();
    const online = sensors.filter(s => s.is_online).length;
    const offline = sensors.length - online;
    res.json({
      total: sensors.length,
      online,
      offline,
      devices: sensors.map(s => ({
        device_id: s.device_id,
        location_name: s.location_name,
        is_online: s.is_online,
        last_updated: s.last_updated,
        current_water_depth_cm: s.current_water_depth_cm,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Map Zones & Campus Locations
app.get(['/map/zones', '/api/map/zones'], (req: Request, res: Response) => {
  try {
    const zones = getRoadZones();
    res.json({
      boundary: RVCE_CAMPUS_BOUNDARY,
      zones,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/map/locations', '/api/map/locations'], (req: Request, res: Response) => {
  try {
    const sensors = getSensors();
    const zones = getRoadZones();
    res.json({
      campus_center: [12.9238, 77.4985],
      boundary: RVCE_CAMPUS_BOUNDARY,
      sensors: sensors.map(s => ({
        device_id: s.device_id,
        location_name: s.location_name,
        latitude: s.latitude,
        longitude: s.longitude,
        current_water_depth_cm: s.current_water_depth_cm,
        safety_status: s.current_safety_status,
        trend: s.current_trend,
        is_online: s.is_online,
      })),
      roads: zones.map(z => ({
        id: z.id,
        road_name: z.road_name,
        geometry: z.geometry,
        current_status: z.current_status,
        is_rising_danger: z.is_rising_danger,
        associated_device_id: z.associated_device_id,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Historical & Latest Readings
app.get(['/readings/latest', '/api/readings/latest'], (req: Request, res: Response) => {
  try {
    const sensors = getSensors();
    res.json(sensors.map(s => ({
      device_id: s.device_id,
      location_name: s.location_name,
      water_depth_cm: s.current_water_depth_cm,
      water_level_cm: s.current_water_level_cm,
      water_level_percentage: s.current_water_level_percentage,
      rainfall_mm: s.current_rainfall_mm,
      timestamp: s.last_updated,
      trend: s.current_trend,
      safety_status: s.current_safety_status,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/readings/:device_id', '/api/readings/:device_id'], (req: Request, res: Response) => {
  try {
    const { device_id } = req.params;
    const hours = req.query.hours ? Number(req.query.hours) : 24;
    const analytics = getAnalytics(device_id, hours);
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Analytics - Water Depth vs Time (15-min intervals)
app.get(['/analytics/water-depth', '/api/analytics/water-depth'], (req: Request, res: Response) => {
  try {
    const deviceId = req.query.device_id as string | undefined;
    const hours = req.query.hours ? Number(req.query.hours) : 24;
    const analytics = getAnalytics(deviceId, hours);
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Vehicle Safety Passability Calculation
app.post(['/vehicle/check', '/api/vehicle/check'], (req: Request, res: Response) => {
  try {
    const { vehicle_type, ground_clearance_cm, road_id, device_id } = req.body;
    if (!ground_clearance_cm) {
      return res.status(400).json({ error: 'ground_clearance_cm is required' });
    }
    const result = checkVehiclePassability({
      vehicle_type,
      ground_clearance_cm: Number(ground_clearance_cm),
      road_id: road_id ? Number(road_id) : undefined,
      device_id: device_id ? String(device_id) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Alerts
app.get(['/alerts', '/api/alerts'], (req: Request, res: Response) => {
  try {
    const activeAlerts = getAlerts(true);
    res.json(activeAlerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/alerts/history', '/api/alerts/history'], (req: Request, res: Response) => {
  try {
    const allAlerts = getAlerts(false);
    res.json(allAlerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/alerts/:id/resolve', '/api/alerts/:id/resolve'], (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const success = resolveAlert(id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. System Settings
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(getSettings());
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updated = updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Live Scenario Simulator Trigger
app.post('/api/simulation/trigger', (req: Request, res: Response) => {
  try {
    const { scenario } = req.body;
    triggerSimulationScenario(scenario);
    broadcastUpdate('simulation_triggered', {
      scenario,
      overview: getOverviewStatistics(),
      roadZones: getRoadZones(),
    });
    res.json({ success: true, scenario, overview: getOverviewStatistics() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/* ==========================================================================
   Vite Dev Middleware or Static File Serving
   ========================================================================== */
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HydroWatch Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
