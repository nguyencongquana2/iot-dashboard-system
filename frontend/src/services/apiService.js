// API Service: Kết nối trực tiếp với Backend Node.js Express (port 5000)
export const API_BASE_URL = 'http://localhost:5000/api';

// Helper lấy header Authorization (ưu tiên Token, dự phòng Basic Auth mặc định)
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return { Authorization: 'Basic ' + btoa('nguyencongquan:123456') };
};

export const apiService = {
  // ==================== AUTH API ====================
  // Đăng nhập
  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    if (!res.ok || result.status === 'error') {
      throw new Error(result.message || 'Sai tài khoản hoặc mật khẩu');
    }
    if (result.token) {
      localStorage.setItem('token', result.token);
    }
    return result;
  },

  // Đăng ký tài khoản
  async register({ username, password, email }) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    const result = await res.json();
    if (!res.ok || result.status === 'error') {
      throw new Error(result.message || 'Đăng ký không thành công');
    }
    return result;
  },

  // Lấy thông tin cá nhân (Profile)
  async getProfile() {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { ...getAuthHeaders() }
    });
    const result = await res.json();
    return result.data || result;
  },

  // Cập nhật thông tin cá nhân
  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  // ==================== SENSORS API ====================
  // Lấy giá trị cảm biến mới nhất từ ESP32
  async getLatestSensors() {
    const res = await fetch(`${API_BASE_URL}/datasensor/latest`, {
      headers: { ...getAuthHeaders() }
    });
    return res.json();
  },

  // Lấy dữ liệu vẽ biểu đồ cảm biến (10-15 điểm gần nhất)
  async getChartData(range = '1h') {
    const res = await fetch(`${API_BASE_URL}/datasensor/chart?range=${range}`, {
      headers: { ...getAuthHeaders() }
    });
    return res.json();
  },

  // Lấy danh sách lịch sử cảm biến (phân trang, tìm kiếm)
  async getSensorHistory({ page = 1, pageSize = 10, search = '', sensorType = 'ALL' } = {}) {
    const query = new URLSearchParams({ page, pageSize, search, sensorType });
    const res = await fetch(`${API_BASE_URL}/datasensor/history?${query}`, {
      headers: { ...getAuthHeaders() }
    });
    return res.json();
  },

  // ==================== DEVICES API ====================
  // Lấy danh sách thiết bị và trạng thái hiện tại
  async getDevices() {
    const res = await fetch(`${API_BASE_URL}/devices`, {
      headers: { ...getAuthHeaders() }
    });
    return res.json();
  },

  // Điều khiển thiết bị (Bật/Tắt LED đơn lẻ hoặc Tất cả)
  async controlDevice({ dv_id, action }) {
    const res = await fetch(`${API_BASE_URL}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ dv_id, action })
    });
    const result = await res.json();
    if (!res.ok || result.status === 'error') {
      throw new Error(result.message || 'Lỗi khi điều khiển thiết bị');
    }
    return result;
  },

  // Lấy lịch sử thao tác điều khiển thiết bị
  async getActionHistory({ page = 1, pageSize = 10, device = 'ALL', action = 'ALL', status = 'ALL', timeRange = '', search = '' } = {}) {
    const query = new URLSearchParams({
      page,
      pageSize,
      device,
      action,
      status,
      timeRange: timeRange || search || '',
      search: search || timeRange || ''
    });
    const res = await fetch(`${API_BASE_URL}/action/history?${query}`, {
      headers: { ...getAuthHeaders() }
    });
    return res.json();
  }
};
