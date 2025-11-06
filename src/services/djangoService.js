// src/services/djangoService.js
import { tokenService } from './tokenService';

class DjangoService {
  constructor() {
    this.baseUrl = `${import.meta.env.VITE_DJANGO_URL}`;
  }

  // Make authenticated requests to Django backend
  async request(method, endpoint, data = null, options = {}) {
    // Get user info and validate role
    const userData = localStorage.getItem('authData');
    const userInfo = userData ? JSON.parse(userData) : null;
    const userRole = userInfo?.role || '';

    if (!userRole.includes('ADMIN')) {
      throw new Error('Admin access required');
    }

    // Get the token
    const token = tokenService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Ensure clean token without 'Bearer ' prefix for header
    const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

    // Log request details
    console.log('[DjangoService] Request:', {
      url: endpoint,
      method,
      role: userRole
    });

    const url = `${this.baseUrl}${endpoint}`;
    
    // Set up headers based on whether we're sending FormData or JSON
    const headers = {
      'Authorization': `Bearer ${cleanToken}`,
      'Accept': 'application/json'
    };

    // Only add Content-Type for JSON requests, let browser set it for FormData
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      method,
      headers,
      credentials: 'include',
      ...options
    };

    // Decode and log JWT payload for debugging
    try {
      var jwtPart = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      var parts = jwtPart.split('.');
      var decodedPayload = JSON.parse(atob(parts[1]));
      console.log('[DjangoService] JWT payload:', decodedPayload);
    } catch (e) {
      console.warn('[DjangoService] Could not decode JWT:', e);
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.body = JSON.stringify(data);
    }

    try {
        console.log('[DjangoService] Request headers:', {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        });
      const response = await fetch(url, config);
      let responseData = null;

      // Handle no-content responses explicitly
      if (response.status === 204) {
        responseData = null;
      } else {
        // Try parsing JSON first using a cloned response to avoid consuming the stream
        try {
          responseData = await response.clone().json();
        } catch (e) {
          // Fallback to text if JSON parsing fails
          try {
            responseData = await response.clone().text();
          } catch (e2) {
            // As a last resort, leave responseData null
            responseData = null;
          }
        }
      }

      // Handle error responses
      if (!response.ok) {
        console.error('[DjangoService] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });

        // Determine a friendly error message
        let message = 'Request failed';
        if (responseData) {
          if (typeof responseData === 'string') message = responseData;
          else if (responseData.detail) message = responseData.detail;
          else message = JSON.stringify(responseData);
        } else if (response.statusText) {
          message = response.statusText;
        }

        const error = new Error(message);
        error.response = {
          status: response.status,
          data: responseData
        };
        throw error;
      }

      return responseData;
    } catch (error) {
      console.error('[DjangoService] Request error:', error);
      throw error;
    }
  }

  // Specific methods for product management
  async deleteProduct(productId) {
    try {
      await this.request('DELETE', `/products/${productId}/`);
      return true;
    } catch (error) {
      if (error.response?.status === 404 || error.message.includes('No Product matches')) {
        throw new Error(`Product #${productId} was not found or was already deleted`);
      }
      throw error;
    }
  }

  // Permanently delete a product (hard delete)
  async hardDeleteProduct(productId) {
    try {
      await this.request('DELETE', `/products/${productId}/hard-delete/`);
      return true;
    } catch (error) {
      if (error.response?.status === 404 || error.message.includes('No Product matches')) {
        throw new Error(`Product #${productId} was not found or was already deleted`);
      }
      throw error;
    }
  }

  // Restore a soft-deleted (inactive) product
  async restoreProduct(productId) {
    try {
      return await this.request('POST', `/products/${productId}/restore/`);
    } catch (error) {
      if (error.response?.status === 404 || error.message.includes('No Product matches')) {
        throw new Error(`Product #${productId} was not found`);
      }
      throw error;
    }
  }

  async updateProduct(productId, data) {
    try {
      return await this.request('PUT', `/products/${productId}/`, data);
    } catch (error) {
      if (error.response?.status === 404 || error.message.includes('No Product matches')) {
        throw new Error(`Product #${productId} not found`);
      }
      throw error;
    }
  }

  async createProduct(data) {
    return this.request('POST', '/products/', data);
  }
}

export const djangoService = new DjangoService();