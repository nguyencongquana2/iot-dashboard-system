import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';
import { PageSizeSelector } from './PageSizeSelector';
import { Pagination } from './Pagination';
import './DataSensor.css';

export const DataSensor = () => {
  const [data, setData] = useState([]);
  const [pageInfo, setPageInfo] = useState({ current_page: 1, total_pages: 1, total_elements: 0, page_size: 10 });
  const [searchQuery, setSearchQuery] = useState('');
  const [sensorType, setSensorType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchData = async (page = currentPage, size = pageSize, filters = {}) => {
    setLoading(true);
    const validSize = Number(size) > 0 ? Number(size) : 10;
    const type = filters.sensorType !== undefined ? filters.sensorType : sensorType;
    const search = filters.search !== undefined ? filters.search : searchQuery;
    try {
      const res = await apiService.getSensorHistory({
        page,
        pageSize: validSize,
        search,
        sensorType: type
      });
      if (res && res.data) {
        setData(res.data.content);
        setPageInfo(res.data.page_info);
      }
    } catch (err) {
      console.error('Error fetching sensor history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData(1, pageSize);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const handleSensorTypeChange = (e) => {
    const nextType = e.target.value;
    setSensorType(nextType);
    setCurrentPage(1);
    fetchData(1, pageSize, { sensorType: nextType });
  };

  return (
    <div className="datasensor-page">
      {/* Page Title */}
      <div className="page-header">
        <h1 className="page-title">Data Sensor</h1>
      </div>

      {/* Filter / Search Bar matching GiaoDienDataSensor.png with Thời gian in dropdown */}
      <form className="filter-card" onSubmit={handleSearchSubmit}>
        <div className="search-input-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder={
              sensorType === 'Time' 
                ? 'Nhập thời gian tìm kiếm (VD: 2024-01-15 hoặc 21:00)' 
                : 'Nhập giá trị tìm kiếm'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="select-box">
          <select 
            className="filter-select"
            value={sensorType}
            onChange={handleSensorTypeChange}
          >
            <option value="ALL">Tất cả</option>
            <option value="Temperature">Temperature</option>
            <option value="Humidity">Humidity</option>
            <option value="Light">Light</option>
            <option value="Time">Thời gian</option>
          </select>
          <ChevronDown size={15} className="select-arrow" />
        </div>

        <button type="submit" className="btn btn-cyan search-btn">
          <Search size={16} />
          <span>Tìm kiếm</span>
        </button>
      </form>

      {/* Table Container matching GiaoDienDataSensor.png */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Sensor type</th>
                <th>Value</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-8">
                    <div className="loading-state">
                      <Loader2 size={24} className="animate-spin text-cyan" />
                      <span>Đang tải dữ liệu cảm biến...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 no-data">
                    Không tìm thấy bản ghi dữ liệu cảm biến phù hợp
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td className="td-id">{row.id}</td>
                    <td className="td-type">
                      <span className={`sensor-tag tag-${row.sensorType.toLowerCase()}`}>
                        {row.sensorType}
                      </span>
                    </td>
                    <td className="td-value">{row.value}</td>
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
            Search / Filter / Sort / Pagination (Tổng: {pageInfo.total_elements} bản ghi)
          </span>

          <div className="table-footer-controls">
            <PageSizeSelector
              value={pageSize}
              onChange={handlePageSizeChange}
              options={[10, 15, 20, 30, 40, 50]}
              label="Số dòng mỗi trang"
            />

            <Pagination
              currentPage={currentPage}
              totalPages={pageInfo.total_pages || 1}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
