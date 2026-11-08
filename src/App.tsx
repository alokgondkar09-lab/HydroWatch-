import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, type ActivePage } from './components/Sidebar.tsx';
import { DashboardPage } from './components/DashboardPage.tsx';
import { MapPage } from './components/MapPage.tsx';
import { VehicleSafetyPage } from './components/VehicleSafetyPage.tsx';
import { AnalyticsPage } from './components/AnalyticsPage.tsx';
import { AlertsPage } from './components/AlertsPage.tsx';
import { SensorManagementPage } from './components/SensorManagementPage.tsx';
import { SettingsPage } from './components/SettingsPage.tsx';
import { SimulationModal } from './components/SimulationModal.tsx';
import { SendReadingModal } from './components/SendReadingModal.tsx';

import type {
  OverviewStatistics,
  RoadZone,
  Sensor,
  Alert,
} from './types/hydrowatch.ts';
import {
  fetchOverview,
  fetchRoadZones,
  fetchSensors,
  fetchAlerts,
} from './services/api.ts';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core telemetry state
  const [overview, setOverview] = useState<OverviewStatistics | null>(null);
  const [roadZones, setRoadZones] = useState<RoadZone[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [boundary, setBoundary] = useState<[number, number][]>([]);

  // Connection & status
  const [isConnected, setIsConnected] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Modals
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isSendReadingOpen, setIsSendReadingOpen] = useState(false);
  const [targetSensorForSend, setTargetSensorForSend] = useState<string | undefined>(undefined);

  // Fetch all live data
  const loadData = useCallback(async () => {
    try {
      const [ovData, rzData, sensData, alData] = await Promise.all([
        fetchOverview(),
        fetchRoadZones(),
        fetchSensors(),
        fetchAlerts(false),
      ]);

      setOverview(ovData);
      setRoadZones(rzData.zones);
      setBoundary(rzData.boundary);
      setSensors(sensData);
      setAlerts(alData);
      setIsConnected(true);
    } catch (err) {
      console.error('Error fetching HydroWatch telemetry:', err);
      setIsConnected(false);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  // Initial load & periodic polling fallback
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Server-Sent Events (SSE) for instant live push
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
      });

      eventSource.addEventListener('new_reading', () => {
        loadData();
      });

      eventSource.addEventListener('simulation_triggered', () => {
        loadData();
      });

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      // Fallback to polling
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[#090d19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        overview={overview}
        alerts={alerts}
        isConnected={isConnected}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenSendReading={() => {
          setTargetSensorForSend(undefined);
          setIsSendReadingOpen(true);
        }}
        onNavigateToAlerts={() => setActivePage('alerts')}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          overview={overview}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {loadingInitial && !overview ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              </div>
              <p className="text-sm font-bold text-slate-300">Connecting to HydroWatch Telemetry Hub...</p>
              <p className="text-xs text-slate-500">Querying RVCE campus edge nodes and SQLite database</p>
            </div>
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardPage
                  overview={overview}
                  roadZones={roadZones}
                  sensors={sensors}
                  alerts={alerts}
                  boundary={boundary}
                  onNavigate={page => setActivePage(page)}
                  onOpenSimulator={() => setIsSimulatorOpen(true)}
                />
              )}

              {activePage === 'map' && (
                <MapPage
                  boundary={boundary}
                  roadZones={roadZones}
                  sensors={sensors}
                  onNavigate={page => setActivePage(page)}
                  onOpenSimulator={() => setIsSimulatorOpen(true)}
                />
              )}

              {activePage === 'vehicle' && (
                <VehicleSafetyPage
                  roadZones={roadZones}
                  onOpenSimulator={() => setIsSimulatorOpen(true)}
                />
              )}

              {activePage === 'analytics' && (
                <AnalyticsPage
                  sensors={sensors}
                  onOpenSimulator={() => setIsSimulatorOpen(true)}
                />
              )}

              {activePage === 'alerts' && (
                <AlertsPage onAlertResolved={loadData} />
              )}

              {activePage === 'sensors' && (
                <SensorManagementPage
                  sensors={sensors}
                  onRefresh={loadData}
                  onOpenSendReading={sensorId => {
                    setTargetSensorForSend(sensorId);
                    setIsSendReadingOpen(true);
                  }}
                />
              )}

              {activePage === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>

      {/* Flood Scenario Simulator Modal */}
      <SimulationModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onScenarioApplied={loadData}
      />

      {/* Send / Inject Reading Packet Modal */}
      <SendReadingModal
        isOpen={isSendReadingOpen}
        onClose={() => setIsSendReadingOpen(false)}
        sensors={sensors}
        defaultSensorId={targetSensorForSend}
        onReadingSent={loadData}
      />
    </div>
  );
}
