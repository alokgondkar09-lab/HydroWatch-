import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Shield,
  Cpu,
  Copy,
  Check,
  Terminal,
  Save,
  Clock,
  Code,
  Wifi,
  FileCode,
} from 'lucide-react';
import type { SystemSettings } from '../types/hydrowatch.ts';
import { fetchSettings, updateSettingsApi } from '../services/api.ts';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    fetchSettings().then(s => setSettings(s)).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSettingsApi(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const sampleArduinoCode = `/*
 * HydroWatch - RVCE Smart Waterlogging System
 * Microcontroller Firmware for ESP32 & HC-SR04 Ultrasonic / Water Level Sensor
 * Target Board: ESP32 Dev Module
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* WIFI_SSID     = "RVCE_CAMPUS_IOT";
const char* WIFI_PASSWORD = "CampusPassword123";

// HydroWatch Backend Server URL
// Replace with your server IP (e.g., http://192.168.1.100:3000/sensor-data)
const char* SERVER_URL    = "http://192.168.1.50:3000/sensor-data";

// Sensor Device Configuration
const char* DEVICE_ID     = "ESP32-RVCE-01";
const float SENSOR_LAT    = 12.9262; // Gate 1 Arch
const float SENSOR_LNG    = 77.4985;

// Ultrasonic Sensor Pins (HC-SR04)
#define TRIG_PIN 5
#define ECHO_PIN 18
#define RAIN_PIN 34 // ADC pin for tipping bucket / resistive rain sensor

// Calibration: Distance from ultrasonic sensor to dry road surface in cm
const float SENSOR_MOUNT_HEIGHT_CM = 60.0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to RVCE Campus WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nConnected! IP Address: " + WiFi.localIP().toString());
}

float measureWaterDepth() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 0.0; // timeout

  float distance_to_water = (duration * 0.0343) / 2.0;
  float water_depth = SENSOR_MOUNT_HEIGHT_CM - distance_to_water;
  return max(0.0f, water_depth);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float depth = measureWaterDepth();
    int rainRaw = analogRead(RAIN_PIN);
    float rain_mm = map(rainRaw, 4095, 0, 0, 50); // calibrated mm

    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["water_depth_cm"] = depth;
    doc["rainfall_mm"] = rain_mm;
    doc["latitude"] = SENSOR_LAT;
    doc["longitude"] = SENSOR_LNG;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    int httpCode = http.POST(jsonPayload);
    Serial.printf("[HTTP] POST Result: %d\\n", httpCode);
    http.end();
  }

  // Sample interval: 15 seconds in dev / 15 minutes in production
  delay(15000);
}
`;

  const sampleCurl = `curl -X POST http://localhost:3000/api/sensor-data \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "ESP32-RVCE-01",
    "water_depth_cm": 14.5,
    "water_level_cm": 29.5,
    "rainfall_mm": 12.0,
    "latitude": 12.9262,
    "longitude": 77.4985
  }'`;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              CALIBRATION & HARDWARE SETUP
            </span>
            <span className="text-xs text-slate-400">Section 10 &bull; Settings & ESP32 Hub</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            System Settings & Hardware Integration
          </h1>
          <p className="text-xs text-slate-400">
            Configure safety thresholds, trend detection rules, and generate ESP32 firmware for physical deployment.
          </p>
        </div>
      </div>

      {/* Threshold Configuration Form */}
      {settings && (
        <form onSubmit={handleSave} className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Safety Zone Thresholds (Calibrated Depth in cm)
            </h2>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Configuration successfully saved to SQLite database!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80">
              <label className="block text-emerald-400 font-bold mb-1">Very Safe Max (cm)</label>
              <input
                type="number"
                value={settings.global_thresholds.very_safe_max}
                onChange={e =>
                  setSettings({
                    ...settings,
                    global_thresholds: { ...settings.global_thresholds, very_safe_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Minimal accumulation</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80">
              <label className="block text-blue-400 font-bold mb-1">Normal Max (cm)</label>
              <input
                type="number"
                value={settings.global_thresholds.normal_max}
                onChange={e =>
                  setSettings({
                    ...settings,
                    global_thresholds: { ...settings.global_thresholds, normal_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Acceptable road conditions</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80">
              <label className="block text-amber-400 font-bold mb-1">Warning Max (cm)</label>
              <input
                type="number"
                value={settings.global_thresholds.warning_max}
                onChange={e =>
                  setSettings({
                    ...settings,
                    global_thresholds: { ...settings.global_thresholds, warning_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Caution required</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80">
              <label className="block text-rose-400 font-bold mb-1">Critical Max (cm)</label>
              <input
                type="number"
                value={settings.global_thresholds.critical_max}
                onChange={e =>
                  setSettings({
                    ...settings,
                    global_thresholds: { ...settings.global_thresholds, critical_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Danger zone above this</span>
            </div>
          </div>

          {/* Trend & Stale Rule Settings */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-bold text-white mb-3">Automatic Trend & Rising Water Detection Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800">
                <label className="block text-slate-300 font-semibold mb-1">Consecutive Rise Intervals</label>
                <input
                  type="number"
                  value={settings.rising_water_consecutive_intervals}
                  onChange={e =>
                    setSettings({ ...settings, rising_water_consecutive_intervals: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">e.g. 3 consecutive intervals</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800">
                <label className="block text-slate-300 font-semibold mb-1">Rising Rate Threshold (cm/hr)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.rising_water_rate_threshold_cm_hr}
                  onChange={e =>
                    setSettings({ ...settings, rising_water_rate_threshold_cm_hr: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Trigger rising water badge</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800">
                <label className="block text-slate-300 font-semibold mb-1">Stale Sensor Timeout (Minutes)</label>
                <input
                  type="number"
                  value={settings.stale_sensor_minutes}
                  onChange={e => setSettings({ ...settings, stale_sensor_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Mark node offline</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ESP32 Arduino Firmware Code Generator */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              ESP32 Arduino Firmware Code (hydrowatch_esp32.ino)
            </h2>
            <p className="text-xs text-slate-400">
              Ready to flash via Arduino IDE or PlatformIO directly to your ESP32 boards.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(sampleArduinoCode, 'code')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition-all cursor-pointer self-start sm:self-auto"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? 'Code Copied!' : 'Copy Sketch'}</span>
          </button>
        </div>

        <div className="relative rounded-xl bg-[#080d1a] border border-slate-800 p-4 font-mono text-xs text-cyan-300 max-h-72 overflow-y-auto">
          <pre>{sampleArduinoCode}</pre>
        </div>
      </div>

      {/* cURL Test Terminal Snippet */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Direct HTTP API Test Command (cURL)
            </h2>
            <p className="text-xs text-slate-400">Test ingestion endpoint POST /api/sensor-data</p>
          </div>

          <button
            onClick={() => copyToClipboard(sampleCurl, 'curl')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-slate-700 transition-all cursor-pointer self-start sm:self-auto"
          >
            {copiedCurl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCurl ? 'Copied!' : 'Copy cURL'}</span>
          </button>
        </div>

        <div className="rounded-xl bg-[#080d1a] border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
          <pre>{sampleCurl}</pre>
        </div>
      </div>
    </div>
  );
};
