import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';
import { PageSizeSelector } from './PageSizeSelector';
import './ActionHistory.css';

export const ActionHistory = () => {
  const [data, setData] = useState([]);
  const [pageInfo, setPageInfo] = useState({ current_page: 1, total_pages: 1, total_elements: 0, page_size: 10 });

  // Filters matching GiaoDienActionHistory.png
  const [timeRange, setTimeRange] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchData = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    const validSize = Number(size) > 0 ? Number(size) : 10;
    try {
      const res = await apiService.getActionHistory({
        page,
        pageSize: validSize,
        device: selectedDevice,
        action: selectedAction,
        status: selectedStatus,
        timeRange: timeRange
      });
      if (res && res.data) {
        setData(res.data.content);
        setPageInfo(res.data.page_info);
      }
    } catch (err) {
      console.error('Error fetching action history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData(1, pageSize);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  return (
    <div className="actionhistory-page">
      {/* Page Title */}
      <div className="page-header">
        <h1 className="page-title">Action History</h1>
      </div>

      {/* Filter Row matching GiaoDienActionHistory.png */}
      <form className="action-filter-card" onSubmit={handleFilterSubmit}>
        {/* Time range selector */}
        <div className="filter-item-box time-box">
          <input
            type="text"
            className="filter-input-action"
            placeholder="29/09/2025 21:00 - 21:16"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          />
        </div>

        {/* Device selector */}
        <div className="filter-item-box select-box">
          <select
            className="filter-select-action"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            <option value="ALL">Tất cả thiết bị</option>
            <option value="LED 1">LED 1</option>
            <option value="LED 2">LED 2</option>
            <option value="LED 3">LED 3</option>
          </select>
          <ChevronDown size={14} className="select-arrow" />
        </div>

        {/* Action selector */}
        <div className="filter-item-box select-box">
          <select
            className="filter-select-action"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="ON">ON</option>
            <option value="OFF">OFF</option>
          </select>
          <ChevronDown size={14} className="select-arrow" />
        </div>

        {/* Status selector */}
        <div className="filter-item-box select-box">
          <select
            className="filter-select-action"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="LOADING">LOADING</option>
          </select>
          <ChevronDown size={14} className="select-arrow" />
        </div>

        <button type="submit" className="btn btn-cyan search-btn">
          <Search size={16} />
          <span>Tìm kiếm</span>
        </button>
      </form>

      {/* Table Card matching GiaoDienActionHistory.png */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Device</th>
                <th>User</th>
                <th>Action</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="loading-state">
                      <Loader2 size={24} className="animate-spin text-cyan" />
                      <span>Đang tải lịch sử điều khiển thiết bị...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 no-data">
                    Không tìm thấy bản ghi lịch sử phù hợp
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td className="td-id">{row.id}</td>
                    <td className="td-device">{row.device}</td>
                    <td className="td-user">{row.user}</td>
                    <td className={`td-action ${row.action === 'ON' ? 'text-action-on' : 'text-action-off'}`}>
                      {row.action}
                    </td>
                    <td className="td-status">
                      <span className={`status-pill pill-${row.status.toLowerCase()}`}>
                        <span className="pill-dot" />
                        <span>{row.status}</span>
                      </span>
                    </td>
                    <td className="td-time">{row.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with summary, page size input, and pagination */}
        <div className="table-footer">
          <span className="table-summary">
            Showing {data.length} of {pageInfo.total_elements} records
          </span>

          <div className="table-footer-controls">
            <PageSizeSelector
              value={pageSize}
              onChange={handlePageSizeChange}
              options={[10, 15, 20, 30, 40, 50]}
              label="Số dòng mỗi trang"
            />

            <div className="pagination-bar">
              {Array.from({ length: pageInfo.total_pages || 1 }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-num ${p === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
