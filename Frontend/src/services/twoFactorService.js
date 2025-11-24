// Two-Factor Authentication API Service

import { apiGet, apiPost } from './api';

/**
 * Get 2FA status for current user
 * @returns {Promise} - { enabled, method, enabledAt, hasRecoveryCodes }
 */
export const get2FAStatus = async () => {
  try {
    const response = await apiGet('Auth/2fa/status');
    // Handle both wrapped and direct response formats
    if (response && typeof response === 'object') {
      if (response.data !== undefined) {
        return typeof response.data === 'string' 
          ? (() => { try { return JSON.parse(response.data); } catch { return response.data; } })()
          : response.data;
      }
      // Check if it's already the status object
      if (response.enabled !== undefined || response.Enabled !== undefined) {
        return response;
      }
    }
    return response;
  } catch (error) {
    console.error('[2FA] Error getting 2FA status:', error);
    throw error;
  }
};

/**
 * Setup 2FA - Get QR code and secret
 * @param {string} method - 'authenticator', 'email', or 'both'
 * @returns {Promise} - { secret, qrCodeDataUrl, manualEntryKey, authenticatorUri }
 */
export const setup2FA = async (method = 'authenticator') => {
  try {
    const response = await apiPost('Auth/2fa/setup', { method });
    return response?.data || response;
  } catch (error) {
    console.error('[2FA] Error setting up 2FA:', error);
    throw error;
  }
};

/**
 * Verify 2FA setup with code from authenticator
 * @param {string} code - 6-digit code from authenticator app
 * @returns {Promise} - { success, message, recoveryCodes }
 */
export const verify2FASetup = async (code) => {
  try {
    const response = await apiPost('Auth/2fa/verify-setup', { code });
    return response?.data || response;
  } catch (error) {
    console.error('[2FA] Error verifying 2FA setup:', error);
    throw error;
  }
};

/**
 * Verify 2FA code during login
 * @param {string} email - User email
 * @param {string} code - 6-digit code or recovery code
 * @param {boolean} useRecoveryCode - Whether using recovery code
 * @returns {Promise} - { message, username, role, twoFactorVerified }
 */
export const verify2FALogin = async (email, code, useRecoveryCode = false) => {
  try {
    const response = await apiPost('Auth/2fa/verify-login', {
      email,
      code,
      useRecoveryCode
    });
    return response?.data || response;
  } catch (error) {
    console.error('[2FA] Error verifying 2FA login:', error);
    throw error;
  }
};

/**
 * Disable 2FA
 * @param {string} password - User password for confirmation
 * @returns {Promise} - { message }
 */
export const disable2FA = async (password) => {
  try {
    const response = await apiPost('Auth/2fa/disable', { password });
    return response?.data || response;
  } catch (error) {
    console.error('[2FA] Error disabling 2FA:', error);
    throw error;
  }
};

/**
 * Regenerate recovery codes
 * @returns {Promise} - { message, recoveryCodes }
 */
export const regenerateRecoveryCodes = async () => {
  try {
    const response = await apiPost('Auth/2fa/regenerate-recovery-codes');
    return response?.data || response;
  } catch (error) {
    console.error('[2FA] Error regenerating recovery codes:', error);
    throw error;
  }
};

export default {
  get2FAStatus,
  setup2FA,
  verify2FASetup,
  verify2FALogin,
  disable2FA,
  regenerateRecoveryCodes
};
