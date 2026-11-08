import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { RoadZone, Sensor, SafetyStatus } from '../types/hydrowatch.ts';

interface CampusLeafletMapProps {
  boundary: [number, number][];
  roadZones: RoadZone[];
  sensors: Sensor[];
  selectedRoadId?: number | null;
  selectedSensorId?: string | null;
  onSelectRoad?: (road: RoadZone) => void;
  onSelectSensor?: (sensor: Sensor) => void;
  height?: string;
  showBoundary?: boolean;
}

const statusColorMap: Record<SafetyStatus, { hex: string; bg: string; text: string }> = {
  'Very Safe': { hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-400' },
  'Normal': { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-400' },
  'Warning': { hex: '#eab308', bg: 'bg-amber-500', text: 'text-amber-400' },
  'Critical': { hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-400' },
  'Danger': { hex: '#ef4444', bg: 'bg-rose-500', text: 'text-rose-400' },
};

export const CampusLeafletMap: React.FC<CampusLeafletMapProps> = ({
  boundary,
  roadZones,
  sensors,
  selectedRoadId,
  selectedSensorId,
  onSelectRoad,
  onSelectSensor,
  height = '500px',
  showBoundary = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    boundary?: L.Polygon;
    roadPolylines: Map<number, L.Polyline>;
    risingSurgePolylines: Map<number, L.Polyline>;
    sensorMarkers: Map<string, L.Marker>;
  }>({
    roadPolylines: new Map(),
    risingSurgePolylines: new Map(),
    sensorMarkers: new Map(),
  });

  // Center of RVCE Campus, Bengaluru
  const RVCE_CENTER: [number, number] = [12.9238, 77.4985];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Fix leaflet default marker icons in bundlers
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapContainerRef.current, {
      center: RVCE_CENTER,
      zoom: 16.5,
      minZoom: 15,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: true,
      maxBounds: [
        [12.915, 77.485], // South-West limit
        [12.932, 77.512], // North-East limit
      ],
      maxBoundsViscosity: 0.9,
    });

    // Dark high-contrast OpenStreetMap CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | RVCE HydroWatch',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Campus Boundary Polygon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.boundary) {
      map.removeLayer(layersRef.current.boundary);
      layersRef.current.boundary = undefined;
    }

    if (showBoundary && boundary && boundary.length > 0) {
      const polygon = L.polygon(boundary, {
        color: '#06b6d4',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#0891b2',
        fillOpacity: 0.08,
      }).addTo(map);

      polygon.bindTooltip('RV College of Engineering Campus Perimeter', {
        permanent: false,
        direction: 'center',
        className: 'bg-slate-900 text-cyan-300 font-semibold px-2 py-1 rounded text-xs border border-cyan-800 shadow',
      });

      layersRef.current.boundary = polygon;
    }
  }, [boundary, showBoundary]);

  // Update Road Segments with live status colors & rising surge overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous road polylines
    layersRef.current.roadPolylines.forEach(layer => map.removeLayer(layer));
    layersRef.current.roadPolylines.clear();

    layersRef.current.risingSurgePolylines.forEach(layer => map.removeLayer(layer));
    layersRef.current.risingSurgePolylines.clear();

    roadZones.forEach(zone => {
      const isSelected = selectedRoadId === zone.id;
      const color = statusColorMap[zone.current_status]?.hex || '#3b82f6';

      // Base colored road polyline
      const polyline = L.polyline(zone.geometry, {
        color: color,
        weight: isSelected ? 9 : 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Tooltip with depth & status
      const popupContent = `
        <div style="min-width: 220px; padding: 12px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 700; font-size: 13px; color: #f8fafc; margin-bottom: 4px;">
            ${zone.road_name}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; color: #94a3b8;">Water Depth:</span>
            <span style="font-weight: 800; font-size: 14px; color: ${color};">
              ${zone.current_depth_cm ?? 0} cm
            </span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; color: #94a3b8;">Safety Zone:</span>
            <span style="font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${color}22; color: ${color}; border: 1px solid ${color}66;">
              ${zone.current_status}
            </span>
          </div>
          ${
            zone.is_rising_danger
              ? `<div style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); border-radius: 4px; padding: 4px 6px; font-size: 11px; color: #fca5a5; font-weight: 700; margin-bottom: 6px;">
                  ⚠️ RISING WATER DANGER (+${zone.rate_of_change ?? 0} cm/hr)
                </div>`
              : ''
          }
          <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
            Sensor: <b>${zone.associated_device_id}</b>
          </div>
        </div>
      `;

      polyline.bindPopup(popupContent, {
        closeButton: true,
        className: 'custom-leaflet-popup',
      });

      polyline.on('click', () => {
        if (onSelectRoad) onSelectRoad(zone);
      });

      layersRef.current.roadPolylines.set(zone.id, polyline);

      // If rising water detected: overlay pulsating animated surge line
      if (zone.is_rising_danger) {
        const surge = L.polyline(zone.geometry, {
          color: '#ef4444',
          weight: 10,
          opacity: 0.85,
          dashArray: '10, 10',
          className: 'water-surge-line',
        }).addTo(map);

        layersRef.current.risingSurgePolylines.set(zone.id, surge);
      }
    });
  }, [roadZones, selectedRoadId, onSelectRoad]);

  // Update ESP32 Sensor Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    layersRef.current.sensorMarkers.forEach(marker => map.removeLayer(marker));
    layersRef.current.sensorMarkers.clear();

    sensors.forEach(sensor => {
      const isSelected = selectedSensorId === sensor.device_id;
      const depth = sensor.current_water_depth_cm ?? 0;
      const statusColor = statusColorMap[sensor.current_safety_status || 'Normal']?.hex || '#3b82f6';
      const isOnline = sensor.is_online !== false;

      // Custom HTML Marker showing Water Depth badge directly on map
      const customIcon = L.divIcon({
        className: 'custom-sensor-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <!-- Outer pulse glow -->
            ${
              sensor.current_safety_status === 'Critical' || sensor.current_safety_status === 'Danger'
                ? `<div style="position: absolute; top: -4px; width: 36px; height: 36px; border-radius: 9999px; background: ${statusColor}; opacity: 0.4;" class="animate-ping"></div>`
                : ''
            }
            <!-- Depth badge pin -->
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: #0f172a;
              border: 2px solid ${statusColor};
              border-radius: 9999px;
              padding: 2px 7px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              font-family: system-ui, sans-serif;
              transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
              transition: transform 0.15s ease;
            ">
              <span style="width: 8px; height: 8px; border-radius: 9999px; background: ${isOnline ? statusColor : '#64748b'}; display: inline-block;"></span>
              <span style="color: #f8fafc; font-weight: 800; font-size: 11px;">${depth} <span style="font-size: 9px; color: #94a3b8;">cm</span></span>
            </div>
            <!-- Pin Pointer Triangle -->
            <div style="
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid ${statusColor};
              margin-top: -1px;
            "></div>
          </div>
        `,
        iconSize: [44, 30],
        iconAnchor: [22, 28],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([sensor.latitude, sensor.longitude], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="min-width: 230px; padding: 12px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: 700; color: #38bdf8;">${sensor.device_id}</span>
            <span style="font-size: 10px; padding: 1px 5px; border-radius: 9999px; ${
              isOnline ? 'background: #10b98122; color: #34d399;' : 'background: #64748b22; color: #94a3b8;'
            }">
              ${isOnline ? 'Online' : 'Offline/Stale'}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 8px;">
            ${sensor.location_name}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: rgba(255,255,255,0.05); padding: 6px; border-radius: 6px;">
              <div style="font-size: 10px; color: #94a3b8;">Water Depth</div>
              <div style="font-size: 15px; font-weight: 800; color: ${statusColor};">${depth} cm</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 6px; border-radius: 6px;">
              <div style="font-size: 10px; color: #94a3b8;">Rainfall</div>
              <div style="font-size: 15px; font-weight: 800; color: #38bdf8;">${sensor.current_rainfall_mm ?? 0} mm</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
            <span>Trend:</span>
            <span style="font-weight: 700; color: ${sensor.current_trend === 'Rapidly Increasing' ? '#ef4444' : '#38bdf8'};">
              ${sensor.current_trend ?? 'Stable'} (${sensor.rate_of_change ?? 0} cm/hr)
            </span>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
            Last Updated: ${sensor.last_updated ? new Date(sensor.last_updated).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: 'custom-leaflet-popup',
      });

      marker.on('click', () => {
        if (onSelectSensor) onSelectSensor(sensor);
      });

      layersRef.current.sensorMarkers.set(sensor.device_id, marker);
    });
  }, [sensors, selectedSensorId, onSelectSensor]);

  // Recenter button helper
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(RVCE_CENTER, 16.5, { animate: true });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl" style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left Campus Tag */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-bold text-slate-200">RV College of Engineering (RVCE)</span>
        <span className="text-slate-500 font-mono text-[10px]">Mysore Rd, BLR</span>
      </div>

      {/* Recenter button */}
      <button
        onClick={handleRecenter}
        className="absolute top-3 right-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-xs font-semibold text-cyan-300 shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
      >
        <span>Reset to Campus</span>
      </button>

      {/* Bottom Floating Map Legend */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[1000] p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs max-w-xl">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Safety Zone Classification</span>
          <span className="text-cyan-400 font-normal">Real-Time Calibrated</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300 font-medium">Very Safe (&le;5cm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-sm shadow-blue-500/50" />
            <span className="text-slate-300 font-medium">Normal (5-15cm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300 font-medium">Warning (15-25cm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block shadow-sm shadow-orange-500/50" />
            <span className="text-slate-300 font-medium">Critical (25-40cm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50" />
            <span className="text-slate-300 font-medium">Danger (&gt;40cm)</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
            <span className="w-3 h-1 bg-rose-500 inline-block animate-pulse" />
            <span className="text-rose-400 font-bold">Rising Water Surge</span>
          </div>
        </div>
      </div>
    </div>
  );
};
