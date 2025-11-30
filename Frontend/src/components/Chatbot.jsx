import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Chatbot.css';
import { chat } from '../services/chatService';

const CHAT_SESSION_ID_KEY = 'chatbot_session_id';

const Chatbot = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Load session ID from localStorage (conversation will be restored from server on first message)
  useEffect(() => {
    try {
      // Get existing session ID from localStorage
      const storedSessionId = localStorage.getItem(CHAT_SESSION_ID_KEY);
      
      if (storedSessionId) {
        setSessionId(storedSessionId);
        console.log('[Chatbot] Loaded session ID from localStorage:', storedSessionId);
      }
      
      // Always show welcome message on mount
      // Conversation history will be restored from server when user sends first message
      setMessages([
        {
          id: 1,
          text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('[Chatbot] Error loading session:', error);
      // Initialize with welcome message on error
      setMessages([
        {
          id: 1,
          text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  // Track previous auth state to detect logout
  const prevAuthRef = useRef(isAuthenticated);
  
  // Clear chat history when user logs out or session expires
  useEffect(() => {
    const handleLogout = () => {
      console.log('[Chatbot] User logged out or session expired, clearing chat history');
      setMessages([
        {
          id: Date.now(),
          text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
      // Clear session ID - server will create new session on next message
      localStorage.removeItem(CHAT_SESSION_ID_KEY);
      setSessionId(null);
    };

    // Listen for auth storage changes (logout from another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'modernissues_auth_v1' && !e.newValue && e.oldValue) {
        // User logged out (value removed)
        handleLogout();
      }
    };

    // Listen for token expired event
    const handleTokenExpired = () => {
      handleLogout();
    };

    // Detect logout in same tab (was authenticated, now not)
    const wasAuthenticated = prevAuthRef.current;
    const isNowAuthenticated = isAuthenticated;
    
    if (wasAuthenticated && !isNowAuthenticated) {
      // User just logged out
      handleLogout();
    }
    
    // Update previous auth state
    prevAuthRef.current = isNowAuthenticated;

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authTokenExpired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authTokenExpired', handleTokenExpired);
    };
  }, [isAuthenticated, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '' || isLoading) return;

    const userMessageText = inputMessage.trim();

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Add a placeholder message for loading state
    const loadingMessageId = Date.now() + 1;
    const loadingMessage = {
      id: loadingMessageId,
      text: 'Đang suy nghĩ...',
      sender: 'bot',
      timestamp: new Date(),
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Call API to get bot response - returns full response object
      const response = await chat(userMessageText, sessionId || null);

      // Update session_id from server response
      if (response.session_id) {
        localStorage.setItem(CHAT_SESSION_ID_KEY, response.session_id);
        setSessionId(response.session_id);
      }

      // Check if we need to restore conversation history (first message after page load)
      // conversation_history includes all previous messages + current message
      const shouldRestoreHistory = messages.length <= 2 && // Only welcome message or welcome + user message
                                   response.conversation_history && 
                                   response.conversation_history.length > 1; // More than just current message
      
      if (shouldRestoreHistory) {
        // Restore full conversation from server
        const restoredMessages = [];
        
        // Add welcome message
        restoredMessages.push({
          id: 1,
          text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
          sender: 'bot',
          timestamp: new Date()
        });
        
        // Convert conversation_history tuples to messages
        // conversation_history format: [(user_text, bot_text), ...]
        response.conversation_history.forEach(([userText, botText], index) => {
          restoredMessages.push({
            id: Date.now() + index * 2,
            text: userText,
            sender: 'user',
            timestamp: new Date()
          });
          restoredMessages.push({
            id: Date.now() + index * 2 + 1,
            text: botText,
            sender: 'bot',
            timestamp: new Date()
          });
        });
        
        // Remove loading message and set all messages
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== loadingMessageId);
          return restoredMessages;
        });
        
        console.log('[Chatbot] Restored conversation from server:', restoredMessages.length, 'messages');
      } else {
        // Normal flow: just add bot response
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== loadingMessageId);
          return [...filtered, {
            id: Date.now(),
            text: response.answer || 'Xin lỗi, tôi không hiểu câu hỏi của bạn.',
            sender: 'bot',
            timestamp: new Date()
          }];
        });
      }

    } catch (error) {
      // Silently handle errors - no console logs to reduce noise
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessageId);
        return [...filtered, {
          id: Date.now(),
          text: error.message || 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
          sender: 'bot',
          timestamp: new Date(),
          isError: true
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {/* Floating Chat Button */}
      <button 
        className={`chatbot-button ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window" ref={chatWindowRef}>
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="chatbot-header-text">
                <h3>Hỗ trợ trực tuyến</h3>
                <span className="chatbot-status">Đang trực tuyến</span>
              </div>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'} ${message.isError ? 'is-error' : ''} ${message.isLoading ? 'is-loading' : ''}`}
              >
                <div className="message-content">
                  {message.text}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString('vi-VN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Nhập tin nhắn của bạn..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button 
              type="submit" 
              className="chatbot-send-button" 
              disabled={inputMessage.trim() === '' || isLoading}
            >
              {isLoading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spinning">
                  <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
