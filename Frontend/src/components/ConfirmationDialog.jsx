import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import './ConfirmationDialog.css';

const ConfirmationDialog = ({
  open,
  onOpenChange,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'default', // 'default', 'danger', 'warning'
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
      <DialogContent className={`confirmation-dialog confirmation-dialog-${variant}`}>
        <DialogHeader>
          <DialogTitle className="confirmation-dialog-title">{title}</DialogTitle>
          <DialogDescription className="confirmation-dialog-message">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="confirmation-dialog-footer">
          <button
            type="button"
            onClick={handleCancel}
            className="confirmation-dialog-btn confirmation-dialog-btn-cancel"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="confirmation-dialog-btn confirmation-dialog-btn-confirm"
          >
            {confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;




