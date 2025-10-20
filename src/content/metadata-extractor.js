/**
 * Metadata Extractor Module
 *
 * Extracts rich metadata from web pages for categorization.
 * Supports Schema.org, Open Graph, and generic meta tags.
 */

/**
 * Extract all available metadata from the current page
 * @returns {Object} Metadata object
 */
function extractPageMetadata() {
  try {
    return {
      // Schema.org structured data
      schemaType: extractSchemaType(),
      schemaData: extractSchemaData(),

      // Open Graph tags
      ogType: getMeta('property', 'og:type'),
      ogVideo: getMeta('property', 'og:video'),
      ogVideoDuration: getMeta('property', 'og:video:duration'),

      // General meta tags
      keywords: getMeta('name', 'keywords'),
      description: getMeta('name', 'description'),
      author: getMeta('name', 'author'),
      applicationName: getMeta('name', 'application-name'),

      // Article-specific
      articleSection: getMeta('property', 'article:section'),
      articleTags: getMeta('property', 'article:tag'),

      // Page content signals
      hasVideo: document.querySelector('video') !== null,
      hasAudio: document.querySelector('audio') !== null,
      hasCodeBlock: document.querySelector('pre, code') !== null,
      hasCodeEditor: hasCodeEditor(),
      hasArticle: document.querySelector('article') !== null,
      hasFeed: document.querySelector('[role="feed"]') !== null,
      isEditing: isUserEditing(),

      // Content metrics
      wordCount: estimateWordCount(),
      imageCount: document.querySelectorAll('img').length,
      videoCount: document.querySelectorAll('video').length,
    };
  } catch (error) {
    console.warn('[HeyHo] Metadata extraction failed:', error);
    return {}; // Return empty object on error
  }
}

/**
 * Extract Schema.org type from JSON-LD script tags
 * @returns {string|null} Schema type (e.g., "VideoObject", "Article")
 */
function extractSchemaType() {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);

        // Handle single object
        if (data['@type']) {
          return data['@type'];
        }

        // Handle array of objects (take first)
        if (Array.isArray(data) && data[0] && data[0]['@type']) {
          return data[0]['@type'];
        }

        // Handle nested @graph structure
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          for (const item of data['@graph']) {
            if (item['@type']) {
              return item['@type'];
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract full Schema.org data for detailed analysis
 * @returns {Object|null} Full schema data
 */
function extractSchemaData() {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);

        // Return the most relevant object
        if (data['@type']) {
          return data;
        }

        if (Array.isArray(data) && data[0]) {
          return data[0];
        }

        if (data['@graph'] && Array.isArray(data['@graph'])) {
          // Find VideoObject, Article, or first object
          const videoOrArticle = data['@graph'].find(
            (item) =>
              item['@type'] === 'VideoObject' ||
              item['@type'] === 'Article' ||
              item['@type'] === 'NewsArticle'
          );

          return videoOrArticle || data['@graph'][0];
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get meta tag content by attribute
 * @param {string} attr - Attribute name ('name' or 'property')
 * @param {string} value - Attribute value to search for
 * @returns {string|null} Meta content or null
 */
function getMeta(attr, value) {
  try {
    const element = document.querySelector(`meta[${attr}="${value}"]`);
    return element ? element.getAttribute('content') : null;
  } catch (error) {
    return null;
  }
}

/**
 * Detect if page has a code editor (Monaco, CodeMirror, etc.)
 * @returns {boolean}
 */
function hasCodeEditor() {
  try {
    return !!(
      document.querySelector('[class*="monaco"]') ||
      document.querySelector('[class*="CodeMirror"]') ||
      document.querySelector('[class*="ace_editor"]')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Detect if user is actively editing content
 * @returns {boolean}
 */
function isUserEditing() {
  try {
    const activeElement = document.activeElement;

    return !!(
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.tagName === 'INPUT' ||
      activeElement?.contentEditable === 'true' ||
      hasCodeEditor()
    );
  } catch (error) {
    return false;
  }
}

/**
 * Estimate word count on page
 * @returns {number}
 */
function estimateWordCount() {
  try {
    const text = document.body?.innerText || '';
    return text.trim().split(/\s+/).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: "PT45M30S" → 2730 seconds
 * @param {string} duration - ISO 8601 duration string
 * @returns {number} Duration in seconds
 */
function parseDuration(duration) {
  if (!duration) {
    return 0;
  }

  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return 0;
    }

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  } catch (error) {
    return 0;
  }
}

// Export for browser environment
self.MetadataExtractor = {
  extractPageMetadata,
  extractSchemaType,
  extractSchemaData,
  parseDuration,
};
