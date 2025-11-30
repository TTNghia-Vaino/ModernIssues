// Chat API Service

import { getBaseURL } from '../config/api';

/**
 * IMPORTANT: About 404 Errors in Browser Console
 * 
 * When the chat endpoint returns 404, the browser will log this error in the console.
 * This is normal browser behavior and cannot be prevented from JavaScript.
 * 
 * What we DO handle:
 * - Gracefully catch 404 errors in code
 * - Show user-friendly error messages instead of crashes
 * - Prevent infinite retry loops
 * - Log warnings only once in development mode
 * 
 * What we CANNOT prevent:
 * - Browser's built-in network request logging in DevTools Console
 * - Network tab showing failed requests
 * - These are informational logs, not application errors
 * 
 * The application continues to work normally even when these logs appear.
 */

// Cache to track if endpoint is unavailable to avoid repeated logs
let endpointUnavailableLogged = false;

/**
 * Get the chat API URL
 * Chat endpoint is at root level: /chat
 * Python FastAPI runs on port 8000: http://35.232.61.38:8000/chat
 * In development: Vite proxy forwards /chat to port 8000
 * In production: Use direct URL to port 8000
 */
const getChatApiUrl = () => {
  const baseURL = getBaseURL();
  
  // Chat API runs on port 8000 (Python FastAPI), separate from main backend (port 5000)
  const CHAT_API_URL = 'http://35.232.61.38:8000';
  
  // In development mode, use proxy (Vite proxy handles /chat -> port 8000)
  // In production mode, use direct URL to port 8000
  if (import.meta.env.DEV || !baseURL) {
    // Development: use proxy (Vite will forward to port 8000)
    return '/chat';
  } else {
    // Production: use direct URL to Python API on port 8000
    return `${CHAT_API_URL}/chat`;
  }
};

/**
 * Send message to chatbot API
 * Endpoint: POST /chat
 * Request body: { text: string, session_id: string }
 * Response: { session_id: string, answer: string, conversation_history: array, decision: object }
 * 
 * @param {string} text - User message text
 * @param {string} sessionId - Session ID for maintaining conversation context
 * @returns {Promise<object>} - Full response object: { session_id, answer, conversation_history, decision }
 */
export const sendChatMessage = async (text, sessionId) => {
  const url = getChatApiUrl();

  try {
    // Use AbortController to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({
        text: text,
        session_id: sessionId
      })
    });
    
    clearTimeout(timeoutId);

    // Handle response - API returns string directly according to Swagger docs
    if (!response.ok) {
      // Handle 404 silently - return immediately without throwing
      if (response.status === 404) {
        if (import.meta.env.DEV && !endpointUnavailableLogged) {
          console.warn('[ChatService] Chat endpoint not available (404). Chat feature may be disabled.');
          endpointUnavailableLogged = true;
        }
        // Suppress error logging for 404 - it's expected if endpoint doesn't exist
        return {
          session_id: sessionId || null,
          answer: 'Tính năng chatbot hiện không khả dụng. Vui lòng thử lại sau.',
          conversation_history: [],
          decision: {}
        };
      }
      
      // Handle 405 Method Not Allowed
      if (response.status === 405) {
        if (import.meta.env.DEV && !endpointUnavailableLogged) {
          console.warn('[ChatService] Chat endpoint method not allowed (405). Check server configuration.');
          endpointUnavailableLogged = true;
        }
        return {
          session_id: sessionId || null,
          answer: 'Tính năng chatbot hiện không khả dụng. Vui lòng thử lại sau.',
          conversation_history: [],
          decision: {}
        };
      }
      
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        // Handle FastAPI validation error format
        if (errorJson.detail) {
          if (Array.isArray(errorJson.detail)) {
            errorMessage = errorJson.detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
          } else {
            errorMessage = errorJson.detail.msg || errorJson.detail.message || errorJson.detail;
          }
        } else {
          errorMessage = errorJson.message || errorMessage;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    // Python API returns JSON with format: { session_id, answer, conversation_history, decision }
    const responseData = await response.json();
    
    // Return full response object for server-side session management
    if (responseData && typeof responseData === 'object') {
      return responseData;
    }
    
    // Fallback: if response is string or unexpected format
    if (typeof responseData === 'string') {
      return {
        session_id: sessionId || null,
        answer: responseData,
        conversation_history: [],
        decision: {}
      };
    }
    
    // If response is empty or unexpected format, return default
    return {
      session_id: sessionId || null,
      answer: 'Xin lỗi, tôi không hiểu câu hỏi của bạn. Vui lòng thử lại.',
      conversation_history: [],
      decision: {}
    };

  } catch (error) {
    // Suppress abort errors and 404s from console
    if (error.name === 'AbortError') {
      return {
        session_id: sessionId || null,
        answer: 'Kết nối timeout. Vui lòng thử lại.',
        conversation_history: [],
        decision: {}
      };
    }
    
    // Only log errors in development mode (404 already handled above)
    if (import.meta.env.DEV) {
      // Only log non-404 and non-abort errors to reduce console noise
      if (error.status !== 404 && error.name !== 'AbortError') {
        console.error('[ChatService] Error sending message:', error);
      }
    }
    
    // Provide user-friendly error messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến chatbot. Vui lòng kiểm tra kết nối mạng.');
    }
    
    if (error.status === 422) {
      throw new Error('Dữ liệu không hợp lệ. Vui lòng thử lại.');
    }
    
    if (error.status === 500) {
      throw new Error('Lỗi server. Vui lòng thử lại sau.');
    }
    
    throw error;
  }
};

/**
 * Main function to send chat message
 * Alias for sendChatMessage for convenience
 * @param {string} text - User message text
 * @param {string} sessionId - Session ID for maintaining conversation context
 * @returns {Promise<object>} - Full response object: { session_id, answer, conversation_history, decision }
 */
export const chat = async (text, sessionId) => {
  return sendChatMessage(text, sessionId);
};

export default {
  sendChatMessage,
  chat
};

