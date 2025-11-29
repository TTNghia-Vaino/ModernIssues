import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import * as warrantyService from '../services/warrantyService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Upload, X, ArrowLeft } from 'lucide-react';
import './UserWarrantyRequest.css';

const UserWarrantyRequest = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    warrantyId: '',
    description: '',
    notes: '',
  });
  
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Load user's warranties
  useEffect(() => {
    loadWarranties();
  }, []);

  const loadWarranties = async () => {
    try {
      setLoading(true);
      const data = await warrantyService.getMyWarranties();
      setWarranties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[UserWarrantyRequest] Error loading warranties:', err);
      showError(err.message || 'Không thể tải danh sách bảo hành');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    const validFiles = [];
    const invalidFiles = [];
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name}: Không phải file ảnh`);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: Kích thước vượt quá 5MB`);
        return;
      }
      
      validFiles.push(file);
    });
    
    if (invalidFiles.length > 0) {
      showError(invalidFiles.join(', '));
    }
    
    if (validFiles.length > 0) {
      const newFiles = [...imageFiles, ...validFiles];
      setImageFiles(newFiles);
      
      // Create previews
      const newPreviews = [];
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result);
          if (newPreviews.length === validFiles.length) {
            setImagePreviews([...imagePreviews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index) => {
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.warrantyId) {
      showError('Vui lòng chọn sản phẩm cần bảo hành');
      return;
    }
    
    if (!formData.description || formData.description.trim() === '') {
      showError('Vui lòng mô tả vấn đề/lỗi của sản phẩm');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare claim data
      const claimData = {
        WarrantyId: parseInt(formData.warrantyId),
        Description: formData.description.trim(),
        Notes: formData.notes?.trim() || null,
        ImageUrls: null // Will be set after uploading images
      };
      
      // Upload images if any, then create claim
      await warrantyService.createWarrantyClaim(claimData, imageFiles);
      
      success('Tạo yêu cầu bảo hành thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.');
      
      // Reset form
      setFormData({
        warrantyId: '',
        description: '',
        notes: '',
      });
      setImageFiles([]);
      setImagePreviews([]);
      
      // Navigate back or reload warranties
      setTimeout(() => {
        navigate('/profile?tab=warranty');
      }, 1500);
      
    } catch (err) {
      console.error('[UserWarrantyRequest] Error creating claim:', err);
      showError(err.message || 'Không thể tạo yêu cầu bảo hành. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter warranties that are still valid (not expired)
  const validWarranties = warranties.filter(w => !w.isExpired && w.status === 'active');

  return (
    <div className="user-warranty-request-page">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Tạo yêu cầu bảo hành</CardTitle>
            <CardDescription>
              Điền thông tin để tạo yêu cầu bảo hành cho sản phẩm của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Select Warranty */}
              <div className="space-y-2">
                <Label htmlFor="warrantyId">Chọn sản phẩm cần bảo hành *</Label>
                <Select
                  value={formData.warrantyId}
                  onValueChange={(value) => setFormData({ ...formData, warrantyId: value })}
                  disabled={loading || submitting}
                >
                  <SelectTrigger id="warrantyId">
                    <SelectValue placeholder="Chọn sản phẩm..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validWarranties.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500 text-center">
                        {loading ? 'Đang tải...' : 'Không có sản phẩm nào còn bảo hành'}
                      </div>
                    ) : (
                      validWarranties.map((warranty) => (
                        <SelectItem key={warranty.warrantyId} value={String(warranty.warrantyId)}>
                          {warranty.productName} - Serial: {warranty.serialNumber}
                          {warranty.daysRemaining && ` (Còn ${warranty.daysRemaining} ngày)`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {validWarranties.length === 0 && !loading && (
                  <p className="text-sm text-gray-500 mt-1">
                    Bạn chưa có sản phẩm nào còn trong thời hạn bảo hành.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả vấn đề/lỗi *</Label>
                <Textarea
                  id="description"
                  placeholder="Vui lòng mô tả chi tiết vấn đề hoặc lỗi mà sản phẩm đang gặp phải..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  disabled={submitting}
                  required
                />
                <p className="text-sm text-gray-500">
                  Mô tả càng chi tiết càng tốt để chúng tôi có thể hỗ trợ bạn nhanh chóng.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú thêm (tùy chọn)</Label>
                <Textarea
                  id="notes"
                  placeholder="Thông tin bổ sung, yêu cầu đặc biệt..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  disabled={submitting}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Ảnh minh chứng (tùy chọn)</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Upload ảnh mô tả tình trạng sản phẩm (ví dụ: vỡ màn hình, đen màn, v.v.)
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={submitting}
                    className="hidden"
                  />
                  <label
                    htmlFor="images"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Upload className={`w-8 h-8 ${submitting ? 'text-gray-300' : 'text-gray-400'}`} />
                    <span className={`text-sm ${submitting ? 'text-gray-400' : 'text-gray-600'}`}>
                      Click để tải lên ảnh (tối đa 5MB/ảnh, có thể chọn nhiều ảnh)
                    </span>
                  </label>
                </div>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                          onClick={() => removeImage(index)}
                          disabled={submitting}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                          Ảnh {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={submitting || validWarranties.length === 0}
                  className="flex-1"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu bảo hành'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserWarrantyRequest;

