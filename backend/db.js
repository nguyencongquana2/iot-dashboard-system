import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// ============================================================================
// PHẦN 1: CẤU HÌNH THÔNG SỐ KẾT NỐI SQL SERVER (config)
// - Lấy thông số từ file .env: Server (localhost), Port (1433), DB (Iot), User (sa).
// ============================================================================
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME || 'Iot',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // true nếu dùng Azure SQL
    trustServerCertificate: true,             // Bỏ qua chứng chỉ self-signed cục bộ
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

// ============================================================================
// PHẦN 2: HÀM KẾT NỐI DATABASE (connectDB)
// - Sử dụng Connection Pool (tối ưu hiệu năng, không tạo mới liên tục).
// ============================================================================
export async function connectDB() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('✅ Đã kết nối thành công tới CSDL SQL Server (Database: Iot)!');
      await initDefaultData();
    }
    return pool;
  } catch (error) {
    console.error('❌ Lỗi kết nối CSDL SQL Server:', error.message);
    console.log('⚠️ Gợi ý: Hãy kiểm tra SQL Server Service đã bật chưa và cấu hình trong file backend/.env');
    return null;
  }
}

// ============================================================================
// PHẦN 3: TỰ ĐỘNG KHỞI TẠO DỮ LIỆU BAN ĐẦU (initDefaultData)
// - Đảm bảo CSDL luôn có danh mục sẵn, tránh lỗi khóa ngoại khi ESP32 lưu dữ liệu.
// ============================================================================
async function initDefaultData() {
  try {
    // 3.1. Danh mục cảm biến (sensors): 1: Temp, 2: Hum, 3: Light
    const sensorCheck = await pool.request().query('SELECT COUNT(*) as count FROM sensors');
    if (sensorCheck.recordset[0].count === 0) {
      await pool.request().query(`
        SET IDENTITY_INSERT sensors ON;
        INSERT INTO sensors (id, name) VALUES 
          (1, 'Temperature'),
          (2, 'Humidity'),
          (3, 'Light');
        SET IDENTITY_INSERT sensors OFF;
      `);
      console.log('📌 Đã khởi tạo danh mục cảm biến mẫu (1: Temp, 2: Hum, 3: Light).');
    }

    // 3.2. Danh mục thiết bị điều khiển (devices): LED 1, LED 2, LED 3
    const deviceCheck = await pool.request().query('SELECT COUNT(*) as count FROM devices');
    if (deviceCheck.recordset[0].count === 0) {
      await pool.request().query(`
        SET IDENTITY_INSERT devices ON;
        INSERT INTO devices (id, name) VALUES 
          (1, 'LED 1'),
          (2, 'LED 2'),
          (3, 'LED 3');
        SET IDENTITY_INSERT devices OFF;
      `);
      console.log('📌 Đã khởi tạo danh mục thiết bị mẫu (1: LED 1, 2: LED 2, 3: LED 3).');
    }

    // 3.3. Tự động kiểm tra và mở rộng các cột hồ sơ Profile nếu chưa có
    await pool.request().query(`
      IF COL_LENGTH('users', 'fullName') IS NULL
      BEGIN
        ALTER TABLE users ADD 
          fullName NVARCHAR(100) DEFAULT 'Nguyen Cong Quan',
          class NVARCHAR(50) DEFAULT 'D21CQCN01-B',
          studentId VARCHAR(50) DEFAULT 'B21DCCN000',
          github NVARCHAR(255) DEFAULT 'https://github.com/nguyencongquan',
          figma NVARCHAR(255) DEFAULT '',
          postman NVARCHAR(255) DEFAULT '',
          pdf NVARCHAR(255) DEFAULT '';
      END
    `);

    // 3.4. Tài khoản người dùng mặc định (users)
    const userCheck = await pool.request().query('SELECT COUNT(*) as count FROM users');
    if (userCheck.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO users (username, password, email, fullName, class, studentId, github) 
        VALUES ('nguyencongquan', '123456', 'nguyencongquan@iot.local', 'Nguyen Cong Quan', 'D21CQCN01-B', 'B21DCCN000', 'https://github.com/nguyencongquan');
      `);
      console.log('📌 Đã khởi tạo tài khoản người dùng mặc định (nguyencongquan).');
    }
  } catch (err) {
    console.warn('⚠️ Ghi chú khi khởi tạo dữ liệu mặc định:', err.message);
  }
}

// ============================================================================
// PHẦN 4: HÀM THỰC THI TRUY VẤN SQL AN TOÀN (executeQuery)
// - Tự động binding tham số qua request.input() để tránh tấn công SQL Injection.
// ============================================================================
export async function executeQuery(queryText, params = {}) {
  const dbPool = await connectDB();
  if (!dbPool) {
    throw new Error('Chưa kết nối được với CSDL SQL Server');
  }

  const request = dbPool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(queryText);
}
