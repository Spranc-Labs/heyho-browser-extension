/**
 * Bookmark Handlers Module for HeyHo Extension
 *
 * Handles bookmark creation and retrieval from Syrupy API
 */

/**
 * Sets up message listeners for bookmark operations
 */
function setupBookmarkMessageHandlers() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only handle bookmark-specific actions
    const bookmarkActions = ['getCollections', 'getBookmarks', 'saveBookmark'];

    if (!request.action || !bookmarkActions.includes(request.action)) {
      return false; // Let other handlers process this message
    }

    handleBookmarkMessage(request, sender, sendResponse);
    return true; // Keep message channel open for async responses
  });
}

/**
 * Handles messages from the popup
 */
async function handleBookmarkMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'getCollections':
        await handleGetCollections(sendResponse);
        break;

      case 'getBookmarks':
        await handleGetBookmarks(request.data, sendResponse);
        break;

      case 'saveBookmark':
        await handleSaveBookmark(request.data, sendResponse);
        break;

      default:
        console.error('Unexpected bookmark action:', request.action);
        sendResponse({ success: false, error: 'Unexpected action' });
    }
  } catch (error) {
    console.error('Bookmark message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get user's collections from Syrupy API
 */
async function handleGetCollections(sendResponse) {
  const { IS_DEV_MODE } = self.ConfigModule;
  const apiClient = self.ApiClient;

  try {
    // Check if user is authenticated
    const authState = await self.AuthManager.getAuthState();
    if (!authState || !authState.isAuthenticated) {
      sendResponse({ success: false, error: 'Not authenticated' });
      return;
    }

    if (IS_DEV_MODE) {
      console.log('[Bookmarks] Fetching collections...');
    }

    const response = await apiClient.get('/collections');

    if (response.success && response.data) {
      sendResponse({
        success: true,
        data: response.data,
      });
    } else {
      sendResponse({
        success: false,
        error: response.error || 'Failed to fetch collections',
      });
    }
  } catch (error) {
    console.error('[Bookmarks] Failed to fetch collections:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get user's bookmarks from Syrupy API
 */
async function handleGetBookmarks(data, sendResponse) {
  const { IS_DEV_MODE } = self.ConfigModule;
  const apiClient = self.ApiClient;

  try {
    // Check if user is authenticated
    const authState = await self.AuthManager.getAuthState();
    if (!authState || !authState.isAuthenticated) {
      sendResponse({ success: false, error: 'Not authenticated' });
      return;
    }

    if (IS_DEV_MODE) {
      console.log('[Bookmarks] Fetching bookmarks...');
    }

    const limit = data?.limit || 10;
    const response = await apiClient.get(`/bookmarks?limit=${limit}`);

    if (response.success && response.data) {
      sendResponse({
        success: true,
        data: response.data,
      });
    } else {
      sendResponse({
        success: false,
        error: response.error || 'Failed to fetch bookmarks',
      });
    }
  } catch (error) {
    console.error('[Bookmarks] Failed to fetch bookmarks:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Save a new bookmark to Syrupy API
 */
async function handleSaveBookmark(data, sendResponse) {
  const { IS_DEV_MODE } = self.ConfigModule;
  const apiClient = self.ApiClient;

  try {
    // Check if user is authenticated
    const authState = await self.AuthManager.getAuthState();
    if (!authState || !authState.isAuthenticated) {
      sendResponse({ success: false, error: 'Not authenticated' });
      return;
    }

    if (IS_DEV_MODE) {
      console.log('[Bookmarks] Saving bookmark:', data.title);
    }

    // Prepare bookmark payload
    const payload = {
      url: data.url,
      title: data.title,
      description: data.description || null,
      note: data.note || null,
      collection_id: data.collection_id || null,
      tags: data.tags || [],
      status: 'saved',
    };

    const response = await apiClient.post('/bookmarks', payload);

    if (response.success && response.data) {
      if (IS_DEV_MODE) {
        console.log('[Bookmarks] Bookmark saved successfully');
      }
      sendResponse({
        success: true,
        data: response.data,
      });
    } else {
      sendResponse({
        success: false,
        error: response.error || 'Failed to save bookmark',
      });
    }
  } catch (error) {
    console.error('[Bookmarks] Failed to save bookmark:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Export module
self.BookmarkHandlers = {
  setupBookmarkMessageHandlers,
};
