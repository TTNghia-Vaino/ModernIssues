import React from 'react';
import './AdminLoadingOverlay.css';

/**
 * AdminLoadingOverlay - Component hiển thị loading state
 * @param {boolean} loading - Đang loading không
 * @param {boolean} hasData - Có dữ liệu không (để quyết định hiển thị overlay hay inline)
 * @param {string} message - Message hiển thị khi loading
 * @param {React.ReactNode} children - Content chính
 */
const AdminLoadingOverlay = ({ 
  loading = false, 
  hasData = false,
  message = 'Đang tải...',
  children 
}) => {
  if (loading && !hasData) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminLoadingOverlay;

