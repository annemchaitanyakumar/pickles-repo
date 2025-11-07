import { Client } from '@stomp/stompjs';
import { tokenService } from './tokenService';
import SockJS from 'sockjs-client/dist/sockjs';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:4040/ws';
const RECONNECT_DELAY = 5000;
const CONNECTION_TIMEOUT = 10000;
const MAX_RECONNECT_ATTEMPTS = 5;

class NotificationService {
  constructor() {
    this.client = null;
    this.subscribers = new Set();
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = MAX_RECONNECT_ATTEMPTS;
    this.connectionTimeout = null;
    this.unreadCount = 0; // keep track of unread notifications
    this._started = false;

    // Try to connect in background when the service is instantiated.
    // If no token is available yet, the connect() will reject; we also
    // listen for an auth:set event (dispatched by tokenService) and
    // attempt to connect when authentication becomes available.
    if (typeof window !== 'undefined') {
      // Attempt an initial connect asynchronously (non-blocking)
      setTimeout(() => {
        this.connect().catch(() => {});
      }, 0);

      // When authentication is set (tokenService dispatches 'auth:set'),
      // try to connect again so the websocket becomes active automatically.
      window.addEventListener('auth:set', () => {
        this.connect().catch(() => {});
      });
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.client?.connected) {
        resolve(this.client);
        return;
      }

      // Clear any existing connection
      this.disconnect();

      const token = tokenService.getAccessToken();
      if (!token) {
        const error = new Error('No authentication token found');
        console.error(error);
        reject(error);
        return;
      }

      this.connectionTimeout = setTimeout(() => {
        if (this.connectionAttempts < this.maxConnectionAttempts) {
          console.log(`Retrying connection (${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`);
          this.disconnect();
          this.connect().then(resolve).catch(reject);
        } else {
          const error = new Error('WebSocket connection timeout after multiple attempts');
          console.error(error);
          reject(error);
          this.disconnect();
        }
      }, CONNECTION_TIMEOUT);

      this.client = new Client({
        webSocketFactory: () => {
          const socket = new SockJS(WEBSOCKET_URL, null, {
            transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Auth-Token': token
            }
          });
          socket.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            this.handleConnectionError(event);
          };
          socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleConnectionError(error);
          };
          return socket;
        },
        connectHeaders: {
          Authorization: `Bearer ${token}`,
          'X-Auth-Token': token
        },
        debug: (str) => console.debug('STOMP:', str),
        reconnectDelay: RECONNECT_DELAY,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          this.handleConnectionError(frame);
        },
        onConnect: () => {
          console.log('Connected to STOMP');
          clearTimeout(this.connectionTimeout);
          try {
            this.client.subscribe('/topic/admin/notifications', (message) => {
              const notification = JSON.parse(message.body);
              // Update unread count and notify app-wide listeners
              this._incrementUnread(notification);
              this.notifySubscribers(notification);
            });
            resolve(this.client);
          } catch (error) {
            console.error('Error subscribing to notifications:', error);
            reject(error);
          }
        }
      });
      this.client.activate();
    });
  }

  handleConnectionError(error) {
    console.error('Connection error:', error);
    console.log('Current token:', tokenService.getAccessToken());
    
    // Check if token is expired or will expire soon
    const token = tokenService.getAccessToken();
    if (!token || tokenService.willTokenExpireSoon(token)) {
      console.log('Token expired or expiring soon, attempting refresh...');
      tokenService.refreshToken()
        .then(() => {
          console.log('Token refreshed, retrying connection...');
          this.connectionAttempts = 0; // Reset attempts after token refresh
          this.connect().catch(() => {});
        })
        .catch(err => {
          console.error('Token refresh failed:', err);
          this.connectionAttempts++;
          this.handleRetry();
        });
      return;
    }

    this.connectionAttempts++;
    this.handleRetry();
  }

  handleRetry() {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      console.log(`Will retry connection (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      const backoffDelay = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 10000);
      console.log(`Waiting ${backoffDelay}ms before next attempt...`);
      setTimeout(() => this.connect(), backoffDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.disconnect();
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    this.connectionAttempts = 0;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(notification) {
    this.subscribers.forEach((callback) => callback(notification));

    // Also emit a global window event so UI outside the dialog (eg. navbar)
    // can listen and update badge counts without subscribing directly to the service.
    this._emitUpdateEvent(notification);
  }

  _incrementUnread(notification) {
    try {
      // increment unread for incoming notifications
      this.unreadCount = (this.unreadCount || 0) + 1;
      this._emitUpdateEvent(notification);
    } catch (e) {
      console.warn('Failed to increment unread count', e);
    }
  }

  _emitUpdateEvent(latestNotification = null) {
    if (typeof window === 'undefined') return;
    try {
      const detail = {
        unreadCount: this.unreadCount || 0,
        latestNotification
      };
      window.dispatchEvent(new CustomEvent('notifications:updated', { detail }));
    } catch (e) {
      console.warn('Failed to dispatch notifications:updated event', e);
    }
  }

  async fetchNotifications() {
    try {
      const token = tokenService.getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Using token:', token);

      const authHeader = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;

      const response = await fetch('http://localhost:4040/api/get-notifications', {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch notifications');
      }

      const data = await response.json();
      // Update internal unread count and emit update
      try {
        this.unreadCount = Array.isArray(data) ? data.filter(n => !n.readFlag).length : 0;
        this._emitUpdateEvent(null);
      } catch (e) {}

      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationsAsRead(ids) {
    try {
      const token = tokenService.getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const authHeader = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;

      const response = await fetch('http://localhost:4040/api/mark-read', {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(ids),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to mark notifications as read');
      }

      // Decrement unread count conservatively and emit update
      try {
        this.unreadCount = Math.max(0, (this.unreadCount || 0) - (ids ? ids.length : 0));
        this._emitUpdateEvent(null);
      } catch (e) {}

      return await response.text();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Synchronous getter for UI components to fetch unread count
  getUnreadCount() {
    return this.unreadCount || 0;
  }
}

export const notificationService = new NotificationService();
