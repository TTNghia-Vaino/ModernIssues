import React from 'react';
import './AdminDataTable.css';

/**
 * AdminDataTable - Component table hiển thị dữ liệu
 * @param {array} columns - Mảng config columns: [{ key, label, className, render }]
 * @param {array} data - Mảng dữ liệu
 * @param {function} renderRow - Function render custom row (optional)
 * @param {function} onRowClick - Callback khi click vào row (optional)
 * @param {boolean} loading - Đang loading không
 * @param {number} totalItems - Tổng số items (để hiển thị empty state)
 * @param {string} emptyMessage - Message khi không có dữ liệu
 * @param {string} noResultsMessage - Message khi filter không có kết quả
 * @param {React.ReactNode} expandedContent - Content hiển thị khi row expanded (optional)
 * @param {string|number} expandedRowId - ID của row đang expanded (optional)
 * @param {string} tableClassName - Custom class cho table
 */
const AdminDataTable = ({
  columns = [],
  data = [],
  renderRow,
  onRowClick,
  loading = false,
  totalItems = 0,
  emptyMessage = 'Chưa có dữ liệu nào.',
  noResultsMessage = 'Không tìm thấy dữ liệu nào phù hợp với bộ lọc.',
  expandedContent,
  expandedRowId,
  tableClassName = ''
}) => {
  // Nếu có renderRow custom, dùng nó
  if (renderRow) {
    return (
      <div className="data-table-container">
        {loading && data.length > 0 ? (
          <div className="loading-overlay-inline">
            <div className="spinner"></div>
            <p>Đang cập nhật...</p>
          </div>
        ) : data.length > 0 ? (
          <div className={`data-table ${tableClassName}`}>
            {columns.length > 0 && (
              <div className="table-header">
                {columns.map((col) => (
                  <div key={col.key} className={col.className || `col-${col.key}`}>
                    {col.label}
                  </div>
                ))}
              </div>
            )}
            {data.map((item, index) => {
              const itemId = item.id || index;
              const isExpanded = expandedRowId !== undefined && expandedRowId === itemId;
              return (
                <React.Fragment key={itemId}>
                  {renderRow(item, index)}
                  {isExpanded && expandedContent && (
                    <div className="expanded-row">
                      <div className="expanded-content">
                        {typeof expandedContent === 'function' ? expandedContent(item) : expandedContent}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="no-results">
            <p>{totalItems === 0 ? emptyMessage : noResultsMessage}</p>
          </div>
        )}
      </div>
    );
  }

  // Render table với columns config
  return (
    <div className="data-table-container">
      {loading && data.length > 0 ? (
        <div className="loading-overlay-inline">
          <div className="spinner"></div>
          <p>Đang cập nhật...</p>
        </div>
      ) : data.length > 0 ? (
        <div className={`data-table ${tableClassName}`}>
          <div className="table-header">
            {columns.map((col) => (
              <div key={col.key} className={col.className || `col-${col.key}`}>
                {col.label}
              </div>
            ))}
          </div>
          {data.map((item, index) => (
            <React.Fragment key={item.id || index}>
              <div 
                className="table-row"
                onClick={() => onRowClick && onRowClick(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <div key={col.key} className={col.className || `col-${col.key}`}>
                    {col.render ? col.render(item) : item[col.key] || '-'}
                  </div>
                ))}
              </div>
              {expandedRowId !== undefined && expandedRowId === (item.id || index) && expandedContent && (
                <div className="expanded-row">
                  <div className="expanded-content">
                    {typeof expandedContent === 'function' ? expandedContent(item) : expandedContent}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p>{totalItems === 0 ? emptyMessage : noResultsMessage}</p>
        </div>
      )}
    </div>
  );
};

export default AdminDataTable;

