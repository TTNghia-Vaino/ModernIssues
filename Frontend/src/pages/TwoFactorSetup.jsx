import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  get2FAStatus, 
  setup2FA, 
  verify2FASetup, 
  disable2FA,
  regenerateRecoveryCodes 
} from '../services/twoFactorService';
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

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await get2FAStatus();
      setStatus(data);
    } catch (err) {
      setError('Failed to load 2FA status. Please refresh the page.');
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
      setError(err.message || 'Failed to start 2FA setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
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
        setSuccess(response.message || result.message || '2FA has been enabled successfully!');
        setStep('complete');
        // Refresh status to update UI
        await fetchStatus();
      } else {
        setError('Failed to verify 2FA setup. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    
    if (!disablePassword) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await disable2FA(disablePassword);
      setSuccess('Two-factor authentication has been disabled.');
      setShowDisableConfirm(false);
      setDisablePassword('');
      await fetchStatus();
      setStep('status');
    } catch (err) {
      setError(err.message || 'Failed to disable 2FA. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!confirm('Are you sure you want to regenerate recovery codes? Your old codes will no longer work.')) {
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
      setError(err.message || 'Failed to regenerate recovery codes.');
    } finally {
      setLoading(false);
    }
  };

  const downloadRecoveryCodes = () => {
    const text = `ModernIssues Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\nKeep these codes safe! Each can be used once.\n\n${recoveryCodes.join('\n')}`;
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
    setSuccess('Recovery codes copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (loading && !setupData) {
    return (
      <div className="two-factor-setup-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="two-factor-setup-container">
      <div className="two-factor-setup-card">
        <div className="setup-header">
          <button className="back-button" onClick={() => navigate('/profile')}>
            ← Back to Profile
          </button>
          <h1>Two-Factor Authentication</h1>
          <p>Add an extra layer of security to your account</p>
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
                <h3>Two-Factor Authentication is Enabled</h3>
                <p>Your account is protected with {status.method}</p>
                <p className="enabled-date">
                  Enabled on: {new Date(status.enabledAt).toLocaleDateString()}
                </p>

                <div className="action-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={handleRegenerateRecoveryCodes}
                    disabled={loading}
                  >
                    Regenerate Recovery Codes
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDisableConfirm(true)}
                  >
                    Disable 2FA
                  </button>
                </div>

                {showDisableConfirm && (
                  <form onSubmit={handleDisable2FA} className="disable-form">
                    <h4>Confirm Disable 2FA</h4>
                    <p>Enter your password to disable two-factor authentication:</p>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Your password"
                      className="form-input"
                      autoFocus
                    />
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => {
                        setShowDisableConfirm(false);
                        setDisablePassword('');
                      }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-danger" disabled={loading}>
                        {loading ? 'Disabling...' : 'Disable 2FA'}
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
                <h3>Two-Factor Authentication is Disabled</h3>
                <p>Protect your account with an extra layer of security</p>

                <div className="benefits">
                  <h4>Why enable 2FA?</h4>
                  <ul>
                    <li>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" />
                      </svg>
                      Protects against unauthorized access
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" />
                      </svg>
                      Works with Microsoft Authenticator, Google Authenticator, and more
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" />
                      </svg>
                      Backup codes for account recovery
                    </li>
                  </ul>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleStartSetup}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Setup View - Show QR Code */}
        {step === 'setup' && setupData && (
          <div className="setup-view">
            <h3>Step 1: Scan QR Code</h3>
            <p>Use Microsoft Authenticator or any TOTP authenticator app</p>

            <div className="qr-code-container">
              <img src={setupData.qrCodeDataUrl} alt="QR Code" className="qr-code" />
            </div>

            <div className="manual-entry">
              <p><strong>Can't scan the code?</strong></p>
              <p>Enter this key manually in your authenticator app:</p>
              <div className="secret-key">
                <code>{setupData.manualEntryKey}</code>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => {
                    navigator.clipboard.writeText(setupData.secret);
                    setSuccess('Secret key copied!');
                    setTimeout(() => setSuccess(''), 2000);
                  }}
                  title="Copy secret key"
                >
                  📋
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setStep('verify')}
            >
              Next: Verify Code
            </button>
          </div>
        )}

        {/* Verify View */}
        {step === 'verify' && (
          <div className="verify-view">
            <h3>Step 2: Verify Code</h3>
            <p>Enter the 6-digit code from your authenticator app</p>

            <form onSubmit={handleVerifySetup} className="verify-form">
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) setVerifyCode(value);
                }}
                placeholder="000000"
                className="code-input"
                maxLength="6"
                autoComplete="off"
                autoFocus
              />

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('setup')}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || verifyCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
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
            <h3>Save Your Recovery Codes</h3>
            <p className="warning-text">
              ⚠️ Store these codes in a safe place. Each code can only be used once.
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
                📥 Download Codes
              </button>
              <button className="btn btn-secondary" onClick={copyRecoveryCodes}>
                📋 Copy to Clipboard
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
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;
