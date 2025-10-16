/**
 * Authentication Manager Module
 *
 * Handles user authentication, token management, and auth state
 */

const AuthManager = (function() {
  'use strict';

  const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };

  // Auth state
  let authState = {
    isAuthenticated: false,
    user: null,
    tokens: null
  };

  /**
   * Initialize auth manager
   */
  async function init() {
    if (IS_DEV_MODE) {
      console.log('🔐 Initializing Auth Manager...');
    }

    // Load existing auth state from storage
    await loadAuthState();

    // Check if tokens are valid
    if (authState.tokens) {
      const isValid = await validateTokens();
      if (!isValid) {
        await clearAuth();
      }
    }

    if (IS_DEV_MODE) {
      console.log('🔐 Auth Manager initialized. Authenticated:', authState.isAuthenticated);
    }
  }

  /**
   * Load auth state from storage
   */
  async function loadAuthState() {
    try {
      const result = await storage.get(['accessToken', 'idToken', 'refreshToken', 'tokenExpiry', 'userData']);

      if (result.accessToken && result.idToken) {
        authState.tokens = {
          accessToken: result.accessToken,
          idToken: result.idToken,
          refreshToken: result.refreshToken,
          expiry: result.tokenExpiry
        };

        // Decode user data from idToken
        authState.user = result.userData || decodeIdToken(result.idToken);
        authState.isAuthenticated = true;
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
  }

  /**
   * Validate if tokens are still valid
   */
  async function validateTokens() {
    if (!authState.tokens || !authState.tokens.expiry) {
      return false;
    }

    const now = Date.now();
    const expiry = authState.tokens.expiry;

    // Check if token expired
    if (now >= expiry) {
      if (IS_DEV_MODE) {
        console.log('⚠️ Access token expired, attempting refresh...');
      }
      // Attempt to refresh token
      const refreshResult = await refreshTokens();
      return refreshResult;
    }

    return true;
  }

  /**
   * Refresh access token using refresh token
   */
  async function refreshTokens() {
    try {
      if (!authState.tokens || !authState.tokens.refreshToken) {
        if (IS_DEV_MODE) {
          console.log('⚠️ No refresh token available');
        }
        return false;
      }

      if (IS_DEV_MODE) {
        console.log('🔄 Refreshing access token...');
      }

      const response = await self.ApiClient.post('/auth/refresh', {
        refreshToken: authState.tokens.refreshToken
      });

      if (response.success && response.data) {
        const tokenData = response.data.data || response.data;

        // Store new tokens
        await storeTokens(tokenData);

        // Update auth state
        authState.tokens = {
          accessToken: tokenData.AccessToken,
          idToken: tokenData.IdToken,
          refreshToken: tokenData.RefreshToken,
          expiry: Date.now() + (tokenData.ExpiresIn * 1000)
        };

        // Update user data from new ID token
        authState.user = decodeIdToken(tokenData.IdToken);

        if (IS_DEV_MODE) {
          console.log('✅ Token refreshed successfully');
        }

        return true;
      }

      if (IS_DEV_MODE) {
        console.log('❌ Token refresh failed:', response.error);
      }
      return false;

    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Ensure we have a valid access token
   * Automatically refreshes if token expires within 5 minutes
   * @returns {Promise<string|null>} Valid access token or null
   */
  async function ensureValidToken() {
    if (!authState.isAuthenticated || !authState.tokens) {
      return null;
    }

    const now = Date.now();
    const expiry = authState.tokens.expiry;
    const fiveMinutes = 5 * 60 * 1000;

    // Refresh if token expires in less than 5 minutes
    if (expiry - now < fiveMinutes) {
      if (IS_DEV_MODE) {
        console.log('🔄 Token expiring soon, preemptively refreshing...');
      }

      const refreshSuccess = await refreshTokens();
      if (!refreshSuccess) {
        // Refresh failed, clear auth
        await clearAuth();
        return null;
      }
    }

    return authState.tokens.accessToken;
  }

  /**
   * Login user
   */
  async function login(email, password) {
    try {
      if (IS_DEV_MODE) {
        console.log('🔐 Attempting login for:', email);
      }

      const response = await self.ApiClient.post('/auth/login', {
        email,
        password
      });

      if (response.success && response.data) {
        const tokenData = response.data.data || response.data;

        // Store tokens
        await storeTokens(tokenData);

        // Update auth state
        authState.isAuthenticated = true;
        authState.tokens = {
          accessToken: tokenData.AccessToken,
          idToken: tokenData.IdToken,
          refreshToken: tokenData.RefreshToken,
          expiry: Date.now() + (tokenData.ExpiresIn * 1000)
        };

        // Decode and store user data
        authState.user = decodeIdToken(tokenData.IdToken);

        if (IS_DEV_MODE) {
          console.log('✅ Login successful:', authState.user);
        }

        // Trigger data sync after successful login (if SyncManager available)
        if (self.SyncManager && self.SyncManager.syncToBackend) {
          setTimeout(() => {
            self.SyncManager.syncToBackend().catch(err => {
              console.error('Post-login sync failed:', err);
            });
          }, 1000); // Wait 1 second to let UI settle
        }

        return { success: true, user: authState.user };
      }

      return { success: false, error: response.error || 'Login failed' };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Sign up new user
   */
  async function signup(email, password, firstName, lastName) {
    try {
      if (IS_DEV_MODE) {
        console.log('🔐 Attempting signup for:', email);
      }

      const response = await self.ApiClient.post('/auth/create-account', {
        email,
        password,
        first_name: firstName,
        last_name: lastName
      });

      if (response.success) {
        if (IS_DEV_MODE) {
          console.log('✅ Signup successful, verification required');
        }

        return {
          success: true,
          message: 'Account created. Please verify your email.',
          verificationCode: response.data?.verification_code,
          user: response.data?.user
        };
      }

      return { success: false, error: response.error || 'Signup failed' };

    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Signup failed' };
    }
  }

  /**
   * Verify email with code
   */
  async function verifyEmail(email, code) {
    try {
      if (IS_DEV_MODE) {
        console.log('🔐 Attempting email verification with code:', code);
      }

      const response = await self.ApiClient.post('/verify-email', {
        email: email,
        code: code
      });

      if (response.success) {
        if (IS_DEV_MODE) {
          console.log('✅ Email verified successfully');
        }

        return { success: true, message: 'Email verified successfully' };
      }

      return { success: false, error: response.error || 'Verification failed' };

    } catch (error) {
      console.error('Verification error:', error);
      return { success: false, error: error.message || 'Verification failed' };
    }
  }

  /**
   * Resend verification code
   */
  async function resendVerification(email) {
    try {
      if (IS_DEV_MODE) {
        console.log('🔐 Resending verification code to:', email);
      }

      const response = await self.ApiClient.post('/resend-verification', {
        email
      });

      if (response.success) {
        if (IS_DEV_MODE) {
          console.log('✅ Verification code resent');
        }

        return { success: true, message: 'Verification code resent' };
      }

      return { success: false, error: response.error || 'Failed to resend code' };

    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, error: error.message || 'Failed to resend code' };
    }
  }

  /**
   * Logout user
   */
  async function logout() {
    try {
      if (IS_DEV_MODE) {
        console.log('🔐 Logging out user');
      }

      // Call logout endpoint to revoke token
      if (authState.tokens && authState.tokens.accessToken) {
        await self.ApiClient.post('/auth/logout', {}, { authenticated: true });
      }

      // Clear local auth state
      await clearAuth();

      if (IS_DEV_MODE) {
        console.log('✅ Logout successful');
      }

      return { success: true };

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local auth even if API call fails
      await clearAuth();
      return { success: true };
    }
  }

  /**
   * Store tokens in storage
   */
  async function storeTokens(tokenData) {
    await storage.set({
      accessToken: tokenData.AccessToken,
      idToken: tokenData.IdToken,
      refreshToken: tokenData.RefreshToken,
      tokenExpiry: Date.now() + (tokenData.ExpiresIn * 1000),
      userData: decodeIdToken(tokenData.IdToken)
    });
  }

  /**
   * Clear authentication data
   */
  async function clearAuth() {
    authState = {
      isAuthenticated: false,
      user: null,
      tokens: null
    };

    await storage.remove(['accessToken', 'idToken', 'refreshToken', 'tokenExpiry', 'userData']);
  }

  /**
   * Decode ID token to get user data
   */
  function decodeIdToken(idToken) {
    try {
      // Simple JWT decode (not validating signature, just extracting payload)
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));

      // Extract user data from token payload
      if (payload.data && payload.data.user) {
        return payload.data.user;
      }

      return null;
    } catch (error) {
      console.error('Failed to decode ID token:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  function getCurrentUser() {
    return authState.user;
  }

  /**
   * Check if user is authenticated
   */
  function isAuthenticated() {
    return authState.isAuthenticated;
  }

  /**
   * Get access token
   */
  function getAccessToken() {
    return authState.tokens?.accessToken || null;
  }

  /**
   * Get auth state
   */
  function getAuthState() {
    return {
      isAuthenticated: authState.isAuthenticated,
      user: authState.user
    };
  }

  // Public API
  return {
    init,
    login,
    signup,
    verifyEmail,
    resendVerification,
    logout,
    refreshTokens,
    ensureValidToken,
    getCurrentUser,
    isAuthenticated,
    getAccessToken,
    getAuthState
  };
})();

// Export for browser environment
self.AuthManager = AuthManager;
