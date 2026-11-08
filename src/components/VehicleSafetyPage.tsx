import React, { useState, useEffect } from 'react';
import {
  Car,
  Bike,
  Truck,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Info,
  Droplets,
  Gauge,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import type {
  RoadZone,
  VehicleType,
  VehicleCheckResult,
} from '../types/hydrowatch.ts';
import { checkVehiclePassabilityApi } from '../services/api.ts';

interface VehicleSafetyPageProps {
  roadZones: RoadZone[];
  onOpenSimulator: () => void;
}

interface VehiclePreset {
  name: string;
  type: VehicleType;
  clearance: number;
}

const PRESETS: VehiclePreset[] = [
  { name: 'Honda Activa 6G (Scooter)', type: 'Two-wheeler', clearance: 16.2 },
  { name: 'TVS Jupiter 125', type: 'Two-wheeler', clearance: 16.3 },
  { name: 'Royal Enfield Classic 350', type: 'Two-wheeler', clearance: 17.0 },
  { name: 'Hero Splendor Plus', type: 'Two-wheeler', clearance: 16.5 },
  { name: 'Maruti Suzuki Swift', type: 'Car', clearance: 16.3 },
  { name: 'Hyundai i20', type: 'Car', clearance: 17.0 },
  { name: 'Honda City', type: 'Car', clearance: 16.5 },
  { name: 'Tata Nexon (Compact SUV)', type: 'SUV', clearance: 20.9 },
  { name: 'Hyundai Creta', type: 'SUV', clearance: 19.0 },
  { name: 'Mahindra Thar 4x4', type: 'SUV', clearance: 22.6 },
  { name: 'Toyota Fortuner', type: 'SUV', clearance: 22.5 },
  { name: 'RVCE Campus Shuttle / College Bus', type: 'Other', clearance: 28.0 },
];

export const VehicleSafetyPage: React.FC<VehicleSafetyPageProps> = ({
  roadZones,
  onOpenSimulator,
}) => {
  const [vehicleType, setVehicleType] = useState<VehicleType>('Car');
  const [groundClearance, setGroundClearance] = useState<number>(17.0);
  const [selectedRoadId, setSelectedRoadId] = useState<number>(roadZones[0]?.id || 1);
  const [selectedPreset, setSelectedPreset] = useState<string>('Maruti Suzuki Swift');

  const [calculationResult, setCalculationResult] = useState<VehicleCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync preset selection
  const handlePresetSelect = (presetName: string) => {
    setSelectedPreset(presetName);
    const p = PRESETS.find(item => item.name === presetName);
    if (p) {
      setVehicleType(p.type);
      setGroundClearance(p.clearance);
    }
  };

  // Run calculation whenever inputs change
  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      if (!groundClearance || groundClearance <= 0) return;
      setLoading(true);
      setError(null);
      try {
        const res = await checkVehiclePassabilityApi({
          vehicle_type: vehicleType,
          ground_clearance_cm: groundClearance,
          road_id: selectedRoadId,
        });
        if (isMounted) setCalculationResult(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to calculate passability');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    runCheck();
    return () => {
      isMounted = false;
    };
  }, [vehicleType, groundClearance, selectedRoadId, roadZones]);

  const selectedRoad = roadZones.find(r => r.id === selectedRoadId) || roadZones[0];

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SAFETY SCREENING ALGORITHM
              </span>
              <span className="text-xs text-slate-400">Section 5 &bull; HydroWatch Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Can My Vehicle Pass?
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Calculates whether your vehicle can safely traverse monitored RVCE roads using the user-specified rule:
              <span className="font-mono text-cyan-300 font-bold ml-1">
                Max Depth &le; 20% of Ground Clearance (D &le; 0.20 &times; G)
              </span>.
            </p>
          </div>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all cursor-pointer self-start md:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulate Flood Scenario</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Inputs (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Car className="w-4 h-4 text-cyan-400" />
              1. Vehicle Parameters
            </h2>

            {/* Vehicle Type Tabs */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Vehicle Category</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'Two-wheeler' as VehicleType, icon: Bike, label: 'Two-Wheeler' },
                  { type: 'Car' as VehicleType, icon: Car, label: 'Car / Sedan' },
                  { type: 'SUV' as VehicleType, icon: Truck, label: 'SUV / 4x4' },
                  { type: 'Other' as VehicleType, icon: HelpCircle, label: 'Bus / Other' },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = vehicleType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setVehicleType(item.type)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Popular Model Presets (Auto-fills Clearance)
              </label>
              <select
                value={selectedPreset}
                onChange={e => handlePresetSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-cyan-500"
              >
                {PRESETS.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} — {p.clearance} cm
                  </option>
                ))}
              </select>
            </div>

            {/* Ground Clearance Input (G) */}
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  Ground Clearance (G)
                  <span className="text-[10px] text-amber-400 font-normal">(Underside to Road)</span>
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="0.1"
                    value={groundClearance}
                    onChange={e => setGroundClearance(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-right font-mono font-bold text-cyan-400 text-xs"
                  />
                  <span className="text-xs text-slate-400">cm</span>
                </div>
              </div>

              <input
                type="range"
                min="10"
                max="40"
                step="0.5"
                value={groundClearance}
                onChange={e => setGroundClearance(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />

              <div className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-snug">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <b>Crucial:</b> Measured from bottom of oil pan/exhaust to asphalt, NOT the roof height.
                </span>
              </div>
            </div>

            {/* Road / Location Selector */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                2. Target Campus Roadway
              </h2>

              <label className="block text-xs font-medium text-slate-400">Select RVCE Roadway</label>
              <select
                value={selectedRoadId}
                onChange={e => setSelectedRoadId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              >
                {roadZones.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.road_name} — Depth: {r.current_depth_cm ?? 0} cm ({r.current_status})
                  </option>
                ))}
              </select>

              {selectedRoad && (
                <div className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Sensor: <b className="text-cyan-400">{selectedRoad.associated_device_id}</b></span>
                  <span>Current Depth: <b className="text-white">{selectedRoad.current_depth_cm ?? 0} cm</b></span>
                  <span className="font-bold text-amber-400">{selectedRoad.current_status}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Mathematical Calculation & Passability Decision (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {calculationResult ? (
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-2xl space-y-5">
              {/* BIG PASSABILITY VERDICT BANNER */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  calculationResult.is_passable
                    ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-600/80 text-emerald-200'
                    : 'bg-gradient-to-r from-rose-950/60 to-slate-900 border-rose-600/80 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {calculationResult.is_passable ? (
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 animate-pulse">
                      <XCircle className="w-8 h-8" />
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                      Official Passability Verdict
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                      {calculationResult.passability_label}
                    </h3>
                  </div>
                </div>

                {/* Safety Override Notice if applicable */}
                {calculationResult.safety_override_reason && (
                  <div className="mt-3.5 p-3 rounded-xl bg-rose-900/40 border border-rose-700/60 text-xs text-rose-100 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[10px] text-rose-300 block">
                        Safety Override Activated
                      </span>
                      <span>{calculationResult.safety_override_reason}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mathematical Step-by-Step Breakdown Card */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Mathematical Proof (Formula Check)</span>
                  <span className="font-mono text-cyan-400 text-[11px]">D_limit = 0.20 &times; G</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Ground Clearance (G)</span>
                    <span className="font-mono text-base font-extrabold text-white">
                      {calculationResult.ground_clearance_cm} cm
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">20% Threshold Limit</span>
                    <span className="font-mono text-base font-extrabold text-cyan-400">
                      {calculationResult.threshold_cm} cm
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Measured Depth (D)</span>
                    <span className="font-mono text-base font-extrabold text-white">
                      {calculationResult.water_depth_cm} cm
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Safety Margin</span>
                    <span
                      className={`font-mono text-base font-extrabold ${
                        calculationResult.difference_cm > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {calculationResult.difference_cm > 0 ? `+${calculationResult.difference_cm}` : calculationResult.difference_cm} cm
                    </span>
                  </div>
                </div>

                {/* Visual Comparative Clearance Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Water Level vs Safety Limit</span>
                    <span className="font-mono">
                      {calculationResult.water_depth_cm} cm of {calculationResult.threshold_cm} cm max
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3 p-0.5 border border-slate-700 overflow-hidden relative">
                    {/* Max threshold indicator marker */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
                      style={{
                        left: `${Math.min(100, (calculationResult.threshold_cm / (calculationResult.ground_clearance_cm * 0.6)) * 100)}%`,
                      }}
                      title="20% Safety Ceiling"
                    />
                    {/* Current water depth fill */}
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        calculationResult.is_passable ? 'bg-cyan-500' : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (calculationResult.water_depth_cm / (calculationResult.ground_clearance_cm * 0.6)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Dry Road (0 cm)</span>
                    <span className="text-amber-400 font-semibold">&bull; 20% Limit Ceiling</span>
                    <span>High Underside Risk</span>
                  </div>
                </div>
              </div>

              {/* Detailed Explanation */}
              <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-800/80 space-y-1 text-xs">
                <span className="font-bold text-slate-300 block">Screening Decision Summary:</span>
                <p className="text-slate-300 leading-relaxed">
                  {calculationResult.detailed_explanation}
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 mt-2">
                  <span>Target: <b>{calculationResult.road_name}</b></span>
                  <span>Sensor Update: {new Date(calculationResult.last_updated).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Safety Improvement Mandatory Disclaimer */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 block mb-0.5">
                    Engineering Safety Advisory & Notice
                  </span>
                  {calculationResult.disclaimer}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
              <Car className="w-10 h-10 text-cyan-400 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-white text-sm">Evaluating Vehicle Passability...</p>
              <p className="text-xs text-slate-500 mt-1">Calculating 20% ground clearance threshold.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
