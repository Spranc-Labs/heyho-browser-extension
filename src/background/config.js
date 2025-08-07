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

// Export for browser environment
self.ConfigModule = {
  IS_DEV_MODE,
  devLogBuffer
};