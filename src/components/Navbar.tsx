import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Radio,
  Bell,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  PlusCircle,
  Menu,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { OverviewStatistics, Alert } from '../types/hydrowatch.ts';

interface NavbarProps {
  overview: OverviewStatistics | null;
  alerts: Alert[];
  onOpenSimulator: () => void;
  onOpenSendReading: () => void;
  onNavigateToAlerts: () => void;
  isConnected: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  overview,
  alerts,
  onOpenSimulator,
  onOpenSendReading,
  onNavigateToAlerts,
  isConnected,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = alerts.filter(a => !a.resolved_at);
  const unreadCount = activeAlerts.length;

  return (
    <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-lg shadow-cyan-500/20">
                <Droplets className="w-6 h-6 text-white" />
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                    HydroWatch
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    RVCE IoT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Smart Waterlogging & Vehicle Safety System
                </p>
              </div>
            </div>
          </div>

          {/* Center Info: Live Clock & Campus Status */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-slate-300">{currentTime || '00:00:00 AM'}</span>
              <span className="text-slate-500 text-[10px]">IST (Bengaluru)</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              <span className="text-slate-400">Campus Status:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  overview?.campus_safety_status === 'Very Safe'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : overview?.campus_safety_status === 'Normal'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : overview?.campus_safety_status === 'Warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {overview?.campus_safety_status || 'Normal'}
              </span>
            </div>
          </div>

          {/* Right Controls: Backend Status, Simulator, Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Backend Connection Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-[11px] font-medium">
                {isConnected ? 'API Live' : 'Reconnecting'}
              </span>
            </div>

            {/* ESP32 Sensor Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span className="text-[11px] font-medium">
                {overview ? `${overview.online_sensors} Online` : 'IoT Ready'}
              </span>
            </div>

            {/* Scenario Simulator Trigger */}
            <button
              onClick={onOpenSimulator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              title="Test flood scenarios (Monsoon, Flash flood surge, Receding)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulate</span>
            </button>

            {/* Manual Post Reading */}
            <button
              onClick={onOpenSendReading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all cursor-pointer"
              title="Inject ESP32 Sensor Packet"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Post Reading</span>
            </button>

            {/* Alerts Dropdown Bell */}
            <div className="relative">
              <button
                onClick={() => setShowAlertDropdown(!showAlertDropdown)}
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                aria-label="Alerts"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showAlertDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 p-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Active Campus Alerts ({unreadCount})
                    </span>
                    <button
                      onClick={() => {
                        setShowAlertDropdown(false);
                        onNavigateToAlerts();
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium"
                    >
                      View All
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto mt-2 space-y-2">
                    {activeAlerts.length === 0 ? (
                      <div className="text-center py-6 text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                        <p className="font-medium text-slate-300">All Roadways Normal</p>
                        <p className="text-[11px] text-slate-500">No active hazard alerts at RVCE</p>
                      </div>
                    ) : (
                      activeAlerts.slice(0, 5).map(alert => (
                        <div
                          key={alert.id}
                          className={`p-2.5 rounded-lg border ${
                            alert.severity === 'danger'
                              ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                              : alert.severity === 'critical'
                              ? 'bg-orange-950/40 border-orange-800/60 text-orange-200'
                              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold text-[11px]">
                            <span>{alert.road_name || alert.device_id}</span>
                            <span className="uppercase text-[9px] px-1.5 py-0.5 rounded font-mono">
                              {alert.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-300 text-[11px] leading-snug">
                            {alert.message}
                          </p>
                          <div className="mt-1 text-[10px] text-slate-400 flex justify-between">
                            <span>Depth: {alert.current_depth ?? 'N/A'} cm</span>
                            <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
