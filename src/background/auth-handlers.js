/**
 * Authentication Message Handlers
 *
 * Handles messages from the auth UI and coordinates with AuthManager
 */

const AuthHandlers = (function() {
  'use strict';

  /**
   * Setup auth message handlers
   */
  function setupAuthMessageHandlers() {
    // Listen for messages from auth UI
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Only handle auth-related messages
      if (!message.action || !message.action.startsWith('auth-') && !['login', 'signup', 'verifyEmail', 'resendVerification', 'logout', 'getAuthState'].includes(message.action)) {
        return false; // Let other handlers process this message
      }

      // Handle auth actions asynchronously
      handleAuthAction(message, sender)
        .then(sendResponse)
        .catch(error => {
          console.error('Auth handler error:', error);
          sendResponse({
            success: false,
            error: error.message || 'An unexpected error occurred'
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    });

    if (self.ConfigModule?.IS_DEV_MODE) {
      console.log('✅ Auth message handlers registered');
    }
  }

  /**
   * Handle auth action
   */
  async function handleAuthAction(message, _sender) {
    const { action, data } = message;

    switch (action) {
    case 'login':
      return await handleLogin(data);

    case 'signup':
      return await handleSignup(data);

    case 'verifyEmail':
      return await handleVerifyEmail(data);

    case 'resendVerification':
      return await handleResendVerification(data);

    case 'logout':
      return await handleLogout();

    case 'getAuthState':
      return await handleGetAuthState();

    default:
      return {
        success: false,
        error: 'Unknown auth action'
      };
    }
  }

  /**
   * Handle login
   */
  async function handleLogin(data) {
    const { email, password } = data;

    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    const result = await self.AuthManager.login(email, password);

    if (result.success && self.ConfigModule?.IS_DEV_MODE) {
      console.log('✅ User logged in:', result.user?.email);
    }

    return result;
  }

  /**
   * Handle signup
   */
  async function handleSignup(data) {
    const { email, password, first_name, last_name } = data;

    if (!email || !password || !first_name || !last_name) {
      return {
        success: false,
        error: 'All fields are required'
      };
    }

    const result = await self.AuthManager.signup(email, password, first_name, last_name);

    if (result.success && self.ConfigModule?.IS_DEV_MODE) {
      console.log('✅ User signed up:', email);
    }

    return result;
  }

  /**
   * Handle email verification
   */
  async function handleVerifyEmail(data) {
    const { email, code } = data;

    if (!email) {
      return {
        success: false,
        error: 'Email is required'
      };
    }

    if (!code || code.length !== 6) {
      return {
        success: false,
        error: 'Valid 6-digit code is required'
      };
    }

    const result = await self.AuthManager.verifyEmail(email, code);

    if (result.success && self.ConfigModule?.IS_DEV_MODE) {
      console.log('✅ Email verified');
    }

    return result;
  }

  /**
   * Handle resend verification
   */
  async function handleResendVerification(data) {
    const { email } = data;

    if (!email) {
      return {
        success: false,
        error: 'Email is required'
      };
    }

    const result = await self.AuthManager.resendVerification(email);

    if (result.success && self.ConfigModule?.IS_DEV_MODE) {
      console.log('✅ Verification code resent to:', email);
    }

    return result;
  }

  /**
   * Handle logout
   */
  async function handleLogout() {
    const result = await self.AuthManager.logout();

    if (result.success && self.ConfigModule?.IS_DEV_MODE) {
      console.log('✅ User logged out');
    }

    return result;
  }

  /**
   * Handle get auth state
   */
  async function handleGetAuthState() {
    return {
      success: true,
      data: self.AuthManager.getAuthState()
    };
  }

  // Public API
  return {
    setupAuthMessageHandlers
  };
})();

// Export for browser environment
self.AuthHandlers = AuthHandlers;
