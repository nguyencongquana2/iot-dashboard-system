USE Iot;
GO

-- 1. Bảng Người dùng
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    fullName NVARCHAR(100) DEFAULT 'Nguyen Cong Quan',
    class NVARCHAR(50) DEFAULT 'D21CQCN01-B',
    studentId VARCHAR(50) DEFAULT 'B21DCCN000',
    github NVARCHAR(255) DEFAULT 'https://github.com/nguyencongquan',
    figma NVARCHAR(255) DEFAULT '',
    postman NVARCHAR(255) DEFAULT '',
    pdf NVARCHAR(255) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Danh sách Cảm biến
CREATE TABLE sensors (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Danh sách Thiết bị điều khiển
CREATE TABLE devices (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Lưu dữ liệu cảm biến (DataSensor)
CREATE TABLE data_sensor (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ssid INT NOT NULL,
    value FLOAT NOT NULL, -- SQL Server thường dùng FLOAT thay vì DOUBLE
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_datasensor_sensors FOREIGN KEY (ssid) REFERENCES sensors(id) ON DELETE CASCADE
);

-- 5. Bảng Lưu lịch sử bật/tắt thiết bị (Action)
CREATE TABLE action_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
	user_id INT,
    dv_id INT NOT NULL,
    action VARCHAR(20) NOT NULL, 
    status VARCHAR(20) NOT NULL, 
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_action_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_action_devices FOREIGN KEY (dv_id) REFERENCES devices(id) ON DELETE CASCADE
);