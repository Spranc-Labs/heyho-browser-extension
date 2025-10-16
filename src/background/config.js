/**
 * Configuration Module for HeyHo Extension
 *
 * Centralizes configuration flags and constants used across the extension.
 */

// Developer mode flag for logging
// Cross-browser detection: development extensions don't have update_url
const IS_DEV_MODE = !('update_url' in browser.runtime.getManifest());

// Development logging buffer for first 10 events
const devLogBuffer = [];

// API Configuration
// TODO: Update these URLs to match your deployed backend
const API_CONFIG = {
  // Development API (local Rails server)
  development: 'http://localhost:3000/api/v1',

  // Staging API (update with your staging URL)
  staging: 'https://your-staging-api.com/api/v1',

  // Production API (update with your production URL)
  production: 'https://your-production-api.com/api/v1'
};

// Select API URL based on environment
const API_BASE_URL = IS_DEV_MODE ? API_CONFIG.development : API_CONFIG.production;

// Export for browser environment
self.ConfigModule = {
  IS_DEV_MODE,
  devLogBuffer,
  API_BASE_URL,
  API_CONFIG
};