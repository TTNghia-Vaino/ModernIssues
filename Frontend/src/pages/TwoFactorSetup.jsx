import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  get2FAStatus, 
  setup2FA, 
  verify2FASetup, 
  disable2FA,
  regenerateRecoveryCodes 
} from '../services/twoFactorService';
import OTPInput from '../components/OTPInput';
import '../components/ForgotPasswordForm.css';
import './TwoFactorSetup.css';

const TwoFactorSetup = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [step, setStep] = useState('status'); // 'status', 'setup', 'verify', 'complete'
  const otpInputRef = useRef(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await get2FAStatus();
      setStatus(data);
    } catch (err) {
      setError('Không thể tải trạng thái 2FA. Vui lòng làm mới trang.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await setup2FA('authenticator');
      setSetupData(data);
      setStep('setup');
    } catch (err) {
      setError(err.message || 'Không thể bắt đầu thiết lập 2FA. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = (codeString) => {
    setVerifyCode(codeString);
    setError('');
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 số');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await verify2FASetup(verifyCode);
      
      // Handle response format (could be wrapped in data or direct)
      const response = result?.data || result;
      
      if (response.success || response.message) {
        setRecoveryCodes(response.recoveryCodes || result.recoveryCodes);
        setSuccess(response.message || result.message || '2FA đã được kích hoạt thành công!');
        setStep('complete');
        // Refresh status to update UI
        await fetchStatus();
      } else {
        setError('Xác thực thiết lập 2FA thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      // Translate common OTP error messages to Vietnamese
      let errorMessage = err.message || 'Mã xác thực không đúng. Vui lòng thử lại.';
      
      // Translate common English error messages
      const errorLower = errorMessage.toLowerCase();
      if (errorLower.includes('otp is incorrect') || errorLower.includes('otp incorrect') || errorLower.includes('invalid otp') || errorLower.includes('invalid code')) {
        errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
      } else if (errorLower.includes('otp expired') || errorLower.includes('expired')) {
        errorMessage = 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.';
      } else if (errorLower.includes('otp') && errorLower.includes('wrong')) {
        errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
      }
      
      setError(errorMessage);
      setVerifyCode('');
      if (otpInputRef.current) {
        otpInputRef.current.reset();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    
    if (!disablePassword) {
      setError('Vui lòng nhập mật khẩu của bạn');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await disable2FA(disablePassword);
      setSuccess('Xác thực hai yếu tố đã được tắt.');
      setShowDisableConfirm(false);
      setDisablePassword('');
      await fetchStatus();
      setStep('status');
    } catch (err) {
      setError(err.message || 'Không thể tắt 2FA. Vui lòng kiểm tra mật khẩu của bạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!confirm('Bạn có chắc chắn muốn tạo lại mã khôi phục? Các mã cũ sẽ không còn hoạt động.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await regenerateRecoveryCodes();
      setRecoveryCodes(result.recoveryCodes);
      setSuccess(result.message);
      setStep('complete');
    } catch (err) {
      setError(err.message || 'Không thể tạo lại mã khôi phục.');
    } finally {
      setLoading(false);
    }
  };

  const downloadRecoveryCodes = () => {
    const text = `ModernIssues Mã Khôi Phục\nĐã tạo: ${new Date().toLocaleString()}\n\nHãy giữ các mã này an toàn! Mỗi mã chỉ có thể sử dụng một lần.\n\n${recoveryCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modernissues-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setSuccess('Đã sao chép mã khôi phục vào clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (loading && !setupData) {
    return (
      <div className="two-factor-setup-container">
        <div className="loading-spinner">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="two-factor-setup-container">
      <div className="two-factor-setup-card">
        <div className="setup-header">
          <button className="back-button" onClick={() => navigate('/profile')}>
            ←
          </button>
          <h1>Xác Thực Hai Yếu Tố</h1>
          <p>Thêm một lớp bảo mật cho tài khoản của bạn</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            {success}
          </div>
        )}

        {/* Status View */}
        {step === 'status' && status && (
          <div className="status-view">
            {status.enabled ? (
              <div className="status-enabled">
                <div className="status-icon enabled">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <h3>Xác Thực Hai Yếu Tố Đã Được Bật</h3>
                <p>Tài khoản của bạn được bảo vệ bằng {status.method}</p>
                <p className="enabled-date">
                  Đã bật vào: {new Date(status.enabledAt).toLocaleDateString('vi-VN')}
                </p>

                <div className="action-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={handleRegenerateRecoveryCodes}
                    disabled={loading}
                  >
                    Tạo Lại Mã Khôi Phục
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDisableConfirm(true)}
                  >
                    Tắt 2FA
                  </button>
                </div>

                {showDisableConfirm && (
                  <form onSubmit={handleDisable2FA} className="disable-form">
                    <h4>Xác Nhận Tắt 2FA</h4>
                    <p>Nhập mật khẩu của bạn để tắt xác thực hai yếu tố:</p>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Mật khẩu của bạn"
                      className="form-input"
                      autoFocus
                    />
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => {
                        setShowDisableConfirm(false);
                        setDisablePassword('');
                      }}>
                        Hủy
                      </button>
                      <button type="submit" className="btn btn-danger" disabled={loading}>
                        {loading ? 'Đang tắt...' : 'Tắt 2FA'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="status-disabled">
                <div className="status-icon disabled">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>Xác Thực Hai Yếu Tố Đã Được Tắt</h3>
                <p>Bảo vệ tài khoản của bạn với một lớp bảo mật bổ sung</p>

                <div className="benefits">
                  <h4>Tại sao nên bật 2FA?</h4>
                  <ul>
                    <li>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" />
                      </svg>
                      Bảo vệ chống lại truy cập trái phép
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" />
                      </svg>
                      Hoạt động với Microsoft Authenticator, Google Authenticator và nhiều ứng dụng khác
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" />
                      </svg>
                      Mã khôi phục để khôi phục tài khoản
                    </li>
                  </ul>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleStartSetup}
                  disabled={loading}
                >
                  {loading ? 'Đang thiết lập...' : 'Bật Xác Thực Hai Yếu Tố'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Setup View - Show QR Code */}
        {step === 'setup' && setupData && (
          <div className="setup-view">
            <h3>Bước 1: Quét Mã QR</h3>
            <p>Sử dụng Microsoft Authenticator hoặc bất kỳ ứng dụng xác thực TOTP nào</p>

            <div className="qr-code-container">
              <img src={setupData.qrCodeDataUrl} alt="QR Code" className="qr-code" />
            </div>

            <div className="manual-entry">
              <p><strong>Không thể quét mã?</strong></p>
              <p>Nhập khóa này thủ công vào ứng dụng xác thực của bạn:</p>
              <div className="secret-key">
                <code>{setupData.manualEntryKey}</code>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => {
                    navigator.clipboard.writeText(setupData.secret);
                    setSuccess('Đã sao chép khóa bí mật!');
                    setTimeout(() => setSuccess(''), 2000);
                  }}
                  title="Sao chép khóa bí mật"
                >
                  📋
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setStep('verify')}
            >
              Tiếp theo: Xác Thực Mã
            </button>
          </div>
        )}

        {/* Verify View */}
        {step === 'verify' && (
          <div className="verify-view">
            <h3>Bước 2: Xác Thực Mã</h3>
            <p>Nhập mã 6 số từ ứng dụng xác thực của bạn</p>

            <form onSubmit={handleVerifySetup} className="verify-form">
              <OTPInput
                ref={otpInputRef}
                length={6}
                onComplete={handleOTPComplete}
                disabled={loading}
                error={error}
                autoFocus={true}
              />

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('setup')}
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || verifyCode.length !== 6}
                >
                  {loading ? 'Đang xác thực...' : 'Xác Thực & Bật'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Complete View - Show Recovery Codes */}
        {step === 'complete' && recoveryCodes && (
          <div className="complete-view">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <h3>Lưu Mã Khôi Phục Của Bạn</h3>
            <p className="warning-text">
              ⚠️ Hãy lưu các mã này ở nơi an toàn. Mỗi mã chỉ có thể sử dụng một lần.
            </p>

            <div className="recovery-codes">
              {recoveryCodes.map((code, index) => (
                <div key={index} className="recovery-code">
                  {code}
                </div>
              ))}
            </div>

            <div className="recovery-actions">
              <button className="btn btn-secondary" onClick={downloadRecoveryCodes}>
                📥 Tải Xuống Mã
              </button>
              <button className="btn btn-secondary" onClick={copyRecoveryCodes}>
                📋 Sao Chép Vào Clipboard
              </button>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setStep('status');
                setRecoveryCodes(null);
                setSetupData(null);
              }}
            >
              Hoàn thành
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;
