import React from 'react';

/**
 * AdminFiltersBar - Component thanh tìm kiếm và lọc
 * @param {string} searchValue - Giá trị search hiện tại
 * @param {function} onSearchChange - Callback khi search thay đổi
 * @param {string} searchPlaceholder - Placeholder cho ô search
 * @param {array} filters - Mảng các filter config: [{ key, value, onChange, options, label }]
 * @param {React.ReactNode} children - Custom filters (optional)
 */
const AdminFiltersBar = ({ 
  searchValue, 
  onSearchChange, 
  searchPlaceholder = '🔍 Tìm kiếm...',
  filters = [],
  children 
}) => {
  return (
    <div className="filters-bar">
      {onSearchChange && (
        <div className="filter-item search">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}
      
      {filters.map((filter, index) => (
        <div key={filter.key || index} className="filter-item">
          {filter.label && <label>{filter.label}</label>}
          <select 
            value={filter.value || 'all'} 
            onChange={(e) => filter.onChange && filter.onChange(e.target.value)}
            disabled={filter.disabled}
          >
            {filter.options && filter.options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      
      {children}
    </div>
  );
};

export default AdminFiltersBar;

