/**
 * Popup Script for HeyHo Extension Debug Panel
 *
 * Provides UI controls for testing and exporting aggregation data
 */

class DebugPanel {
  constructor() {
    this.logContainer = document.getElementById('log-container');
    this.maxLogEntries = 50;
    this.setupEventListeners();
    this.initialize();
  }

  /**
   * Initialize popup - wait for background script to be ready
   */
  async initialize() {
    try {
      // Load persisted activity log first
      await this.loadActivityLog();

      // Wait for background script to be ready
      await this.waitForBackgroundScript();

      // Load initial data
      await this.loadAuthState();
      await this.loadStats();
      await this.loadSyncState();
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.log('⚠️ Background script not ready. Please reload the extension.', 'error');
    }
  }

  /**
   * Wait for background script to be ready by attempting a simple ping
   */
  async waitForBackgroundScript(maxAttempts = 10, delay = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop -- Retry mechanism requires sequential attempts
        const response = await chrome.runtime.sendMessage({ action: 'getAuthState' });
        if (response) {
          return true; // Background script is ready
        }
      } catch (error) {
        // Background not ready yet, wait and retry
        if (i < maxAttempts - 1) {
          // eslint-disable-next-line no-await-in-loop -- Delay between retry attempts
          await new Promise((resolve) => {
            setTimeout(resolve, delay);
          });
        }
      }
    }
    throw new Error('Background script not responding');
  }

  /**
   * Load and display authentication state
   */
  async loadAuthState() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAuthState',
      });

      if (response.success && response.data) {
        this.updateAuthUI(response.data);
      } else {
        this.showLoggedOutState();
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      this.showLoggedOutState();
    }
  }

  /**
   * Update auth UI based on state
   */
  updateAuthUI(authState) {
    const loggedOut = document.getElementById('auth-logged-out');
    const loggedIn = document.getElementById('auth-logged-in');

    if (authState.isAuthenticated && authState.user) {
      // Show logged in state
      loggedOut.style.display = 'none';
      loggedIn.style.display = 'block';

      // Update user info
      const userName = document.getElementById('user-name');
      const userEmail = document.getElementById('user-email');
      const userAvatar = document.getElementById('user-avatar');

      if (authState.user.firstName && authState.user.lastName) {
        userName.textContent = `${authState.user.firstName} ${authState.user.lastName}`;
        // Generate initials for avatar
        const initials = `${authState.user.firstName[0]}${authState.user.lastName[0]}`;
        userAvatar.textContent = initials.toUpperCase();
      } else {
        userName.textContent = 'User';
      }

      userEmail.textContent = authState.user.email || '-';

      // Load sync state when user is authenticated
      this.loadSyncState();
    } else {
      this.showLoggedOutState();
    }
  }

  /**
   * Show logged out state
   */
  showLoggedOutState() {
    const loggedOut = document.getElementById('auth-logged-out');
    const loggedIn = document.getElementById('auth-logged-in');

    loggedOut.style.display = 'block';
    loggedIn.style.display = 'none';
  }

  /**
   * Load and display sync state
   */
  async loadSyncState() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSyncState',
      });

      if (response.success && response.data) {
        this.updateSyncUI(response.data);
      }
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  }

  /**
   * Update sync UI based on state
   */
  updateSyncUI(syncState) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const lastSyncTime = document.getElementById('last-sync-time');

    // Remove all status classes
    statusIndicator.classList.remove('connected', 'disconnected', 'syncing', 'error');

    if (syncState.isSyncing) {
      statusIndicator.classList.add('syncing');
      statusText.textContent = 'Syncing...';
    } else if (syncState.lastSyncStatus === 'success') {
      statusIndicator.classList.add('connected');
      statusText.textContent = 'Synced';
    } else if (syncState.lastSyncStatus === 'failed' || syncState.lastSyncStatus === 'error') {
      statusIndicator.classList.add('error');
      statusText.textContent = 'Sync failed';
    } else {
      statusIndicator.classList.add('connected');
      statusText.textContent = 'Connected';
    }

    // Update last sync time
    if (syncState.lastSyncTime) {
      const lastSyncDate = new Date(syncState.lastSyncTime);
      const now = Date.now();
      const diff = now - syncState.lastSyncTime;

      let timeAgo;
      if (diff < 60000) {
        timeAgo = 'Just now';
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        timeAgo = `${minutes}m ago`;
      } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        timeAgo = `${hours}h ago`;
      } else {
        timeAgo = lastSyncDate.toLocaleDateString();
      }

      lastSyncTime.textContent = `Last sync: ${timeAgo}`;
    } else {
      lastSyncTime.textContent = 'Never synced';
    }
  }

  /**
   * Update sync status indicator
   */
  updateSyncStatus(status) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    // Remove all status classes
    statusIndicator.classList.remove('connected', 'disconnected', 'syncing');

    switch (status) {
      case 'connected':
        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
        break;
      case 'disconnected':
        statusIndicator.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
        break;
      case 'syncing':
        statusIndicator.classList.add('syncing');
        statusText.textContent = 'Syncing...';
        break;
    }
  }

  setupEventListeners() {
    // Auth button listeners
    const loginBtn = document.getElementById('btn-login');
    const signupBtn = document.getElementById('btn-signup');
    const logoutBtn = document.getElementById('btn-logout');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.openLoginPage());
    }

    if (signupBtn) {
      signupBtn.addEventListener('click', () => this.openSignupPage());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Sync button listener
    const syncBtn = document.getElementById('btn-sync-now');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSyncNow());
    }

    // Aggregation controls
    document.getElementById('trigger-aggregation').addEventListener('click', () => {
      this.triggerAggregation();
    });

    document.getElementById('run-migration').addEventListener('click', () => {
      this.runMigration();
    });

    document.getElementById('view-raw-events').addEventListener('click', () => {
      this.viewRawEvents();
    });

    document.getElementById('clear-old-data').addEventListener('click', () => {
      this.clearOldData();
    });

    // Export controls
    document.getElementById('export-page-visits').addEventListener('click', () => {
      this.exportData('pageVisits');
    });

    document.getElementById('export-tab-aggregates').addEventListener('click', () => {
      this.exportData('tabAggregates');
    });

    document.getElementById('export-all').addEventListener('click', () => {
      this.exportAllData();
    });
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getDebugStats',
      });

      if (response.success) {
        document.getElementById('events-count').textContent = response.stats.eventsCount;
        document.getElementById('visits-count').textContent = response.stats.visitsCount;
        document.getElementById('tabs-count').textContent = response.stats.tabsCount;
        document.getElementById('last-aggregation').textContent = response.stats.lastAggregation;
      } else {
        this.log('Failed to load stats', 'error');
      }
    } catch (error) {
      this.log(`Error loading stats: ${error.message}`, 'error');
    }
  }

  async runMigration() {
    const button = document.getElementById('run-migration');
    button.classList.add('loading');
    button.disabled = true;

    this.log('Running anonymous client ID migration...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'runMigration',
      });

      if (response.success) {
        this.log('✅ Migration completed successfully', 'success');
        this.loadStats(); // Refresh stats
      } else {
        this.log(`❌ Migration failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('Migration error:', error);
      this.log(`❌ Error: ${error.message}`, 'error');
    } finally {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  async clearOldData() {
    const button = document.getElementById('clear-old-data');
    button.classList.add('loading');
    button.disabled = true;

    this.log('🧹 Clearing old aggregated data (for testing metadata fixes)...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearOldData',
      });

      if (response.success) {
        this.log('✅ Old data cleared successfully!', 'success');
        this.log(
          '💡 Browse some pages and trigger aggregation to test metadata extraction.',
          'info'
        );
        this.loadStats(); // Refresh stats
      } else {
        this.log(`❌ Clear failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('Clear data error:', error);
      this.log(`❌ Error: ${error.message}`, 'error');
    } finally {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  async triggerAggregation() {
    const button = document.getElementById('trigger-aggregation');
    button.classList.add('loading');
    button.disabled = true;

    this.log('Triggering manual aggregation...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'triggerAggregation',
      });

      if (response.success) {
        this.log(
          `✅ Aggregation completed: processed ${response.eventsProcessed} events`,
          'success'
        );
        this.loadStats(); // Refresh stats
      } else {
        this.log(`❌ Aggregation failed: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`, 'error');
    } finally {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  async viewRawEvents() {
    this.log('Fetching raw events...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getRawEvents',
      });

      if (response.success) {
        const events = response.data;
        this.log(`Found ${events.length} raw events`, 'info');

        if (events.length > 0) {
          console.log('Raw Events:', events);
          this.downloadJSON(events, 'raw-events.json');
          this.log('Raw events downloaded to console and file', 'success');
        } else {
          this.log('No raw events found', 'info');
        }
      } else {
        this.log(`Failed to fetch raw events: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`Error fetching raw events: ${error.message}`, 'error');
    }
  }

  async exportData(type) {
    const typeLabels = {
      pageVisits: 'Page Visits',
      tabAggregates: 'Tab Aggregates',
    };

    this.log(`Exporting ${typeLabels[type]}...`, 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportData',
        dataType: type,
      });

      if (response.success) {
        const data = response.data;
        this.log(`Found ${data.length} ${typeLabels[type].toLowerCase()}`, 'info');

        if (data.length > 0) {
          this.downloadJSON(data, `${type}.json`);
          this.log(`✅ ${typeLabels[type]} exported successfully`, 'success');
        } else {
          this.log(`No ${typeLabels[type].toLowerCase()} found`, 'info');
        }
      } else {
        this.log(`❌ Export failed: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error exporting ${typeLabels[type]}: ${error.message}`, 'error');
    }
  }

  async exportAllData() {
    this.log('Exporting all aggregation data...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportAllData',
      });

      if (response.success) {
        const { rawEvents, pageVisits, tabAggregates, stats } = response.data;

        const allData = {
          exportedAt: new Date().toISOString(),
          stats: {
            rawEventsCount: rawEvents.length,
            pageVisitsCount: pageVisits.length,
            tabAggregatesCount: tabAggregates.length,
          },
          rawEvents,
          pageVisits,
          tabAggregates,
          systemStats: stats,
        };

        this.downloadJSON(allData, 'heyho-aggregation-data.json');
        this.log(
          `✅ Complete export: ${rawEvents.length} events, ` +
            `${pageVisits.length} visits, ${tabAggregates.length} tabs`,
          'success'
        );
      } else {
        this.log(`❌ Export failed: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error exporting all data: ${error.message}`, 'error');
    }
  }

  downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Load persisted activity log from storage
   */
  async loadActivityLog() {
    try {
      const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
      const result = await storage.get('activityLog');
      const logs = result.activityLog || [];

      // Clear existing logs
      this.logContainer.innerHTML = '';

      // Restore logs
      logs.forEach((logData) => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${logData.type}`;
        logEntry.textContent = logData.text;
        this.logContainer.appendChild(logEntry);
      });

      // Scroll to bottom
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    } catch (error) {
      console.error('Failed to load activity log:', error);
    }
  }

  /**
   * Save activity log to storage
   */
  async saveActivityLog() {
    try {
      const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
      const logs = Array.from(this.logContainer.children).map((entry) => ({
        text: entry.textContent,
        type: entry.className.replace('log-entry ', ''),
      }));

      await storage.set({ activityLog: logs });
    } catch (error) {
      console.error('Failed to save activity log:', error);
    }
  }

  log(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    this.logContainer.appendChild(logEntry);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;

    // Keep only last 50 log entries
    while (this.logContainer.children.length > this.maxLogEntries) {
      this.logContainer.removeChild(this.logContainer.firstChild);
    }

    // Persist log to storage
    this.saveActivityLog();
  }

  /**
   * Open login page in new tab
   */
  openLoginPage() {
    const loginUrl = chrome.runtime.getURL('src/auth/login.html');
    chrome.tabs.create({ url: loginUrl });
  }

  /**
   * Open signup page in new tab
   */
  openSignupPage() {
    const signupUrl = chrome.runtime.getURL('src/auth/signup.html');
    chrome.tabs.create({ url: signupUrl });
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    const logoutBtn = document.getElementById('btn-logout');
    logoutBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'logout',
      });

      if (response.success) {
        this.log('Logged out successfully', 'success');
        // Refresh auth state
        await this.loadAuthState();
      } else {
        this.log(`Logout failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.log(`Error: ${error.message}`, 'error');
    } finally {
      logoutBtn.disabled = false;
    }
  }

  /**
   * Handle manual sync trigger
   */
  async handleSyncNow() {
    const syncBtn = document.getElementById('btn-sync-now');
    syncBtn.disabled = true;

    // Update UI to show syncing state
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    statusIndicator.classList.remove('connected', 'error');
    statusIndicator.classList.add('syncing');
    statusText.textContent = 'Syncing...';

    this.log('Starting manual sync...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'syncNow',
        data: { force: false },
      });

      if (response.success) {
        const synced = response.synced || 0;
        if (synced > 0) {
          // Show count of newly created items (not just updates)
          const newItems =
            (response.data?.page_visits_new || 0) + (response.data?.tab_aggregates_new || 0);

          if (newItems > 0) {
            this.log(
              `✅ Sync completed: ${newItems} new items added to browsing history`,
              'success'
            );
          } else {
            this.log(`ℹ️ Sync completed: All items already in history (${synced} updated)`, 'info');
          }
        } else {
          this.log('ℹ️ No new data to sync', 'info');
        }

        // Refresh sync state and stats
        await this.loadSyncState();
        await this.loadStats(); // ADDED: Refresh stats after sync
      } else {
        this.log(`❌ Sync failed: ${response.error}`, 'error');

        // Update UI to show error state
        statusIndicator.classList.remove('syncing');
        statusIndicator.classList.add('error');
        statusText.textContent = 'Sync failed';
      }
    } catch (error) {
      console.error('Sync error:', error);
      this.log(`❌ Error: ${error.message}`, 'error');

      // Update UI to show error state
      statusIndicator.classList.remove('syncing');
      statusIndicator.classList.add('error');
      statusText.textContent = 'Sync failed';
    } finally {
      syncBtn.disabled = false;
    }
  }
}

// Initialize the debug panel when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new DebugPanel();
});
