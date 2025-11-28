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
import './AdminModal.css';

/**
 * AdminModal - Component modal/dialog wrapper cho các form admin
 * @param {boolean} open - Modal có mở không
 * @param {function} onOpenChange - Callback khi đóng modal: (open) => void
 * @param {string} title - Tiêu đề modal
 * @param {string} description - Mô tả modal (optional)
 * @param {React.ReactNode} children - Content của modal
 * @param {function} onCancel - Callback khi click hủy (optional)
 * @param {function} onSubmit - Callback khi submit (optional)
 * @param {string} submitLabel - Label cho nút submit (default: 'Lưu')
 * @param {string} cancelLabel - Label cho nút cancel (default: 'Hủy')
 * @param {boolean} loading - Đang loading không (disable buttons)
 * @param {string} size - Size của modal: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' (default: 'lg')
 * @param {string} className - Custom className cho DialogContent
 * @param {React.ReactNode} footer - Custom footer (optional, sẽ override default footer)
 */
const AdminModal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  onCancel,
  onSubmit,
  submitLabel = 'Lưu',
  cancelLabel = 'Hủy',
  loading = false,
  size = 'lg',
  className = '',
  footer
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange && onOpenChange(false);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size] || sizeClasses.lg} max-h-[90vh] overflow-hidden flex flex-col admin-modal-content ${className}`}>
        <DialogHeader className="flex-shrink-0 admin-modal-header">
          <DialogTitle className="admin-modal-title">{title}</DialogTitle>
          {description && <DialogDescription className="admin-modal-description">{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="admin-modal-body space-y-4 py-4 overflow-y-auto flex-1">
          {children}
        </div>
        
        {footer !== undefined ? (
          footer
        ) : (
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            {onSubmit && (
              <Button 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : submitLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminModal;

