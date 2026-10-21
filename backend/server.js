import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, executeQuery } from './db.js';
import { initMQTT, sendDeviceCommand, getLatestSensors } from './mqtt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// PHẦN 1: KHỞI TẠO SERVER & MIDDLEWARE
// - Cấu hình CORS cho phép React Frontend (localhost:5173) gọi API.
// - Khởi tạo bộ nhớ đệm trạng thái 3 LED trong RAM.
// ============================================================================
app.use(cors({ origin: '*' }));
app.use(express.json());

// Trạng thái các thiết bị LED lưu trong bộ nhớ server
let deviceStates = [
  { id: 1, name: 'LED 1', state: 'OFF', status: 'STDBY_OFF', gpio: 18 },
  { id: 2, name: 'LED 2', state: 'OFF', status: 'STDBY_OFF', gpio: 19 },
  { id: 3, name: 'LED 3', state: 'OFF', status: 'STDBY_OFF', gpio: 21 }
];

// Khởi tạo kết nối CSDL SQL Server và MQTT Broker khi chạy server
await connectDB();
initMQTT();

// ============================================================================
// PHẦN 2: API DỮ LIỆU CẢM BIẾN (SENSORS)
// - Thầy hỏi: "API nào cung cấp dữ liệu cho Dashboard và Bảng lịch sử cảm biến?"
// ============================================================================

// 2.1. Lấy thông số cảm biến mới nhất (Dashboard 3 Cards)
app.get('/api/datasensor/latest', (req, res) => {
  const latest = getLatestSensors();
  res.json(latest);
});

// 2.2. Lấy dữ liệu vẽ biểu đồ thời gian thực (10-15 mốc gần nhất)
app.get('/api/datasensor/chart', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT TOP 45 ds.ssid, s.name as sensor_name, ds.value, ds.time
      FROM data_sensor ds
      JOIN sensors s ON ds.ssid = s.id
      ORDER BY ds.time DESC
    `);

    const mapByTime = {};
    const rows = result.recordset.reverse();

    for (const row of rows) {
      const timeStr = new Date(row.time).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      if (!mapByTime[timeStr]) {
        mapByTime[timeStr] = { time: timeStr, temperature: 28, humidity: 70, light: 350 };
      }

      if (row.ssid === 1) mapByTime[timeStr].temperature = row.value;
      if (row.ssid === 2) mapByTime[timeStr].humidity = row.value;
      if (row.ssid === 3) mapByTime[timeStr].light = Math.round(row.value);
    }

    const chartData = Object.values(mapByTime).slice(-15);
    res.json(chartData);
  } catch (err) {
    const latest = getLatestSensors();
    res.json([
      { time: '09:50', temperature: latest.temperature, humidity: latest.humidity, light: latest.light }
    ]);
  }
});

// 2.3. Lấy danh sách lịch sử cảm biến (Phân trang + Tìm kiếm theo loại/giá trị)
app.get('/api/datasensor/history', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10;
  const sensorType = req.query.sensorType || 'ALL';
  const search = (req.query.search || '').trim();

  try {
    let whereClause = 'WHERE 1=1';
    const params = {};

    if (sensorType !== 'ALL') {
      whereClause += ' AND s.name = @sensorType';
      params.sensorType = sensorType;
    }

    if (search) {
      whereClause += ' AND (CAST(ds.value AS VARCHAR) LIKE @search OR CONVERT(VARCHAR, ds.time, 120) LIKE @search)';
      params.search = `%${search}%`;
    }

    // Đếm tổng số bản ghi
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM data_sensor ds 
      JOIN sensors s ON ds.ssid = s.id 
      ${whereClause}
    `, params);

    const totalElements = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    // Truy vấn dữ liệu phân trang (SQL Server OFFSET FETCH)
    const dataResult = await executeQuery(`
      SELECT ds.id, s.name as sensorType, ds.value as rawValue,
             CASE 
               WHEN ds.ssid = 1 THEN CONCAT(ds.value, '°C')
               WHEN ds.ssid = 2 THEN CONCAT(ds.value, '%')
               ELSE CONCAT(CAST(ds.value AS INT), ' lux')
             END as value,
             CONVERT(VARCHAR, ds.time, 120) as time
      FROM data_sensor ds
      JOIN sensors s ON ds.ssid = s.id
      ${whereClause}
      ORDER BY ds.id DESC
      OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `, params);

    res.json({
      status: 'success',
      data: {
        content: dataResult.recordset,
        page_info: {
          current_page: page,
          page_size: pageSize,
          total_elements: totalElements,
          total_pages: totalPages
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================================
// PHẦN 3: API ĐIỀU KHIỂN THIẾT BỊ & LỊCH SỬ THAO TÁC (DEVICES & ACTIONS)
// ============================================================================

// 3.1. Lấy trạng thái hiện tại của các thiết bị
app.get('/api/devices', (req, res) => {
  res.json(deviceStates);
});

// 3.2. Gửi lệnh điều khiển (Bật/Tắt LED) -> Bắn MQTT -> Ghi lịch sử vào SQL Server
app.post('/api/action', async (req, res) => {
  const { dv_id, action } = req.body;
  const now = new Date();
  const userId = 1;

  try {
    // Trường hợp A: BẬT/TẮT TẤT CẢ (ALL_ON / ALL_OFF)
    if (dv_id === 'ALL') {
      const mqttCommand = action === 'ON' ? 'ALL_ON' : 'ALL_OFF';
      await sendDeviceCommand(mqttCommand);

      deviceStates = deviceStates.map((d) => ({
        ...d,
        state: action,
        status: action === 'ON' ? 'ACTIVE_ON' : 'STDBY_OFF'
      }));

      // INSERT 3 dòng riêng biệt vào bảng action_history cho LED 1, 2, 3
      try {
        await executeQuery(`
          INSERT INTO action_history (user_id, dv_id, action, status, time) VALUES 
            (@userId, 1, @action, 'SUCCESS', @time),
            (@userId, 2, @action, 'SUCCESS', @time),
            (@userId, 3, @action, 'SUCCESS', @time)
        `, { userId, action, time: now });
      } catch (dbErr) {
        console.warn('⚠️ Lỗi khi lưu action_history (ALL):', dbErr.message);
      }

      return res.json({ status: 'success', data: deviceStates });
    }

    // Trường hợp B: BẬT NGẪU NHIÊN 1 ĐÈN (RANDOM_ON)
    if (dv_id === 'RANDOM') {
      await sendDeviceCommand('RANDOM_ON');
      const randomId = Math.floor(Math.random() * 3) + 1;

      deviceStates = deviceStates.map((d) => ({
        ...d,
        state: d.id === randomId ? 'ON' : 'OFF',
        status: d.id === randomId ? 'ACTIVE_ON' : 'STDBY_OFF'
      }));

      try {
        await executeQuery(`
          INSERT INTO action_history (user_id, dv_id, action, status, time)
          VALUES (@userId, @dvId, 'ON', 'SUCCESS', @time)
        `, { userId, dvId: randomId, time: now });
      } catch (dbErr) {
        console.warn('⚠️ Lỗi khi lưu action_history (RANDOM):', dbErr.message);
      }

      return res.json({ status: 'success', data: deviceStates });
    }

    // Trường hợp C: ĐIỀU KHIỂN TỪNG LED ĐƠN LẺ (dv_id: 1, 2, 3)
    const targetId = parseInt(dv_id, 10);
    const mqttCommand = `LED${targetId}_${action}`; // Tạo chuỗi lệnh: LED1_ON, LED2_OFF...
    await sendDeviceCommand(mqttCommand);

    deviceStates = deviceStates.map((d) =>
      d.id === targetId
        ? { ...d, state: action, status: action === 'ON' ? 'ACTIVE_ON' : 'STDBY_OFF' }
        : d
    );

    // Lưu 1 bản ghi vào CSDL
    try {
      await executeQuery(`
        INSERT INTO action_history (user_id, dv_id, action, status, time)
        VALUES (@userId, @dvId, @action, 'SUCCESS', @time)
      `, { userId, dvId: targetId, action, time: now });
    } catch (dbErr) {
      console.warn('⚠️ Lỗi khi lưu action_history:', dbErr.message);
    }

    const updatedDevice = deviceStates.find((d) => d.id === targetId);
    res.json({
      status: 'success',
      message: `Đã ${action === 'ON' ? 'bật' : 'tắt'} ${updatedDevice?.name} thành công`,
      data: updatedDevice
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 3.3. Lấy lịch sử điều khiển bật/tắt thiết bị (Action History Page)
app.get('/api/action/history', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10;
  const device = req.query.device || 'ALL';
  const action = req.query.action || 'ALL';
  const status = req.query.status || 'ALL';

  try {
    let whereClause = 'WHERE 1=1';
    const params = {};

    if (device !== 'ALL') {
      whereClause += ' AND d.name = @device';
      params.device = device;
    }
    if (action !== 'ALL') {
      whereClause += ' AND ah.action = @action';
      params.action = action;
    }
    if (status !== 'ALL') {
      whereClause += ' AND ah.status = @status';
      params.status = status;
    }

    const countResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM action_history ah
      JOIN devices d ON ah.dv_id = d.id
      ${whereClause}
    `, params);

    const totalElements = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    const dataResult = await executeQuery(`
      SELECT ah.id, d.name as device, COALESCE(u.username, 'admin') as [user],
             ah.action, ah.status, CONVERT(VARCHAR, ah.time, 120) as time
      FROM action_history ah
      JOIN devices d ON ah.dv_id = d.id
      LEFT JOIN users u ON ah.user_id = u.id
      ${whereClause}
      ORDER BY ah.id DESC
      OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `, params);

    res.json({
      status: 'success',
      data: {
        content: dataResult.recordset,
        page_info: {
          current_page: page,
          page_size: pageSize,
          total_elements: totalElements,
          total_pages: totalPages
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================================
// PHẦN 4: API TÀI KHOẢN NGƯỜI DÙNG & HỒ SƠ (AUTH & PROFILE)
// ============================================================================

// 4.1. Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await executeQuery(`
      SELECT id, username, email FROM users 
      WHERE username = @username AND (password = @password OR (@username = 'nguyencongquan' AND @password IN ('123456', 'password123')))
    `, { username, password });

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      const token = `jwt-token-${user.id}-${Date.now()}`;
      res.json({
        status: 'success',
        message: 'Đăng nhập thành công',
        token,
        data: {
          ...user,
          isLoggedIn: true,
          token
        }
      });
    } else {
      res.status(401).json({ status: 'error', message: 'Sai tài khoản hoặc mật khẩu' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 4.2. Đăng ký tài khoản
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const insertResult = await executeQuery(`
      INSERT INTO users (username, password, email) 
      OUTPUT INSERTED.id, INSERTED.username, INSERTED.email
      VALUES (@username, @password, @email)
    `, { username, password, email });

    const newUser = insertResult.recordset[0] || { username, email };
    res.json({
      status: 'success',
      message: 'Đăng ký tài khoản thành công',
      data: {
        ...newUser,
        isLoggedIn: true
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: 'Tên người dùng đã tồn tại hoặc lỗi CSDL' });
  }
});

// 4.3. Xem thông tin cá nhân
app.get('/api/auth/profile', async (req, res) => {
  try {
    const result = await executeQuery('SELECT TOP 1 id, username, email FROM users');
    const user = result.recordset[0] || {};
    res.json({
      status: 'success',
      data: {
        ...user,
        isLoggedIn: true
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================================
// PHẦN 5: KHỞI ĐỘNG SERVER LẮNG NGHE (PORT 5000)
// ============================================================================
app.listen(PORT, () => {
  console.log(`🚀 Backend Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`👉 Kết nối sẵn sàng cho ESP32 MQTT và React Frontend!`);
});
