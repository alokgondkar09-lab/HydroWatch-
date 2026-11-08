import type {
  Sensor,
  RoadZone,
  Alert,
  OverviewStatistics,
  AnalyticsSummary,
  VehicleCheckRequest,
  VehicleCheckResult,
  SystemSettings,
} from '../types/hydrowatch.ts';

const API_BASE = ''; // Relative path for same-origin dev & prod

export async function fetchOverview(): Promise<OverviewStatistics> {
  const res = await fetch(`${API_BASE}/api/overview`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchSensors(): Promise<Sensor[]> {
  const res = await fetch(`${API_BASE}/api/sensors`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchRoadZones(): Promise<{ boundary: [number, number][]; zones: RoadZone[] }> {
  const res = await fetch(`${API_BASE}/api/map/zones`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchAnalytics(deviceId?: string, hours: number = 24): Promise<AnalyticsSummary> {
  const query = new URLSearchParams();
  if (deviceId) query.append('device_id', deviceId);
  query.append('hours', hours.toString());
  const res = await fetch(`${API_BASE}/api/analytics/water-depth?${query.toString()}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function checkVehiclePassabilityApi(req: VehicleCheckRequest): Promise<VehicleCheckResult> {
  const res = await fetch(`${API_BASE}/api/vehicle/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

export async function fetchAlerts(activeOnly: boolean = false): Promise<Alert[]> {
  const endpoint = activeOnly ? `${API_BASE}/api/alerts` : `${API_BASE}/api/alerts/history`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function resolveAlertApi(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/alerts/${id}/resolve`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function postSensorData(payload: {
  device_id: string;
  water_depth_cm: number;
  water_level_cm?: number;
  water_level_percentage?: number;
  rainfall_mm?: number;
  latitude?: number;
  longitude?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/sensor-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

export async function triggerSimulationApi(scenario: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/simulation/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function updateSettingsApi(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}
