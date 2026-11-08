import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Droplets,
  CloudRain,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { Sensor, AnalyticsSummary } from '../types/hydrowatch.ts';
import { fetchAnalytics } from '../services/api.ts';

interface AnalyticsPageProps {
  sensors: Sensor[];
  onOpenSimulator: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  sensors,
  onOpenSimulator,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(sensors[0]?.device_id || 'ESP32-RVCE-01');
  const [timeFilterHours, setTimeFilterHours] = useState<number>(24);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!selectedDeviceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalytics(selectedDeviceId, timeFilterHours);
      setAnalyticsData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDeviceId, timeFilterHours]);

  const selectedSensor = sensors.find(s => s.device_id === selectedDeviceId) || sensors[0];

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              15-MINUTE HISTORICAL ANALYTICS
            </span>
            <span className="text-xs text-slate-400">Section 6 &bull; Water Depth vs Time</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Water Depth & Rainfall Analytics
          </h1>
          <p className="text-xs text-slate-400">
            Recorded in persistent SQLite database. Aggregated in strict 15-minute intervals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sensor Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200">
            <span className="text-slate-400">Sensor:</span>
            <select
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {sensors.map(s => (
                <option key={s.device_id} value={s.device_id} className="bg-slate-900">
                  {s.location_name.split('(')[0]} ({s.device_id})
                </option>
              ))}
            </select>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex items-center p-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300">
            {[
              { label: '1H', hours: 1 },
              { label: '6H', hours: 6 },
              { label: '24H', hours: 24 },
              { label: '7D', hours: 168 },
            ].map(tf => (
              <button
                key={tf.hours}
                onClick={() => setTimeFilterHours(tf.hours)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  timeFilterHours === tf.hours
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics (6 Metrics from Section 6) */}
      {analyticsData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Current Depth */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Current Depth</span>
            <div className="text-2xl font-extrabold text-cyan-400 mt-1">
              {analyticsData.current_depth} <span className="text-xs font-normal">cm</span>
            </div>
            <span className="text-[10px] text-slate-500">Latest 15m bucket</span>
          </div>

          {/* Previous Reading */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Previous Reading</span>
            <div className="text-2xl font-extrabold text-slate-300 mt-1">
              {analyticsData.previous_depth} <span className="text-xs font-normal">cm</span>
            </div>
            <span className="text-[10px] text-slate-500">15m Prior</span>
          </div>

          {/* Depth Change */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Change (&Delta;D)</span>
            <div
              className={`text-2xl font-extrabold mt-1 flex items-center gap-1 ${
                analyticsData.change_in_depth > 0
                  ? 'text-rose-400'
                  : analyticsData.change_in_depth < 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {analyticsData.change_in_depth > 0 ? `+${analyticsData.change_in_depth}` : analyticsData.change_in_depth}
              <span className="text-xs font-normal">cm</span>
            </div>
            <span className="text-[10px] text-slate-500">Consecutive diff</span>
          </div>

          {/* Max Depth */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Peak Maximum</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">
              {analyticsData.max_depth} <span className="text-xs font-normal">cm</span>
            </div>
            <span className="text-[10px] text-slate-500">In selected window</span>
          </div>

          {/* Average Depth */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Average Depth</span>
            <div className="text-2xl font-extrabold text-blue-400 mt-1">
              {analyticsData.avg_depth} <span className="text-xs font-normal">cm</span>
            </div>
            <span className="text-[10px] text-slate-500">Mean accumulation</span>
          </div>

          {/* Rate of Increase/Decrease */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rate of Trend</span>
            <div
              className={`text-xl font-extrabold mt-1 flex items-center gap-1 ${
                analyticsData.rate_of_change >= 8
                  ? 'text-rose-400'
                  : analyticsData.rate_of_change < 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {analyticsData.rate_of_change > 0 ? `+${analyticsData.rate_of_change}` : analyticsData.rate_of_change}
              <span className="text-xs font-normal">cm/hr</span>
            </div>
            <span className="text-[10px] font-bold text-cyan-400">{analyticsData.trend_status}</span>
          </div>
        </div>
      )}

      {/* Main Interactive Recharts Graph: Water Depth vs Time */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              Water Depth vs. Time (cm)
            </h2>
            <p className="text-xs text-slate-400">
              Sensor: <b className="text-slate-200">{selectedSensor?.location_name}</b> ({selectedDeviceId})
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block rounded" />
              <span className="text-slate-300 font-medium">Water Depth (cm)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
              <span className="text-slate-300 font-medium">Total Level (cm)</span>
            </div>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-80 w-full">
          {analyticsData && analyticsData.data_points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData.data_points} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="display_time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  unit="cm"
                  domain={[0, 'dataMax + 10']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(val: any, name: any) => [`${val} cm`, name === 'water_depth_cm' ? 'Water Depth' : 'Water Level']}
                  labelFormatter={(lbl: any) => `Time: ${lbl}`}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                {/* Warning threshold guide line */}
                <ReferenceLine y={20} label={{ value: 'Warning Limit (20cm)', fill: '#eab308', fontSize: 10 }} stroke="#eab308" strokeDasharray="4 4" />
                <ReferenceLine y={35} label={{ value: 'Danger Limit (35cm)', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="4 4" />

                <Line
                  type="monotone"
                  dataKey="water_depth_cm"
                  name="Water Depth (cm)"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 2, fill: '#06b6d4' }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="water_level_cm"
                  name="Total Column Level (cm)"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No 15-minute readings found in this window. Try selecting a broader time filter.
            </div>
          )}
        </div>
      </div>

      {/* Secondary Chart: Rainfall Intensity Bar Graph */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-blue-400" />
              Precipitation & Rainfall Intensity (mm)
            </h2>
            <p className="text-xs text-slate-400">Correlates water accumulation with local campus rainfall</p>
          </div>
        </div>

        <div className="h-44 w-full">
          {analyticsData && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.data_points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="display_time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="mm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [`${val} mm`, 'Rainfall']}
                />
                <Bar dataKey="rainfall_mm" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
