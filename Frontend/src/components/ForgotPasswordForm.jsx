import React, { useState, useRef, useEffect } from 'react';
import * as authService from '../services/authService';
import { useNotification } from '../context/NotificationContext';
import OTPInput from './OTPInput';
import './ForgotPasswordForm.css';

const ForgotPasswordForm = () => {
  const { success, info, error: showError } = useNotification();
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState(''); // Token từ verifyOtp response
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(0);
  const codeInputRefs = useRef([]);

  // Countdown timer for resend code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto focus first code input when step 2
  useEffect(() => {
    if (step === 2 && codeInputRefs.current[0]) {
      codeInputRefs.current[0].focus();
    }
  }, [step]);

  // Validate email
  const validateEmail = (emailValue) => {
    if (!emailValue || emailValue.trim() === '') {
      return 'Vui lòng nhập email';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      return 'Email không đúng định dạng. Vui lòng nhập email hợp lệ (ví dụ: example@email.com)';
    }
    return '';
  };

  // Step 1: Send code to email
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});
    
    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      showError(emailError);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authService.forgotPassword({ email: email.trim() });
      setStep(2);
      setCountdown(60); // 60 seconds countdown
      setErrors({});
    } catch (error) {
      const errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      setError(errorMessage);
      showError(errorMessage);
      
      // Set field-specific error if email related
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('tài khoản') || errorMessage.toLowerCase().includes('not found')) {
        setErrors({ email: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!code || code.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 số!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authService.verifyOtp({ email, otp: code });
      // Lưu tempToken từ response (có thể là tempToken, token, hoặc resetToken)
      const token = response.tempToken || response.token || response.resetToken || response.data?.tempToken || response.data?.token;
      if (token) {
        setTempToken(token);
      } else {
        throw new Error('Không nhận được token từ server. Vui lòng thử lại.');
      }
      setStep(3);
    } catch (error) {
      // Translate common OTP error messages to Vietnamese
      let errorMessage = error.message || 'Mã xác thực không đúng. Vui lòng thử lại.';
      
      // Translate common English error messages
      const errorLower = errorMessage.toLowerCase();
      if (errorLower.includes('otp is incorrect') || errorLower.includes('otp incorrect') || errorLower.includes('invalid otp')) {
        errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
      } else if (errorLower.includes('otp expired') || errorLower.includes('expired')) {
        errorMessage = 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.';
      } else if (errorLower.includes('otp') && errorLower.includes('wrong')) {
        errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
      }
      
      setError(errorMessage);
      showError(errorMessage);
      setCode('');
      // Reset OTPInput if it has reset method
      if (codeInputRefs.current && codeInputRefs.current.reset) {
        codeInputRefs.current.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Validate password
  const validatePassword = (password) => {
    if (!password || password.trim() === '') {
      return 'Vui lòng nhập mật khẩu';
    }
    if (password.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    return '';
  };

  // Validate confirm password
  const validateConfirmPassword = (password, confirmPasswordValue) => {
    if (!confirmPasswordValue || confirmPasswordValue.trim() === '') {
      return 'Vui lòng xác nhận mật khẩu';
    }
    if (password !== confirmPasswordValue) {
      return 'Mật khẩu xác nhận không khớp';
    }
    return '';
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});
    
    // Validate passwords
    const passwordError = validatePassword(newPassword);
    const confirmPasswordError = validateConfirmPassword(newPassword, confirmPassword);
    
    if (passwordError || confirmPasswordError) {
      const newErrors = {};
      if (passwordError) newErrors.newPassword = passwordError;
      if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
      setErrors(newErrors);
      showError('Vui lòng kiểm tra lại thông tin mật khẩu');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (!tempToken) {
        const errorMsg = 'Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại từ đầu.';
        setError(errorMsg);
        showError(errorMsg);
        setStep(1);
        setEmail('');
        setTempToken('');
        return;
      }
      
      await authService.resetPassword({
        tempToken,
        newPassword
      });
      // Success - redirect to login
      success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      const errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      setError(errorMessage);
      showError(errorMessage);
      
      // Set field-specific errors if password related
      if (errorMessage.toLowerCase().includes('mật khẩu') || errorMessage.toLowerCase().includes('password')) {
        setErrors({ newPassword: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Resend code
  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setError('');
    setIsLoading(true);
    
    try {
      await authService.forgotPassword({ email });
      setCountdown(60);
      setCode('');
      setTempToken(''); // Reset tempToken khi gửi lại code
      // Reset OTPInput if it has reset method
      if (codeInputRefs.current && codeInputRefs.current.reset) {
        codeInputRefs.current.reset();
      }
      info('Mã xác thực mới đã được gửi đến email của bạn!');
    } catch (error) {
      const errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Enter Email
  const renderEmailStep = () => (
    <>
              <h1 className="forgot-password-title">QUÊN MẬT KHẨU</h1>
              
              <p className="forgot-password-description">
        Nhập email của bạn để nhận mã xác thực 6 số
              </p>

              <p className="login-link">
                Nhớ mật khẩu? <a href="/login">Đăng nhập tại đây</a>
              </p>

      <form className="forgot-password-form" onSubmit={handleSendCode}>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    placeholder="Nhập email của bạn"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Clear error when user starts typing
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    onBlur={() => {
                      // Validate email format when user leaves the field
                      if (email && email.trim() !== '') {
                        const emailError = validateEmail(email);
                        if (emailError) {
                          setErrors(prev => ({ ...prev, email: emailError }));
                        }
                      }
                    }}
                    autoComplete="email"
                    disabled={isLoading}
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && (
                    <span className="error-text">
                      <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                      {errors.email}
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="send-reset-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane" aria-hidden="true"></i>
              Gửi mã xác thực
                    </>
                  )}
                </button>
              </form>
    </>
  );

  // Step 2: Enter Code
  const renderCodeStep = () => (
    <>
      <h1 className="forgot-password-title">NHẬP MÃ XÁC THỰC</h1>
      
      <p className="forgot-password-description">
        Chúng tôi đã gửi mã xác thực 6 số đến email <strong>{email}</strong>
      </p>

      {error && (
        <div className="error-message">
          <i className="fas fa-info-circle" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <form className="forgot-password-form" onSubmit={handleVerifyCode}>
        <OTPInput
          ref={codeInputRefs}
          length={6}
          onComplete={(codeString) => {
            setCode(codeString);
          }}
          disabled={isLoading}
        />

        <button 
          type="submit" 
          className="send-reset-btn"
          disabled={isLoading || !code || code.length !== 6}
        >
          {isLoading ? (
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
                onClick={handleResendCode}
                disabled={isLoading}
              >
                Gửi lại mã
              </button>
            )}
          </p>
        </div>

        <button
          type="button"
          className="back-btn"
          onClick={() => {
            setStep(1);
            setCode('');
            setError('');
            // Reset OTPInput if it has reset method
            if (codeInputRefs.current && codeInputRefs.current.reset) {
              codeInputRefs.current.reset();
            }
          }}
          disabled={isLoading}
        >
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Quay lại
        </button>
      </form>
    </>
  );

  // Step 3: New Password
  const renderNewPasswordStep = () => (
    <>
      <h1 className="forgot-password-title">ĐẶT LẠI MẬT KHẨU</h1>
      
      <p className="forgot-password-description">
        Vui lòng nhập mật khẩu mới cho tài khoản <strong>{email}</strong>
      </p>

      {error && (
        <div className="error-message">
          <i className="fas fa-info-circle" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <form className="forgot-password-form" onSubmit={handleResetPassword}>
        <div className="form-group">
          <label htmlFor="newPassword">Mật khẩu mới *</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              // Clear error when user starts typing
              if (errors.newPassword) {
                setErrors(prev => ({ ...prev, newPassword: '' }));
              }
              // Revalidate confirm password if it has value
              if (confirmPassword) {
                const confirmError = validateConfirmPassword(e.target.value, confirmPassword);
                setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
              }
            }}
            onBlur={() => {
              const passwordError = validatePassword(newPassword);
              if (passwordError) {
                setErrors(prev => ({ ...prev, newPassword: passwordError }));
              }
            }}
            autoComplete="new-password"
            disabled={isLoading}
            className={errors.newPassword ? 'error' : ''}
          />
          {errors.newPassword && (
            <span className="error-text">
              <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
              {errors.newPassword}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              // Clear error when user starts typing
              if (errors.confirmPassword) {
                setErrors(prev => ({ ...prev, confirmPassword: '' }));
              }
            }}
            onBlur={() => {
              const confirmError = validateConfirmPassword(newPassword, confirmPassword);
              if (confirmError) {
                setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
              }
            }}
            autoComplete="new-password"
            disabled={isLoading}
            className={errors.confirmPassword ? 'error' : ''}
          />
          {errors.confirmPassword && (
            <span className="error-text">
              <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
              {errors.confirmPassword}
            </span>
          )}
        </div>

        <button 
          type="submit" 
          className="send-reset-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
              Đang xử lý...
            </>
          ) : (
            <>
              <i className="fas fa-key" aria-hidden="true"></i>
              Đặt lại mật khẩu
            </>
          )}
        </button>

        <button
          type="button"
          className="back-btn"
          onClick={() => {
            setStep(2);
            setNewPassword('');
            setConfirmPassword('');
            setTempToken(''); // Reset tempToken khi quay lại
            setError('');
          }}
          disabled={isLoading}
        >
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Quay lại
        </button>
      </form>
    </>
  );

  return (
    <div className="forgot-password-page">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <div className="container">
          <span>Trang chủ / Quên mật khẩu</span>
        </div>
      </div>

      <div className="forgot-password-container">
        <div className="container">
          <div className="forgot-password-main-centered">
            <div className="forgot-password-form-container">
              {/* Progress indicator */}
              <div className="step-indicator">
                <div className={`step ${step >= 1 ? 'active' : ''}`}>
                  <div className="step-number">1</div>
                  <div className="step-label">Email</div>
                </div>
                <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
                <div className={`step ${step >= 2 ? 'active' : ''}`}>
                  <div className="step-number">2</div>
                  <div className="step-label">Mã xác thực</div>
                </div>
                <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                  <div className="step-number">3</div>
                  <div className="step-label">Mật khẩu mới</div>
                </div>
              </div>

              {step === 1 && renderEmailStep()}
              {step === 2 && renderCodeStep()}
              {step === 3 && renderNewPasswordStep()}
            </div>
          </div>
        </div>
      </div>

      {/* Floating contact buttons */}
      <div className="floating-contacts">
        <a href="#" className="floating-btn chat-btn" aria-label="Chat">
          <i className="fas fa-comments" aria-hidden="true"></i>
          <span>Xin chào!</span>
        </a>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
