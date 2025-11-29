import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as userService from '../services/userService';
import { CheckCircle } from 'lucide-react';
import OTPInput from '../components/OTPInput';
import './VerifyEmailPage.css';
import '../components/ForgotPasswordForm.css';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, login } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  // Get email and password from location state (from registration) or user context
  const emailFromState = location.state?.email;
  const passwordFromState = location.state?.password;
  const currentEmail = emailFromState || user?.email;
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const otpInputRef = useRef(null);

  useEffect(() => {
    // Allow access if email is provided from registration, or if user is authenticated
    // Don't redirect immediately, let the component render first
    if (!currentEmail && !isAuthenticated) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, currentEmail, navigate]);

  // Start countdown when component mounts (OTP was already sent by backend during registration)
  useEffect(() => {
    if (currentEmail) {
      // OTP was already sent by backend, just start countdown
      setCountdown(60);
      setEmailSent(true);
    }
  }, [currentEmail]);

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
    
    if (!currentEmail) {
      showError('❌ Không tìm thấy email. Vui lòng đăng nhập lại.');
      return;
    }
    
    try {
      setLoading(true);
      await userService.resendVerificationEmail(currentEmail);
      showSuccess('✅ Email xác thực đã được gửi thành công! Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục spam).');
      setEmailSent(true);
      setCountdown(60); // Start 60 second countdown
      setOtpCode(''); // Clear previous OTP
      setOtpError('');
      if (otpInputRef.current) {
        otpInputRef.current.reset();
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
    setOtpError('');
    
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Vui lòng nhập đầy đủ 6 số!');
      return;
    }

    if (!currentEmail) {
      showError('❌ Không tìm thấy email. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      setLoading(true);
      const verifyData = {
        email: currentEmail,
        otp: otpCode
      };
      
      const result = await userService.verifyEmail(verifyData);
      
      // Check if email was already verified
      if (result?.alreadyVerified) {
        showSuccess('✅ Email đã được xác thực trước đó! Đang đăng nhập...');
      } else {
        showSuccess('✅ Email đã được xác thực thành công! Đang đăng nhập...');
      }
      
      setVerified(true);
      
      // Auto-login if password is available (from registration flow)
      if (passwordFromState && currentEmail) {
        try {
          const loginResult = await login({
            email: currentEmail,
            password: passwordFromState
          });
          
          if (loginResult.success) {
            showSuccess('✅ Đăng nhập thành công! Đang chuyển về trang chủ...');
            // Redirect to homepage after successful login
            setTimeout(() => {
              navigate('/');
            }, 1500);
          } else {
            // If auto-login fails, redirect to login page
            showError('❌ Xác thực thành công nhưng đăng nhập thất bại. Vui lòng đăng nhập thủ công.');
            setTimeout(() => {
              navigate('/login');
            }, 2000);
          }
        } catch (loginErr) {
          console.error('[VerifyEmailPage] Auto-login error:', loginErr);
          // If auto-login fails, redirect to login page
          showError('❌ Xác thực thành công nhưng đăng nhập thất bại. Vui lòng đăng nhập thủ công.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        // If no password available (user came from profile page), just refresh and redirect to profile
        setTimeout(() => {
          navigate('/profile');
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err.message || 'Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.';
      setOtpError(errorMessage);
      showError(`❌ Xác thực thất bại: ${errorMessage}`);
      setOtpCode(''); // Clear OTP input
      if (otpInputRef.current) {
        otpInputRef.current.reset();
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading or redirect message if no email and not authenticated
  if (!currentEmail && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="container">
          <div className="forgot-password-main-centered">
            <div className="forgot-password-form-container">
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
                  <button
                    onClick={() => navigate('/profile')}
                    className="send-reset-btn"
                  >
                    <i className="fas fa-check" aria-hidden="true"></i>
                    Về trang cá nhân
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="forgot-password-title">NHẬP MÃ XÁC THỰC</h1>
                  
                  <p className="forgot-password-description">
                    Chúng tôi đã gửi mã xác thực 6 số đến email <strong>{currentEmail || 'N/A'}</strong>
                  </p>

                  {otpError && <div className="error-message">{otpError}</div>}

                  <form className="forgot-password-form" onSubmit={handleVerify}>
                    <OTPInput
                      ref={otpInputRef}
                      length={6}
                      onComplete={(codeString) => {
                        setOtpCode(codeString);
                        setOtpError('');
                      }}
                      disabled={loading}
                      error=""
                      autoFocus={true}
                    />

                    <button 
                      type="submit" 
                      className="send-reset-btn"
                      disabled={loading || !otpCode || otpCode.length !== 6}
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                          Đang xác thực...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check" aria-hidden="true"></i>
                          Xác thực
                        </>
                      )}
                    </button>

                    <div className="resend-code-section">
                      <p className="resend-text">
                        Không nhận được mã?{' '}
                        {countdown > 0 ? (
                          <span className="countdown">Gửi lại sau {countdown}s</span>
                        ) : (
                          <button
                            type="button"
                            className="resend-link-btn"
                            onClick={handleResendEmail}
                            disabled={loading}
                          >
                            Gửi lại mã
                          </button>
                        )}
                      </p>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

