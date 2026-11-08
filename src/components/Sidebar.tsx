import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Car,
  LineChart,
  BellRing,
  Cpu,
  Settings,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type { OverviewStatistics } from '../types/hydrowatch.ts';

export type ActivePage =
  | 'dashboard'
  | 'map'
  | 'vehicle'
  | 'analytics'
  | 'alerts'
  | 'sensors'
  | 'settings';

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  overview: OverviewStatistics | null;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  overview,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActivePage,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'map' as ActivePage,
      label: 'Live Campus Map',
      icon: MapPin,
      badge:
        overview && overview.active_danger_zones_count > 0 ? (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
            {overview.active_danger_zones_count} Danger
          </span>
        ) : overview && overview.rising_water_zones_count > 0 ? (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-900">
            Rising
          </span>
        ) : null,
    },
    {
      id: 'vehicle' as ActivePage,
      label: 'Vehicle Passability',
      icon: Car,
      badge: (
        <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          20% Rule
        </span>
      ),
    },
    {
      id: 'analytics' as ActivePage,
      label: 'Depth Analytics',
      icon: LineChart,
      badge: null,
    },
    {
      id: 'alerts' as ActivePage,
      label: 'Alerts & Warnings',
      icon: BellRing,
      badge:
        overview && overview.active_alerts_count > 0 ? (
          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {overview.active_alerts_count}
          </span>
        ) : null,
    },
    {
      id: 'sensors' as ActivePage,
      label: 'Sensor Devices',
      icon: Cpu,
      badge:
        overview ? (
          <span className="px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
            {overview.online_sensors}/{overview.total_sensors}
          </span>
        ) : null,
    },
    {
      id: 'settings' as ActivePage,
      label: 'Settings & Firmware',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Monitoring Hub
          </div>

          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/60 text-cyan-300 border border-cyan-800/50 shadow-inner'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 mt-4 border-t border-slate-800/80 px-2">
            <div className="p-3 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>RVCE Safety Protocol</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Threshold: Max water depth &lt; 20% vehicle clearance. Avoid civil underpass during heavy downpour.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b16]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px]">RVCE Bengaluru</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Telemetry
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
