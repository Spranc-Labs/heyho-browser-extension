/**
 * Authentication UI Logic
 * Handles form submissions, validations, and UI interactions
 */

// UI Timing Constants (in milliseconds)
const UI_DELAYS = {
  SUCCESS_REDIRECT: 1500, // Delay before redirect on success
  ALERT_AUTO_HIDE: 5000, // Auto-hide alerts after 5s
  VERIFICATION_CHECK: 2000, // Check verification status every 2s
  ALERT_SLIDE_IN: 300, // Alert slide-in animation duration
};

// Validation Constants
const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MIN_NAME_LENGTH: 2,
  VERIFICATION_CODE_LENGTH: 6,
};

// Font weight constant
const FONT_WEIGHT_BOLD = 600;

class AuthUI {
  constructor() {
    this.alertContainer = document.getElementById('alert-container');
    this.currentPage = this.detectPage();
    this.initializePage();
  }

  /**
   * Detect which auth page we're on
   */
  detectPage() {
    const path = window.location.pathname;
    if (path.includes('login.html')) {
      return 'login';
    }
    if (path.includes('signup.html')) {
      return 'signup';
    }
    if (path.includes('verify.html')) {
      return 'verify';
    }
    return 'unknown';
  }

  /**
   * Initialize the current page
   */
  initializePage() {
    switch (this.currentPage) {
      case 'login':
        this.initLoginPage();
        break;
      case 'signup':
        this.initSignupPage();
        break;
      case 'verify':
        this.initVerifyPage();
        break;
    }
  }

  /**
   * Initialize login page
   */
  initLoginPage() {
    const form = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      // Validate
      if (!this.validateEmail(email)) {
        this.showAlert('Please enter a valid email address', 'error');
        return;
      }

      if (!password) {
        this.showAlert('Please enter your password', 'error');
        return;
      }

      // Show loading state
      loginBtn.classList.add('loading');
      loginBtn.disabled = true;

      try {
        // Send message to background script to handle login
        const response = await chrome.runtime.sendMessage({
          action: 'login',
          data: { email, password },
        });

        console.log('Login response:', response);

        if (!response) {
          this.showAlert('No response from background script', 'error');
          return;
        }

        if (response.success) {
          this.showAlert('Login successful! Redirecting...', 'success');

          // Redirect to popup after short delay
          setTimeout(() => {
            window.close();
          }, UI_DELAYS.SUCCESS_REDIRECT);
        } else {
          this.showAlert(response.error || 'Login failed. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Login error:', error);
        this.showAlert(`Error: ${error.message || 'An error occurred'}`, 'error');
      } finally {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
      }
    });

    // Forgot password button
    const forgotBtn = document.getElementById('forgot-password-btn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        this.showAlert('Password reset feature coming soon!', 'info');
      });
    }
  }

  /**
   * Initialize signup page
   */
  initSignupPage() {
    const form = document.getElementById('signup-form');
    const signupBtn = document.getElementById('signup-btn');
    const passwordInput = document.getElementById('password');

    // Password strength validation
    passwordInput.addEventListener('input', (e) => {
      this.validatePasswordStrength(e.target.value);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firstName = document.getElementById('first-name').value.trim();
      const lastName = document.getElementById('last-name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      // Validate all fields
      if (!firstName || !lastName) {
        this.showAlert('Please enter your first and last name', 'error');
        return;
      }

      if (!this.validateEmail(email)) {
        this.showAlert('Please enter a valid email address', 'error');
        return;
      }

      if (!this.isPasswordStrong(password)) {
        this.showAlert('Password does not meet requirements', 'error');
        return;
      }

      if (password !== confirmPassword) {
        this.showAlert('Passwords do not match', 'error');
        return;
      }

      // Show loading state
      signupBtn.classList.add('loading');
      signupBtn.disabled = true;

      try {
        // Send message to background script to handle signup
        const response = await chrome.runtime.sendMessage({
          action: 'signup',
          data: {
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          },
        });

        if (response.success) {
          // Store email for verification page
          await chrome.storage.local.set({ pendingVerificationEmail: email });

          this.showAlert('Account created! Redirecting to verification...', 'success');

          // Redirect to verify page
          setTimeout(() => {
            window.location.href = 'verify.html';
          }, UI_DELAYS.SUCCESS_REDIRECT);
        } else {
          this.showAlert(response.error || 'Signup failed. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Signup error:', error);
        this.showAlert('An error occurred. Please try again.', 'error');
      } finally {
        signupBtn.classList.remove('loading');
        signupBtn.disabled = false;
      }
    });
  }

  /**
   * Initialize verify page
   */
  async initVerifyPage() {
    const form = document.getElementById('verify-form');
    const verifyBtn = document.getElementById('verify-btn');
    const resendBtn = document.getElementById('resend-btn');
    const codeInput = document.getElementById('verification-code');

    // Get pending email from storage
    const { pendingVerificationEmail } = await chrome.storage.local.get('pendingVerificationEmail');

    if (pendingVerificationEmail) {
      document.getElementById('user-email').textContent = pendingVerificationEmail;
    } else {
      this.showAlert('No pending verification found', 'error');
      setTimeout(() => {
        window.location.href = 'signup.html';
      }, UI_DELAYS.VERIFICATION_CHECK);
      return;
    }

    // Auto-format code input (numbers only)
    codeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Handle verify form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const code = codeInput.value.trim();

      if (code.length !== VALIDATION.VERIFICATION_CODE_LENGTH) {
        this.showAlert(`Please enter a ${VALIDATION.VERIFICATION_CODE_LENGTH}-digit code`, 'error');
        return;
      }

      verifyBtn.classList.add('loading');
      verifyBtn.disabled = true;

      try {
        // Get the pending email from storage
        const { pendingVerificationEmail } = await chrome.storage.local.get(
          'pendingVerificationEmail'
        );

        const response = await chrome.runtime.sendMessage({
          action: 'verifyEmail',
          data: {
            email: pendingVerificationEmail,
            code,
          },
        });

        if (response.success) {
          this.showAlert('Email verified successfully! Redirecting to login...', 'success');

          // Clear pending verification
          await chrome.storage.local.remove('pendingVerificationEmail');

          // Redirect to login
          setTimeout(() => {
            window.location.href = 'login.html';
          }, UI_DELAYS.SUCCESS_REDIRECT);
        } else {
          this.showAlert(response.error || 'Invalid verification code', 'error');
        }
      } catch (error) {
        console.error('Verification error:', error);
        this.showAlert('An error occurred. Please try again.', 'error');
      } finally {
        verifyBtn.classList.remove('loading');
        verifyBtn.disabled = false;
      }
    });

    // Handle resend button
    resendBtn.addEventListener('click', async () => {
      resendBtn.classList.add('loading');
      resendBtn.disabled = true;

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'resendVerification',
          data: { email: pendingVerificationEmail },
        });

        if (response.success) {
          this.showAlert('Verification code resent! Check your email.', 'success');
        } else {
          this.showAlert(response.error || 'Failed to resend code', 'error');
        }
      } catch (error) {
        console.error('Resend error:', error);
        this.showAlert('An error occurred. Please try again.', 'error');
      } finally {
        resendBtn.classList.remove('loading');
        resendBtn.disabled = false;
      }
    });
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Check if password meets strength requirements
   */
  isPasswordStrong(password) {
    return (
      password.length >= VALIDATION.MIN_PASSWORD_LENGTH &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
    );
  }

  /**
   * Validate password strength and update UI
   */
  validatePasswordStrength(password) {
    const requirements = {
      length: password.length >= VALIDATION.MIN_PASSWORD_LENGTH,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };

    // Update UI for each requirement
    Object.entries(requirements).forEach(([req, valid]) => {
      const element = document.getElementById(`req-${req}`);
      if (element) {
        if (valid) {
          element.classList.add('valid');
        } else {
          element.classList.remove('valid');
        }
      }
    });

    return Object.values(requirements).every((valid) => valid);
  }

  /**
   * Show alert message
   */
  showAlert(message, type = 'info') {
    // Clear existing alerts
    this.alertContainer.innerHTML = '';

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;

    // Add icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    // Create icon span
    const iconSpan = document.createElement('span');
    iconSpan.style.fontWeight = String(FONT_WEIGHT_BOLD);
    iconSpan.textContent = icons[type] || 'ℹ';

    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    // Append to alert
    alert.appendChild(iconSpan);
    alert.appendChild(messageSpan);

    this.alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), UI_DELAYS.ALERT_SLIDE_IN);
      }, UI_DELAYS.ALERT_AUTO_HIDE);
    }
  }

  /**
   * Clear all alerts
   */
  clearAlerts() {
    this.alertContainer.innerHTML = '';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AuthUI();
  });
} else {
  new AuthUI();
}
