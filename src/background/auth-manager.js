/**
 * Authentication Manager Module
 *
 * Handles user authentication, token management, and auth state
 */

const AuthManager = (function () {
  'use strict';

  const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };

  // Auth state
  let authState = {
    isAuthenticated: false,
    user: null,
    tokens: null,
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
      const result = await storage.get(['accessToken', 'refreshToken', 'tokenExpiry', 'userData']);

      if (result.accessToken && result.refreshToken) {
        authState.tokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiry: result.tokenExpiry,
        };

        // Get user data from storage (not from idToken)
        authState.user = result.userData;
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
        refresh_token: authState.tokens.refreshToken,
      });

      if (response.success && response.data) {
        const tokenData = response.data.data || response.data;

        // Sync-be refresh returns only new access_token (not refresh_token or user)
        const newAccessToken = tokenData.access_token || tokenData.AccessToken;
        const expiresIn = tokenData.ExpiresIn || 3600;

        // Update stored access token
        await storage.set({
          accessToken: newAccessToken,
          tokenExpiry: Date.now() + expiresIn * 1000,
        });

        // Update auth state
        authState.tokens.accessToken = newAccessToken;
        authState.tokens.expiry = Date.now() + expiresIn * 1000;

        if (IS_DEV_MODE) {
          console.log('✅ Token refreshed successfully');
        }

        return true;
      }

      if (IS_DEV_MODE) {
        console.log('❌ Token refresh failed:', response.error || response.message);
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
        password,
      });

      // Handle new backend response format
      // ApiClient returns: { success: true, data: <backend response> }
      // Backend returns: { data: { AccessToken, RefreshToken, IdToken, ExpiresIn } }
      if (response.success && response.data) {
        // DEBUG: Log the actual response structure
        if (IS_DEV_MODE) {
          console.log('🔍 Full response:', JSON.stringify(response, null, 2));
          console.log('🔍 response.data:', JSON.stringify(response.data, null, 2));
        }

        // Extract the actual token data from nested structure
        const tokenData = response.data.data || response.data;

        if (IS_DEV_MODE) {
          console.log('🔍 tokenData:', JSON.stringify(tokenData, null, 2));
          console.log('🔍 AccessToken exists:', !!tokenData.AccessToken);
          console.log('🔍 RefreshToken exists:', !!tokenData.RefreshToken);
        }

        const accessToken = tokenData.AccessToken;
        const refreshToken = tokenData.RefreshToken;
        const expiresIn = tokenData.ExpiresIn || 3600;

        if (!accessToken || !refreshToken) {
          if (IS_DEV_MODE) {
            console.error('❌ Missing tokens!');
            console.error('   AccessToken:', accessToken ? 'exists' : 'MISSING');
            console.error('   RefreshToken:', refreshToken ? 'exists' : 'MISSING');
            console.error('   tokenData keys:', Object.keys(tokenData));
          }
          return {
            success: false,
            error: 'Invalid response from server - missing tokens',
          };
        }

        // Store tokens first so ApiClient can use them for authenticated requests
        await storeTokens({
          accessToken,
          refreshToken,
          user: null, // Will be updated after fetching user data
          expiresIn,
        });

        // Fetch user data from /auth/me endpoint (requires authenticated flag)
        const userResponse = await self.ApiClient.get('/auth/me', {
          authenticated: true, // This tells ApiClient to add the Bearer token
        });

        if (IS_DEV_MODE) {
          console.log('🔍 /auth/me response:', JSON.stringify(userResponse, null, 2));
        }

        if (!userResponse.success || !userResponse.data?.user) {
          return {
            success: false,
            error: 'Failed to fetch user data',
          };
        }

        const user = userResponse.data.user;

        // Update stored tokens with user data
        await storeTokens({
          accessToken,
          refreshToken,
          user,
          expiresIn,
        });

        // Update auth state
        authState.isAuthenticated = true;
        authState.tokens = {
          accessToken,
          refreshToken,
          expiry: Date.now() + expiresIn * 1000,
        };

        // Store user data
        authState.user = user;

        if (IS_DEV_MODE) {
          console.log('✅ Login successful:', authState.user);
        }

        // Trigger data sync after successful login (if SyncManager available)
        if (self.SyncManager && self.SyncManager.syncToBackend) {
          setTimeout(() => {
            self.SyncManager.syncToBackend().catch((err) => {
              console.error('Post-login sync failed:', err);
            });
          }, 1000); // Wait 1 second to let UI settle
        }

        return { success: true, user: authState.user };
      }

      // Extract more detailed error message from response
      let errorMessage = response.error || response.message || 'Login failed';

      // If there are field-specific errors in details, use those
      if (response.details && response.details['field-error']) {
        const [field, fieldError] = response.details['field-error'];
        errorMessage = `${field}: ${fieldError}`;
      }

      if (IS_DEV_MODE) {
        console.log('❌ Login failed:', errorMessage, response);
      }

      return { success: false, error: errorMessage };
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

      const response = await self.ApiClient.post('/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });

      if (response.success && response.data) {
        const tokenData = response.data.data || response.data;

        // Sync-be returns tokens immediately on signup (no email verification)
        const accessToken = tokenData.access_token || tokenData.AccessToken;
        const refreshToken = tokenData.refresh_token || tokenData.RefreshToken;
        const user = tokenData.user;

        // Default to 1 hour expiry if not provided
        const expiresIn = tokenData.ExpiresIn || 3600;

        // Store tokens
        await storeTokens({
          accessToken,
          refreshToken,
          user,
          expiresIn,
        });

        // Update auth state
        authState.isAuthenticated = true;
        authState.tokens = {
          accessToken,
          refreshToken,
          expiry: Date.now() + expiresIn * 1000,
        };

        // Store user data
        authState.user = user;

        if (IS_DEV_MODE) {
          console.log('✅ Signup successful, user logged in:', authState.user);
        }

        return {
          success: true,
          user: authState.user,
        };
      }

      return { success: false, error: response.error || response.message || 'Signup failed' };
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
        code: code,
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
        email,
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
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      tokenExpiry: Date.now() + tokenData.expiresIn * 1000,
      userData: tokenData.user,
    });
  }

  /**
   * Clear authentication data
   */
  async function clearAuth() {
    authState = {
      isAuthenticated: false,
      user: null,
      tokens: null,
    };

    await storage.remove(['accessToken', 'refreshToken', 'tokenExpiry', 'userData']);
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
      user: authState.user,
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
    getAuthState,
  };
})();

// Export for browser environment
self.AuthManager = AuthManager;
