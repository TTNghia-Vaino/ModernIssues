import * as SignalR from '@microsoft/signalr';
import { getBaseURL } from '../config/api.js';

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.joinedGroups = new Set(); // Track groups that have been joined
    this.isConnecting = false; // Prevent multiple simultaneous connections
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

  // Register event handlers for SignalR connection
  registerEventHandlers() {
    if (!this.connection) {
      console.warn('[SignalR] Cannot register event handlers - no connection');
      return;
    }

    console.log('[SignalR] Registering event handlers...');

    // Remove existing handlers to avoid duplicates
    this.connection.off('PaymentSuccess');
    this.connection.off('JoinedGroup');
    this.connection.off('close');
    this.connection.off('reconnecting');
    this.connection.off('reconnected');

    // Register connection lifecycle handlers
    this.connection.onclose((error) => {
      console.log('[SignalR] Connection closed', error);
      this.isConnected = false;
      this.isConnecting = false;
    });

    this.connection.onreconnecting((error) => {
      console.log('[SignalR] Reconnecting...', error);
      this.isConnected = false;
    });

    this.connection.onreconnected(async (connectionId) => {
      console.log('[SignalR] Reconnected:', connectionId);
      this.isConnected = true;
      this.isConnecting = false;
      
      // Rejoin all groups that were previously joined
      if (this.joinedGroups.size > 0) {
        console.log('[SignalR] Rejoining groups after reconnect:', Array.from(this.joinedGroups));
        const groupsToRejoin = Array.from(this.joinedGroups);
        for (const gencode of groupsToRejoin) {
          try {
            await this.joinPaymentGroup(gencode, true); // Pass true to skip connection check
          } catch (error) {
            console.error(`[SignalR] Failed to rejoin group ${gencode}:`, error);
          }
        }
      }
    });

    // Listen for payment success notifications
    this.connection.on('PaymentSuccess', (data) => {
      console.log('[SignalR] ===== PaymentSuccess event received =====');
      console.log('[SignalR] Raw data received:', data);
      console.log('[SignalR] Data:', JSON.stringify(data, null, 2));
      console.log('[SignalR] Data type:', typeof data);
      console.log('[SignalR] Listeners count:', this.listeners.get('PaymentSuccess')?.length || 0);
      console.log('[SignalR] All listeners:', Array.from(this.listeners.get('PaymentSuccess') || []).map(l => l.id));
      console.log('[SignalR] Connection state:', this.connection?.state);
      console.log('[SignalR] Is connected:', this.isConnected);
      console.log('[SignalR] Connection ID:', this.connection?.connectionId);
      console.log('[SignalR] Joined groups:', Array.from(this.joinedGroups));
      this.notifyListeners('PaymentSuccess', data);
    });

    this.connection.on('JoinedGroup', (gencode) => {
      console.log('[SignalR] Joined payment group:', gencode);
    });

    console.log('[SignalR] Event handlers registered');
  }

  // Connect to SignalR hub
  async connect() {
    if (this.connection && this.isConnected) {
      console.log('[SignalR] Already connected, connection state:', this.connection?.state);
      // Even if already connected, ensure event handlers are registered
      this.registerEventHandlers();
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log('[SignalR] Connection already in progress, waiting...');
      // Wait for existing connection attempt to complete
      let attempts = 0;
      while (this.isConnecting && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (this.isConnected) {
        return;
      }
    }

    this.isConnecting = true;

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
        .configureLogging(SignalR.LogLevel.Debug) // Maximum logging for debugging
        .build();

      // Register event handlers
      this.registerEventHandlers();

      // Start connection
      console.log('[SignalR] Starting connection...');
      await this.connection.start();
      this.isConnected = true;
      this.isConnecting = false;
      console.log('[SignalR] ✅ Connected successfully');
      console.log('[SignalR] Connection state:', this.connection.state);
      console.log('[SignalR] Connection ID:', this.connection.connectionId);
      console.log('[SignalR] Joined groups:', Array.from(this.joinedGroups));
      console.log('[SignalR] Event handlers registered:', {
        'PaymentSuccess': 'registered',
        'JoinedGroup': 'registered',
        'close': 'registered',
        'reconnecting': 'registered',
        'reconnected': 'registered'
      });
    } catch (error) {
      console.error('[SignalR] Connection error:', error);
      this.isConnected = false;
      this.isConnecting = false;
      throw error;
    }
  }

  // Disconnect from SignalR
  async disconnect() {
    if (this.connection) {
      try {
        this.joinedGroups.clear(); // Clear joined groups
        await this.connection.stop();
        this.isConnected = false;
        this.isConnecting = false;
        console.log('[SignalR] Disconnected');
      } catch (error) {
        console.error('[SignalR] Disconnect error:', error);
      }
    }
  }

  // Join payment group by gencode
  async joinPaymentGroup(gencode, skipConnectionCheck = false) {
    if (!gencode || typeof gencode !== 'string' || gencode.trim() === '') {
      console.warn('[SignalR] Invalid gencode provided:', gencode);
      throw new Error('Invalid gencode');
    }

    const trimmedGencode = gencode.trim();
    console.log('[SignalR] joinPaymentGroup called with gencode:', trimmedGencode);
    console.log('[SignalR] Current connection state:', this.connection?.state);
    console.log('[SignalR] Is connected:', this.isConnected);
    console.log('[SignalR] Skip connection check:', skipConnectionCheck);

    // Ensure connection is established
    if (!skipConnectionCheck) {
      if (!this.connection || !this.isConnected) {
        console.log('[SignalR] Not connected, connecting first...');
        await this.connect();
      }
    }

    // Wait for connection to be fully established
    if (this.connection) {
      let attempts = 0;
      const maxAttempts = 30;
      // Check connection state - can be 'Connected', 'Disconnected', 'Connecting', 'Reconnecting', or enum value
      const isConnected = () => {
        const state = this.connection.state;
        // Handle both string and enum values
        return state === 'Connected' || 
               state === SignalR.HubConnectionState?.Connected || 
               (typeof state === 'number' && state === 1); // Connected is typically 1
      };

      while (!isConnected() && attempts < maxAttempts) {
        console.log('[SignalR] Waiting for connection to be ready, state:', this.connection.state);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!isConnected()) {
        throw new Error(`SignalR connection not ready, state: ${this.connection.state}`);
      }
    }

    if (this.connection && this.isConnected) {
      try {
        const groupName = `payment_${trimmedGencode}`;
        console.log('[SignalR] Invoking JoinPaymentGroup with gencode:', trimmedGencode);
        console.log('[SignalR] Target group name:', groupName);
        console.log('[SignalR] Connection ID:', this.connection.connectionId);
        
        await this.connection.invoke('JoinPaymentGroup', trimmedGencode);
        
        this.joinedGroups.add(trimmedGencode); // Track joined group
        console.log('[SignalR] ✅ Successfully joined payment group for gencode:', trimmedGencode);
        console.log('[SignalR] Current joined groups:', Array.from(this.joinedGroups));
        console.log('[SignalR] Group name that backend should send to:', groupName);
      } catch (error) {
        console.error('[SignalR] ❌ Error joining payment group:', error);
        console.error('[SignalR] Connection state:', this.connection?.state);
        console.error('[SignalR] Error details:', {
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    } else {
      const errorMsg = `SignalR connection not available. Connection: ${!!this.connection}, IsConnected: ${this.isConnected}, State: ${this.connection?.state}`;
      console.error('[SignalR]', errorMsg);
      throw new Error(errorMsg);
    }
  }

  // Leave payment group
  async leavePaymentGroup(gencode) {
    if (!gencode) {
      return;
    }

    // Remove from tracking
    this.joinedGroups.delete(gencode);

    // Check if connection is ready
    const isConnectionReady = () => {
      if (!this.connection || !this.isConnected) return false;
      const state = this.connection.state;
      return state === 'Connected' || 
             state === SignalR.HubConnectionState?.Connected || 
             (typeof state === 'number' && state === 1);
    };

    if (isConnectionReady()) {
      try {
        await this.connection.invoke('LeavePaymentGroup', gencode);
        console.log('[SignalR] Left payment group for gencode:', gencode);
        console.log('[SignalR] Remaining joined groups:', Array.from(this.joinedGroups));
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
    console.log('[SignalR] onPaymentSuccess called, listener ID:', id);
    console.log('[SignalR] Total listeners now:', this.listeners.get('PaymentSuccess')?.length || 0);
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
    console.log(`[SignalR] ===== NotifyListeners called =====`);
    console.log(`[SignalR] Event: ${event}`);
    console.log(`[SignalR] Listeners count: ${listeners?.length || 0}`);
    console.log(`[SignalR] Data:`, JSON.stringify(data, null, 2));
    
    if (listeners && listeners.length > 0) {
      console.log(`[SignalR] Calling ${listeners.length} listener(s)...`);
      listeners.forEach(({ id, callback }, index) => {
        try {
          console.log(`[SignalR] [${index + 1}/${listeners.length}] Calling listener ${id}`);
          callback(data);
          console.log(`[SignalR] [${index + 1}/${listeners.length}] Listener ${id} completed successfully`);
        } catch (error) {
          console.error(`[SignalR] [${index + 1}/${listeners.length}] Listener ${id} callback error:`, error);
        }
      });
      console.log(`[SignalR] ✅ All listeners notified`);
    } else {
      console.warn(`[SignalR] ⚠️ No listeners registered for event: ${event}`);
      console.warn(`[SignalR] Available events:`, Array.from(this.listeners.keys()));
    }
  }
}

// Export singleton instance
export const signalRService = new SignalRService();
export default signalRService;

