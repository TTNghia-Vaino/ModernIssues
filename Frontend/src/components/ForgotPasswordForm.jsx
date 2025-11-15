import React, { useState, useRef, useEffect } from 'react';
import * as authService from '../services/authService';
import { useNotification } from '../context/NotificationContext';
import './ForgotPasswordForm.css';

const ForgotPasswordForm = () => {
  const { success, info } = useNotification();
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [tempToken, setTempToken] = useState(''); // Token từ verifyOtp response
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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

  // Step 1: Send code to email
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Vui lòng nhập email!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authService.forgotPassword({ email });
      setStep(2);
      setCountdown(60); // 60 seconds countdown
    } catch (error) {
      setError(error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    
    const codeString = code.join('');
    if (codeString.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 số!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authService.verifyOtp({ email, otp: codeString });
      // Lưu tempToken từ response (có thể là tempToken, token, hoặc resetToken)
      const token = response.tempToken || response.token || response.resetToken || response.data?.tempToken || response.data?.token;
      if (token) {
        setTempToken(token);
      } else {
        throw new Error('Không nhận được token từ server. Vui lòng thử lại.');
      }
      setStep(3);
    } catch (error) {
      setError(error.message || 'Mã xác thực không đúng. Vui lòng thử lại.');
      setCode(['', '', '', '', '', '']);
      if (codeInputRefs.current[0]) {
        codeInputRefs.current[0].focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (!tempToken) {
        setError('Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại từ đầu.');
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
      setError(error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code input
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only numbers
    
    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last character
    setCode(newCode);
    
    // Auto focus next input
    if (value && index < 5 && codeInputRefs.current[index + 1]) {
      codeInputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace in code input
  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1].focus();
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
      setCode(['', '', '', '', '', '']);
      setTempToken(''); // Reset tempToken khi gửi lại code
      if (codeInputRefs.current[0]) {
        codeInputRefs.current[0].focus();
      }
      info('Mã xác thực mới đã được gửi đến email của bạn!');
    } catch (error) {
      setError(error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
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

      {error && <div className="error-message">{error}</div>}

      <form className="forgot-password-form" onSubmit={handleSendCode}>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Nhập email của bạn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
            disabled={isLoading}
                  />
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

      {error && <div className="error-message">{error}</div>}

      <form className="forgot-password-form" onSubmit={handleVerifyCode}>
        <div className="form-group">
          <label>Mã xác thực *</label>
          <div className="code-inputs">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (codeInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                className="code-input"
                disabled={isLoading}
                autoComplete="off"
              />
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          className="send-reset-btn"
          disabled={isLoading || code.join('').length !== 6}
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
            setCode(['', '', '', '', '', '']);
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

  // Step 3: New Password
  const renderNewPasswordStep = () => (
    <>
      <h1 className="forgot-password-title">ĐẶT LẠI MẬT KHẨU</h1>
      
      <p className="forgot-password-description">
        Vui lòng nhập mật khẩu mới cho tài khoản <strong>{email}</strong>
      </p>

      {error && <div className="error-message">{error}</div>}

      <form className="forgot-password-form" onSubmit={handleResetPassword}>
        <div className="form-group">
          <label htmlFor="newPassword">Mật khẩu mới *</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading}
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading}
            minLength="6"
          />
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
