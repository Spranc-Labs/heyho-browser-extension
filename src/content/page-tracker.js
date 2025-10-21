/**
 * Page Tracker Content Script
 *
 * Extracts metadata from pages and sends to background script for categorization.
 */

// Global error handler for content script
window.addEventListener('error', (event) => {
  // Send error to background script for logging
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime
      .sendMessage({
        type: 'CONTENT_SCRIPT_ERROR',
        data: {
          message: event.message,
          stack: event.error?.stack,
          url: window.location.href,
          timestamp: Date.now(),
        },
      })
      .catch(() => {
        // Extension context invalidated - ignore silently
      });
  }
});

let lastUrl = window.location.href;
let extractionTimeout = null;

/**
 * Extract and send page metadata to background script
 * @param {number} retryCount - Current retry attempt (for recursive retry logic)
 */
function trackPageMetadata(retryCount = 0) {
  try {
    // Don't track on extension pages or special URLs
    if (
      window.location.href.startsWith('chrome://') ||
      window.location.href.startsWith('about:') ||
      window.location.href.startsWith('chrome-extension://') ||
      window.location.href.startsWith('moz-extension://')
    ) {
      return;
    }

    // Extract metadata using MetadataExtractor
    const metadata = self.MetadataExtractor ? self.MetadataExtractor.extractPageMetadata() : {};

    // Validate that we got meaningful metadata
    const hasMetadata =
      metadata &&
      (metadata.schemaType ||
        metadata.ogType ||
        metadata.hasVideo ||
        metadata.hasCodeEditor ||
        metadata.hasFeed ||
        (metadata.wordCount && metadata.wordCount > 100));

    // If no metadata and we haven't retried yet, wait and try again
    // (some sites load metadata dynamically)
    if (!hasMetadata && retryCount < 2) {
      const retryDelay = retryCount === 0 ? 2000 : 4000; // 2s, then 4s
      setTimeout(() => trackPageMetadata(retryCount + 1), retryDelay);
      return;
    }

    // Log extraction result (helps debugging)
    if (console && console.log) {
      if (hasMetadata) {
        console.log('[HeyHo] ✅ Metadata extracted:', {
          url: window.location.href.substring(0, 60),
          schemaType: metadata.schemaType,
          ogType: metadata.ogType,
          wordCount: metadata.wordCount,
          retries: retryCount,
        });
      } else {
        console.warn(
          '[HeyHo] ⚠️ No rich metadata found for:',
          window.location.href.substring(0, 60)
        );
      }
    }

    // Send to background script (even if empty - we tried our best)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime
        .sendMessage({
          type: 'PAGE_METADATA_EXTRACTED',
          data: {
            url: window.location.href,
            title: document.title || '',
            metadata: metadata,
          },
        })
        .catch((error) => {
          // Silently fail if extension context is invalidated
          if (error.message && !error.message.includes('Extension context')) {
            console.warn('[HeyHo] Failed to send metadata:', error);
          }
        });
    }
  } catch (error) {
    console.warn('[HeyHo] Failed to extract/send page metadata:', error);
  }
}

/**
 * Initialize page tracking
 */
function init() {
  // Track on initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait a bit for dynamic content to load
      setTimeout(trackPageMetadata, 1000);
    });
  } else {
    // Document already loaded
    setTimeout(trackPageMetadata, 1000);
  }

  // Track on SPA navigation (URL changes without page reload)
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;

      // Debounce rapid navigation
      clearTimeout(extractionTimeout);
      extractionTimeout = setTimeout(trackPageMetadata, 500);
    }
  }, 1000); // Check every second
}

// Start tracking
init();
