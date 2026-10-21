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

// ============================================================================
// PHẦN 3: KHỞI TẠO KẾT NỐI & XỬ LÝ TIN NHẮN TỪ ESP32 (initMQTT)
// - Lắng nghe topic data_sensor -> Parse JSON -> Lưu vào bảng data_sensor (SQL Server).
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
      console.log(`📩 [ESP32 ACK -> ${TOPIC_STATUS}]:`, payloadStr);
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
// ============================================================================
export function sendDeviceCommand(command) {
  if (!mqttClient || !mqttClient.connected) {
    console.warn(`⚠️ Cảnh báo: MQTT Broker chưa kết nối, lệnh [${command}] vẫn được gửi khi có mạng.`);
  }

  return new Promise((resolve, reject) => {
    if (!mqttClient) {
      return reject(new Error('MQTT Client chưa được khởi tạo'));
    }

    console.log(`📤 [Backend -> ${TOPIC_CONTROL}]: Publish lệnh -> ${command}`);
    mqttClient.publish(TOPIC_CONTROL, command, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Gửi lệnh [${command}] thất bại:`, err);
        return reject(err);
      }
      resolve(true);
    });
  });
}

// Hàm lấy nhanh giá trị cảm biến mới nhất
export function getLatestSensors() {
  return latestSensors;
}
