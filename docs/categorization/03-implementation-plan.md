# Implementation Plan

## Overview

This document provides a step-by-step plan to implement metadata-based page categorization in the HeyHo browser extension.

**Timeline**: 1-2 weeks
**Effort**: 20-30 hours

---

## Week 1: Core Implementation

### Day 1-2: Metadata Extraction Service

**Goal**: Extract metadata from web pages

#### Step 1: Create Metadata Extractor

```bash
# Create new file
touch src/content/metadata-extractor.js
```

**File**: `src/content/metadata-extractor.js`

Implement functions from [01-metadata-extraction.md](./01-metadata-extraction.md):
- `extractPageMetadata()`
- `extractSchemaType()`
- `extractSchemaData()`
- `getMeta()`
- `hasCodeEditor()`
- `isUserEditing()`
- `parseDuration()`

**Testing**:
```bash
# Manual test in browser console
node specs/content/metadata-extractor.spec.js
```

**Checklist**:
- [ ] Create `src/content/metadata-extractor.js`
- [ ] Implement all extraction functions
- [ ] Test on YouTube, GitHub, Netflix
- [ ] Handle errors gracefully (try/catch)
- [ ] Export module: `self.MetadataExtractor = {...}`

---

### Day 3-4: Categorization Service

**Goal**: Categorize pages based on metadata

#### Step 2: Create Categorizer

```bash
touch src/background/categorizer.js
```

**File**: `src/background/categorizer.js`

Implement `PageCategorizer` class from [02-categorization-rules.md](./02-categorization-rules.md):
- `categorize(pageVisit)`
- `categorizeBySchema()`
- `categorizeByOpenGraph()`
- `categorizeByDomain()`
- `categorizeByContent()`
- `applyBehavioralAdjustments()`

**Testing**:
```javascript
// Test with mock data
const mockPageVisit = {
  url: 'https://youtube.com/watch?v=xyz',
  title: 'React Tutorial',
  domain: 'youtube.com',
  metadata: {
    schemaType: 'VideoObject',
    schemaData: { duration: 'PT45M30S' }
  }
};

const result = PageCategorizer.categorize(mockPageVisit);
console.log(result);
// Expected: { category: 'learning_video', confidence: 0.95 }
```

**Checklist**:
- [ ] Create `src/background/categorizer.js`
- [ ] Implement all categorization methods
- [ ] Test all 12 categories with examples from [04-examples.md](./04-examples.md)
- [ ] Verify confidence thresholds
- [ ] Export module: `self.PageCategorizer = PageCategorizer`

---

### Day 5: Integrate with PageVisit Model

**Goal**: Add categorization fields to PageVisit

#### Step 3: Update PageVisit Model

**File**: `src/aggregation/models.js`

**Changes**:
```javascript
class PageVisit {
  constructor(data) {
    // ... existing fields ...

    // NEW: Categorization fields
    this.category = data.category || null;
    this.categoryConfidence = data.categoryConfidence || 0;
    this.categoryMethod = data.categoryMethod || null;
    this.metadata = data.metadata || {};
  }

  static createFromEvent(tabId, url, domain, timestamp, anonymousClientId, title, metadata = {}) {
    const pageVisit = new PageVisit({
      // ... existing fields ...
      metadata: metadata
    });

    // Categorize immediately
    const categorization = self.PageCategorizer.categorize(pageVisit);
    pageVisit.category = categorization.category;
    pageVisit.categoryConfidence = categorization.confidence;
    pageVisit.categoryMethod = categorization.method;

    return pageVisit;
  }

  toJSON() {
    return {
      // ... existing fields ...

      // NEW: Categorization data
      category: this.category,
      categoryConfidence: this.categoryConfidence,
      categoryMethod: this.categoryMethod,
      metadata: this.metadata
    };
  }
}
```

**Checklist**:
- [ ] Update `PageVisit` constructor
- [ ] Update `createFromEvent()` to accept metadata
- [ ] Call `PageCategorizer.categorize()` on creation
- [ ] Update `toJSON()` to include categorization fields
- [ ] Test with existing page visits

---

### Day 6: Content Script Integration

**Goal**: Extract metadata and send to background script

#### Step 4: Create Page Tracker Content Script

```bash
touch src/content/page-tracker.js
```

**File**: `src/content/page-tracker.js`

```javascript
/**
 * Page Tracker Content Script
 * Extracts metadata and sends to background script
 */

// Import metadata extractor
// (Ensure it's loaded before this script)

let lastUrl = window.location.href;

/**
 * Extract and send page metadata
 */
function trackPageMetadata() {
  try {
    const metadata = self.MetadataExtractor.extractPageMetadata();

    // Send to background script
    chrome.runtime.sendMessage({
      type: 'PAGE_METADATA_EXTRACTED',
      data: {
        url: window.location.href,
        title: document.title,
        tabId: null, // Background will determine this
        metadata: metadata
      }
    });
  } catch (error) {
    console.error('Failed to extract page metadata:', error);
  }
}

// Track on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', trackPageMetadata);
} else {
  trackPageMetadata();
}

// Track on SPA navigation
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    trackPageMetadata();
  }
}, 1000);
```

**Update `manifest.json`**:
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": [
        "src/content/metadata-extractor.js",
        "src/content/page-tracker.js"
      ],
      "run_at": "document_end"
    }
  ]
}
```

**Checklist**:
- [ ] Create `src/content/page-tracker.js`
- [ ] Extract metadata on page load
- [ ] Send to background script via `chrome.runtime.sendMessage`
- [ ] Handle SPA navigation
- [ ] Update `manifest.json` content_scripts
- [ ] Test on multiple sites

---

### Day 7: Background Script Integration

**Goal**: Receive metadata and create categorized page visits

#### Step 5: Update Event Handlers

**File**: `src/background/events.js` or `src/background/listeners.js`

**Add message listener**:
```javascript
// Listen for page metadata from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_METADATA_EXTRACTED') {
    handlePageMetadata(message.data, sender.tab);
  }
});

/**
 * Store page metadata for later use when creating PageVisit
 */
const pageMetadataCache = new Map();

async function handlePageMetadata(data, tab) {
  if (!tab || !tab.id) return;

  // Store metadata for this tab
  pageMetadataCache.set(tab.id, {
    url: data.url,
    title: data.title,
    metadata: data.metadata,
    timestamp: Date.now()
  });

  // Clean up old entries (>5 minutes)
  for (const [tabId, cachedData] of pageMetadataCache.entries()) {
    if (Date.now() - cachedData.timestamp > 300000) {
      pageMetadataCache.delete(tabId);
    }
  }
}

// Export for use in aggregator
self.getPageMetadata = (tabId) => {
  return pageMetadataCache.get(tabId)?.metadata || {};
};
```

**Update Aggregator** (`src/background/aggregator.js` or `src/aggregation/processor.js`):

```javascript
// When creating PageVisit from events
async function createPageVisitFromEvent(event) {
  // Get cached metadata for this tab
  const metadata = self.getPageMetadata ? self.getPageMetadata(event.tabId) : {};

  const pageVisit = PageVisit.createFromEvent(
    event.tabId,
    event.url,
    event.domain,
    event.timestamp,
    event.anonymousClientId,
    event.title || '', // Add title if available
    metadata // Pass metadata for categorization
  );

  return pageVisit;
}
```

**Checklist**:
- [ ] Add message listener for `PAGE_METADATA_EXTRACTED`
- [ ] Create metadata cache with cleanup
- [ ] Export `getPageMetadata()` function
- [ ] Update aggregator to use metadata when creating PageVisit
- [ ] Test end-to-end: content script → background → categorization
- [ ] Verify categories are assigned correctly

---

## Week 2: Testing & Refinement

### Day 8-9: Comprehensive Testing

**Goal**: Test on real browsing data

#### Step 6: Manual Testing

**Test Sites**:
1. YouTube (tutorial, shorts, movie trailer)
2. GitHub (code, PR, issues)
3. Netflix/streaming
4. Medium/Dev.to
5. Stack Overflow
6. Twitter/X
7. Reddit (various subreddits)
8. News sites
9. Shopping sites
10. Documentation sites

**Testing Script**:
```javascript
// In browser console after installing extension

// 1. Check metadata extraction
const metadata = self.MetadataExtractor.extractPageMetadata();
console.table(metadata);

// 2. Get page visits from storage
chrome.storage.local.get(['pageVisits'], (result) => {
  const visits = result.pageVisits || [];
  console.log('Recent page visits:', visits.slice(-10));

  // Check categories
  const categorized = visits.filter(v => v.category);
  const unclassified = visits.filter(v => v.category === 'unclassified');

  console.log(`Categorized: ${categorized.length}/${visits.length} (${(categorized.length/visits.length*100).toFixed(1)}%)`);
  console.log(`Unclassified: ${unclassified.length}/${visits.length} (${(unclassified.length/visits.length*100).toFixed(1)}%)`);

  // Category breakdown
  const breakdown = {};
  categorized.forEach(v => {
    breakdown[v.category] = (breakdown[v.category] || 0) + 1;
  });
  console.table(breakdown);
});
```

**Checklist**:
- [ ] Test on 20+ different websites
- [ ] Verify categorization accuracy (manual review)
- [ ] Check unclassified rate (<10%)
- [ ] Verify confidence scores are reasonable
- [ ] Test SPA navigation (YouTube video to video)
- [ ] Test quick browsing (rapid tab switches)

---

### Day 10: Backend Integration

**Goal**: Ensure backend accepts categorization fields

#### Step 7: Update Backend Schema (if needed)

**Migration** (Rails):
```bash
# In sync-be directory
rails g migration AddCategorizationToPageVisits \
  category:string \
  category_confidence:float \
  category_method:string \
  metadata:jsonb
```

**Migration file**:
```ruby
class AddCategorizationToPageVisits < ActiveRecord::Migration[7.0]
  def change
    add_column :page_visits, :category, :string
    add_column :page_visits, :category_confidence, :float
    add_column :page_visits, :category_method, :string
    add_column :page_visits, :metadata, :jsonb, default: {}

    add_index :page_visits, :category
    add_index :page_visits, [:user_id, :category]
  end
end
```

**Run migration**:
```bash
rails db:migrate
```

**Update Model** (`app/models/page_visit.rb`):
```ruby
class PageVisit < ApplicationRecord
  # ... existing code ...

  # Categorization validations
  validates :category, inclusion: {
    in: %w[
      work_coding work_code_review work_communication work_documentation
      learning_video learning_reading
      entertainment_video entertainment_browsing entertainment_short_form
      social_media news shopping reference unclassified
    ],
    allow_nil: true
  }

  validates :category_confidence, numericality: {
    greater_than_or_equal_to: 0,
    less_than_or_equal_to: 1
  }, allow_nil: true
end
```

**Update DataSyncService** (`app/services/data_sync_service.rb`):
```ruby
# Make sure categorization fields are permitted
def transform_page_visit(page_visit)
  {
    # ... existing fields ...
    category: page_visit['category'],
    category_confidence: page_visit['categoryConfidence'],
    category_method: page_visit['categoryMethod'],
    metadata: page_visit['metadata']
  }
end
```

**Checklist**:
- [ ] Create and run migration
- [ ] Update PageVisit model validations
- [ ] Update DataSyncService to accept new fields
- [ ] Test sync from extension
- [ ] Verify data stored correctly in database
- [ ] Check via Rails console: `PageVisit.last`

---

### Day 11: Debugging & Edge Cases

**Goal**: Handle edge cases and fix bugs

#### Step 8: Handle Edge Cases

**Edge Cases to Test**:

1. **No metadata available** (old/simple sites)
   - Should return `unclassified`

2. **Invalid JSON-LD** (malformed schema)
   - Should handle gracefully, skip to next method

3. **Multiple schema types** on same page
   - Should pick most relevant

4. **SPA navigation** (React Router, etc.)
   - Should detect URL changes and re-extract

5. **Very fast browsing** (tab opened < 1 second)
   - Metadata might not be extracted yet
   - Should handle missing metadata gracefully

6. **Extensions/internal pages** (chrome://, about:)
   - Should skip categorization (already filtered by triage)

**Error Handling**:
```javascript
// In metadata-extractor.js
function extractPageMetadata() {
  try {
    return {
      schemaType: safeExtract(extractSchemaType),
      schemaData: safeExtract(extractSchemaData),
      // ... other fields with safe extraction
    };
  } catch (error) {
    console.warn('[HeyHo] Metadata extraction failed:', error);
    return {}; // Return empty object, categorizer will handle
  }
}

function safeExtract(fn) {
  try {
    return fn();
  } catch (error) {
    return null;
  }
}
```

**Checklist**:
- [ ] Test all edge cases above
- [ ] Add comprehensive error handling
- [ ] Log errors in dev mode only
- [ ] Test with malformed HTML/schema
- [ ] Verify no crashes or infinite loops
- [ ] Test performance on slow pages

---

### Day 12-13: Performance Optimization

**Goal**: Ensure categorization is fast and efficient

#### Step 9: Optimize Performance

**Caching Strategy**:
```javascript
// Cache metadata per URL to avoid re-extraction
const metadataCache = new Map();

function getCachedMetadata(url) {
  if (metadataCache.has(url)) {
    return metadataCache.get(url);
  }

  const metadata = extractPageMetadata();

  // Cache with size limit
  if (metadataCache.size > 100) {
    const firstKey = metadataCache.keys().next().value;
    metadataCache.delete(firstKey);
  }

  metadataCache.set(url, metadata);
  return metadata;
}
```

**Lazy Extraction** (only extract when needed):
```javascript
// Don't extract metadata on every heartbeat
// Only on CREATE and NAVIGATE events

if (event.type === 'CREATE' || event.type === 'NAVIGATE') {
  trackPageMetadata();
}
```

**Debounce SPA Detection**:
```javascript
let navigationTimeout;

setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;

    // Debounce rapid navigation
    clearTimeout(navigationTimeout);
    navigationTimeout = setTimeout(trackPageMetadata, 500);
  }
}, 1000);
```

**Measure Performance**:
```javascript
// In metadata-extractor.js (dev mode)
function extractPageMetadata() {
  const start = performance.now();

  const metadata = {
    // ... extraction ...
  };

  const end = performance.now();
  if (self.ConfigModule?.IS_DEV_MODE) {
    console.log(`[HeyHo] Metadata extraction took ${(end - start).toFixed(2)}ms`);
  }

  return metadata;
}
```

**Checklist**:
- [ ] Implement metadata caching
- [ ] Add lazy extraction (only on CREATE/NAVIGATE)
- [ ] Debounce SPA navigation detection
- [ ] Measure extraction performance (<10ms target)
- [ ] Measure categorization performance (<5ms target)
- [ ] Test with 100+ page visits
- [ ] Monitor memory usage

---

### Day 14: Documentation & Deployment

**Goal**: Document changes and deploy

#### Step 10: Update Documentation

**Update README** (`apps/browser-extension/README.md`):
```markdown
## Features

- ✅ Page visit tracking with engagement metrics
- ✅ Tab aggregation
- ✅ **NEW: Automatic page categorization** (12 categories)
- ✅ Background sync to backend
- ✅ ADHD-friendly insights

## Categorization

Pages are automatically categorized into 12 categories:
- Work: `work_coding`, `work_code_review`, `work_communication`, `work_documentation`
- Learning: `learning_video`, `learning_reading`
- Entertainment: `entertainment_video`, `entertainment_browsing`, `entertainment_short_form`
- Other: `social_media`, `news`, `shopping`, `reference`

See [docs/categorization/](./docs/categorization/) for details.
```

**Create CHANGELOG entry**:
```markdown
# Changelog

## [Unreleased]

### Added
- Page visit categorization based on metadata extraction
- 12 category types for browsing behavior analysis
- Schema.org and Open Graph metadata parsing
- Confidence scoring for categorization accuracy
- Unclassified category for low-confidence pages

### Changed
- PageVisit model now includes category, confidence, and metadata fields
- Sync payload includes categorization data

See [docs/categorization/00-overview.md](./docs/categorization/00-overview.md) for details.
```

**Checklist**:
- [ ] Update README.md
- [ ] Add CHANGELOG entry
- [ ] Update any user-facing docs
- [ ] Create release notes

---

#### Step 11: Deploy

**Build Extension**:
```bash
# In browser-extension directory
npm run build # If you have a build step

# Or just load extension in Chrome
# chrome://extensions → Load unpacked → Select directory
```

**Test Deployment**:
1. Load extension in Chrome
2. Browse 20+ different sites
3. Check page visits have categories
4. Sync to backend
5. Verify backend has categorization data
6. Check popup shows categories (if implemented)

**Checklist**:
- [ ] Build extension
- [ ] Load in Chrome
- [ ] Test browsing 20+ sites
- [ ] Verify sync works
- [ ] Check backend data
- [ ] Monitor for errors
- [ ] Deploy to production (if ready)

---

## Testing Checklist

### Unit Tests
- [ ] `metadata-extractor.spec.js` - All extraction functions
- [ ] `categorizer.spec.js` - All categorization rules
- [ ] `page-visit.spec.js` - Model with categorization

### Integration Tests
- [ ] Content script extracts metadata
- [ ] Background script receives metadata
- [ ] PageVisit created with category
- [ ] Sync includes categorization fields
- [ ] Backend stores categories

### Manual Tests
- [ ] 20+ different websites tested
- [ ] All 12 categories tested
- [ ] Unclassified rate <10%
- [ ] Accuracy >90% (manual review)
- [ ] Performance <10ms extraction
- [ ] No errors in console
- [ ] SPA navigation works
- [ ] Backend sync works

---

## Success Criteria

✅ **Functionality**:
- [ ] Metadata extraction works on all major sites
- [ ] Categorization assigns correct categories
- [ ] Confidence scores are reasonable
- [ ] Integration with PageVisit model complete
- [ ] Backend sync includes categorization data

✅ **Performance**:
- [ ] Metadata extraction <10ms
- [ ] Categorization <5ms
- [ ] No noticeable impact on browsing
- [ ] Memory usage acceptable

✅ **Quality**:
- [ ] 90%+ categorization rate (≤10% unclassified)
- [ ] 90%+ accuracy (correct categories)
- [ ] Error handling robust
- [ ] No crashes or infinite loops

✅ **Documentation**:
- [ ] All docs complete (overview, extraction, rules, examples, plan)
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Code comments clear

---

## Rollback Plan

If issues arise:

1. **Disable categorization temporarily**:
   ```javascript
   // In page-tracker.js
   const CATEGORIZATION_ENABLED = false;
   ```

2. **Revert to previous version**:
   ```bash
   git revert <commit-hash>
   ```

3. **Investigate issue**:
   - Check console for errors
   - Review recent page visits
   - Test specific problematic sites

4. **Fix and redeploy**

---

## Next Steps After Implementation

1. **Monitor categorization accuracy** (week 1)
   - Review sample of categorized pages
   - Identify miscategorizations
   - Refine rules if needed

2. **Add insights** (Phase 2)
   - Daily category breakdown
   - Productivity hours by category
   - Distraction detection

3. **User feedback** (ongoing)
   - Collect feedback on categorization
   - Add new categories if needed
   - Refine confidence thresholds

4. **ML fallback** (Phase 3 - optional)
   - For unclassified pages only
   - Use lightweight model
   - Train on user corrections

---

**Status**: Ready for Implementation
**Start Date**: TBD
**Target Completion**: 2 weeks from start
**Owner**: Developer implementing categorization

---

## Questions?

See:
- [Overview](./00-overview.md) - High-level explanation
- [Metadata Extraction](./01-metadata-extraction.md) - Technical extraction details
- [Categorization Rules](./02-categorization-rules.md) - Categorization logic
- [Examples](./04-examples.md) - Real-world examples
