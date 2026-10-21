# 📡 HƯỚNG DẪN KHỞI CHẠY & BÁO CÁO BACKEND IOT

Hệ thống Backend được thiết kế tối giản, dễ hiểu và kết nối trực tiếp với mạch **ESP32** (qua giao thức MQTT) và **Cơ sở dữ liệu SQL Server**.

---

## 🗂️ 1. Cấu trúc thư mục Backend
```
backend/
├── .env                # File cấu hình IP MQTT, Cổng, CSDL SQL Server
├── db.js               # Kết nối CSDL SQL Server & tự động tạo danh mục cảm biến, thiết bị
├── mqtt.js             # Kết nối MQTT Broker (192.168.1.95:1884), nhận dữ liệu & gửi lệnh ESP32
├── server.js           # Express Web Server cung cấp các REST API cho Frontend
└── package.json        # Danh sách thư viện cần thiết
```

---

## 🚀 2. Cách khởi chạy Backend

Mở một cửa sổ Terminal mới (PowerShell hoặc CMD):

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt các thư viện cần thiết (chỉ chạy lần đầu)
npm install

# 3. Khởi động server
npm start
```

Khi chạy thành công, Terminal sẽ hiển thị:
```
✅ Đã kết nối thành công tới CSDL SQL Server (Database: Iot)!
✅ Đã kết nối thành công tới MQTT Broker!
📡 Đã Subscribe topic: [data_sensor] và [status]
🚀 Backend Server đang chạy tại: http://localhost:5000
```

---

## 🔗 3. Cách chuyển Frontend từ Mock sang dùng Backend thật

Trong file `frontend/src/services/apiService.js`, bạn chỉ cần đổi 1 dòng:
```javascript
// Dòng 14:
export const USE_MOCK = false; // Đổi từ true sang false
```
Lúc này toàn bộ giao diện Web sẽ gọi API thật đến `http://localhost:5000` và hiển thị dữ liệu thật từ ESP32!

---

## 🎤 4. Kịch bản báo cáo với Thầy (Q&A)

### Câu 1: Em hãy trình bày luồng dữ liệu khi cảm biến đo được thông số?
> **Trả lời:**
> *"Dạ thưa thầy, trên mạch ESP32 cứ mỗi 3 giây sẽ đọc thông số từ cảm biến DHT11 (Nhiệt độ, Độ ẩm) và Quang trở LDR (Ánh sáng). ESP32 đóng gói thành chuỗi JSON: `{\"temperature\": ..., \"humidity\": ..., \"light\": ...}` rồi gửi (Publish) lên MQTT Broker tại topic `data_sensor`. File `mqtt.js` của Backend subscribe topic này, nhận tin, phân tích JSON và INSERT vào bảng `data_sensor` trong SQL Server. Sau đó Frontend gọi API `GET /api/datasensor/latest` và `GET /api/datasensor/chart` để hiển thị số đo và vẽ biểu đồ Recharts."*

### Câu 2: Khi người dùng bấm nút bật đèn trên Web, mạch ESP32 nhận lệnh như thế nào?
> **Trả lời:**
> *"Dạ, khi người dùng gạt công tắc bật đèn trên Dashboard, Frontend gửi request `POST /api/action` kèm ID thiết bị và hành động lên Backend. Trong `server.js`, Backend gọi hàm `sendDeviceCommand()` trong `mqtt.js` để bắn chuỗi lệnh (ví dụ: `LED1_ON`, `LED2_OFF`, hoặc `ALL_ON`) lên topic `control_devices`. ESP32 lắng nghe topic này, trong hàm `callback()` sẽ kiểm tra chuỗi lệnh và xuất mức điện áp HIGH ra chân GPIO tương ứng để bật đèn, đồng thời phản hồi lại bản tin ACK xác nhận qua topic `status`."*

### Câu 3: Tại sao khi bấm Bật tất cả, hệ thống lại lưu 3 dòng vào lịch sử thay vì 1 dòng?
> **Trả lời:**
> *"Dạ vì trong thiết kế CSDL của bảng `action_history`, cột `dv_id` là khóa ngoại tham chiếu đến bảng `devices` gồm 3 thiết bị thực tế là LED 1 (id 1), LED 2 (id 2) và LED 3 (id 3). Việc tách thành 3 bản ghi riêng biệt giúp đảm bảo tính toàn vẹn của CSDL và cho phép chức năng lọc lịch sử theo từng thiết bị hoạt động hoàn toàn chính xác."*
