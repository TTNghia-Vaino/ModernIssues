// Email API Service

import { apiPost } from './api';

/**
 * Send email
 * @param {object} emailData - Email data (to, subject, body, etc.)
 * @returns {Promise} - Response data
 */
export const sendEmail = async (emailData) => {
  return apiPost('Email/send', emailData);
};







