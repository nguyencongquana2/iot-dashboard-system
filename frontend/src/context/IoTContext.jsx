import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';

const IoTContext = createContext(null);

const DEFAULT_DEVICES = [
  { id: 1, name: "LED 1", pin: 18, state: "OFF", status: "STDBY_OFF", loading: false },
  { id: 2, name: "LED 2", pin: 19, state: "OFF", status: "STDBY_OFF", loading: false },
  { id: 3, name: "LED 3", pin: 21, state: "OFF", status: "STDBY_OFF", loading: false }
];

const DEFAULT_SENSOR_VALUES = {
  temperature: 0,
  humidity: 0,
  light: 0,
  lastUpdated: "--:--:--"
};

export const IoTProvider = ({ children }) => {
  const [devices, setDevices] = useState(DEFAULT_DEVICES);
  const [sensorValues, setSensorValues] = useState(DEFAULT_SENSOR_VALUES);
  const [chartData, setChartData] = useState([]);
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [actionError, setActionError] = useState('');

  const tickerRef = useRef(null);

  // Tự động ẩn thông báo lỗi sau 6 giây
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => setActionError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  // Khởi tạo danh sách thiết bị và biểu đồ ban đầu từ Backend
  useEffect(() => {
    apiService.getDevices().then((devs) => {
      if (devs && devs.length) setDevices(devs);
    }).catch(() => {});

    apiService.getChartData().then((chart) => {
      if (chart && Array.isArray(chart) && chart.length > 0) {
        setChartData(chart);
      }
    }).catch(() => {});
  }, []);

  // Polling định kỳ dữ liệu cảm biến ESP32 từ Backend (mỗi 2.5 giây)
  useEffect(() => {
    if (!isRealtimeActive) {
      if (tickerRef.current) clearInterval(tickerRef.current);
      return;
    }

    const pollSensors = async () => {
      try {
        const latest = await apiService.getLatestSensors();
        if (latest && typeof latest.temperature !== 'undefined') {
          const now = new Date();
          const timeStr = now.toLocaleTimeString("vi-VN", { hour12: false });
          const chartTimeStr = now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', hour12: false });

          const temp = Number(latest.temperature);
          const hum = Number(latest.humidity);
          const light = Number(latest.light);

          setSensorValues({
            temperature: temp,
            humidity: hum,
            light: light,
            lastUpdated: timeStr
          });

          // Cập nhật điểm mới vào biểu đồ (giữ 10-15 điểm gần nhất)
          setChartData((prevChart) => {
            const newPoint = {
              time: chartTimeStr,
              temperature: temp,
              humidity: hum,
              light: light
            };
            return [...prevChart.slice(-9), newPoint];
          });
        }
      } catch (err) {
        console.error('Lỗi khi lấy dữ liệu cảm biến từ Backend:', err);
      }
    };

    // Lấy dữ liệu ngay khi mount
    pollSensors();

    // Định kỳ lấy dữ liệu mỗi 2.5 giây (khớp với chu kỳ của ESP32)
    tickerRef.current = setInterval(pollSensors, 2500);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [isRealtimeActive]);

  // Điều khiển thiết bị đơn lẻ (dv_id: 1, 2, 3)
  const controlDevice = async (dv_id, action) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === dv_id ? { ...d, loading: true } : d))
    );
    setActionError('');
    const startTime = Date.now();

    try {
      await apiService.controlDevice({ dv_id, action });

      // Đảm bảo thời gian loading tối thiểu 500ms để người dùng thấy rõ trạng thái chuyển tiếp
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }

      setDevices((prev) =>
        prev.map((d) =>
          d.id === dv_id
            ? {
                ...d,
                state: action,
                status: action === 'ON' ? 'ACTIVE_ON' : 'STDBY_OFF',
                loading: false
              }
            : d
        )
      );
    } catch (err) {
      console.error('Lỗi khi điều khiển thiết bị:', err);
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
      setDevices((prev) =>
        prev.map((d) => (d.id === dv_id ? { ...d, loading: false } : d))
      );
      setActionError(err.message || 'Mạch ESP32 không phản hồi hoặc đã bị ngắt kết nối!');
    }
  };

  // Hàm chuyển đổi trạng thái (toggle) đèn
  const toggleDevice = (id) => {
    const dev = devices.find((d) => d.id === id);
    if (!dev) return;
    const nextAction = dev.state === 'ON' ? 'OFF' : 'ON';
    controlDevice(id, nextAction);
  };

  // Điều khiển hàng loạt: Bật hoặc Tắt tất cả (dv_id: 'ALL')
  const toggleAll = async (action) => {
    setDevices((prev) => prev.map((d) => ({ ...d, loading: true })));
    setActionError('');
    const startTime = Date.now();

    try {
      const res = await apiService.controlDevice({ dv_id: 'ALL', action });

      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }

      if (res && res.data) {
        setDevices(res.data.map((d) => ({ ...d, loading: false })));
      }
    } catch (err) {
      console.error('Lỗi khi điều khiển tất cả thiết bị:', err);
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
      setDevices((prev) => prev.map((d) => ({ ...d, loading: false })));
      setActionError(err.message || 'Mạch ESP32 không phản hồi hoặc đã bị ngắt kết nối!');
    }
  };

  // Điều khiển ngẫu nhiên: Bật ngẫu nhiên 1 đèn (dv_id: 'RANDOM')
  const randomLed = async () => {
    setDevices((prev) => prev.map((d) => ({ ...d, loading: true })));
    setActionError('');
    const startTime = Date.now();

    try {
      const res = await apiService.controlDevice({ dv_id: 'RANDOM', action: 'ON' });

      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }

      if (res && res.data) {
        setDevices(res.data.map((d) => ({ ...d, loading: false })));
      }
    } catch (err) {
      console.error('Lỗi khi bật ngẫu nhiên thiết bị:', err);
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
      setDevices((prev) => prev.map((d) => ({ ...d, loading: false })));
      setActionError(err.message || 'Mạch ESP32 không phản hồi hoặc đã bị ngắt kết nối!');
    }
  };

  return (
    <IoTContext.Provider
      value={{
        devices,
        sensorValues,
        chartData,
        isRealtimeActive,
        setIsRealtimeActive,
        toggleDevice,
        controlDevice,
        toggleAll,
        randomLed,
        actionError,
        setActionError
      }}
    >
      {children}
    </IoTContext.Provider>
  );
};

export const useIoT = () => {
  const context = useContext(IoTContext);
  if (!context) {
    throw new Error('useIoT must be used within an IoTProvider');
  }
  return context;
};
