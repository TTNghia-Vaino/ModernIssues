import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as userService from '../services/userService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, CheckCircle, X } from 'lucide-react';
import './VerifyEmailPage.css';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Auto send verification email and start countdown when component mounts
  useEffect(() => {
    const sendInitialEmail = async () => {
      try {
        const result = await userService.resendVerificationEmail();
        if (result && (result.success !== false)) {
          showSuccess('✅ Email xác thực đã được gửi tự động. Vui lòng kiểm tra hộp thư của bạn.');
          setEmailSent(true);
          setCountdown(60);
        } else {
          showError('❌ Không thể gửi email xác thực tự động. Vui lòng nhấn "Gửi lại mã".');
          setCountdown(60); // Still start countdown so user can manually resend
        }
      } catch (err) {
        // If auto-send fails, still start countdown (user can manually resend)
        showError(`❌ Không thể gửi email xác thực tự động: ${err.message || 'Vui lòng nhấn "Gửi lại mã" để thử lại.'}`);
        setCountdown(60);
        console.warn('Failed to auto-send verification email:', err);
      }
    };
    
    if (isAuthenticated) {
      sendInitialEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return; // Prevent resend during countdown
    
    try {
      setLoading(true);
      const result = await userService.resendVerificationEmail();
      
      // Check if resend was successful
      if (result && (result.success !== false)) {
        showSuccess('✅ Email xác thực đã được gửi thành công! Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục spam).');
        setEmailSent(true);
        setCountdown(60); // Start 60 second countdown
        setOtpCode(''); // Clear previous OTP
      } else {
        showError('❌ Gửi email thất bại. Vui lòng thử lại sau.');
      }
    } catch (err) {
      const errorMessage = err.message || 'Không thể gửi email xác thực';
      showError(`❌ Gửi email thất bại: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      showError('Vui lòng nhập mã xác thực');
      return;
    }

    if (otpCode.length !== 6) {
      showError('Mã xác thực phải có 6 chữ số');
      return;
    }

    try {
      setLoading(true);
      const verifyData = {
        otpCode: otpCode.trim(),
        ...(user?.email && { email: user.email })
      };
      
      const result = await userService.verifyEmail(verifyData);
      
      // Check if verification was successful
      if (result && (result.success !== false)) {
        showSuccess('✅ Email đã được xác thực thành công! Bạn sẽ được chuyển về trang cá nhân.');
        setVerified(true);
        
        // Refresh user data to update emailConfirmed status
        setTimeout(() => {
          navigate('/profile');
          // Reload to refresh user context
          window.location.reload();
        }, 2000);
      } else {
        showError('❌ Xác thực thất bại. Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.');
        setOtpCode(''); // Clear OTP input
      }
    } catch (err) {
      const errorMessage = err.message || 'Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.';
      showError(`❌ Xác thực thất bại: ${errorMessage}`);
      setOtpCode(''); // Clear OTP input
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 mt-8">
          <h2 className="text-3xl font-bold text-gray-900">Xác thực Email</h2>
          <p className="text-gray-600 mt-1">Xác thực địa chỉ email của bạn để bảo mật tài khoản</p>
        </div>

        <Card className="bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6" />
              <div>
                <CardTitle className="text-white">Xác thực Email</CardTitle>
                <CardDescription className="text-emerald-50">
                  Nhập mã xác thực đã được gửi đến email của bạn
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
          {verified ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Xác thực thành công!
              </h3>
              <p className="text-gray-600 mb-6">
                Email của bạn đã được xác thực thành công. Đang chuyển hướng về trang cá nhân...
              </p>
              <Button
                onClick={() => navigate('/profile')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Về trang cá nhân
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-gray-700 mb-3 text-sm font-medium">
                  Chúng tôi đã gửi mã xác thực đến địa chỉ email:
                </p>
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-lg">
                  <div className="verify-email-display">
                    <Mail className="h-5 w-5 text-emerald-600" />
                    <span className="font-semibold text-gray-900">{user?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                    Mã xác thực (OTP)
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Nhập mã 6 chữ số"
                    maxLength={6}
                    className="text-center text-3xl tracking-[0.5em] font-semibold h-16 border-2 focus:border-emerald-500 focus:ring-emerald-500"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vui lòng nhập mã 6 chữ số đã được gửi đến email của bạn
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-medium"
                    disabled={loading || !otpCode.trim() || otpCode.length !== 6}
                  >
                    {loading ? 'Đang xác thực...' : 'Xác thực Email'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendEmail}
                    disabled={loading || countdown > 0}
                    className="h-11 border-emerald-300 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `Gửi lại mã (${countdown}s)` : 'Gửi lại mã'}
                  </Button>
                </div>
              </form>

              {emailSent && (
                <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-md">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700">
                      Email xác thực đã được gửi thành công. Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục spam).
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Không nhận được email? Vui lòng kiểm tra thư mục spam hoặc{' '}
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    className="text-emerald-600 hover:text-emerald-700 underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || countdown > 0}
                  >
                    {countdown > 0 ? `gửi lại mã xác thực (${countdown}s)` : 'gửi lại mã xác thực'}
                  </button>
                  .
                </p>
              </div>
            </>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

