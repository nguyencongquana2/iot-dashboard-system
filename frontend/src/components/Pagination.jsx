import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import './Pagination.css';

/**
 * Thuật toán sinh danh sách trang thu gọn dạng Sliding Window có dấu ba chấm (...)
 * Luôn đảm bảo tối đa 7 nút trang hiển thị, không bị tràn màn hình.
 */
function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Trường hợp gần đầu
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...right', totalPages];
  }

  // Trường hợp gần cuối
  if (currentPage >= totalPages - 3) {
    return [
      1,
      '...left',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages
    ];
  }

  // Trường hợp ở giữa
  return [
    1,
    '...left',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...right',
    totalPages
  ];
}

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange
}) => {
  if (!totalPages || totalPages <= 1) return null;

  const pageItems = getPaginationItems(currentPage, totalPages);

  const handlePageClick = (p) => {
    if (typeof p === 'number' && p !== currentPage && onPageChange) {
      onPageChange(p);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(totalPages);
    }
  };

  return (
    <nav className="pagination-nav" aria-label="Điều hướng phân trang">
      {/* Nút về trang đầu (<<) */}
      <button
        type="button"
        className="page-nav-btn page-nav-first"
        onClick={handleFirst}
        disabled={currentPage <= 1}
        title="Trang đầu (Trang 1)"
        aria-label="Về trang đầu"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Nút lùi 1 trang (<) */}
      <button
        type="button"
        className="page-nav-btn page-nav-prev"
        onClick={handlePrev}
        disabled={currentPage <= 1}
        title="Trang trước"
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Danh sách các số trang và dấu ba chấm */}
      <div className="page-numbers-group">
        {pageItems.map((item, index) => {
          if (typeof item === 'string') {
            return (
              <span
                key={`ellipsis-${item}-${index}`}
                className="page-ellipsis"
                aria-hidden="true"
              >
                &hellip;
              </span>
            );
          }

          const isActive = item === currentPage;
          return (
            <button
              key={`page-${item}`}
              type="button"
              className={`page-num ${isActive ? 'active' : ''}`}
              onClick={() => handlePageClick(item)}
              aria-current={isActive ? 'page' : undefined}
              title={`Trang ${item}`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Nút tiến 1 trang (>) */}
      <button
        type="button"
        className="page-nav-btn page-nav-next"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        title="Trang sau"
        aria-label="Trang sau"
      >
        <ChevronRight size={16} />
      </button>

      {/* Nút đến trang cuối (>>) */}
      <button
        type="button"
        className="page-nav-btn page-nav-last"
        onClick={handleLast}
        disabled={currentPage >= totalPages}
        title={`Trang cuối (Trang ${totalPages})`}
        aria-label="Đến trang cuối"
      >
        <ChevronsRight size={16} />
      </button>
    </nav>
  );
};
