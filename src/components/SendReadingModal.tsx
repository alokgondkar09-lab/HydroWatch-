import React, { useState } from 'react';
import {
  Send,
  X,
  Droplets,
  CloudRain,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Sensor } from '../types/hydrowatch.ts';
import { postSensorData } from '../services/api.ts';

interface SendReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensors: Sensor[];
  defaultSensorId?: string;
  onReadingSent: () => void;
}

export const SendReadingModal: React.FC<SendReadingModalProps> = ({
  isOpen,
  onClose,
  sensors,
  defaultSensorId,
  onReadingSent,
}) => {
  const [deviceId, setDeviceId] = useState(defaultSensorId || sensors[0]?.device_id || 'ESP32-RVCE-01');
  const [depthCm, setDepthCm] = useState<number>(18.5);
  const [rainMm, setRainMm] = useState<number>(14.0);
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultMsg(null);
    setErrorMsg(null);
    try {
      const selected = sensors.find(s => s.device_id === deviceId);
      const res = await postSensorData({
        device_id: deviceId,
        water_depth_cm: Number(depthCm),
        rainfall_mm: Number(rainMm),
        latitude: selected?.latitude,
        longitude: selected?.longitude,
      });

      setResultMsg(`Recorded! Depth: ${depthCm} cm sent to ${deviceId}.`);
      onReadingSent();
      setTimeout(() => {
        onClose();
        setResultMsg(null);
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Inject ESP32 Sensor Packet
              </h2>
              <p className="text-xs text-slate-400">Simulate incoming HTTP POST /sensor-data</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {resultMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{resultMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target ESP32 Device ID</label>
            <select
              value={deviceId}
              onChange={e => setDeviceId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              {sensors.map(s => (
                <option key={s.device_id} value={s.device_id}>
                  {s.device_id} — {s.location_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                Road Surface Water Depth
              </span>
              <span className="font-mono text-cyan-400 font-bold">{depthCm} cm</span>
            </div>
            <input
              type="number"
              min="0"
              max="70"
              step="0.1"
              value={depthCm}
              onChange={e => setDepthCm(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              required
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                Rainfall Intensity
              </span>
              <span className="font-mono text-blue-400 font-bold">{rainMm} mm</span>
            </div>
            <input
              type="number"
              min="0"
              max="150"
              step="0.5"
              value={rainMm}
              onChange={e => setRainMm(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Posting...' : 'Send HTTP POST'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
