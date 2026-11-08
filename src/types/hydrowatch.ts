export type SafetyStatus = 'Very Safe' | 'Normal' | 'Warning' | 'Critical' | 'Danger';
export type TrendStatus = 'Stable' | 'Increasing' | 'Rapidly Increasing' | 'Decreasing';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'danger';
export type VehicleType = 'Two-wheeler' | 'Car' | 'SUV' | 'Other';

export interface Sensor {
  id: number;
  device_id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  is_active: number;
  created_at: string;
  current_water_depth_cm?: number;
  current_water_level_cm?: number;
  current_water_level_percentage?: number;
  current_rainfall_mm?: number;
  current_trend?: TrendStatus;
  current_safety_status?: SafetyStatus;
  rate_of_change?: number; // cm/hour
  last_updated?: string;
  is_online?: boolean;
}

export interface Reading {
  id: number;
  device_id: string;
  water_depth_cm: number;
  water_level_cm: number;
  water_level_percentage: number;
  rainfall_mm: number;
  timestamp: string;
  location_name?: string;
}

export interface SafetyThresholds {
  very_safe_max: number;
  normal_max: number;
  warning_max: number;
  critical_max: number;
}

export interface RoadZone {
  id: number;
  road_name: string;
  geometry: [number, number][]; // [lat, lng] array
  safety_thresholds: SafetyThresholds;
  current_status: SafetyStatus;
  associated_device_id: string;
  current_depth_cm?: number;
  current_level_cm?: number;
  current_rainfall_mm?: number;
  is_rising_danger?: boolean;
  rate_of_change?: number;
  last_updated?: string;
}

export interface Alert {
  id: number;
  device_id: string;
  road_id?: number | null;
  road_name?: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  created_at: string;
  resolved_at?: string | null;
  current_depth?: number | null;
  previous_depth?: number | null;
}

export interface HistoricalTrend {
  id: number;
  device_id: string;
  previous_depth: number;
  current_depth: number;
  rate_of_change: number;
  trend_status: TrendStatus;
  timestamp: string;
}

export interface VehicleCheckRequest {
  vehicle_type: VehicleType;
  ground_clearance_cm: number;
  road_id?: number;
  device_id?: string;
}

export interface VehicleCheckResult {
  vehicle_type: VehicleType;
  ground_clearance_cm: number;
  water_depth_cm: number;
  threshold_cm: number;
  difference_cm: number;
  is_passable: boolean;
  passability_label: 'PASSABILITY THRESHOLD MET – PROVISIONAL PASS' | 'DO NOT PASS – WATER DEPTH EXCEEDS YOUR THRESHOLD';
  road_name: string;
  road_safety_status: SafetyStatus;
  is_rising_water: boolean;
  is_stale_data: boolean;
  last_updated: string;
  safety_override_reason?: string;
  detailed_explanation: string;
  disclaimer: string;
}

export interface OverviewStatistics {
  latest_reading?: {
    water_depth_cm: number;
    water_level_cm: number;
    water_level_percentage: number;
    rainfall_mm: number;
    location_name: string;
    device_id: string;
    timestamp: string;
    trend: TrendStatus;
    rate_of_change: number;
  } | null;
  campus_safety_status: SafetyStatus;
  active_danger_zones_count: number;
  rising_water_zones_count: number;
  total_sensors: number;
  online_sensors: number;
  offline_sensors: number;
  last_updated: string | null;
  active_alerts_count: number;
}

export interface AnalyticsDataPoint {
  timestamp: string;
  display_time: string;
  water_depth_cm: number;
  water_level_cm: number;
  rainfall_mm: number;
  rate_of_change?: number;
}

export interface AnalyticsSummary {
  device_id: string;
  location_name: string;
  current_depth: number;
  previous_depth: number;
  change_in_depth: number;
  max_depth: number;
  min_depth: number;
  avg_depth: number;
  rate_of_change: number;
  trend_status: TrendStatus;
  data_points: AnalyticsDataPoint[];
}

export interface SystemSettings {
  stale_sensor_minutes: number;
  rising_water_consecutive_intervals: number;
  rising_water_rate_threshold_cm_hr: number;
  sample_interval_minutes: number;
  global_thresholds: SafetyThresholds;
}
