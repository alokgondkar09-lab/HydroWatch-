import React, { useState } from 'react';
import {
  Cpu,
  Radio,
  MapPin,
  Clock,
  Droplets,
  CloudRain,
  Activity,
  Plus,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { Sensor } from '../types/hydrowatch.ts';
import { postSensorData } from '../services/api.ts';

interface SensorManagementPageProps {
  sensors: Sensor[];
  onRefresh: () => void;
  onOpenSendReading: (sensorId?: string) => void;
}

export const SensorManagementPage: React.FC<SensorManagementPageProps> = ({
  sensors,
  onRefresh,
  onOpenSendReading,
}) => {
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleQuickPing = async (sensor: Sensor) => {
    setPingingId(sensor.device_id);
    try {
      await postSensorData({
        device_id: sensor.device_id,
        water_depth_cm: sensor.current_water_depth_cm ?? 2.5,
        rainfall_mm: sensor.current_rainfall_mm ?? 1.0,
      });
      setSuccessMessage(`Heartbeat ping acknowledged for ${sensor.device_id}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      onRefresh();
    } catch (e: any) {
      alert(`Ping failed: ${e.message}`);
    } finally {
      setPingingId(null);
    }
  };

  const onlineCount = sensors.filter(s => s.is_online).length;
  const offlineCount = sensors.length - onlineCount;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              IOT HARDWARE FLEET
            </span>
            <span className="text-xs text-slate-400">Section 9 &bull; ESP32 Device Nodes</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            ESP32 Sensor Fleet Management
          </h1>
          <p className="text-xs text-slate-400">
            Microcontroller telemetry, ultrasonic depth transceivers, and campus installation points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenSendReading()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add / Inject Reading</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            title="Refresh Fleet"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fleet Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Registered Nodes</span>
            <div className="text-3xl font-extrabold text-white mt-1">{sensors.length}</div>
            <span className="text-[11px] text-slate-500">RVCE Campus Network</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Online & Transmitting</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">{onlineCount}</div>
            <span className="text-[11px] text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active within &le;30 min
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Wifi className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Stale / Disconnected</span>
            <div className="text-3xl font-extrabold text-slate-400 mt-1">{offlineCount}</div>
            <span className="text-[11px] text-slate-500">No packet &gt;30 min</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400">
            <WifiOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sensors.map(sensor => {
          const isOnline = sensor.is_online !== false;
          return (
            <div
              key={sensor.id}
              className={`p-5 rounded-2xl bg-slate-900/90 border transition-all shadow-xl space-y-4 ${
                isOnline ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/60 opacity-80'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-cyan-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm font-mono">{sensor.device_id}</h3>
                    <span className="text-[10px] text-slate-400">ESP32-WROOM-32</span>
                  </div>
                </div>

                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {isOnline ? 'Online' : 'Offline / Stale'}
                </span>
              </div>

              {/* Location info */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Installation Node</span>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">{sensor.location_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span>{sensor.latitude.toFixed(4)}&deg; N, {sensor.longitude.toFixed(4)}&deg; E</span>
                </div>
              </div>

              {/* Readings Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    Water Depth
                  </span>
                  <div className="text-lg font-extrabold text-white mt-0.5">
                    {sensor.current_water_depth_cm ?? 0} <span className="text-xs font-normal text-cyan-400">cm</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <CloudRain className="w-3 h-3 text-blue-400" />
                    Rainfall
                  </span>
                  <div className="text-lg font-extrabold text-white mt-0.5">
                    {sensor.current_rainfall_mm ?? 0} <span className="text-xs font-normal text-blue-400">mm</span>
                  </div>
                </div>
              </div>

              {/* Communication Details */}
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/60">
                <div className="flex justify-between">
                  <span>Trend Direction:</span>
                  <span className="font-bold text-white">{sensor.current_trend || 'Stable'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Transmission:</span>
                  <span className="font-mono text-slate-300">
                    {sensor.last_updated ? new Date(sensor.last_updated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleQuickPing(sensor)}
                  disabled={pingingId === sensor.device_id}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3 text-cyan-400" />
                  <span>{pingingId === sensor.device_id ? 'Pinging...' : 'Ping Node'}</span>
                </button>
                <button
                  onClick={() => onOpenSendReading(sensor.device_id)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-semibold text-cyan-300 transition-all cursor-pointer"
                >
                  Inject Data
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
