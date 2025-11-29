import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verify2FALogin } from '../services/twoFactorService';
import OTPInput from '../components/OTPInput';
import '../components/ForgotPasswordForm.css';
import './TwoFactorVerify.css';

const TwoFactorVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpInputRef = useRef(null);
  
  const email = location.state?.email;
  const method = location.state?.method || 'authenticator';

  useEffect(() => {
    // Redirect if no email in state
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Vui lòng nhập mã xác thực');
      return;
    }

    setLoading(true);

    try {
      const response = await verify2FALogin(email, code, useRecoveryCode);
      
      // Check response format (could be wrapped in data or direct)
      const result = response?.data || response;
      
      if (result.twoFactorVerified || result.message === "Login successful!") {
        // Update AuthContext with user info
        const userData = {
          username: result.username || email?.split('@')[0],
          role: result.role || 'customer',
          email: email
        };
        
        // Update AuthContext
        if (setUser) {
          setUser(userData);
        }
        
        // Store user info in localStorage (for AuthContext)
        localStorage.setItem('modernissues_auth_v1', JSON.stringify(userData));
        
        // Dispatch event to sync AuthContext
        window.dispatchEvent(new Event('authStorageSync'));
        
        // Redirect to home or previous page
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Xác thực đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      // Translate common OTP error messages to Vietnamese
      let errorMessage = err.message || 'Mã xác thực không đúng. Vui lòng thử lại.';
      
      // Translate common English error messages
      const errorLower = errorMessage.toLowerCase();
      if (errorLower.includes('otp is incorrect') || errorLower.includes('otp incorrect') || errorLower.includes('invalid otp') || errorLower.includes('invalid verification code')) {
        errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
      } else if (errorLower.includes('otp expired') || errorLower.includes('expired')) {
        errorMessage = 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.';
      } else if (errorLower.includes('otp') && errorLower.includes('wrong')) {
        errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    // Only for recovery code (not OTP)
    const value = e.target.value.replace(/[^0-9A-Za-z-]/g, ''); // Only numbers, letters, and hyphens
    setCode(value.toUpperCase());
  };

  const handleOTPComplete = (codeString) => {
    setCode(codeString);
    setError('');
  };

  return (
    <div className="two-factor-verify-container">
      <div className="two-factor-verify-card">
        <div className="verify-header">
          <div className="verify-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2>Xác Thực Hai Yếu Tố</h2>
          <p className="verify-subtitle">
            {useRecoveryCode 
              ? 'Nhập một trong các mã khôi phục của bạn'
              : method === 'email'
                ? 'Nhập mã đã được gửi đến email của bạn'
                : 'Nhập mã 6 số từ ứng dụng xác thực của bạn'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="verify-form">
          {useRecoveryCode ? (
            <div className="form-group">
              <label htmlFor="code">Mã Khôi Phục</label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={handleCodeChange}
                placeholder="XXXX-XXXX"
                className="verify-input"
                autoComplete="off"
                autoFocus
                maxLength={9}
              />
            </div>
          ) : (
            <OTPInput
              ref={otpInputRef}
              length={6}
              onComplete={handleOTPComplete}
              disabled={loading}
              error={error}
              autoFocus={true}
            />
          )}

          {error && !useRecoveryCode && (
            <div className="error-message" style={{ marginTop: '10px' }}>
              <i className="fas fa-info-circle" aria-hidden="true"></i>
              {error}
            </div>
          )}
          {error && useRecoveryCode && (
            <div className="error-message">
              <i className="fas fa-info-circle" aria-hidden="true"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="verify-button"
            disabled={loading || !code.trim() || (!useRecoveryCode && code.length !== 6)}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Đang xác thực...
              </>
            ) : (
              'Xác Thực'
            )}
          </button>

          <div className="verify-actions">
            {!useRecoveryCode && (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setUseRecoveryCode(true);
                  setCode('');
                  setError('');
                  if (otpInputRef.current) {
                    otpInputRef.current.reset();
                  }
                }}
              >
                Sử dụng mã khôi phục thay thế
              </button>
            )}
            {useRecoveryCode && (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setUseRecoveryCode(false);
                  setCode('');
                  setError('');
                  if (otpInputRef.current) {
                    otpInputRef.current.reset();
                  }
                }}
              >
                Sử dụng mã xác thực thay thế
              </button>
            )}
          </div>

          <div className="back-to-login">
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/login')}
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </form>

        <div className="verify-footer">
          <p>
            <strong>Mất quyền truy cập vào ứng dụng xác thực của bạn?</strong>
            <br />
            Sử dụng một trong các mã khôi phục của bạn để đăng nhập, sau đó tạo lại mã mới.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
