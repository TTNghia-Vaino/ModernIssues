import * as SignalR from '@microsoft/signalr';
import { getBaseURL } from '../config/api.js';

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  // Get SignalR URL
  getSignalRUrl() {
    const baseUrl = getBaseURL();
    // SignalR endpoint không có /v1 prefix
    if (baseUrl) {
      return `${baseUrl}/paymentHub`;
    }
    return '/paymentHub';
  }

  // Connect to SignalR hub
  async connect() {
    if (this.connection && this.isConnected) {
      console.log('[SignalR] Already connected');
      return;
    }

    try {
      const url = this.getSignalRUrl();
      console.log('[SignalR] Connecting to:', url);

      // Try WebSockets first, fallback to ServerSentEvents or LongPolling
      // Use bitwise OR to allow multiple transport types
      const connectionOptions = {
        // Don't skip negotiation in dev with proxy, let it negotiate
        skipNegotiation: false,
        // Allow WebSockets and ServerSentEvents as fallback
        transport: SignalR.HttpTransportType.WebSockets | SignalR.HttpTransportType.ServerSentEvents
      };

      this.connection = new SignalR.HubConnectionBuilder()
        .withUrl(url, connectionOptions)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            // Exponential backoff: 0s, 2s, 10s, 30s
            if (retryContext.previousRetryCount === 0) return 2000;
            if (retryContext.previousRetryCount === 1) return 10000;
            return 30000;
          }
        })
        .configureLogging(SignalR.LogLevel.Warning) // Reduce logging in production
        .build();

      // Register event handlers
      this.connection.onclose((error) => {
        console.log('[SignalR] Connection closed', error);
        this.isConnected = false;
      });

      this.connection.onreconnecting((error) => {
        console.log('[SignalR] Reconnecting...', error);
        this.isConnected = false;
      });

      this.connection.onreconnected((connectionId) => {
        console.log('[SignalR] Reconnected:', connectionId);
        this.isConnected = true;
      });

      // Listen for payment success notifications
      this.connection.on('PaymentSuccess', (data) => {
        console.log('[SignalR] Payment success received:', data);
        this.notifyListeners('PaymentSuccess', data);
      });

      this.connection.on('JoinedGroup', (gencode) => {
        console.log('[SignalR] Joined payment group:', gencode);
      });

      // Start connection
      await this.connection.start();
      this.isConnected = true;
      console.log('[SignalR] Connected successfully');
    } catch (error) {
      console.error('[SignalR] Connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  // Disconnect from SignalR
  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.stop();
        this.isConnected = false;
        console.log('[SignalR] Disconnected');
      } catch (error) {
        console.error('[SignalR] Disconnect error:', error);
      }
    }
  }

  // Join payment group by gencode
  async joinPaymentGroup(gencode) {
    if (!this.connection || !this.isConnected) {
      await this.connect();
    }

    if (this.connection && this.isConnected) {
      try {
        await this.connection.invoke('JoinPaymentGroup', gencode);
        console.log('[SignalR] Joined payment group for gencode:', gencode);
      } catch (error) {
        console.error('[SignalR] Error joining payment group:', error);
        throw error;
      }
    }
  }

  // Leave payment group
  async leavePaymentGroup(gencode) {
    if (this.connection && this.isConnected) {
      try {
        await this.connection.invoke('LeavePaymentGroup', gencode);
        console.log('[SignalR] Left payment group for gencode:', gencode);
      } catch (error) {
        console.error('[SignalR] Error leaving payment group:', error);
      }
    }
  }

  // Subscribe to payment success events
  onPaymentSuccess(callback) {
    const id = Date.now() + Math.random();
    if (!this.listeners.has('PaymentSuccess')) {
      this.listeners.set('PaymentSuccess', []);
    }
    this.listeners.get('PaymentSuccess').push({ id, callback });
    return id;
  }

  // Unsubscribe from events
  offPaymentSuccess(listenerId) {
    const listeners = this.listeners.get('PaymentSuccess');
    if (listeners) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Notify all listeners
  notifyListeners(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(({ callback }) => {
        try {
          callback(data);
        } catch (error) {
          console.error('[SignalR] Listener callback error:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const signalRService = new SignalRService();
export default signalRService;

