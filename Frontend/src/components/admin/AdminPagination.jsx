import React from 'react';

/**
 * AdminPagination - Component pagination controls
 * @param {number} currentPage - Trang hiện tại
 * @param {number} totalPages - Tổng số trang
 * @param {number} pageSize - Số items mỗi trang
 * @param {number} totalItems - Tổng số items
 * @param {number} startIndex - Index bắt đầu (0-based)
 * @param {number} endIndex - Index kết thúc (0-based)
 * @param {function} onPageChange - Callback khi đổi trang: (page) => void
 * @param {function} onPageSizeChange - Callback khi đổi page size: (size) => void
 * @param {array} pageSizeOptions - Mảng các options cho page size (default: [10, 20, 50, 100])
 * @param {string} itemName - Tên item để hiển thị (default: 'items')
 */
const AdminPagination = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemName = 'items'
}) => {
  if (totalItems === 0) return null;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      onPageChange && onPageChange(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    onPageSizeChange && onPageSizeChange(newSize);
  };

  return (
    <div className="pagination-controls">
      <div className="pagination-info">
        Hiển thị {startIndex + 1}-{Math.min(endIndex, totalItems)} / {totalItems} {itemName}
      </div>
      
      <div className="pagination-buttons">
        <button 
          className="pg-btn"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
        >
          «
        </button>
        <button 
          className="pg-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </button>
        
        <span className="page-indicator">
          Trang {currentPage} / {totalPages || 1}
        </span>
        
        <button 
          className="pg-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          ›
        </button>
        <button 
          className="pg-btn"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage >= totalPages}
        >
          »
        </button>
      </div>
      
      {onPageSizeChange && (
        <div className="page-size-selector">
          <label>Hiển thị: </label>
          <select value={pageSize} onChange={handlePageSizeChange}>
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default AdminPagination;

