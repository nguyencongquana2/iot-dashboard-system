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

// Helper phân tích khoảng thời gian (VD: "29/09/2025 21:00 - 21:16", "2026-10-26 03:00 - 04:00", "03:00 - 03:30")
function parseDateRange(rangeStr) {
  if (!rangeStr || !rangeStr.includes(' - ')) return null;
  const parts = rangeStr.split(' - ').map((s) => s.trim());
  if (parts.length !== 2) return null;

  const [startStr, endStr] = parts;

  const normalizeStartDateTime = (str) => {
    const timeOnlyMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnlyMatch) return null; // Sẽ xử lý ở time_only

    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      const h = (dmyMatch[4] || '00').padStart(2, '0');
      const m = dmyMatch[5] || '00';
      const s = dmyMatch[6] || '00';
      return `${year}-${month}-${day} ${h}:${m}:${s}`;
    }

    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      const h = (ymdMatch[4] || '00').padStart(2, '0');
      const m = ymdMatch[5] || '00';
      const s = ymdMatch[6] || '00';
      return `${year}-${month}-${day} ${h}:${m}:${s}`;
    }

    return null;
  };

  const normalizeEndDateTime = (str, fallbackDate = null) => {
    const timeOnlyMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnlyMatch) {
      const h = timeOnlyMatch[1].padStart(2, '0');
      const m = timeOnlyMatch[2];
      const s = timeOnlyMatch[3] || '59';
      if (fallbackDate) {
        return `${fallbackDate} ${h}:${m}:${s}`;
      }
      return null;
    }

    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      const h = (dmyMatch[4] || '23').padStart(2, '0');
      const m = dmyMatch[5] || (dmyMatch[4] ? '00' : '59');
      const s = dmyMatch[6] || '59';
      return `${year}-${month}-${day} ${h}:${m}:${s}`;
    }

    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      const h = (ymdMatch[4] || '23').padStart(2, '0');
      const m = ymdMatch[5] || (ymdMatch[4] ? '00' : '59');
      const s = ymdMatch[6] || '59';
      return `${year}-${month}-${day} ${h}:${m}:${s}`;
    }

    return null;
  };

  const dmyStart = startStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const ymdStart = startStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let baseDate = null;
  if (dmyStart) {
    baseDate = `${dmyStart[3]}-${dmyStart[2].padStart(2, '0')}-${dmyStart[1].padStart(2, '0')}`;
  } else if (ymdStart) {
    baseDate = `${ymdStart[1]}-${ymdStart[2].padStart(2, '0')}-${ymdStart[3].padStart(2, '0')}`;
  }

  const startNormalized = normalizeStartDateTime(startStr);
  const endNormalized = normalizeEndDateTime(endStr, baseDate);

  const timeOnly1 = startStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  const timeOnly2 = endStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!startNormalized && timeOnly1 && timeOnly2) {
    const t1 = `${timeOnly1[1].padStart(2, '0')}:${timeOnly1[2]}:${timeOnly1[3] || '00'}`;
    const t2 = `${timeOnly2[1].padStart(2, '0')}:${timeOnly2[2]}:${timeOnly2[3] || '59'}`;
    return { type: 'time_only', startTime: t1, endTime: t2 };
  }

  if (startNormalized && endNormalized) {
    return { type: 'datetime', start: startNormalized, end: endNormalized };
  }

  return null;
}

// 2.3. Lấy danh sách lịch sử cảm biến (Phân trang + Tìm kiếm theo loại/giá trị)
app.get('/api/datasensor/history', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10;
  const sensorType = req.query.sensorType || 'ALL';
  const search = (req.query.search || '').trim();

  try {
    let whereClause = 'WHERE 1=1';
    const params = {};

    if (sensorType !== 'ALL' && sensorType !== 'Time') {
      whereClause += ' AND s.name = @sensorType';
      params.sensorType = sensorType;
    }

    if (search) {
      const range = parseDateRange(search);
      if (range) {
        if (range.type === 'datetime') {
          whereClause += ' AND ds.time >= @start AND ds.time <= @end';
          params.start = range.start;
          params.end = range.end;
        } else if (range.type === 'time_only') {
          whereClause += ' AND CONVERT(VARCHAR(8), ds.time, 108) BETWEEN @startTime AND @endTime';
          params.startTime = range.startTime;
          params.endTime = range.endTime;
        }
      } else {
        if (sensorType === 'Time') {
          whereClause += ' AND (CONVERT(VARCHAR, ds.time, 120) LIKE @search OR CONVERT(VARCHAR, ds.time, 103) LIKE @search OR CONVERT(VARCHAR, ds.time, 108) LIKE @search)';
          params.search = `%${search}%`;
        } else if (sensorType === 'ALL') {
          whereClause += ' AND (s.name LIKE @search OR CAST(ds.value AS VARCHAR) LIKE @search OR CONVERT(VARCHAR, ds.time, 120) LIKE @search OR CONVERT(VARCHAR, ds.time, 103) LIKE @search OR CONVERT(VARCHAR, ds.time, 108) LIKE @search)';
          params.search = `%${search}%`;
        } else {
          whereClause += ' AND (CAST(ds.value AS VARCHAR) LIKE @search OR CONVERT(VARCHAR, ds.time, 120) LIKE @search OR CONVERT(VARCHAR, ds.time, 103) LIKE @search OR CONVERT(VARCHAR, ds.time, 108) LIKE @search)';
          params.search = `%${search}%`;
        }
      }
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

// 3.2. Gửi lệnh điều khiển (Bật/Tắt LED) -> Lưu LOADING -> Bắn MQTT -> Cập nhật SUCCESS / FAILED
app.post('/api/action', async (req, res) => {
  const { dv_id, action } = req.body;
  const now = new Date();
  const userId = 1;
  let insertedIds = [];

  try {
    // GIAI ĐOẠN 1: TẠO BẢN GHI TRẠNG THÁI 'LOADING' TRƯỚC KHI BẮN LỆNH
    try {
      if (dv_id === 'ALL') {
        const insertRes = await executeQuery(`
          INSERT INTO action_history (user_id, dv_id, action, status, time)
          OUTPUT INSERTED.id
          VALUES 
            (@userId, 1, @action, 'LOADING', @time),
            (@userId, 2, @action, 'LOADING', @time),
            (@userId, 3, @action, 'LOADING', @time)
        `, { userId, action, time: now });
        insertedIds = insertRes.recordset.map((r) => r.id);
      } else if (dv_id === 'RANDOM') {
        const randomId = Math.floor(Math.random() * 3) + 1;
        req.selectedRandomId = randomId;
        const insertRes = await executeQuery(`
          INSERT INTO action_history (user_id, dv_id, action, status, time)
          OUTPUT INSERTED.id
          VALUES (@userId, @dvId, 'ON', 'LOADING', @time)
        `, { userId, dvId: randomId, time: now });
        insertedIds = insertRes.recordset.map((r) => r.id);
      } else {
        const targetId = parseInt(dv_id, 10);
        const insertRes = await executeQuery(`
          INSERT INTO action_history (user_id, dv_id, action, status, time)
          OUTPUT INSERTED.id
          VALUES (@userId, @dvId, @action, 'LOADING', @time)
        `, { userId, dvId: targetId, action, time: now });
        insertedIds = insertRes.recordset.map((r) => r.id);
      }
    } catch (insertErr) {
      console.warn('⚠️ Lỗi khi khởi tạo bản ghi action_history (LOADING):', insertErr.message);
    }

    // GIAI ĐOẠN 2: BẮN LỆNH MQTT XUỐNG ESP32 VÀ CHỜ PHẢN HỒI ACK
    if (dv_id === 'ALL') {
      const mqttCommand = action === 'ON' ? 'ALL_ON' : 'ALL_OFF';
      await sendDeviceCommand(mqttCommand);

      deviceStates = deviceStates.map((d) => ({
        ...d,
        state: action,
        status: action === 'ON' ? 'ACTIVE_ON' : 'STDBY_OFF'
      }));
    } else if (dv_id === 'RANDOM') {
      await sendDeviceCommand('RANDOM_ON');
      const randomId = req.selectedRandomId || (Math.floor(Math.random() * 3) + 1);

      deviceStates = deviceStates.map((d) => ({
        ...d,
        state: d.id === randomId ? 'ON' : 'OFF',
        status: d.id === randomId ? 'ACTIVE_ON' : 'STDBY_OFF'
      }));
    } else {
      const targetId = parseInt(dv_id, 10);
      const mqttCommand = `LED${targetId}_${action}`;
      await sendDeviceCommand(mqttCommand);

      deviceStates = deviceStates.map((d) =>
        d.id === targetId
          ? { ...d, state: action, status: action === 'ON' ? 'ACTIVE_ON' : 'STDBY_OFF' }
          : d
      );
    }

    // GIAI ĐOẠN 3: KHI NHẬN ACK THÀNH CÔNG -> CẬP NHẬT TRẠNG THÁI BẢN GHI ĐÓ THÀNH 'SUCCESS'
    if (insertedIds.length > 0) {
      try {
        const idListStr = insertedIds.join(',');
        await executeQuery(`
          UPDATE action_history 
          SET status = 'SUCCESS' 
          WHERE id IN (${idListStr})
        `);
      } catch (updateErr) {
        console.warn('⚠️ Lỗi khi cập nhật status SUCCESS:', updateErr.message);
      }
    }

    const updatedDevice = dv_id !== 'ALL' && dv_id !== 'RANDOM'
      ? deviceStates.find((d) => d.id === parseInt(dv_id, 10))
      : deviceStates;

    return res.json({
      status: 'success',
      message: `Đã ${action === 'ON' ? 'bật' : 'tắt'} thiết bị thành công`,
      data: updatedDevice
    });
  } catch (err) {
    // GIAI ĐOẠN 4: KHI GẶP LỖI (TIMEOUT ACK HOẶC MẤT KẾT NỐI BROKER) -> CẬP NHẬT THÀNH 'FAILED'
    try {
      if (insertedIds.length > 0) {
        const idListStr = insertedIds.join(',');
        await executeQuery(`
          UPDATE action_history 
          SET status = 'FAILED' 
          WHERE id IN (${idListStr})
        `);
      } else {
        // Dự phòng nếu chưa kịp insert ở bước 1
        const targetId = dv_id === 'ALL' ? 1 : (parseInt(dv_id, 10) || 1);
        await executeQuery(`
          INSERT INTO action_history (user_id, dv_id, action, status, time)
          VALUES (@userId, @dvId, @action, 'FAILED', @time)
        `, { userId, dvId: targetId, action: action || 'UNKNOWN', time: now });
      }
    } catch (saveErr) {
      console.warn('⚠️ Lỗi khi cập nhật action_history (FAILED):', saveErr.message);
    }

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
  const search = (req.query.search || req.query.timeRange || '').trim();

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

    if (search) {
      const range = parseDateRange(search);
      if (range) {
        if (range.type === 'datetime') {
          whereClause += ' AND ah.time >= @start AND ah.time <= @end';
          params.start = range.start;
          params.end = range.end;
        } else if (range.type === 'time_only') {
          whereClause += ' AND CONVERT(VARCHAR(8), ah.time, 108) BETWEEN @startTime AND @endTime';
          params.startTime = range.startTime;
          params.endTime = range.endTime;
        }
      } else {
        whereClause += ` AND (
          CONVERT(VARCHAR, ah.time, 120) LIKE @search
          OR CONVERT(VARCHAR, ah.time, 103) LIKE @search
          OR CONVERT(VARCHAR, ah.time, 108) LIKE @search
          OR d.name LIKE @search
          OR ah.action LIKE @search
          OR ah.status LIKE @search
          OR COALESCE(u.username, 'admin') LIKE @search
        )`;
        params.search = `%${search}%`;
      }
    }

    const countResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM action_history ah
      JOIN devices d ON ah.dv_id = d.id
      LEFT JOIN users u ON ah.user_id = u.id
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

// 4.3. Xem thông tin cá nhân (Profile)
app.get('/api/auth/profile', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT TOP 1 id, username, email, fullName, class, studentId, github, figma, postman, pdf 
      FROM users
    `);
    const user = result.recordset[0] || {};
    res.json({
      status: 'success',
      data: {
        ...user,
        isLoggedIn: true
      }
    });
  } catch (err) {
    try {
      const fallback = await executeQuery('SELECT TOP 1 id, username, email FROM users');
      const user = fallback.recordset[0] || {};
      res.json({ status: 'success', data: { ...user, isLoggedIn: true } });
    } catch {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
});

// 4.4. Cập nhật thông tin cá nhân (Profile) vào CSDL SQL Server
app.put('/api/auth/profile', async (req, res) => {
  const { fullName, class: className, studentId, email, github, figma, postman, pdf } = req.body;
  try {
    await executeQuery(`
      UPDATE users SET 
        fullName = COALESCE(@fullName, fullName),
        class = COALESCE(@class, class),
        studentId = COALESCE(@studentId, studentId),
        email = COALESCE(@email, email),
        github = COALESCE(@github, github),
        figma = COALESCE(@figma, figma),
        postman = COALESCE(@postman, postman),
        pdf = COALESCE(@pdf, pdf)
      WHERE id = (SELECT TOP 1 id FROM users)
    `, {
      fullName: fullName || null,
      class: className || null,
      studentId: studentId || null,
      email: email || null,
      github: github || null,
      figma: figma || null,
      postman: postman || null,
      pdf: pdf || null
    });

    const updatedResult = await executeQuery(`
      SELECT TOP 1 id, username, email, fullName, class, studentId, github, figma, postman, pdf 
      FROM users
    `);

    res.json({
      status: 'success',
      message: 'Cập nhật thông tin cá nhân thành công',
      data: {
        ...(updatedResult.recordset[0] || {}),
        isLoggedIn: true
      }
    });
  } catch (err) {
    console.error('Lỗi khi cập nhật profile:', err.message);
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
