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
      let responseData;

      // Try to parse response as JSON
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        console.error('[DjangoService] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });

        // Create error with response details
        const error = new Error(responseData.detail || 'Request failed');
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