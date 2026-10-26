import mqtt from 'mqtt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// ============================================================================
// PHẦN 1: CẤU HÌNH THÔNG SỐ MQTT BROKER & TOPIC
// - Broker URL: 127.0.0.1:1884 (hoặc IP LAN của máy tính).
// - Topic Sensor: 'data_sensor' (nhận nhiệt độ, độ ẩm, ánh sáng từ ESP32).
// - Topic Control: 'control_devices' (Backend gửi lệnh bật tắt LED xuống ESP32).
// - Topic Status: 'status' (ESP32 gửi gói ACK báo đã thực thi xong).
// ============================================================================
const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1884';
const mqttOptions = {
  clientId: `BackendServer-${Math.random().toString(16).substring(2, 8)}`,
  username: process.env.MQTT_USER || 'nguyen cong quan',
  password: process.env.MQTT_PASS || 'b23dccn678',
  clean: true,
  reconnectPeriod: 5000 // Tự động thử kết nối lại sau mỗi 5s nếu mất mạng
};

const TOPIC_SENSOR = process.env.MQTT_TOPIC_SENSOR || 'data_sensor';
const TOPIC_CONTROL = process.env.MQTT_TOPIC_CONTROL || 'control_devices';
const TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS || 'status';

// ============================================================================
// PHẦN 2: BỘ NHỚ ĐỆM RAM CHO CẢM BIẾN (latestSensors)
// - Giữ giá trị mới nhất nhận được từ ESP32 để API Dashboard đọc tức thì mà không cần query DB liên tục.
// ============================================================================
let latestSensors = {
  temperature: 28.5,
  humidity: 70.0,
  light: 350,
  time: new Date().toISOString().replace('T', ' ').slice(0, 19)
};

let mqttClient = null;
let lastEspHeartbeat = 0; // Thời điểm gần nhất nhận được tín hiệu từ ESP32
let pendingAckWaiters = []; // Danh sách các Promise đang đợi phản hồi ACK từ ESP32

// ============================================================================
// PHẦN 3: KHỞI TẠO KẾT NỐI & XỬ LÝ TIN NHẮN TỪ ESP32 (initMQTT)
// - Lắng nghe topic data_sensor -> Parse JSON -> Lưu vào bảng data_sensor (SQL Server).
// - Lắng nghe topic status -> Phản hồi ACK cho lệnh điều khiển.
// ============================================================================
export function initMQTT() {
  console.log(`🔌 Đang kết nối tới MQTT Broker tại: ${brokerUrl}...`);
  mqttClient = mqtt.connect(brokerUrl, mqttOptions);

  mqttClient.on('connect', () => {
    console.log('✅ Đã kết nối thành công tới MQTT Broker!');

    // Đăng ký nhận dữ liệu từ các Topic của ESP32
    mqttClient.subscribe([TOPIC_SENSOR, TOPIC_STATUS], (err) => {
      if (err) {
        console.error('❌ Lỗi khi subscribe topics:', err);
      } else {
        console.log(`📡 Đã Subscribe topic: [${TOPIC_SENSOR}] và [${TOPIC_STATUS}]`);
      }
    });
  });

  // Lắng nghe dữ liệu gửi đến từ ESP32
  mqttClient.on('message', async (topic, message) => {
    const payloadStr = message.toString();

    // 3.1. Nhận gói tin cảm biến từ ESP32 và ghi vào SQL Server
    if (topic === TOPIC_SENSOR) {
      lastEspHeartbeat = Date.now();
      try {
        const data = JSON.parse(payloadStr);
        const now = new Date();
        const formattedTime = now.toISOString().replace('T', ' ').slice(0, 19);

        // Cập nhật bộ nhớ đệm
        latestSensors = {
          temperature: parseFloat(data.temperature) || 0,
          humidity: parseFloat(data.humidity) || 0,
          light: parseInt(data.light, 10) || 0,
          time: formattedTime
        };

        console.log(`📥 [ESP32 -> ${TOPIC_SENSOR}]:`, payloadStr);

        // Lưu vào CSDL SQL Server (bảng data_sensor)
        // ssid 1: Nhiệt độ, ssid 2: Độ ẩm, ssid 3: Ánh sáng
        try {
          await executeQuery(`
            INSERT INTO data_sensor (ssid, value, time) VALUES 
              (1, @temp, @time),
              (2, @hum, @time),
              (3, @light, @time)
          `, {
            temp: latestSensors.temperature,
            hum: latestSensors.humidity,
            light: latestSensors.light,
            time: now
          });
        } catch (dbErr) {
          console.warn('⚠️ Lỗi khi lưu bản ghi cảm biến vào CSDL:', dbErr.message);
        }
      } catch (jsonErr) {
        console.warn('⚠️ Gói tin cảm biến không đúng chuẩn JSON:', payloadStr);
      }
    }

    // 3.2. Nhận gói tin phản hồi (ACK) từ ESP32 khi thực thi xong lệnh bật/tắt
    if (topic === TOPIC_STATUS) {
      lastEspHeartbeat = Date.now();
      console.log(`📩 [ESP32 ACK -> ${TOPIC_STATUS}]:`, payloadStr);

      // Phản hồi cho các lệnh đang chờ ACK từ topic status
      if (pendingAckWaiters.length > 0) {
        const currentWaiters = [...pendingAckWaiters];
        pendingAckWaiters = [];
        currentWaiters.forEach((waiter) => waiter.resolve(payloadStr));
      }
    }
  });

  mqttClient.on('error', (err) => {
    console.error('❌ Lỗi kết nối MQTT:', err.message);
  });

  mqttClient.on('reconnect', () => {
    console.log('🔄 Đang thử kết nối lại MQTT Broker...');
  });

  return mqttClient;
}

// ============================================================================
// PHẦN 4: HÀM GỬI LỆNH ĐIỀU KHIỂN XUỐNG ESP32 (sendDeviceCommand)
// - Publish chuỗi lệnh (ví dụ: 'LED1_ON', 'LED2_OFF', 'ALL_ON') vào topic 'control_devices'.
// - BẮT BUỘC ĐỢI ESP32 phản hồi gói tin ACK qua topic 'status' trong thời gian timeoutMs (mặc định 2500ms).
// - Nếu ESP32 bị tháo / mất nguồn / mất mạng -> Không nhận được ACK -> Reject lỗi!
// ============================================================================
export function sendDeviceCommand(command, { timeoutMs = 2500 } = {}) {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      return reject(new Error('MQTT Broker chưa kết nối!'));
    }

    let timer = null;
    const waiter = {
      resolve: (ackPayload) => {
        if (timer) clearTimeout(timer);
        resolve(ackPayload);
      },
      reject: (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      }
    };

    // Đặt timeout chờ ACK từ ESP32
    timer = setTimeout(() => {
      pendingAckWaiters = pendingAckWaiters.filter((w) => w !== waiter);
      reject(new Error(`ESP32 không phản hồi lệnh [${command}] sau ${timeoutMs}ms (Mạch ESP32 đã bị tháo hoặc mất kết nối)!`));
    }, timeoutMs);

    pendingAckWaiters.push(waiter);

    console.log(`📤 [Backend -> ${TOPIC_CONTROL}]: Publish lệnh -> ${command}`);
    mqttClient.publish(TOPIC_CONTROL, command, { qos: 1 }, (err) => {
      if (err) {
        if (timer) clearTimeout(timer);
        pendingAckWaiters = pendingAckWaiters.filter((w) => w !== waiter);
        console.error(`❌ Gửi lệnh [${command}] thất bại:`, err);
        return reject(err);
      }
      console.log(`⏳ Đang đợi ESP32 phản hồi ACK trên topic [${TOPIC_STATUS}] (tối đa ${timeoutMs}ms)...`);
    });
  });
}

// Hàm lấy nhanh giá trị cảm biến mới nhất
export function getLatestSensors() {
  return latestSensors;
}
