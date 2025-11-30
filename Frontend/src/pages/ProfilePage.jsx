import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as userService from '../services/userService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { User, Lock, Mail, Phone, Shield, Upload, X, CheckCircle } from 'lucide-react';
import { getBaseURL } from '../config/api';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { success, error: showError } = useNotification();
  
  // Get tab from URL query params
  const getTabFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['info', 'password', 'email', 'phone', '2fa'].includes(tab)) {
      return tab;
    }
    return 'info';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromUrl());
  
  // Update activeTab when URL changes
  useEffect(() => {
    const tab = getTabFromUrl();
    setActiveTab(tab);
  }, [location.search]);
  const [loading, setLoading] = useState(false);
  
  // User profile data
  const [profileData, setProfileData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    address: '',
    avatarUrl: null,
    confirmPassword: '', // Mật khẩu xác nhận khi chỉnh sửa
  });
  
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Email change
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmPassword: '',
    otpCode: '',
  });
  const [emailStep, setEmailStep] = useState('input'); // 'input' | 'otp'
  const [, setEmailOtpSent] = useState(false);
  
  // Phone change
  const [phoneData, setPhoneData] = useState({
    newPhone: '',
    confirmPassword: '',
  });
  
  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // Avatar upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  

  // Load user profile
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await userService.getCurrentUser();
        
        // API returns: { success, message, data: { userId, username, email, phone, address, avatarUrl, ... } }
        // userService.getCurrentUser() should return the data object directly
        if (import.meta.env.DEV) {
          console.log('[ProfilePage] Profile data received:', profile);
        }
        
        setProfileData(profile);
        
        // Extract emailConfirmed status (explicitly check for true)
        setEmailConfirmed(profile?.emailConfirmed === true);
        
        // Extract twoFactorEnabled status from profile data
        setTwoFactorEnabled(profile?.twoFactorEnabled === true);
        
        // Extract fields directly from profile (API structure: data object with phone, address, avatarUrl)
        const username = profile?.username || profile?.name || user?.name || '';
        const email = profile?.email || user?.email || '';
        const phone = profile?.phone || user?.phone || '';
        const address = profile?.address || user?.address || '';
        const avatar = profile?.avatarUrl || profile?.avatar || user?.avatar || null;
        
        if (import.meta.env.DEV) {
          console.log('[ProfilePage] Extracted values:', { username, email, phone, address, avatar, twoFactorEnabled: profile?.twoFactorEnabled });
        }
        
        setFormData({
          username,
          email,
          phone,
          address,
          avatarUrl: avatar,
          confirmPassword: '',
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        showError(err.message || 'Không thể tải thông tin cá nhân');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [isAuthenticated, showError]);


  // Load 2FA status (fallback if not available in profileData)
  useEffect(() => {
    if (!isAuthenticated || activeTab !== '2fa') return;
    
    // If twoFactorEnabled is already set from profileData, skip API call
    if (profileData?.twoFactorEnabled !== undefined) {
      return;
    }
    
    const load2FA = async () => {
      try {
        const status = await userService.get2FAStatus();
        setTwoFactorEnabled(status.enabled || false);
      } catch (err) {
        console.error('Error loading 2FA:', err);
      }
    };
    
    load2FA();
  }, [isAuthenticated, activeTab, profileData]);
  
  // Get user ID from profileData or user context
  const getUserId = () => {
    return profileData?.id || profileData?.userId || user?.id;
  };

  // Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    const userId = getUserId();
    if (!userId) return;
    
    if (!formData.confirmPassword) {
      showError('Vui lòng nhập mật khẩu để xác nhận thay đổi');
      return;
    }
    
    try {
      setLoading(true);
      const updateData = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        confirmPassword: formData.confirmPassword,
      };
      
      const updated = await userService.updateUserProfile(userId, updateData, avatarFile);
      setProfileData(updated);
      if (updated.avatarUrl) {
        setFormData(prev => ({ ...prev, avatarUrl: updated.avatarUrl, confirmPassword: '' }));
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditingProfile(false);
      // Refresh user context to sync avatar
      await refreshUser();
      success('Cập nhật thông tin thành công');
    } catch (err) {
      showError(err.message || 'Không thể cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  // Handle save avatar only
  const handleSaveAvatar = async () => {
    const userId = getUserId();
    if (!userId || !avatarFile) return;
    
    if (!formData.confirmPassword) {
      showError('Vui lòng nhập mật khẩu để xác nhận thay đổi');
      return;
    }
    
    try {
      setLoading(true);
      const updateData = {
        username: profileData?.username || profileData?.name || '',
        email: profileData?.email || '',
        phone: profileData?.phone || '',
        address: profileData?.address || '',
        confirmPassword: formData.confirmPassword,
      };
      
      const updated = await userService.updateUserProfile(userId, updateData, avatarFile);
      setProfileData(updated);
      if (updated.avatarUrl) {
        setFormData(prev => ({ ...prev, avatarUrl: updated.avatarUrl, confirmPassword: '' }));
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      // Refresh user context to sync avatar
      await refreshUser();
      success('Cập nhật ảnh đại diện thành công');
    } catch (err) {
      showError(err.message || 'Không thể cập nhật ảnh đại diện');
    } finally {
      setLoading(false);
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    try {
      setLoading(true);
      await userService.changePassword(passwordData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('Đổi mật khẩu thành công');
    } catch (err) {
      showError(err.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  // Handle send email OTP
  const handleSendEmailOtp = async () => {
    try {
      setLoading(true);
      await userService.sendEmailOtp({
        newEmail: emailData.newEmail,
        confirmPassword: emailData.confirmPassword,
      });
      setEmailOtpSent(true);
      setEmailStep('otp');
      success('Đã gửi mã OTP đến email hiện tại. Vui lòng kiểm tra email.');
    } catch (err) {
      showError(err.message || 'Không thể gửi mã OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle change email
  const handleChangeEmail = async () => {
    try {
      setLoading(true);
      const updated = await userService.changeEmail({
        newEmail: emailData.newEmail,
        confirmPassword: emailData.confirmPassword,
        otpCode: emailData.otpCode,
      });
      setProfileData(updated);
      setFormData(prev => ({ ...prev, email: updated.email }));
      setEmailData({ newEmail: '', confirmPassword: '', otpCode: '' });
      setEmailStep('input');
      setEmailOtpSent(false);
      success('Đổi email thành công');
    } catch (err) {
      showError(err.message || 'Không thể đổi email');
    } finally {
      setLoading(false);
    }
  };

  // Handle change phone
  const handleChangePhone = async () => {
    try {
      setLoading(true);
      const updated = await userService.changePhone(phoneData);
      setProfileData(updated);
      setFormData(prev => ({ ...prev, phone: updated.phone }));
      setPhoneData({ newPhone: '', confirmPassword: '' });
      success('Đổi số điện thoại thành công');
    } catch (err) {
      showError(err.message || 'Không thể đổi số điện thoại');
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA toggle
  const handleToggle2FA = async (enabled) => {
    try {
      setLoading(true);
      const updated = await userService.update2FA({
        enabled,
        method: 'Email',
      });
      setTwoFactorEnabled(updated.enabled);
      success(enabled ? 'Bật 2FA thành công' : 'Tắt 2FA thành công');
    } catch (err) {
      showError(err.message || 'Không thể cập nhật 2FA');
      setTwoFactorEnabled(!enabled); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  // Build avatar URL with useMemo to avoid re-renders
  const avatarUrl = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    
    // Priority: formData.avatarUrl > profileData.avatarUrl > user.avatar
    // API returns avatarUrl as filename (e.g., "Screenshot2025-08-12163453_20251129_074815_7973.png")
    const avatarPath = formData.avatarUrl || profileData?.avatarUrl || profileData?.avatar || user?.avatar;
    
    if (avatarPath && avatarPath !== 'null' && avatarPath !== 'undefined' && avatarPath !== '') {
      // If already a full URL, return as is
      if (typeof avatarPath === 'string' && (avatarPath.startsWith('http://') || avatarPath.startsWith('https://'))) {
        return avatarPath;
      }
      
      // Normalize URL using backend domain
      const baseUrl = getBaseURL() || 'http://35.232.61.38:5000';
      const cleanBaseUrl = baseUrl.replace(/\/v1$/, '').replace(/\/$/, '');
      return `${cleanBaseUrl}/Uploads/Images/${avatarPath}`;
    }
    
    return null;
  }, [avatarPreview, formData.avatarUrl, profileData, user]);

  // Get display values with useMemo to avoid re-renders
  // Priority: formData (when editing) > profileData (from API) > user (from context)
  const displayValues = useMemo(() => {
    const values = {
      username: formData.username || profileData?.username || profileData?.name || user?.name || '',
      email: formData.email || profileData?.email || user?.email || '',
      phone: formData.phone || profileData?.phone || user?.phone || '',
      address: formData.address || profileData?.address || user?.address || '',
    };
    
    if (import.meta.env.DEV) {
      console.log('[ProfilePage] displayValues calculated:', values, {
        'formData.phone': formData.phone,
        'profileData?.phone': profileData?.phone,
        'formData.address': formData.address,
        'profileData?.address': profileData?.address,
      });
    }
    
    return values;
  }, [profileData, user, formData]);


  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Vui lòng đăng nhập để xem trang cá nhân</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !profileData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <p className="text-center">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 mt-8">
          <h2 className="text-3xl font-bold text-gray-900">Trang cá nhân</h2>
          <p className="text-gray-600 mt-1">Quản lý thông tin và hoạt động của bạn</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-white shadow-md p-1 h-auto">
            <TabsTrigger
              value="info"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Thông tin</span>
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Mật khẩu</span>
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger
              value="phone"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Số điện thoại</span>
            </TabsTrigger>
            <TabsTrigger
              value="2fa"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">2FA</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Thông tin cá nhân */}
          <TabsContent value="info" className="space-y-6">
            <Card className="shadow-lg border-0 max-w-2xl mx-auto">
              <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription className="text-white/80">
                  {isEditingProfile ? 'Chỉnh sửa thông tin tài khoản của bạn' : 'Xem thông tin tài khoản của bạn'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group mb-4">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <div 
                      className="cursor-pointer"
                      onClick={() => document.getElementById('avatar-upload').click()}
                    >
                      <Avatar className="h-32 w-32 ring-4 ring-emerald-100 transition-all group-hover:ring-emerald-300">
                        {avatarUrl ? (
                          <AvatarImage 
                            src={avatarUrl} 
                            alt="Avatar"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <AvatarFallback className="text-3xl bg-emerald-100 text-emerald-700">
                          {displayValues.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/60 rounded-full p-3">
                          <Upload className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {avatarPreview && (
                    <p className="text-sm text-emerald-600 mt-2">Ảnh mới sẽ được lưu khi bạn nhấn "Lưu ảnh" hoặc "Lưu thay đổi"</p>
                  )}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Tên người dùng</Label>
                    <Input
                      id="username"
                      value={isEditingProfile ? formData.username : displayValues.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      disabled={!isEditingProfile}
                      className={isEditingProfile ? "border-gray-300" : "bg-gray-50"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-info">Email</Label>
                    <Input
                      id="email-info"
                      type="email"
                      value={isEditingProfile ? formData.email : displayValues.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditingProfile}
                      className={isEditingProfile ? "border-gray-300" : "bg-gray-50"}
                    />
                    {!emailConfirmed && (
                      <p className="text-sm text-red-600 mt-1">
                        <a 
                          href="/verify-email" 
                          className="text-red-600 underline hover:text-red-700"
                        >
                          Xác thực email ngay
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-info">Số điện thoại</Label>
                    <Input
                      id="phone-info"
                      type="tel"
                      value={isEditingProfile ? formData.phone : displayValues.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditingProfile}
                      className={isEditingProfile ? "border-gray-300" : "bg-gray-50"}
                      placeholder={!displayValues.phone ? 'Chưa có số điện thoại' : ''}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Địa chỉ</Label>
                    <Input
                      id="address"
                      value={isEditingProfile ? formData.address : displayValues.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!isEditingProfile}
                      className={isEditingProfile ? "border-gray-300" : "bg-gray-50"}
                      placeholder={!displayValues.address ? 'Chưa có địa chỉ' : ''}
                    />
                  </div>
                  {(isEditingProfile || avatarFile) && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="confirm-password-profile">Mật khẩu xác nhận *</Label>
                      <Input
                        id="confirm-password-profile"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Nhập mật khẩu để xác nhận thay đổi"
                        className="border-gray-300"
                      />
                      <p className="text-sm text-gray-500">Vui lòng nhập mật khẩu để xác nhận thay đổi thông tin</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  {!isEditingProfile ? (
                    <>
                      {avatarFile && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setAvatarFile(null);
                              setAvatarPreview(null);
                              setFormData(prev => ({ ...prev, confirmPassword: '' }));
                            }}
                          >
                            Hủy ảnh
                          </Button>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleSaveAvatar}
                            disabled={loading || !formData.confirmPassword}
                          >
                            {loading ? 'Đang lưu...' : 'Lưu ảnh'}
                          </Button>
                        </>
                      )}
                      {!avatarFile && (
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setIsEditingProfile(true);
                            setFormData({
                              username: profileData?.username || profileData?.name || '',
                              email: profileData?.email || '',
                              phone: profileData?.phone || '',
                              address: profileData?.address || '',
                              avatarUrl: profileData?.avatarUrl || null,
                              confirmPassword: '',
                            });
                          }}
                        >
                          Chỉnh sửa
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setFormData({
                            username: profileData?.username || profileData?.name || '',
                            email: profileData?.email || '',
                            phone: profileData?.phone || '',
                            address: profileData?.address || '',
                            avatarUrl: profileData?.avatarUrl || null,
                            confirmPassword: '',
                          });
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                      >
                        Hủy
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleSaveProfile}
                        disabled={loading || !formData.confirmPassword}
                      >
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Đổi mật khẩu */}
          <TabsContent value="password" className="space-y-6">
            <Card className="shadow-lg border-0 max-w-2xl mx-auto">
              <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
                <CardTitle>Đổi mật khẩu</CardTitle>
                <CardDescription className="text-white/80">Cập nhật mật khẩu để bảo mật tài khoản</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Mật khẩu mới</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="font-medium mb-2">Yêu cầu mật khẩu:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Tối thiểu 8 ký tự</li>
                      <li>Bao gồm chữ hoa và chữ thường</li>
                      <li>Có ít nhất 1 số và 1 ký tự đặc biệt</li>
                    </ul>
                  </div>
                  <div className="flex gap-3 pt-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                    >
                      Hủy
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleChangePassword}
                      disabled={loading}
                    >
                      {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Email */}
          <TabsContent value="email" className="space-y-6">
            <Card className="shadow-lg border-0 max-w-2xl mx-auto">
              <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
                <CardTitle>Cập nhật Email</CardTitle>
                <CardDescription className="text-white/80">
                  Thay đổi địa chỉ email liên kết với tài khoản
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                      <Mail className="h-5 w-5" />
                      <span className="font-medium">Email hiện tại</span>
                    </div>
                    <p className="text-emerald-900 font-semibold">{formData.email || profileData?.email}</p>
                  </div>

                  {emailStep === 'input' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="new-email">Email mới</Label>
                        <Input
                          id="new-email"
                          type="email"
                          placeholder="email@example.com"
                          value={emailData.newEmail}
                          onChange={(e) => setEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password-email">Mật khẩu xác nhận</Label>
                        <Input
                          id="password-email"
                          type="password"
                          value={emailData.confirmPassword}
                          onChange={(e) => setEmailData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                        <p>⚠️ Sau khi thay đổi email, bạn sẽ nhận được mã OTP qua email hiện tại để xác thực.</p>
                      </div>
                      <div className="flex gap-3 pt-2 justify-center">
                        <Button variant="outline" onClick={() => {
                          setEmailData({ newEmail: '', confirmPassword: '', otpCode: '' });
                          setEmailStep('input');
                          setEmailOtpSent(false);
                        }}>
                          Hủy
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleSendEmailOtp}
                          disabled={loading || !emailData.newEmail || !emailData.confirmPassword}
                        >
                          {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p>✅ Đã gửi mã OTP đến email hiện tại. Vui lòng kiểm tra email và nhập mã OTP.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="otp-code">Mã OTP (6 chữ số)</Label>
                        <Input
                          id="otp-code"
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          value={emailData.otpCode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setEmailData(prev => ({ ...prev, otpCode: value }));
                          }}
                          className="border-gray-300 text-center text-2xl tracking-widest"
                        />
                      </div>
                      <div className="flex gap-3 pt-2 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEmailStep('input');
                            setEmailData(prev => ({ ...prev, otpCode: '' }));
                          }}
                        >
                          Quay lại
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleChangeEmail}
                          disabled={loading || emailData.otpCode.length !== 6}
                        >
                          {loading ? 'Đang xử lý...' : 'Xác nhận đổi email'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Số điện thoại */}
          <TabsContent value="phone" className="space-y-6">
            <Card className="shadow-lg border-0 max-w-2xl mx-auto">
              <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
                <CardTitle>Cập nhật Số điện thoại</CardTitle>
                <CardDescription className="text-white/80">
                  Thay đổi số điện thoại liên kết với tài khoản
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                      <Phone className="h-5 w-5" />
                      <span className="font-medium">Số điện thoại hiện tại</span>
                    </div>
                    <p className="text-emerald-900 font-semibold">{formData.phone || profileData?.phone || 'Chưa có'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-phone">Số điện thoại mới</Label>
                    <Input
                      id="new-phone"
                      type="tel"
                      placeholder="0987654321"
                      value={phoneData.newPhone}
                      onChange={(e) => setPhoneData(prev => ({ ...prev, newPhone: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-phone">Mật khẩu xác nhận</Label>
                    <Input
                      id="password-phone"
                      type="password"
                      value={phoneData.confirmPassword}
                      onChange={(e) => setPhoneData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <p>⚠️ Bạn sẽ nhận được mã OTP qua số điện thoại mới để xác nhận thay đổi.</p>
                  </div>
                  <div className="flex gap-3 pt-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setPhoneData({ newPhone: '', confirmPassword: '' })}
                    >
                      Hủy
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleChangePhone}
                      disabled={loading}
                    >
                      {loading ? 'Đang xử lý...' : 'Cập nhật SĐT'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: 2FA */}
          <TabsContent value="2fa" className="space-y-6">
            <Card className="shadow-lg border-0 max-w-2xl mx-auto">
              <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
                <CardTitle>Xác thực hai yếu tố (2FA)</CardTitle>
                <CardDescription className="text-white/80">Tăng cường bảo mật cho tài khoản của bạn</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6 max-w-md mx-auto">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Shield className={`h-8 w-8 ${twoFactorEnabled ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium">Trạng thái 2FA</p>
                        <p className="text-sm text-gray-600">{twoFactorEnabled ? 'Đã bật' : 'Chưa bật'}</p>
                      </div>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      disabled={true}
                    />
                  </div>

                  {twoFactorEnabled ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <h3 className="font-medium text-emerald-900 mb-2">2FA đã được kích hoạt</h3>
                        <p className="text-sm text-emerald-700">
                          Tài khoản của bạn đang được bảo vệ bởi xác thực hai yếu tố.
                        </p>
                      </div>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => window.location.href = '/2fa/setup'}
                      >
                        Quản lý 2FA
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-medium mb-2">Lợi ích của 2FA:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          <li>Bảo vệ tài khoản khỏi truy cập trái phép</li>
                          <li>Thêm lớp bảo mật ngoài mật khẩu</li>
                          <li>Hỗ trợ Microsoft Authenticator</li>
                        </ul>
                      </div>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => window.location.href = '/2fa/setup'}
                      >
                        Thiết lập 2FA
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;

