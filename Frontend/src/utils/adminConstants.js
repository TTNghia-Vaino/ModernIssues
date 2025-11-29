import { 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Power,
  PowerOff
} from 'lucide-react';

/**
 * Admin Icons - Đồng bộ icon cho tất cả các trang admin
 */
export const AdminIcons = {
  // Actions
  edit: Edit,
  delete: Trash2,
  view: Eye,
  activate: CheckCircle,
  deactivate: XCircle,
  reset: RotateCcw,
  powerOn: Power,
  powerOff: PowerOff,
};

/**
 * Admin Status Colors - Đồng bộ màu cho trạng thái
 */
export const AdminStatusColors = {
  // Active/Hoạt động
  active: {
    background: '#e8f5e9',
    color: '#2e7d32',
    border: '#c8e6c9',
    dot: '#2e7d32'
  },
  // Inactive/Disabled/Vô hiệu hóa
  inactive: {
    background: '#ffebee',
    color: '#c62828',
    border: '#ffcdd2',
    dot: '#c62828'
  },
  // Disabled/Ngừng bán
  disabled: {
    background: '#ffebee',
    color: '#c62828',
    border: '#ffcdd2',
    dot: '#c62828'
  },
  // Pending/Chờ xử lý
  pending: {
    background: '#fff3e0',
    color: '#e65100',
    border: '#ffe0b2',
    dot: '#e65100'
  },
  // Processing/Đang xử lý
  processing: {
    background: '#e3f2fd',
    color: '#1976d2',
    border: '#bbdefb',
    dot: '#1976d2'
  },
  // Out of stock/Hết hàng
  outOfStock: {
    background: '#fce4ec',
    color: '#c2185b',
    border: '#f8bbd0',
    dot: '#c2185b'
  },
  // Expired/Đã hết hạn
  expired: {
    background: '#f5f5f5',
    color: '#757575',
    border: '#e0e0e0',
    dot: '#757575'
  }
};

/**
 * Admin Action Labels - Đồng bộ label cho actions
 */
export const AdminActionLabels = {
  edit: 'Chỉnh sửa',
  delete: 'Xóa',
  view: 'Chi tiết',
  activate: 'Kích hoạt',
  deactivate: 'Vô hiệu hóa',
  disable: 'Ngừng bán',
  enable: 'Kích hoạt lại',
  reset: 'Đặt lại'
};

