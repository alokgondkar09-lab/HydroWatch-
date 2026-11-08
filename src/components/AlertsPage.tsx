import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Filter,
  RefreshCw,
  Clock,
  Droplets,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type { Alert, AlertSeverity } from '../types/hydrowatch.ts';
import { fetchAlerts, resolveAlertApi } from '../services/api.ts';

interface AlertsPageProps {
  onAlertResolved?: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onAlertResolved }) => {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts(tab === 'active');
      setAlerts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [tab]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveAlertApi(id);
      await loadAlerts();
      if (onAlertResolved) onAlertResolved();
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter === 'all') return true;
    return a.severity === severityFilter;
  });

  const getSeverityStyle = (severity: AlertSeverity) => {
    switch (severity) {
      case 'danger':
        return {
          card: 'bg-rose-950/30 border-rose-800/80',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: AlertOctagon,
          iconColor: 'text-rose-400',
        };
      case 'critical':
        return {
          card: 'bg-orange-950/30 border-orange-800/80',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          icon: AlertTriangle,
          iconColor: 'text-orange-400',
        };
      case 'warning':
        return {
          card: 'bg-amber-950/30 border-amber-800/80',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'info':
      default:
        return {
          card: 'bg-slate-900/60 border-slate-800',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          icon: Info,
          iconColor: 'text-blue-400',
        };
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              CAMPUS HAZARD DISPATCH
            </span>
            <span className="text-xs text-slate-400">Section 8 &bull; Alert & Notification Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Hazard Warnings & Alerts
          </h1>
          <p className="text-xs text-slate-400">
            Real-time threshold triggers, continuous rising-water alarms, and sensor heartbeat tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Active vs History Tab */}
          <div className="flex p-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTab('active')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === 'active' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active ({alerts.filter(a => !a.resolved_at).length})
            </button>
            <button
              onClick={() => setTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === 'history' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Historical Archive
            </button>
          </div>

          <button
            onClick={loadAlerts}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
            title="Refresh Alerts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Severity Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold mr-1">Severity Filter:</span>
        {['all', 'danger', 'critical', 'warning', 'info'].map(sev => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-3 py-1 rounded-lg uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
              severityFilter === sev
                ? 'bg-slate-700 text-white border-slate-500'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => {
            const style = getSeverityStyle(alert.severity);
            const Icon = style.icon;
            const isResolved = !!alert.resolved_at;

            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 rounded-2xl border shadow-lg transition-all ${style.card} ${
                  isResolved ? 'opacity-60' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg bg-black/30 ${style.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm">
                        {alert.road_name || 'Campus Sector'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-2">
                        ({alert.device_id})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase border ${style.badge}`}>
                      {alert.severity}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="py-3 text-slate-200 text-xs sm:text-sm leading-relaxed">
                  {alert.message}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-4 text-slate-300">
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      Current Depth: <b className="text-white ml-1">{alert.current_depth ?? 'N/A'} cm</b>
                    </span>
                    {alert.previous_depth !== undefined && alert.previous_depth !== null && (
                      <span className="text-slate-400">
                        Prior: <span className="font-mono">{alert.previous_depth} cm</span>
                      </span>
                    )}
                  </div>

                  {!isResolved ? (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{resolvingId === alert.id ? 'Resolving...' : 'Acknowledge / Clear'}</span>
                    </button>
                  ) : (
                    <span className="text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved at {new Date(alert.resolved_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
            <h3 className="font-extrabold text-white text-base">No Alerts Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {tab === 'active'
                ? 'All sensors and campus roadways are reporting clear and safe status.'
                : 'No historical alert logs match the current filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
