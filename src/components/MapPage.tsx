import React, { useState } from 'react';
import {
  MapPin,
  Filter,
  Info,
  Car,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Droplets,
  CloudRain,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { RoadZone, Sensor, SafetyStatus } from '../types/hydrowatch.ts';
import { CampusLeafletMap } from './CampusLeafletMap.tsx';
import type { ActivePage } from './Sidebar.tsx';

interface MapPageProps {
  boundary: [number, number][];
  roadZones: RoadZone[];
  sensors: Sensor[];
  onNavigate: (page: ActivePage) => void;
  onOpenSimulator: () => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  boundary,
  roadZones,
  sensors,
  onNavigate,
  onOpenSimulator,
}) => {
  const [selectedRoad, setSelectedRoad] = useState<RoadZone | null>(roadZones[0] || null);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'warning' | 'danger'>('all');
  const [carClearance, setCarClearance] = useState<number>(18);

  // Filter roads
  const filteredRoads = roadZones.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'warning') return r.current_status === 'Warning' || r.current_status === 'Critical' || r.current_status === 'Danger' || r.is_rising_danger;
    if (statusFilter === 'danger') return r.current_status === 'Danger' || r.current_status === 'Critical';
    return true;
  });

  const activeSensor = selectedSensor || (selectedRoad ? sensors.find(s => s.device_id === selectedRoad.associated_device_id) : sensors[0]);

  // Quick Passability calculation for inspector
  const limitDepth = Math.round(0.2 * carClearance * 10) / 10;
  const currentDepth = selectedRoad?.current_depth_cm ?? 0;
  const isPassable = currentDepth < limitDepth && selectedRoad?.current_status !== 'Critical' && selectedRoad?.current_status !== 'Danger' && !selectedRoad?.is_rising_danger;

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

  return (
    <div className="space-y-4 pb-12">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Interactive OpenStreetMap – RVCE Campus Only
          </h1>
          <p className="text-xs text-slate-400">
            Centred on RV College of Engineering, Mysore Road, Bengaluru. Click any roadway or sensor marker for detailed telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Roadways ({roadZones.length})</option>
              <option value="warning" className="bg-slate-900">Warning & Above</option>
              <option value="danger" className="bg-slate-900">Active Danger Only</option>
            </select>
          </div>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate Event</span>
          </button>
        </div>
      </div>

      {/* Main Map View & Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <CampusLeafletMap
            boundary={boundary}
            roadZones={filteredRoads}
            sensors={sensors}
            selectedRoadId={selectedRoad?.id}
            selectedSensorId={selectedSensor?.device_id}
            onSelectRoad={road => {
              setSelectedRoad(road);
              setSelectedSensor(null);
            }}
            onSelectSensor={sensor => {
              setSelectedSensor(sensor);
              const foundRoad = roadZones.find(r => r.associated_device_id === sensor.device_id);
              if (foundRoad) setSelectedRoad(foundRoad);
            }}
            height="580px"
          />

          {/* Road Segment Selection Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {roadZones.map(road => {
              const isSelected = selectedRoad?.id === road.id;
              return (
                <button
                  key={road.id}
                  onClick={() => {
                    setSelectedRoad(road);
                    setSelectedSensor(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-md'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      road.current_status === 'Very Safe'
                        ? 'bg-emerald-400'
                        : road.current_status === 'Normal'
                        ? 'bg-blue-400'
                        : road.current_status === 'Warning'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span>{road.road_name.split('(')[0]}</span>
                  <span className="font-bold text-white">({road.current_depth_cm ?? 0}cm)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Detailed Location & Vehicle Passability Inspector */}
        <div className="space-y-4">
          {selectedRoad ? (
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl space-y-5">
              {/* Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-cyan-400 font-bold">
                    Zone #{selectedRoad.id} &bull; {selectedRoad.associated_device_id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSafetyBadgeStyle(
                      selectedRoad.current_status
                    )}`}
                  >
                    {selectedRoad.current_status}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white leading-snug">
                  {selectedRoad.road_name}
                </h3>
              </div>

              {/* Emerging Rising Water Warning Pill */}
              {selectedRoad.is_rising_danger && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="font-extrabold uppercase text-[11px] text-rose-400 block">
                      Rapidly Rising Water Alert!
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Water depth increasing at <b>+{selectedRoad.rate_of_change ?? 0} cm/hr</b>. Risk of flash waterlogging within minutes.
                    </p>
                  </div>
                </div>
              )}

              {/* Real-Time Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    Water Depth
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {selectedRoad.current_depth_cm ?? 0}
                    <span className="text-xs text-cyan-400 font-normal ml-1">cm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Road Surface Level</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                    Rainfall Intensity
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {selectedRoad.current_rainfall_mm ?? 0}
                    <span className="text-xs text-blue-400 font-normal ml-1">mm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Tipping Bucket Gauge</div>
                </div>
              </div>

              {/* Water Trend Information */}
              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Trend Status:</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      selectedRoad.is_rising_danger
                        ? 'text-rose-400'
                        : selectedRoad.current_status === 'Warning'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedRoad.is_rising_danger ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {selectedRoad.is_rising_danger ? 'Rapidly Rising' : 'Stable'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Rate of Change:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedRoad.rate_of_change !== undefined ? `${selectedRoad.rate_of_change > 0 ? '+' : ''}${selectedRoad.rate_of_change} cm/hr` : '0.0 cm/hr'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Last Telemetry:</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {selectedRoad.last_updated ? new Date(selectedRoad.last_updated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Integrated Vehicle Passability Checker for THIS Road */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-cyan-400" />
                    Check Your Clearance For This Road
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">{carClearance} cm</span>
                </div>

                <div>
                  <input
                    type="range"
                    min="12"
                    max="35"
                    step="0.5"
                    value={carClearance}
                    onChange={e => setCarClearance(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>12 cm</span>
                    <span>Safety Limit: {limitDepth} cm</span>
                    <span>35 cm</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    isPassable
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isPassable ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>
                      {isPassable
                        ? 'PASSABILITY MET – PROVISIONAL PASS'
                        : 'DO NOT PASS – HAZARD EXCEEDS LIMIT'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-normal text-slate-300">
                    {isPassable
                      ? `Depth ${currentDepth} cm is below 20% clearance threshold (${limitDepth} cm).`
                      : selectedRoad.current_status === 'Critical' || selectedRoad.current_status === 'Danger'
                      ? `Road is in ${selectedRoad.current_status} state. Avoid route.`
                      : selectedRoad.is_rising_danger
                      ? 'Rapidly rising water detected. Unsafe.'
                      : `Depth ${currentDepth} cm exceeds permitted limit ${limitDepth} cm.`}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('vehicle')}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Open Full Vehicle Safety Prediction Tool</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
              <Info className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-70" />
              <p className="font-bold text-white text-sm">Select a Roadway or Sensor</p>
              <p className="mt-1 text-slate-400">Click on any colored segment or node on the map to inspect live metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
