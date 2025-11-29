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
      setError('Please enter the verification code');
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
        setError('Login verification failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
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
          <h2>Two-Factor Authentication</h2>
          <p className="verify-subtitle">
            {useRecoveryCode 
              ? 'Enter one of your recovery codes'
              : method === 'email'
                ? 'Enter the code sent to your email'
                : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="verify-form">
          {useRecoveryCode ? (
            <div className="form-group">
              <label htmlFor="code">Recovery Code</label>
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
              {error}
            </div>
          )}
          {error && useRecoveryCode && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" />
              </svg>
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
                Verifying...
              </>
            ) : (
              'Verify'
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
                Use recovery code instead
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
                Use authenticator code instead
              </button>
            )}
          </div>

          <div className="back-to-login">
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/login')}
            >
              ← Back to login
            </button>
          </div>
        </form>

        <div className="verify-footer">
          <p>
            <strong>Lost access to your authenticator?</strong>
            <br />
            Use one of your recovery codes to sign in, then regenerate new codes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
