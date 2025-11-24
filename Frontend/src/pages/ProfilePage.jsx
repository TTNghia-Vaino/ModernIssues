import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import * as userService from '../services/userService';
import * as warrantyService from '../services/warrantyService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { User, ShoppingCart, ShieldCheck, Lock, Mail, Phone, Shield, Search, Upload } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getBaseURL } from '../config/api';
import './ProfilePage.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

const ProfilePage = () => {
  const { user, isAuthenticated } = useAuth();
  const { success, error: showError } = useNotification();
  
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  
  // User profile data
  const [profileData, setProfileData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    address: '',
    avatarUrl: null,
    confirmPassword: '', // Mật khẩu xác nhận khi chỉnh sửa
  });
  
  // Consumption data
  const [consumptionData, setConsumptionData] = useState(null);
  const [purchasedProducts, setPurchasedProducts] = useState([]);
  
  // Warranty data
  const [warrantyProducts, setWarrantyProducts] = useState([]);
  
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
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  
  // Phone change
  const [phoneData, setPhoneData] = useState({
    newPhone: '',
    confirmPassword: '',
  });
  
  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState('Email');
  
  // Avatar upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  // Chart refs
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Load user profile
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await userService.getUserById(user.id);
        setProfileData(profile);
        setFormData({
          username: profile.username || profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          avatarUrl: profile.avatarUrl || null,
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
  }, [isAuthenticated, user?.id]);

  // Load consumption data
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'spending') return;
    
    const loadConsumption = async () => {
      try {
        const data = await userService.getConsumption();
        setConsumptionData(data);
      } catch (err) {
        console.error('Error loading consumption:', err);
        showError(err.message || 'Không thể tải dữ liệu chi tiêu');
      }
    };
    
    loadConsumption();
  }, [isAuthenticated, activeTab]);

  // Load purchases
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'spending') return;
    
    const loadPurchases = async () => {
      try {
        const purchases = await userService.getPurchases();
        setPurchasedProducts(purchases || []);
      } catch (err) {
        console.error('Error loading purchases:', err);
        showError(err.message || 'Không thể tải danh sách sản phẩm đã mua');
      }
    };
    
    loadPurchases();
  }, [isAuthenticated, activeTab]);

  // Load warranties
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'warranty') return;
    
    const loadWarranties = async () => {
      try {
        const warranties = await warrantyService.getMyWarranties();
        setWarrantyProducts(warranties || []);
      } catch (err) {
        console.error('Error loading warranties:', err);
        showError(err.message || 'Không thể tải danh sách bảo hành');
      }
    };
    
    loadWarranties();
  }, [isAuthenticated, activeTab]);

  // Load 2FA status
  useEffect(() => {
    if (!isAuthenticated || activeTab !== '2fa') return;
    
    const load2FA = async () => {
      try {
        const status = await userService.get2FAStatus();
        setTwoFactorEnabled(status.enabled || false);
        setTwoFactorMethod(status.method || 'Email');
      } catch (err) {
        console.error('Error loading 2FA:', err);
      }
    };
    
    load2FA();
  }, [isAuthenticated, activeTab]);

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
    if (!user?.id) return;
    
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
      
      const updated = await userService.updateUserProfile(user.id, updateData, avatarFile);
      setProfileData(updated);
      if (updated.avatarUrl) {
        setFormData(prev => ({ ...prev, avatarUrl: updated.avatarUrl, confirmPassword: '' }));
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditingProfile(false);
      success('Cập nhật thông tin thành công');
    } catch (err) {
      showError(err.message || 'Không thể cập nhật thông tin');
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

  // Build avatar URL
  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (formData.avatarUrl) {
      if (formData.avatarUrl.startsWith('http')) return formData.avatarUrl;
      const baseUrl = getBaseURL() || 'http://35.232.61.38:5000';
      const cleanBaseUrl = baseUrl.replace(/\/v1$/, '');
      return `${cleanBaseUrl}/Uploads/Images/${formData.avatarUrl}`;
    }
    return null;
  };

  // Build image URL
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/placeholder.svg';
    if (imageUrl.startsWith('http')) return imageUrl;
    const baseUrl = getBaseURL() || 'http://35.232.61.38:5000';
    const cleanBaseUrl = baseUrl.replace(/\/v1$/, '');
    return `${cleanBaseUrl}/Uploads/Images/${imageUrl}`;
  };

  // Create chart when consumption data changes
  useEffect(() => {
    if (!consumptionData || !chartRef.current) {
      return;
    }

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const chartData = {
      labels: consumptionData.monthlyData?.map(d => d.month) || [],
      datasets: [
        {
          label: 'Chi tiêu (VNĐ)',
          data: consumptionData.monthlyData?.map(d => d.amount) || [],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };

    // Create new chart
    chartInstanceRef.current = new ChartJS(chartRef.current, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.y.toLocaleString('vi-VN')}đ`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return `${(value / 1000000).toFixed(1)}tr`;
              },
            },
          },
        },
      },
    });

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [consumptionData]);

  const filteredProducts = purchasedProducts.filter((product) =>
    product.productName?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.name?.toLowerCase().includes(searchProduct.toLowerCase())
  );

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
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Trang cá nhân</h2>
          <p className="text-gray-600 mt-1">Quản lý thông tin và hoạt động của bạn</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white shadow-md p-1 h-auto">
            <TabsTrigger
              value="info"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Thông tin</span>
            </TabsTrigger>
            <TabsTrigger
              value="spending"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Tiêu dùng</span>
            </TabsTrigger>
            <TabsTrigger
              value="warranty"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Bảo hành</span>
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
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription className="text-white/80">
                  {isEditingProfile ? 'Chỉnh sửa thông tin tài khoản của bạn' : 'Xem thông tin tài khoản của bạn'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center mb-8">
                  <Avatar className="h-32 w-32 mb-4 ring-4 ring-emerald-100">
                    <AvatarImage src={getAvatarUrl()} />
                    <AvatarFallback className="text-3xl bg-emerald-100 text-emerald-700">
                      {formData.username?.charAt(0)?.toUpperCase() || profileData?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditingProfile && (
                    <div className="relative">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 bg-transparent"
                        onClick={() => document.getElementById('avatar-upload').click()}
                      >
                        <Upload className="h-4 w-4" />
                        Thay đổi ảnh đại diện
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Tên đăng nhập</Label>
                    <Input
                      id="username"
                      value={isEditingProfile ? formData.username : (profileData?.username || profileData?.name || '')}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-info">Email</Label>
                    <Input
                      id="email-info"
                      type="email"
                      value={isEditingProfile ? formData.email : (profileData?.email || '')}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditingProfile}
                      className={isEditingProfile ? "border-gray-300" : "bg-gray-50"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-info">Số điện thoại</Label>
                    <Input
                      id="phone-info"
                      type="tel"
                      value={isEditingProfile ? formData.phone : (profileData?.phone || '')}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditingProfile}
                      className={isEditingProfile ? "border-gray-300" : "bg-gray-50"}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Địa chỉ</Label>
                    <Input
                      id="address"
                      value={isEditingProfile ? formData.address : (profileData?.address || '')}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!isEditingProfile}
                      className={isEditingProfile ? "border-gray-300" : "bg-gray-50"}
                    />
                  </div>
                  {isEditingProfile && (
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

          {/* Tab: Tiêu dùng */}
          <TabsContent value="spending" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Biểu đồ chi tiêu 12 tháng gần nhất</CardTitle>
                <CardDescription className="text-white/80">Tổng quan chi tiêu của bạn</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {consumptionData && (
                  <>
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                      <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="pt-6">
                          <div className="text-sm text-gray-600">Tổng chi tiêu</div>
                          <div className="text-2xl font-bold text-emerald-700">
                            {consumptionData.totalConsumption?.toLocaleString('vi-VN')}đ
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-teal-50 border-teal-200">
                        <CardContent className="pt-6">
                          <div className="text-sm text-gray-600">Trung bình/tháng</div>
                          <div className="text-2xl font-bold text-teal-700">
                            {Math.round(consumptionData.averageMonthly || 0).toLocaleString('vi-VN')}đ
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                          <div className="text-sm text-gray-600">Sản phẩm đã mua</div>
                          <div className="text-2xl font-bold text-blue-700">
                            {consumptionData.totalProducts || 0} sản phẩm
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="h-80 w-full">
                      <canvas ref={chartRef}></canvas>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Danh sách sản phẩm đã mua</CardTitle>
                <CardDescription className="text-white/80">Lịch sử mua hàng của bạn</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                </div>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-[100px]">Hình ảnh</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead>Ngày mua</TableHead>
                        <TableHead className="text-right">Giá mua</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            {searchProduct ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow key={product.orderId || product.id} className="hover:bg-gray-50">
                            <TableCell>
                              <img
                                src={getImageUrl(product.imageUrl || product.image)}
                                alt={product.productName || product.name}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => {
                                  e.target.src = '/placeholder.svg';
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {product.productName || product.name}
                            </TableCell>
                            <TableCell>
                              {product.purchaseDate
                                ? new Date(product.purchaseDate).toLocaleDateString('vi-VN')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-700">
                              {product.priceAtPurchase?.toLocaleString('vi-VN')}đ
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Bảo hành */}
          <TabsContent value="warranty" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Quản lý bảo hành</CardTitle>
                <CardDescription className="text-white/80">Theo dõi trạng thái bảo hành sản phẩm</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-[100px]">Hình ảnh</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Số Serial</TableHead>
                        <TableHead>Ngày mua</TableHead>
                        <TableHead>Hết hạn BH</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warrantyProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Chưa có sản phẩm bảo hành
                          </TableCell>
                        </TableRow>
                      ) : (
                        warrantyProducts.map((product) => (
                          <TableRow key={product.warrantyId || product.id} className="hover:bg-gray-50">
                            <TableCell>
                              <img
                                src={getImageUrl(product.productImageUrl || product.imageUrl)}
                                alt={product.productName}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => {
                                  e.target.src = '/placeholder.svg';
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell className="font-mono text-sm text-gray-600">
                              {product.serialNumber}
                            </TableCell>
                            <TableCell>
                              {product.startDate
                                ? new Date(product.startDate).toLocaleDateString('vi-VN')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {product.endDate
                                ? new Date(product.endDate).toLocaleDateString('vi-VN')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {product.status === 'active' || product.statusDisplay === 'Còn hạn' ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {product.statusDisplay || 'Còn hạn'}
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                  {product.statusDisplay || 'Đang bảo hành'}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Đổi mật khẩu */}
          <TabsContent value="password" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Đổi mật khẩu</CardTitle>
                <CardDescription className="text-white/80">Cập nhật mật khẩu để bảo mật tài khoản</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-w-md">
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
                  <div className="flex gap-3 pt-2">
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
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Cập nhật Email</CardTitle>
                <CardDescription className="text-white/80">
                  Thay đổi địa chỉ email liên kết với tài khoản
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-w-md">
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
                      <div className="flex gap-3 pt-2">
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
                      <div className="flex gap-3 pt-2">
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
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Cập nhật Số điện thoại</CardTitle>
                <CardDescription className="text-white/80">
                  Thay đổi số điện thoại liên kết với tài khoản
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-w-md">
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
                  <div className="flex gap-3 pt-2">
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
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <CardTitle>Xác thực hai yếu tố (2FA)</CardTitle>
                <CardDescription className="text-white/80">Tăng cường bảo mật cho tài khoản của bạn</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6 max-w-md">
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
                      onCheckedChange={handleToggle2FA}
                      disabled={loading}
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
                  )}>
                        <p className="text-sm text-emerald-800">
                          <strong>Phương thức:</strong> Email - Mã OTP sẽ được gửi đến email của bạn khi đăng nhập.
                        </p>
                      </div>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleToggle2FA(true)}
                        disabled={loading}
                      >
                        {loading ? 'Đang xử lý...' : 'Kích hoạt 2FA'}
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

