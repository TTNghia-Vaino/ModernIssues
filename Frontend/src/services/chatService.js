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
 * Chat endpoint is typically at root level: /chat or /v1/chat
 */
const getChatApiUrl = () => {
  const baseURL = getBaseURL();
  
  // If baseURL is empty, we're using proxy - try /chat directly
  if (!baseURL) {
    return '/chat';
  }
  
  // Otherwise construct full URL
  // Try /chat first (as shown in Swagger docs), fallback to /v1/chat if needed
  return `${baseURL}/chat`;
};

/**
 * Send message to chatbot API
 * Endpoint: POST /chat
 * Request body: { text: string, session_id: string }
 * Response: string (chatbot response text)
 * 
 * @param {string} text - User message text
 * @param {string} sessionId - Session ID for maintaining conversation context
 * @returns {Promise<string>} - Chatbot response text
 */
export const sendChatMessage = async (text, sessionId) => {
  const url = getChatApiUrl();

  try {
    // Use AbortController to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
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
        return 'Tính năng chatbot hiện không khả dụng. Vui lòng thử lại sau.';
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

    // API returns string directly according to Swagger docs
    const responseText = await response.text();
    
    // If response is empty, return default message
    if (!responseText || responseText.trim() === '') {
      return 'Xin lỗi, tôi không hiểu câu hỏi của bạn. Vui lòng thử lại.';
    }
    
    // If it's a JSON string, try to parse it
    try {
      const parsed = JSON.parse(responseText);
      // If parsed result is a string, return it
      if (typeof parsed === 'string') {
        return parsed;
      }
      // If it's an object, extract text or message field
      return parsed.text || parsed.message || parsed.response || JSON.stringify(parsed);
    } catch {
      // If not JSON, return as-is (it's already a string)
      return responseText;
    }

  } catch (error) {
    // Suppress abort errors and 404s from console
    if (error.name === 'AbortError') {
      return 'Kết nối timeout. Vui lòng thử lại.';
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
 */
export const chat = async (text, sessionId) => {
  return sendChatMessage(text, sessionId);
};

export default {
  sendChatMessage,
  chat
};

