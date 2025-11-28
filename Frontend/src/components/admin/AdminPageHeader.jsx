import React from 'react';
import { Plus } from 'lucide-react';

/**
 * AdminPageHeader - Header component cho các trang admin
 * @param {string} title - Tiêu đề trang
 * @param {string} subtitle - Mô tả phụ (optional)
 * @param {function} onAdd - Callback khi click nút thêm mới
 * @param {string} addButtonText - Text cho nút thêm mới
 * @param {boolean} showAddButton - Có hiển thị nút thêm mới không (default: true)
 * @param {React.ReactNode} extraActions - Các action buttons thêm (optional)
 */
const AdminPageHeader = ({ 
  title, 
  subtitle, 
  onAdd, 
  addButtonText = 'Thêm mới',
  showAddButton = true,
  extraActions 
}) => {
  return (
    <div className="page-header">
      <div className="page-titles">
        <h2>{title}</h2>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {extraActions}
        {showAddButton && onAdd && (
          <button onClick={onAdd} className="add-btn">
            <Plus className="w-4 h-4" />
            {addButtonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminPageHeader;

