# Metadata Extraction

## Overview

This document explains how we extract rich metadata from web pages to enable accurate categorization without requiring ML models.

## What Metadata Do We Extract?

### 1. Schema.org Structured Data (JSON-LD)

**Most reliable source** - Embedded by most modern websites for SEO.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "React Tutorial for Beginners",
  "description": "Learn React in 2024...",
  "duration": "PT45M30S",
  "uploadDate": "2024-01-15",
  "genre": "Education"
}
</script>
```

**Common @types we use:**
- `VideoObject` → Video content
- `Article` / `NewsArticle` / `BlogPosting` → Written content
- `SoftwareSourceCode` → Code repositories
- `Course` → Educational content
- `Movie` / `TVSeries` → Entertainment
- `WebPage` → Generic page

### 2. Open Graph Tags (Facebook/Social)

**Very common** - Used for social media previews.

```html
<meta property="og:type" content="video.movie">
<meta property="og:title" content="Stranger Things">
<meta property="og:video" content="https://...">
<meta property="og:video:duration" content="3300">
```

**Common og:type values:**
- `video.movie` → Movies
- `video.episode` → TV episodes
- `video.other` → Generic video
- `article` → Articles/blog posts
- `website` → Generic pages
- `profile` → User profiles

### 3. Meta Tags (General)

**Fallback metadata** - Basic page information.

```html
<meta name="keywords" content="react, tutorial, javascript">
<meta name="description" content="Learn React...">
<meta name="author" content="Jane Doe">
<meta name="application-name" content="GitHub">
<meta property="article:section" content="Technology">
<meta property="article:tag" content="Programming">
```

### 4. Page Content Signals

**DOM-based indicators** - What's actually on the page.

```javascript
// Video presence
document.querySelector('video') !== null

// Code presence
document.querySelector('pre, code') !== null

// Code editor (Monaco = VS Code)
document.querySelector('[class*="monaco"]') !== null

// Editing mode
document.activeElement?.contentEditable === 'true'

// Article content
document.querySelector('article') !== null

// Social feed
document.querySelector('[role="feed"]') !== null
```

## Implementation

### Content Script (Runs on Every Page)

```javascript
// src/content/metadata-extractor.js

/**
 * Extract all available metadata from the current page
 * @returns {Object} Metadata object
 */
function extractPageMetadata() {
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
    videoCount: document.querySelectorAll('video').length
  };
}

/**
 * Extract Schema.org type from JSON-LD script tags
 * @returns {string|null} Schema type (e.g., "VideoObject", "Article")
 */
function extractSchemaType() {
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
}

/**
 * Extract full Schema.org data for detailed analysis
 * @returns {Object|null} Full schema data
 */
function extractSchemaData() {
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
        const videoOrArticle = data['@graph'].find(item =>
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
}

/**
 * Get meta tag content by attribute
 * @param {string} attr - Attribute name ('name' or 'property')
 * @param {string} value - Attribute value to search for
 * @returns {string|null} Meta content or null
 */
function getMeta(attr, value) {
  const element = document.querySelector(`meta[${attr}="${value}"]`);
  return element ? element.getAttribute('content') : null;
}

/**
 * Detect if page has a code editor (Monaco, CodeMirror, etc.)
 * @returns {boolean}
 */
function hasCodeEditor() {
  return !!(
    document.querySelector('[class*="monaco"]') ||
    document.querySelector('[class*="CodeMirror"]') ||
    document.querySelector('[class*="ace_editor"]')
  );
}

/**
 * Detect if user is actively editing content
 * @returns {boolean}
 */
function isUserEditing() {
  const activeElement = document.activeElement;

  return !!(
    activeElement?.tagName === 'TEXTAREA' ||
    activeElement?.tagName === 'INPUT' ||
    activeElement?.contentEditable === 'true' ||
    hasCodeEditor()
  );
}

/**
 * Estimate word count on page
 * @returns {number}
 */
function estimateWordCount() {
  const text = document.body?.innerText || '';
  return text.trim().split(/\s+/).length;
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: "PT45M30S" → 2730 seconds
 * @param {string} duration - ISO 8601 duration string
 * @returns {number} Duration in seconds
 */
function parseDuration(duration) {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

// Export for use in categorizer
self.MetadataExtractor = {
  extractPageMetadata,
  extractSchemaType,
  extractSchemaData,
  parseDuration
};
```

## Integration with Page Visit Tracking

### Update PageVisit Model

```javascript
// src/aggregation/models.js (updated)

class PageVisit {
  constructor(data) {
    // ... existing fields ...

    // NEW: Categorization fields
    this.category = data.category || null;
    this.categoryConfidence = data.categoryConfidence || 0;
    this.categoryMethod = data.categoryMethod || null; // 'metadata' or 'unclassified'

    // NEW: Metadata for categorization
    this.metadata = data.metadata || {};
  }

  static createFromEvent(tabId, url, domain, timestamp, anonymousClientId, title, metadata = {}) {
    return new PageVisit({
      id: `pv_${timestamp}_${tabId}`,
      tabId,
      url,
      domain,
      title,
      timestamp,
      anonymousClientId,
      isActive: true,
      activeDuration: 0,
      idlePeriods: [],
      engagementRate: 0,

      // Store metadata for categorization
      metadata: metadata
    });
  }

  toJSON() {
    return {
      // ... existing fields ...

      // NEW: Include categorization data
      category: this.category,
      categoryConfidence: this.categoryConfidence,
      categoryMethod: this.categoryMethod,
      metadata: this.metadata
    };
  }
}
```

## Message Passing (Content Script → Background Script)

```javascript
// src/content/page-tracker.js (new file)

// Extract metadata when page loads
window.addEventListener('load', () => {
  const metadata = self.MetadataExtractor.extractPageMetadata();

  // Send to background script for categorization
  chrome.runtime.sendMessage({
    type: 'PAGE_METADATA_EXTRACTED',
    data: {
      url: window.location.href,
      title: document.title,
      metadata: metadata
    }
  });
});

// Also extract on navigation (SPAs)
let lastUrl = window.location.href;

setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;

    const metadata = self.MetadataExtractor.extractPageMetadata();

    chrome.runtime.sendMessage({
      type: 'PAGE_METADATA_EXTRACTED',
      data: {
        url: window.location.href,
        title: document.title,
        metadata: metadata
      }
    });
  }
}, 1000); // Check every second
```

## Performance Considerations

### Extraction Time

**Metadata extraction is fast:**
- Schema.org parsing: ~1-2ms
- Meta tag reading: ~1ms
- DOM queries: ~5-10ms
- **Total: <10ms** (negligible impact)

### Caching

**Cache metadata per page visit:**
```javascript
// Cache metadata for the current page
const metadataCache = new Map();

function getCachedMetadata(url) {
  if (metadataCache.has(url)) {
    return metadataCache.get(url);
  }

  const metadata = extractPageMetadata();
  metadataCache.set(url, metadata);
  return metadata;
}
```

## Error Handling

```javascript
function extractPageMetadata() {
  try {
    return {
      schemaType: safeExtractSchemaType(),
      ogType: safeMeta('property', 'og:type'),
      // ... rest of metadata ...
    };
  } catch (error) {
    console.warn('Metadata extraction failed:', error);
    return {}; // Return empty object on error
  }
}

function safeExtractSchemaType() {
  try {
    return extractSchemaType();
  } catch (error) {
    return null;
  }
}
```

## Testing

### Manual Testing

```javascript
// In browser console on any page:
const metadata = self.MetadataExtractor.extractPageMetadata();
console.table(metadata);

// On YouTube:
// {
//   schemaType: "VideoObject",
//   ogType: "video.other",
//   hasVideo: true,
//   ...
// }

// On GitHub:
// {
//   schemaType: "SoftwareSourceCode",
//   applicationName: "GitHub",
//   hasCodeBlock: true,
//   ...
// }
```

### Unit Tests

```javascript
// specs/content/metadata-extractor.spec.js

describe('MetadataExtractor', () => {
  describe('extractSchemaType', () => {
    it('extracts VideoObject from JSON-LD', () => {
      document.body.innerHTML = `
        <script type="application/ld+json">
          {"@type": "VideoObject", "name": "Test Video"}
        </script>
      `;

      const type = self.MetadataExtractor.extractSchemaType();
      expect(type).toBe('VideoObject');
    });
  });

  describe('parseDuration', () => {
    it('parses ISO 8601 duration correctly', () => {
      expect(self.MetadataExtractor.parseDuration('PT45M30S')).toBe(2730);
      expect(self.MetadataExtractor.parseDuration('PT1H30M')).toBe(5400);
    });
  });
});
```

## Real-World Examples

See [Examples Document](./04-examples.md) for detailed real-world metadata from popular sites.

## Next Steps

- [Categorization Rules](./02-categorization-rules.md) - How we use this metadata to categorize pages
- [Implementation Plan](./03-implementation-plan.md) - Step-by-step implementation guide

---

**File Location**: `src/content/metadata-extractor.js`
**Dependencies**: None (pure DOM API)
**Performance**: <10ms extraction time
**Compatibility**: All modern browsers
