# IoT Smart Dashboard System

Hệ thống giám sát và điều khiển thiết bị IoT thời gian thực (Real-time IoT Dashboard) kết nối qua giao thức MQTT.

## 📌 Tính năng chính
- **Giám sát cảm biến**: Thu thập dữ liệu nhiệt độ, độ ẩm (DHT11) và cường độ ánh sáng (LDR) theo thời gian thực.
- **Điều khiển thiết bị**: Điều khiển bật/tắt các thiết bị (LED/Relay) từ giao diện Web với cơ chế phản hồi trạng thái (ACK).
- **Trực quan hóa dữ liệu**: Biểu đồ hiển thị biến thiên thông số cảm biến theo thời gian thực (Recharts).
- **Lịch sử & Thống kê**: Lưu trữ lịch sử dữ liệu cảm biến và thao tác điều khiển vào SQL Server.

## 🛠️ Công nghệ sử dụng
- **Phần cứng**: ESP32, DHT11, Cảm biến ánh sáng (LDR), LED.
- **Giao thức**: MQTT (Mosquitto Broker), HTTP RESTful API.
- **Backend**: Node.js, Express.js, `mqtt.js`, SQL Server (`mssql`).
- **Frontend**: React 19, Vite, Recharts, Lucide React, Vanilla CSS.

## 📂 Cấu trúc thư mục
```
├── Database/         # Script khởi tạo CSDL SQL Server
├── backend/          # REST API & MQTT Client (Node.js)
├── frontend/         # Dashboard Web (React 19 + Vite)
├── code_ESP32        # Mã nguồn nạp cho vi điều khiển ESP32
└── README.md
```
