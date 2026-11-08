import React, { useState } from 'react';
import {
  Droplets,
  Gauge,
  ShieldAlert,
  AlertTriangle,
  Cpu,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Car,
  ExternalLink,
  MapPin,
  CheckCircle2,
  ChevronRight,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type {
  OverviewStatistics,
  RoadZone,
  Sensor,
  Alert,
  SafetyStatus,
} from '../types/hydrowatch.ts';
import { CampusLeafletMap } from './CampusLeafletMap.tsx';
import type { ActivePage } from './Sidebar.tsx';

interface DashboardPageProps {
  overview: OverviewStatistics | null;
  roadZones: RoadZone[];
  sensors: Sensor[];
  alerts: Alert[];
  boundary: [number, number][];
  onNavigate: (page: ActivePage) => void;
  onOpenSimulator: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  overview,
  roadZones,
  sensors,
  alerts,
  boundary,
  onNavigate,
  onOpenSimulator,
}) => {
  const latest = overview?.latest_reading;

  // Mini vehicle check state
  const [quickClearance, setQuickClearance] = useState<number>(18);
  const [quickRoadId, setQuickRoadId] = useState<number>(roadZones[0]?.id || 1);
  const selectedRoad = roadZones.find(r => r.id === quickRoadId) || roadZones[0];
  const calculatedLimit = Math.round(0.2 * quickClearance * 10) / 10;
  const isPassable = selectedRoad ? (selectedRoad.current_depth_cm ?? 0) < calculatedLimit : true;

  // Quick safety pill style
  const getSafetyBadgeStyle = (status: SafetyStatus) => {
    switch (status) {
      case 'Very Safe':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Normal':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Critical':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Danger':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  // Format relative timestamp
  const formatTime = (ts: string | null | undefined) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Sparkline data for mini chart
  const miniChartData = sensors.map((s, idx) => ({
    name: s.location_name.split(' ')[0],
    depth: s.current_water_depth_cm ?? 0,
    rainfall: s.current_rainfall_mm ?? 0,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner / Campus Status Summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                RVCE CAMPUS DISPATCH
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Updated {formatTime(overview?.last_updated)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-Time Waterlogging & Flood Monitoring
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Monitoring telemetry from ESP32 edge sensors deployed along RVCE roadways, culverts, and low-lying pedestrian corridors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('map')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Explore Campus Map</span>
            </button>
            <button
              onClick={onOpenSimulator}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Simulate Rain</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Overview Statistics (6 High-Fidelity Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Current Water Depth */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Water Depth</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white">
              {latest ? latest.water_depth_cm : '0.0'}
            </span>
            <span className="text-xs font-semibold text-cyan-400">cm</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 truncate max-w-[100px]" title={latest?.location_name || 'Campus'}>
              {latest ? latest.location_name.split(' ')[0] : 'All Zones'}
            </span>
            <span
              className={`flex items-center gap-0.5 font-semibold ${
                latest?.trend === 'Rapidly Increasing' || latest?.trend === 'Increasing'
                  ? 'text-rose-400'
                  : latest?.trend === 'Decreasing'
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {latest?.trend === 'Rapidly Increasing' || latest?.trend === 'Increasing' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : latest?.trend === 'Decreasing' ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              {latest?.trend || 'Stable'}
            </span>
          </div>
        </div>

        {/* Card 2: Water Level */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Water Level</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white">
              {latest ? latest.water_level_percentage : 0}
            </span>
            <span className="text-xs font-semibold text-blue-400">%</span>
            <span className="text-[11px] text-slate-500 ml-1">({latest?.water_level_cm || 0} cm)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, latest?.water_level_percentage || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Campus Safety Status */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Campus Safety</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide border ${getSafetyBadgeStyle(
                overview?.campus_safety_status || 'Normal'
              )}`}
            >
              {overview?.campus_safety_status || 'Normal'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            Across 6 internal roads
          </div>
        </div>

        {/* Card 4: Active Danger Zones */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Danger Zones</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold ${
                overview && overview.active_danger_zones_count > 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {overview?.active_danger_zones_count ?? 0}
            </span>
            <span className="text-xs text-slate-400">Active</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Rising Water:</span>
            <span
              className={`font-semibold ${
                overview && overview.rising_water_zones_count > 0 ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {overview?.rising_water_zones_count ?? 0} Detected
            </span>
          </div>
        </div>

        {/* Card 5: Connected Sensors */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">IoT Sensors</span>
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white">
              {overview?.online_sensors ?? 0}
            </span>
            <span className="text-xs text-slate-400">/ {overview?.total_sensors ?? 0}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {overview?.online_sensors ?? 0} Online
            </span>
            <span className="text-slate-500">{overview?.offline_sensors ?? 0} Stale</span>
          </div>
        </div>

        {/* Card 6: Last Updated */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Last Packet</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-extrabold text-white font-mono truncate" title={overview?.last_updated || ''}>
            {formatTime(overview?.last_updated)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Telemetry active</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map Preview + Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Campus Map Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">Live RVCE Campus Flood Map</h2>
            </div>
            <button
              onClick={() => onNavigate('map')}
              className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <span>Full Screen Map</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <CampusLeafletMap
              boundary={boundary}
              roadZones={roadZones}
              sensors={sensors}
              height="440px"
              onSelectRoad={() => onNavigate('map')}
              onSelectSensor={() => onNavigate('map')}
            />
          </div>

          {/* Road Zones Quick Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {roadZones.slice(0, 6).map(road => {
              const depth = road.current_depth_cm ?? 0;
              return (
                <div
                  key={road.id}
                  onClick={() => onNavigate('map')}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-200 truncate">{road.road_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="text-slate-400">Depth: <b className="text-white">{depth} cm</b></span>
                      {road.is_rising_danger && (
                        <span className="text-rose-400 font-bold text-[10px] animate-pulse">Rising!</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border ${getSafetyBadgeStyle(
                      road.current_status
                    )}`}
                  >
                    {road.current_status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Vehicle Passability + Active Alerts */}
        <div className="space-y-6">
          {/* Quick Vehicle Passability Screening Widget */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Car className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Can My Vehicle Pass?</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                20% Limit Rule
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Select Monitored Roadway</label>
                <select
                  value={quickRoadId}
                  onChange={e => setQuickRoadId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                >
                  {roadZones.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.road_name} ({r.current_depth_cm ?? 0} cm)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 font-medium mb-1">
                  <span>Vehicle Ground Clearance (G)</span>
                  <span className="text-cyan-400 font-bold font-mono">{quickClearance} cm</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="35"
                  step="0.5"
                  value={quickClearance}
                  onChange={e => setQuickClearance(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Two-wheeler (14-16cm)</span>
                  <span>Sedan (16-17cm)</span>
                  <span>SUV (19-22cm)</span>
                </div>
              </div>

              {/* Passability Outcome Box */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isPassable && selectedRoad.current_status !== 'Critical' && selectedRoad.current_status !== 'Danger'
                    ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-700/60 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-extrabold text-xs">
                  {isPassable && selectedRoad.current_status !== 'Critical' && selectedRoad.current_status !== 'Danger' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>PASSABILITY THRESHOLD MET</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>DO NOT PASS – EXCEEDS LIMIT</span>
                    </>
                  )}
                </div>

                <div className="mt-2 text-[11px] space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Permitted Water Limit (20% &times; {quickClearance}):</span>
                    <span className="font-bold text-white">{calculatedLimit} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Measured Water Depth:</span>
                    <span className="font-bold text-white">{selectedRoad.current_depth_cm ?? 0} cm</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('vehicle')}
                  className="mt-3 w-full py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Detailed Screening Tool</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Alerts Feed */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Recent Alerts</h3>
              </div>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {alerts.slice(0, 3).map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-xs ${
                    alert.severity === 'danger'
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                      : alert.severity === 'critical'
                      ? 'bg-orange-950/30 border-orange-800/50 text-orange-200'
                      : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                    <span>{alert.road_name || alert.device_id}</span>
                    <span className="uppercase text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-900/60">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">{alert.message}</p>
                  <div className="mt-1.5 text-[10px] text-slate-400 flex justify-between">
                    <span>Water Depth: {alert.current_depth ?? 0} cm</span>
                    <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1 opacity-80" />
                  <p className="font-semibold text-slate-300 text-xs">No Active Alerts</p>
                  <p className="text-[11px] text-slate-500">All campus roads clear</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Depths Overview Sparkline Chart */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Live Sensor Readings Across RVCE Zones
            </h3>
            <p className="text-xs text-slate-400">Instantaneous water depth comparison across monitored nodes</p>
          </div>
          <button
            onClick={() => onNavigate('analytics')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View 15-Minute Historical Trends</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={miniChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="cm" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Area type="monotone" dataKey="depth" stroke="#06b6d4" strokeWidth={2.5} fill="url(#depthGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
