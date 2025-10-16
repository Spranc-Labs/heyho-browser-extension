/**
 * API Client Module
 *
 * Handles all HTTP requests to the backend API
 * Includes automatic JWT token injection and error handling
 */

const ApiClient = (function() {
  'use strict';

  /**
   * Get the API base URL from config
   */
  function getBaseURL() {
    return self.ConfigModule?.API_BASE_URL || 'http://localhost:3000/api/v1';
  }

  /**
   * Get stored access token
   */
  async function getAccessToken() {
    const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
    const result = await storage.get('accessToken');
    return result.accessToken || null;
  }

  /**
   * Make an HTTP request
   *
   * @param {string} endpoint - API endpoint (e.g., '/auth/login')
   * @param {object} options - Request options
   * @returns {Promise<object>} - Response data
   */
  async function request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      authenticated = false,
      timeout = 30000
    } = options;

    const url = `${getBaseURL()}${endpoint}`;

    // Build headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Add JWT token if authenticated request
    if (authenticated) {
      const token = await getAccessToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Build request config
    const config = {
      method,
      headers: requestHeaders,
      mode: 'cors',
      credentials: 'omit'
    };

    // Add body for POST/PUT requests
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      // Make request with timeout
      const response = await Promise.race([
        fetch(url, config),
        timeoutPromise
      ]);

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle HTTP errors
      if (!response.ok) {
        throw new ApiError(
          data.message || data.error || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error) {
      console.error('API Request Error:', error);

      // Handle different error types
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message,
          status: error.status,
          details: error.details
        };
      }

      // Network errors
      if (error.message === 'Failed to fetch' || error.message === 'NetworkError') {
        return {
          success: false,
          error: 'Network error. Please check your connection.',
          status: 0
        };
      }

      // Timeout errors
      if (error.message === 'Request timeout') {
        return {
          success: false,
          error: 'Request timeout. Please try again.',
          status: 0
        };
      }

      // Generic error
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
        status: 0
      };
    }
  }

  /**
   * Custom API Error class
   */
  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.details = details;
    }
  }

  /**
   * GET request
   */
  async function get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async function post(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async function put(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async function patch(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async function del(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' });
  }

  // Public API
  return {
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    ApiError
  };
})();

// Export for browser environment
self.ApiClient = ApiClient;
