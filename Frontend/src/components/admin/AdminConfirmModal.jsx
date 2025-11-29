import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import './AdminConfirmModal.css';

/**
 * AdminConfirmModal - Component modal xác nhận chung cho các hành động admin
 * @param {boolean} open - Modal có mở không
 * @param {function} onOpenChange - Callback khi đóng modal: (open) => void
 * @param {string} title - Tiêu đề modal (default: 'Xác nhận')
 * @param {string} message - Nội dung thông báo cần xác nhận
 * @param {string} confirmText - Text cho nút xác nhận (default: 'Xác nhận')
 * @param {string} cancelText - Text cho nút hủy (default: 'Hủy')
 * @param {function} onConfirm - Callback khi xác nhận
 * @param {function} onCancel - Callback khi hủy (optional)
 * @param {string} variant - Loại xác nhận: 'default' | 'danger' | 'warning' (default: 'default')
 * @param {boolean} loading - Đang loading không (disable buttons)
 */
const AdminConfirmModal = ({
  open,
  onOpenChange,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`admin-confirm-modal admin-confirm-modal-${variant} max-w-md`}>
        <DialogHeader className="admin-confirm-modal-header">
          <DialogTitle className="admin-confirm-modal-title">{title}</DialogTitle>
          {message && (
            <DialogDescription className="admin-confirm-modal-message">
              {message}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <DialogFooter className="admin-confirm-modal-footer">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="admin-confirm-btn-cancel"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={`admin-confirm-btn-confirm admin-confirm-btn-${variant}`}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminConfirmModal;

