import React from 'react';
import {
  Thermometer,
  Droplets,
  Sun,
  Lightbulb,
  LightbulbOff,
  Loader2,
  Sparkles,
  Zap,
  Power
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { useIoT } from '../context/IoTContext';
import './Dashboard.css';

// Custom Tooltip for Recharts matching UI theme
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const temp = payload.find(p => p.dataKey === 'temperature');
    const hum = payload.find(p => p.dataKey === 'humidity');
    const light = payload.find(p => p.dataKey === 'light');

    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-time">{label}</p>
        {temp && (
          <div className="tooltip-item temp">
            <span className="tooltip-dot dot-temp" />
            <span>Nhiệt độ:</span>
            <strong>{temp.value}°C</strong>
          </div>
        )}
        {hum && (
          <div className="tooltip-item hum">
            <span className="tooltip-dot dot-humidity" />
            <span>Độ ẩm:</span>
            <strong>{hum.value}%</strong>
          </div>
        )}
        {light && (
          <div className="tooltip-item light">
            <span className="tooltip-dot dot-light" />
            <span>Ánh sáng:</span>
            <strong>{light.value} lux</strong>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const {
    devices,
    sensorValues,
    chartData,
    toggleDevice,
    toggleAll,
    randomLed
  } = useIoT();

  const allAreOn = devices.length > 0 && devices.every((d) => d.state === 'ON');
  const allAreOff = devices.length > 0 && devices.every((d) => d.state === 'OFF');
  const isAnyLoading = devices.some((d) => d.loading);

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Dashboard</h1>
          <span className="page-subtitle">Giám sát thông số môi trường & điều khiển thời gian thực</span>
        </div>
      </div>

      {/* 3 Metric Cards matching GiaoDienDashboard.png */}
      <div className="metrics-grid">
        {/* Temperature Card */}
        <div className="metric-card card-temp">
          <div className="metric-header">
            <div className="metric-icon-box box-temp">
              <Thermometer size={20} className="icon-temp" />
            </div>
            <div className="metric-status-dot dot-temp" />
          </div>
          <span className="metric-label">Temperature</span>
          <div className="metric-value-row">
            <span className="metric-number">{sensorValues.temperature.toFixed(1)}</span>
            <span className="metric-unit">°C</span>
          </div>
        </div>

        {/* Humidity Card */}
        <div className="metric-card card-humidity">
          <div className="metric-header">
            <div className="metric-icon-box box-humidity">
              <Droplets size={20} className="icon-humidity" />
            </div>
            <div className="metric-status-dot dot-humidity" />
          </div>
          <span className="metric-label">Humidity</span>
          <div className="metric-value-row">
            <span className="metric-number">{sensorValues.humidity.toFixed(0)}</span>
            <span className="metric-unit">%</span>
          </div>
        </div>

        {/* Light Card */}
        <div className="metric-card card-light">
          <div className="metric-header">
            <div className="metric-icon-box box-light">
              <Sun size={20} className="icon-light" />
            </div>
            <div className="metric-status-dot dot-light" />
          </div>
          <span className="metric-label">Light</span>
          <div className="metric-value-row">
            <span className="metric-number">{sensorValues.light.toFixed(0)}</span>
            <span className="metric-unit">lux</span>
          </div>
        </div>
      </div>

      {/* 2 Split Sensor Charts in a 2-column grid */}
      <div className="charts-grid">
        {/* Chart 1: Temperature & Humidity */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Temperature & Humidity</h2>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-line line-temp" />
                <span className="legend-text">Temperature (°C)</span>
              </div>
              <div className="legend-item">
                <span className="legend-line line-humidity" />
                <span className="legend-text">Humidity (%)</span>
              </div>
            </div>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={275}>
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#142137" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#0ea5e9"
                  strokeWidth={2.4}
                  dot={{ r: 3, fill: '#0ea5e9' }}
                  activeDot={{ r: 6, fill: '#38bdf8' }}
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#14b8a6"
                  strokeWidth={2.4}
                  dot={{ r: 3, fill: '#14b8a6' }}
                  activeDot={{ r: 6, fill: '#2dd4bf' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Light */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Light Intensity</h2>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-line line-light" />
                <span className="legend-text">Light (lux)</span>
              </div>
            </div>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={275}>
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#142137" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="light"
                  stroke="#f59e0b"
                  strokeWidth={2.4}
                  dot={{ r: 3, fill: '#f59e0b' }}
                  activeDot={{ r: 6, fill: '#fbbf24' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Device Controls matching GiaoDienDashboard.png & code_ESP32 */}
      <div className="devices-section">
        <div className="devices-grid">
          {devices.map((device) => {
            const isOn = device.state === 'ON';
            return (
              <div key={device.id} className={`device-card ${isOn ? 'device-on' : 'device-off'}`}>
                <div className="device-info-col">
                  <div className={`device-icon-box ${isOn ? 'icon-box-on' : 'icon-box-off'}`}>
                    {isOn ? (
                      <Lightbulb size={22} className="device-icon active-icon" />
                    ) : (
                      <LightbulbOff size={22} className="device-icon standby-icon" />
                    )}
                  </div>
                  <div className="device-meta">
                    <span className="device-name">{device.name}</span>
                    <div className={`device-badge ${isOn ? 'badge-on' : 'badge-off'}`}>
                      <span className={`badge-dot ${isOn ? 'dot-pulse' : ''}`} />
                      <span>{isOn ? 'ĐANG BẬT' : 'ĐÃ TẮT'}</span>
                    </div>
                  </div>
                </div>

                <div className="device-action-col">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    className={`device-toggle-btn ${isOn ? 'toggle-on' : 'toggle-off'}`}
                    onClick={() => toggleDevice(device.id)}
                    disabled={device.loading}
                    title={isOn ? `Click để tắt ${device.name}` : `Click để bật ${device.name}`}
                  >
                    {device.loading ? (
                      <span className="toggle-loading">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Đang gửi...</span>
                      </span>
                    ) : (
                      <>
                        <span className="toggle-status-text">{isOn ? 'BẬT' : 'TẮT'}</span>
                        <span className="toggle-switch-track">
                          <span className="toggle-switch-thumb" />
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Batch Commands from code_ESP32 (ALL_ON, ALL_OFF, RANDOM_ON) */}
        <div className="batch-controls-card">
          <div className="batch-header">
            <Zap size={16} className="batch-icon" />
            <span className="batch-title">Lệnh điều khiển hàng loạt (ESP32 MQTT Broker):</span>
          </div>
          <div className="batch-buttons">
            <button
              className="btn btn-outline batch-btn"
              onClick={() => toggleAll('ON')}
              disabled={allAreOn || isAnyLoading}
              title={allAreOn ? 'Tất cả đèn đã bật' : 'Bật tất cả đèn (ALL_ON)'}
            >
              <Power size={14} className="text-cyan" />
              <span>Bật tất cả (ALL_ON)</span>
            </button>
            <button
              className="btn btn-outline batch-btn"
              onClick={() => toggleAll('OFF')}
              disabled={allAreOff || isAnyLoading}
              title={allAreOff ? 'Tất cả đèn đã tắt' : 'Tắt tất cả đèn (ALL_OFF)'}
            >
              <Power size={14} className="text-danger" />
              <span>Tắt tất cả (ALL_OFF)</span>
            </button>
            <button
              className="btn btn-outline batch-btn"
              onClick={randomLed}
              disabled={isAnyLoading}
              title="Bật ngẫu nhiên 1 đèn"
            >
              <Sparkles size={14} className="text-warning" />
              <span>Bật ngẫu nhiên 1 đèn (RANDOM_ON)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
