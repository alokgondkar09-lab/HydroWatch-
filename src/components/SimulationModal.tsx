import React, { useState } from 'react';
import {
  Sparkles,
  CloudRain,
  AlertTriangle,
  ArrowDownCircle,
  RotateCcw,
  X,
  CheckCircle2,
  Waves,
} from 'lucide-react';
import { triggerSimulationApi } from '../services/api.ts';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioApplied: () => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  onScenarioApplied,
}) => {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'flash_flood',
      title: 'Flash Flood Surge (Culvert Emergency)',
      description:
        'Simulates sudden cloudburst: Civil Underpass surges to 32.5 cm (+16.6 cm/hr) and Gate 1 surges to 26 cm. Triggers RISING WATER danger overlay, road color transitions to Danger/Critical, and automatic alerts.',
      icon: Waves,
      badge: 'High Impact',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      btnColor: 'from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500',
    },
    {
      id: 'heavy_monsoon',
      title: 'Heavy Monsoon Downpour',
      description:
        'Simulates persistent torrential rain across all 6 campus zones (+6.5 cm water depth, 30 mm rain). Elevates campus roadways to Warning and Critical levels.',
      icon: CloudRain,
      badge: 'Campus Wide',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      btnColor: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500',
    },
    {
      id: 'receding',
      title: 'Water Receding & Drainage Active',
      description:
        'Simulates storm water drains clearing waterlogging (-5 cm across sensors). Reverts roads back toward Normal/Very Safe status.',
      icon: ArrowDownCircle,
      badge: 'Recovery',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      btnColor: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    },
    {
      id: 'reset_normal',
      title: 'Reset to Normal Baseline',
      description:
        'Clears simulated crisis data, resets alerts, and restores clean 24-hour calibrated historical baseline readings.',
      icon: RotateCcw,
      badge: 'Default Clean',
      badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
      btnColor: 'from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700',
    },
  ];

  const handleApply = async (id: string, name: string) => {
    setLoadingScenario(id);
    setStatusMessage(null);
    try {
      await triggerSimulationApi(id);
      setStatusMessage(`Scenario "${name}" applied! Telemetry and map updated.`);
      onScenarioApplied();
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1500);
    } catch (e: any) {
      alert(`Simulation failed: ${e.message}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Live Scenario Simulation Control
              </h2>
              <p className="text-xs text-slate-400">
                Trigger weather conditions to inspect live map reactions, rising-water detection, and passability changes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {scenarios.map(sc => {
            const Icon = sc.icon;
            const isLoading = loadingScenario === sc.id;
            return (
              <div
                key={sc.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-bold text-white text-xs sm:text-sm">{sc.title}</span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase border ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                    {sc.description}
                  </p>
                </div>

                <button
                  onClick={() => handleApply(sc.id, sc.title)}
                  disabled={!!loadingScenario}
                  className={`px-4 py-2 rounded-xl text-white font-bold text-xs bg-gradient-to-r shadow-md transition-all cursor-pointer shrink-0 ${sc.btnColor}`}
                >
                  {isLoading ? 'Applying...' : 'Trigger Now'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500">
            All readings are saved directly to SQLite database and streamed live over Server-Sent Events (SSE).
          </p>
        </div>
      </div>
    </div>
  );
};
