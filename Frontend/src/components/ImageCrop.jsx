import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ImageCrop.css';

/**
 * ImageCrop Component
 * Component để cắt ảnh theo kích thước yêu cầu
 * Có thể điều chỉnh vị trí và kích thước crop area
 * @param {string} imageSrc - URL của ảnh cần cắt
 * @param {number} targetWidth - Chiều rộng mục tiêu
 * @param {number} targetHeight - Chiều cao mục tiêu
 * @param {function} onCrop - Callback khi cắt xong (nhận file đã cắt)
 * @param {function} onCancel - Callback khi hủy
 */
const ImageCrop = ({ imageSrc, targetWidth, targetHeight, onCrop, onCancel }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'tl', 'tr', 'bl', 'br', 'move'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setImageLoaded(true);
        
        // Tính toán scale để fit container
        const containerWidth = containerRef.current?.clientWidth || 800;
        const containerHeight = containerRef.current?.clientHeight || 600;
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const minScale = Math.min(scaleX, scaleY, 0.8); // Giữ lại một chút margin
        setScale(minScale);
        
        // Tính toán crop area ban đầu (center, với kích thước target)
        const displayWidth = img.width * minScale;
        const displayHeight = img.height * minScale;
        const cropWidth = Math.min(targetWidth * minScale, displayWidth);
        const cropHeight = Math.min(targetHeight * minScale, displayHeight);
        
        setCropArea({
          x: (displayWidth - cropWidth) / 2,
          y: (displayHeight - cropHeight) / 2,
          width: cropWidth,
          height: cropHeight
        });
      };
      img.src = imageSrc;
    }
  }, [imageSrc, targetWidth, targetHeight]);

  const getMousePos = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleHandleMouseDown = (e, handle) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    const pos = getMousePos(e);
    setDragStart({
      x: pos.x - cropArea.x,
      y: pos.y - cropArea.y,
      startCrop: { ...cropArea }
    });
  };

  const handleCropAreaMouseDown = (e) => {
    if (e.target.classList.contains('crop-handle')) return;
    setIsDragging(true);
    setResizeHandle('move');
    const pos = getMousePos(e);
    setDragStart({
      x: pos.x - cropArea.x,
      y: pos.y - cropArea.y
    });
  };

  const handleMouseMove = (e) => {
    if (!imageLoaded) return;
    
    const pos = getMousePos(e);
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;
    const aspectRatio = targetWidth / targetHeight;
    
    if (isResizing && resizeHandle) {
      // Resize logic - giữ đúng tỷ lệ khung hình
      let newCrop = { ...cropArea };
      
      if (resizeHandle === 'br') {
        // Resize từ góc dưới bên phải
        const deltaX = pos.x - (cropArea.x + cropArea.width);
        const deltaY = pos.y - (cropArea.y + cropArea.height);
        const delta = Math.max(deltaX, deltaY * aspectRatio);
        const newWidth = cropArea.width + delta;
        const newHeight = newWidth / aspectRatio;
        
        if (cropArea.x + newWidth <= displayWidth && cropArea.y + newHeight <= displayHeight) {
          newCrop = {
            ...cropArea,
            width: newWidth,
            height: newHeight
          };
        }
      } else if (resizeHandle === 'tl') {
        // Resize từ góc trên bên trái
        const deltaX = cropArea.x - pos.x;
        const deltaY = cropArea.y - pos.y;
        const delta = Math.max(deltaX, deltaY * aspectRatio);
        const newWidth = cropArea.width + delta;
        const newHeight = newWidth / aspectRatio;
        const newX = cropArea.x - (newWidth - cropArea.width);
        const newY = cropArea.y - (newHeight - cropArea.height);
        
        if (newX >= 0 && newY >= 0) {
          newCrop = {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          };
        }
      } else if (resizeHandle === 'tr') {
        // Resize từ góc trên bên phải
        const deltaX = pos.x - (cropArea.x + cropArea.width);
        const deltaY = cropArea.y - pos.y;
        const delta = Math.max(deltaX, deltaY * aspectRatio);
        const newWidth = cropArea.width + delta;
        const newHeight = newWidth / aspectRatio;
        const newY = cropArea.y - (newHeight - cropArea.height);
        
        if (cropArea.x + newWidth <= displayWidth && newY >= 0) {
          newCrop = {
            x: cropArea.x,
            y: newY,
            width: newWidth,
            height: newHeight
          };
        }
      } else if (resizeHandle === 'bl') {
        // Resize từ góc dưới bên trái
        const deltaX = cropArea.x - pos.x;
        const deltaY = pos.y - (cropArea.y + cropArea.height);
        const delta = Math.max(deltaX, deltaY * aspectRatio);
        const newWidth = cropArea.width + delta;
        const newHeight = newWidth / aspectRatio;
        const newX = cropArea.x - (newWidth - cropArea.width);
        
        if (newX >= 0 && cropArea.y + newHeight <= displayHeight) {
          newCrop = {
            x: newX,
            y: cropArea.y,
            width: newWidth,
            height: newHeight
          };
        }
      }
      
      // Giới hạn trong phạm vi ảnh và đảm bảo kích thước tối thiểu
      const minWidth = targetWidth * scale * 0.3;
      const minHeight = targetHeight * scale * 0.3;
      
      if (newCrop.width >= minWidth && newCrop.height >= minHeight) {
        newCrop.x = Math.max(0, Math.min(newCrop.x, displayWidth - newCrop.width));
        newCrop.y = Math.max(0, Math.min(newCrop.y, displayHeight - newCrop.height));
        newCrop.width = Math.min(newCrop.width, displayWidth - newCrop.x);
        newCrop.height = Math.min(newCrop.height, displayHeight - newCrop.y);
        setCropArea(newCrop);
      }
    } else if (isDragging && resizeHandle === 'move') {
      // Move logic - chỉ di chuyển, không thay đổi kích thước
      let newX = pos.x - dragStart.x;
      let newY = pos.y - dragStart.y;
      
      // Giới hạn trong phạm vi ảnh
      newX = Math.max(0, Math.min(newX, displayWidth - cropArea.width));
      newY = Math.max(0, Math.min(newY, displayHeight - cropArea.height));
      
      setCropArea(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, cropArea, imageSize, scale, dragStart, resizeHandle]);

  const handleCrop = () => {
    if (!imageLoaded || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to target size
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Load image
    const img = new Image();
    img.onload = () => {
      // Calculate source coordinates from crop area
      const sourceX = cropArea.x / scale;
      const sourceY = cropArea.y / scale;
      const sourceWidth = cropArea.width / scale;
      const sourceHeight = cropArea.height / scale;
      
      // Draw cropped image to canvas
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetWidth, targetHeight
      );
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'banner.jpg', { type: 'image/jpeg' });
          onCrop(file);
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = imageSrc;
  };

  const displayWidth = imageSize.width * scale;
  const displayHeight = imageSize.height * scale;

  // Render modal content using Portal to ensure it's above all other modals
  // Block all interactions when crop modal is open
  const modalContent = (
    <div 
      className="image-crop-modal"
      onClick={(e) => {
        // Prevent clicks from propagating to elements behind
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Prevent mouse events from propagating
        e.stopPropagation();
      }}
    >
      <div 
        className="image-crop-overlay" 
        onClick={onCancel}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <div className="image-crop-container">
        <div className="image-crop-header">
          <div>
            <h3>Cắt ảnh banner</h3>
            <p>Kích thước yêu cầu: {targetWidth} x {targetHeight}px</p>
            <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
              💡 Kéo khung để di chuyển, kéo góc để điều chỉnh kích thước
            </p>
          </div>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        
        <div className="image-crop-content">
          <div 
            ref={containerRef}
            className="image-crop-preview"
          >
            {imageLoaded && (
              <>
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    display: 'block'
                  }}
                />
                <div
                  className="crop-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                  }}
                >
                  <div
                    className="crop-area"
                    style={{
                      left: `${cropArea.x}px`,
                      top: `${cropArea.y}px`,
                      width: `${cropArea.width}px`,
                      height: `${cropArea.height}px`,
                      cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleCropAreaMouseDown}
                  >
                    <div 
                      className="crop-handle crop-handle-tl" 
                      onMouseDown={(e) => handleHandleMouseDown(e, 'tl')}
                      style={{ cursor: 'nwse-resize' }}
                    />
                    <div 
                      className="crop-handle crop-handle-tr"
                      onMouseDown={(e) => handleHandleMouseDown(e, 'tr')}
                      style={{ cursor: 'nesw-resize' }}
                    />
                    <div 
                      className="crop-handle crop-handle-bl"
                      onMouseDown={(e) => handleHandleMouseDown(e, 'bl')}
                      style={{ cursor: 'nesw-resize' }}
                    />
                    <div 
                      className="crop-handle crop-handle-br"
                      onMouseDown={(e) => handleHandleMouseDown(e, 'br')}
                      style={{ cursor: 'nwse-resize' }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        
        <div className="image-crop-footer">
          <button className="btn-cancel" onClick={onCancel}>Hủy</button>
          <button className="btn-crop" onClick={handleCrop}>Cắt ảnh</button>
        </div>
      </div>
    </div>
  );

  // Use Portal to render directly to document.body, ensuring it's above all other modals
  return createPortal(modalContent, document.body);
};

export default ImageCrop;
