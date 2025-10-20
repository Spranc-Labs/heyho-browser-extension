# Browser Extension Development Guide

## Overview

This document outlines the coding standards, conventions, and best practices for developing the HeyHo browser extension. The extension is designed to work cross-browser (Chrome, Firefox, Safari) using modern Manifest V3 architecture.

---

## Table of Contents

1. [Architecture Principles](#architecture-principles)
2. [Code Organization](#code-organization)
3. [Naming Conventions](#naming-conventions)
4. [JavaScript Best Practices](#javascript-best-practices)
5. [Module Pattern](#module-pattern)
6. [Error Handling](#error-handling)
7. [Storage Best Practices](#storage-best-practices)
8. [Content Scripts](#content-scripts)
9. [Background Service Workers](#background-service-workers)
10. [Message Passing](#message-passing)
11. [Performance Guidelines](#performance-guidelines)
12. [Cross-Browser Compatibility](#cross-browser-compatibility)
13. [Security](#security)
14. [Testing](#testing)
15. [Documentation](#documentation)
16. [Code Quality Tools](#code-quality-tools)

---

## Architecture Principles

### 1. Manifest V3 First
- Always use Manifest V3 (not V2)
- Use service workers instead of persistent background pages
- Understand service worker lifecycle (install, activate, terminate)
- Design for service worker termination (no long-lived state)

### 2. Cross-Browser Compatibility
- Target Chrome, Firefox, and Safari
- Use `browser.*` API with polyfills when needed
- Test on all target browsers before release
- Use feature detection, not browser detection

### 3. Privacy-First Design
- Minimize permissions requested
- Never collect PII without explicit consent
- Use anonymous identifiers (UUIDs) by default
- Store sensitive data securely (not in plain text)

### 4. Offline-First Architecture
- Extension should work without internet connection
- Use IndexedDB for local storage (not chrome.storage for large data)
- Sync data to backend asynchronously
- Handle network failures gracefully

### 5. Performance & Resource Efficiency
- Service workers terminate after 30s of inactivity
- Minimize memory usage (content scripts run in every tab)
- Use alarms for periodic tasks (not setInterval)
- Batch operations to reduce CPU usage

---

## Code Organization

### Directory Structure

```
heyho-browser-extension/
├── manifest-chrome.json          # Chrome/Edge manifest
├── manifest-firefox.json         # Firefox manifest
├── manifest-safari.json          # Safari manifest (if needed)
├── src/
│   ├── background/               # Service worker scripts
│   │   ├── init.js              # Initialization entry point
│   │   ├── config.js            # Configuration constants
│   │   ├── storage.js           # IndexedDB wrapper
│   │   ├── events.js            # Event models
│   │   ├── aggregator.js        # Data aggregation logic
│   │   ├── categorizer.js       # Page categorization
│   │   ├── metadata-handler.js  # Metadata cache management
│   │   ├── listeners.js         # Event listeners
│   │   ├── auth-manager.js      # Authentication
│   │   ├── sync-manager.js      # Backend sync
│   │   └── ...
│   ├── content/                  # Content scripts (injected into pages)
│   │   ├── metadata-extractor.js
│   │   ├── page-tracker.js
│   │   └── ...
│   ├── popup/                    # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── options/                  # Settings page
│       ├── options.html
│       ├── options.js
│       └── options.css
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── categorization/
│   └── architecture/
└── CLAUDE.md                     # This file
```

### File Naming Conventions

- Use **kebab-case** for file names: `metadata-extractor.js`, `auth-manager.js`
- Use descriptive names: `page-tracker.js` not `tracker.js`
- Group related files: `auth-manager.js`, `auth-handlers.js`
- Suffix with type when helpful: `events.js`, `storage.js`, `listeners.js`

---

## Naming Conventions

### JavaScript

#### Variables and Functions
```javascript
// Use camelCase for variables and functions
const metadataCache = new Map();
let isAuthenticated = false;

function extractPageMetadata() { }
async function syncToBackend() { }
```

#### Constants
```javascript
// Use SCREAMING_SNAKE_CASE for true constants
const API_BASE_URL = 'https://api.heyho.com';
const MAX_RETRY_ATTEMPTS = 3;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Use PascalCase for enum-like objects
const EventType = {
  CREATE: 'CREATE',
  ACTIVATE: 'ACTIVATE',
  NAVIGATE: 'NAVIGATE',
  HEARTBEAT: 'HEARTBEAT',
  CLOSE: 'CLOSE'
};

const Categories = {
  WORK_CODING: 'work_coding',
  LEARNING_VIDEO: 'learning_video',
  UNCLASSIFIED: 'unclassified'
};
```

#### Classes
```javascript
// Use PascalCase for classes
class PageCategorizer { }
class EventProcessor { }
class StorageManager { }
```

#### Private Methods (Convention)
```javascript
// Prefix with underscore for private/internal methods
class PageCategorizer {
  categorize(pageVisit) {
    return this._applyRules(pageVisit);
  }

  _applyRules(pageVisit) {
    // Internal method
  }
}
```

#### Message Types
```javascript
// Use SCREAMING_SNAKE_CASE for message type constants
const MessageType = {
  PAGE_METADATA_EXTRACTED: 'PAGE_METADATA_EXTRACTED',
  AUTH_TOKEN_UPDATED: 'AUTH_TOKEN_UPDATED',
  SYNC_COMPLETED: 'SYNC_COMPLETED'
};
```

---

## JavaScript Best Practices

### 1. Modern JavaScript (ES2022)

**Use modern syntax and features:**

```javascript
// Good: Use const/let (not var)
const API_URL = 'https://api.example.com';
let currentUser = null;

// Good: Use arrow functions
const processData = (data) => data.map((item) => item.value);

// Good: Use template literals
const message = `User ${username} logged in at ${timestamp}`;

// Good: Use destructuring
const { url, title, domain } = pageVisit;
const [first, second, ...rest] = array;

// Good: Use default parameters
function fetchData(url, timeout = 5000) {
  // Implementation
}

// Good: Use async/await (not callbacks)
async function getData() {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch:', error);
    return null;
  }
}

// Good: Use optional chaining
const title = pageVisit?.metadata?.schemaData?.title;

// Good: Use nullish coalescing
const port = config.port ?? 3000; // Only default if null/undefined
```

**Avoid outdated patterns:**

```javascript
// Bad: var (use const/let)
var x = 10;

// Bad: function callbacks (use async/await)
fetchData(function(error, data) {
  if (error) return;
  processData(data, function(error, result) {
    // Callback hell
  });
});

// Bad: string concatenation (use template literals)
const url = 'https://' + domain + '/api/' + endpoint;

// Bad: checking for null/undefined separately
const value = config.value !== null && config.value !== undefined ? config.value : 'default';
```

### 2. Variable Declaration

**Use const by default, let when needed, never var:**

```javascript
// Good: const for values that don't change
const MAX_RETRIES = 3;
const categories = ['work_coding', 'learning_video'];

// Good: let for values that change
let retryCount = 0;
let currentTab = null;

// Bad: var (function-scoped, hoisting issues)
var isProcessing = false;
```

**Rule of thumb:**
1. Try `const` first
2. If you need to reassign, use `let`
3. Never use `var`

### 3. Functions

**Prefer arrow functions for non-methods:**

```javascript
// Good: Arrow functions for callbacks, array methods
const processedData = data.map((item) => item * 2);
setTimeout(() => console.log('Done'), 1000);

// Good: Regular functions for methods (access to 'this')
const obj = {
  name: 'test',
  getName() {
    return this.name; // Regular function has correct 'this'
  }
};

// Bad: Arrow function as method (wrong 'this')
const obj = {
  name: 'test',
  getName: () => {
    return this.name; // 'this' is undefined or wrong!
  }
};
```

**Use default parameters:**

```javascript
// Good: Default parameters
function fetchData(url, timeout = 5000, retries = 3) {
  // Implementation
}

// Bad: Manual default assignment
function fetchData(url, timeout, retries) {
  timeout = timeout || 5000;
  retries = retries || 3;
  // Problem: 0 is falsy, so timeout=0 becomes 5000!
}
```

**Use rest parameters instead of arguments:**

```javascript
// Good: Rest parameters
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}

// Bad: arguments object (not a real array)
function sum() {
  const args = Array.prototype.slice.call(arguments);
  return args.reduce((total, n) => total + n, 0);
}
```

### 4. Array and Object Methods

**Use modern array methods:**

```javascript
// Good: Use map, filter, reduce
const domains = pageVisits.map((visit) => visit.domain);
const workVisits = pageVisits.filter((visit) => visit.category.startsWith('work_'));
const totalTime = pageVisits.reduce((sum, visit) => sum + visit.duration, 0);

// Good: Use find instead of filter[0]
const visit = pageVisits.find((v) => v.id === targetId);

// Good: Use some/every for boolean checks
const hasWorkVisits = pageVisits.some((v) => v.category.startsWith('work_'));
const allCategorized = pageVisits.every((v) => v.category !== 'unclassified');

// Bad: Manual loops for simple operations
const domains = [];
for (let i = 0; i < pageVisits.length; i++) {
  domains.push(pageVisits[i].domain);
}
```

**Use object methods:**

```javascript
// Good: Object.keys/values/entries
const keys = Object.keys(config);
const values = Object.values(config);
const entries = Object.entries(config);

// Good: Object spread for copying
const newConfig = { ...oldConfig, port: 3001 };

// Good: Object.assign for merging
const merged = Object.assign({}, defaults, userConfig);
```

### 5. Destructuring

**Use destructuring for cleaner code:**

```javascript
// Good: Object destructuring
function processPageVisit({ url, title, domain, metadata }) {
  // Direct access to properties
  console.log(url, title);
}

// Good: Array destructuring
const [year, month, day] = dateString.split('-');

// Good: Nested destructuring
const { metadata: { schemaType, ogType } } = pageVisit;

// Good: Default values in destructuring
const { timeout = 5000, retries = 3 } = options;

// Good: Rest in destructuring
const { url, title, ...rest } = pageVisit;
```

### 6. Async/Await Best Practices

**Always use try-catch with async:**

```javascript
// Good: Proper error handling
async function syncData() {
  try {
    const data = await collectData();
    const result = await sendToBackend(data);
    return { success: true, result };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  }
}

// Bad: No error handling (unhandled rejection)
async function syncData() {
  const data = await collectData(); // May throw!
  return await sendToBackend(data); // May throw!
}
```

**Avoid unnecessary await:**

```javascript
// Good: Return promise directly
async function getData() {
  return fetch(url).then((r) => r.json());
}

// Bad: Unnecessary await before return
async function getData() {
  return await fetch(url).then((r) => r.json());
}

// Exception: When in try-catch, await is needed
async function getData() {
  try {
    return await fetch(url); // Must await to catch errors
  } catch (error) {
    return null;
  }
}
```

**Parallel async operations:**

```javascript
// Good: Run in parallel
const [user, settings, visits] = await Promise.all([
  fetchUser(),
  fetchSettings(),
  fetchVisits()
]);

// Bad: Sequential (slow!)
const user = await fetchUser();
const settings = await fetchSettings();
const visits = await fetchVisits();
```

### 7. Null and Undefined Handling

**Use optional chaining and nullish coalescing:**

```javascript
// Good: Optional chaining
const title = pageVisit?.metadata?.schemaData?.title;

// Good: Nullish coalescing (only null/undefined)
const port = config.port ?? 3000;
const name = user.name ?? 'Anonymous';

// Bad: Nested checks
const title = pageVisit && pageVisit.metadata &&
              pageVisit.metadata.schemaData &&
              pageVisit.metadata.schemaData.title;

// Bad: OR operator (treats 0, '', false as falsy)
const port = config.port || 3000; // Problem: port=0 becomes 3000!
```

**Check for existence properly:**

```javascript
// Good: Check for null/undefined
if (value !== null && value !== undefined) { }
if (value != null) { } // Checks both null and undefined

// Good: Check for truthy (intentional)
if (value) { } // Accepts any truthy value

// Bad: Checking for existence with ==
if (value != false) { } // Confusing
```

### 8. Immutability

**Avoid mutating data:**

```javascript
// Good: Create new array
const newArray = [...oldArray, newItem];
const filtered = array.filter((x) => x > 0);

// Good: Create new object
const updated = { ...config, port: 3001 };

// Bad: Mutate original
oldArray.push(newItem); // Mutates!
config.port = 3001; // Mutates!

// Exception: When performance critical or data is local
function processLargeArray(arr) {
  // Local mutation is OK if not exposed
  arr.sort();
  return arr;
}
```

### 9. Comparison and Equality

**Use strict equality (===):**

```javascript
// Good: Strict equality
if (value === 0) { }
if (type !== 'video') { }

// Bad: Loose equality (type coercion)
if (value == 0) { } // '0' == 0 is true!
if (type != 'video') { }

// Exception: Checking for null/undefined
if (value == null) { } // Checks both null and undefined
```

**Use `includes` for multiple checks:**

```javascript
// Good: Use includes
if (['work_coding', 'work_documentation'].includes(category)) { }

// Bad: Multiple OR checks
if (category === 'work_coding' || category === 'work_documentation') { }
```

### 10. Avoid Common Pitfalls

**Magic numbers:**

```javascript
// Good: Named constants
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const CACHE_TTL_MS = 5 * 60 * MILLISECONDS_PER_SECOND;

setTimeout(callback, CACHE_TTL_MS);

// Bad: Magic numbers
setTimeout(callback, 300000); // What is this?
```

**Empty functions:**

```javascript
// Good: Explicit no-op with comment
const noop = () => {
  // Intentionally empty - placeholder for callback
};

// Bad: Unexplained empty function
function handleError() {
  // Why is this empty?
}
```

**Unused variables:**

```javascript
// Good: Prefix with underscore if intentionally unused
function processData(data, _metadata) {
  return data.map((item) => item.value);
  // _metadata signals "not used but required by signature"
}

// Bad: Unused parameter
function processData(data, metadata) {
  return data.map((item) => item.value);
  // metadata is never used - confusing
}
```

### 11. Comments and Documentation

**Write self-documenting code:**

```javascript
// Good: Clear variable names
const isUserAuthenticated = checkAuthStatus();
const hasValidToken = token && !isTokenExpired(token);

// Bad: Unclear code with explanatory comments
const x = checkAuthStatus(); // Check if user is authenticated
const y = token && !isTokenExpired(token); // Check if token is valid
```

**Use comments for "why", not "what":**

```javascript
// Good: Explain why
// Safari doesn't support requestIdleCallback, so fall back to setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(callback);
} else {
  setTimeout(callback, 100);
}

// Bad: Explain what (code already shows this)
// Call requestIdleCallback with callback
requestIdleCallback(callback);
```

**Use JSDoc for public APIs:**

```javascript
/**
 * Categorizes a page visit based on extracted metadata.
 *
 * @param {Object} pageVisit - Page visit object
 * @param {string} pageVisit.url - Full URL
 * @param {string} pageVisit.title - Page title
 * @param {Object} pageVisit.metadata - Extracted metadata
 * @returns {{category: string, confidence: number, method: string}} Categorization result
 */
function categorize(pageVisit) {
  // Implementation
}
```

### 12. Performance Considerations

**Avoid expensive operations in loops:**

```javascript
// Good: Cache length
const len = array.length;
for (let i = 0; i < len; i++) {
  process(array[i]);
}

// Good: Use for...of when index not needed
for (const item of array) {
  process(item);
}

// Bad: Recalculate length every iteration
for (let i = 0; i < array.length; i++) {
  process(array[i]);
}
```

**Use early returns:**

```javascript
// Good: Early return
function processData(data) {
  if (!data) return null;
  if (data.length === 0) return [];

  // Main logic here
  return processedData;
}

// Bad: Nested conditions
function processData(data) {
  if (data) {
    if (data.length > 0) {
      // Main logic deeply nested
      return processedData;
    } else {
      return [];
    }
  } else {
    return null;
  }
}
```

**Avoid memory leaks:**

```javascript
// Good: Clear intervals/timeouts
const intervalId = setInterval(callback, 1000);
window.addEventListener('beforeunload', () => {
  clearInterval(intervalId);
});

// Bad: Never cleared (memory leak)
setInterval(callback, 1000);
```

---

## Module Pattern

### Browser Environment Export

**Use `self` for global exports (service worker compatible):**

```javascript
/**
 * Storage Module for IndexedDB operations
 */
const StorageModule = (function() {
  'use strict';

  // Private state
  let dbInstance = null;

  // Private functions
  function _handleError(error) {
    console.error('[Storage]', error);
  }

  // Public API
  async function initDB() {
    // Implementation
  }

  async function addEvent(event) {
    // Implementation
  }

  // Return public interface
  return {
    initDB,
    addEvent
  };
})();

// Export for browser environment (works in service workers)
self.StorageModule = StorageModule;
```

### Node.js Compatible Exports (for testing)

```javascript
// Add at end of file for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageModule };
}
```

### Module Dependencies

**Access dependencies via `self` global:**

```javascript
async function processEvent(event) {
  // Access other modules via self
  const { IS_DEV_MODE } = self.ConfigModule;
  const db = await self.StorageModule.initDB();

  if (IS_DEV_MODE) {
    console.log('Processing event:', event);
  }

  // Implementation
}
```

---

## Error Handling

### 1. Always Use Try-Catch for Async Operations

```javascript
async function syncToBackend() {
  try {
    const data = await collectData();
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Sync] Failed to sync data:', error);
    // Don't throw - handle gracefully
    return { success: false, error: error.message };
  }
}
```

### 2. Return Result Objects (Don't Throw)

**Good:**
```javascript
async function processData() {
  try {
    // Process data
    return { success: true, data: result };
  } catch (error) {
    console.error('Processing failed:', error);
    return { success: false, error: error.message };
  }
}

// Usage:
const result = await processData();
if (!result.success) {
  console.warn('Processing failed:', result.error);
  // Handle failure gracefully
}
```

**Bad (Don't do this):**
```javascript
async function processData() {
  // Throws error - caller must handle
  const result = await riskyOperation(); // May throw
  return result;
}
```

### 3. Add Global Error Handlers

**Service Worker:**
```javascript
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Uncaught error:', event.error);
  // Log to backend or local storage for debugging
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
});
```

**Content Script:**
```javascript
window.addEventListener('error', (event) => {
  console.error('[Content] Uncaught error:', event.error);
  // Send to background script for logging
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_ERROR',
    data: {
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href
    }
  }).catch(() => {
    // Extension context invalidated - ignore
  });
});
```

### 4. Handle Extension Context Invalidation

**Content scripts may outlive extension context:**

```javascript
function sendMessage(message) {
  return chrome.runtime.sendMessage(message).catch(error => {
    // Check if extension context was invalidated
    if (error.message && error.message.includes('Extension context')) {
      console.warn('[Content] Extension context invalidated');
      // Don't retry or log error - this is expected
      return null;
    }
    // Other errors should be logged
    console.error('[Content] Message send failed:', error);
    throw error;
  });
}
```

### 5. Retry Logic for Critical Operations

```javascript
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = () => true
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const shouldRetryError = shouldRetry(error);

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      const waitTime = delay * Math.pow(backoff, attempt - 1);
      console.warn(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Usage:
const result = await withRetry(
  () => fetch(API_URL),
  {
    maxRetries: 3,
    shouldRetry: (error) => error.message.includes('network')
  }
);
```

---

## Storage Best Practices

### 1. Use IndexedDB for Large Data

**Chrome.storage.local limits:**
- 10 MB total storage (Chrome)
- Synchronous operations block main thread
- Not suitable for thousands of records

**IndexedDB benefits:**
- Gigabytes of storage
- Async operations (non-blocking)
- Indexes for fast queries
- Transactions for consistency

**When to use chrome.storage vs IndexedDB:**

| Data Type | Storage | Reason |
|-----------|---------|--------|
| Settings, preferences | `chrome.storage.sync` | Small, should sync across devices |
| Auth tokens, state | `chrome.storage.local` | Small, needs to survive restart |
| Events, page visits | IndexedDB | Large volume, needs indexes |
| Aggregated data | IndexedDB | Large, needs transactions |

### 2. IndexedDB Schema Versioning

```javascript
const DB_NAME = 'Heyho_EventsDB';
const DB_VERSION = 3; // Increment when schema changes

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Version 1: Initial schema
      if (oldVersion < 1) {
        const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
        eventsStore.createIndex('timestamp_idx', 'timestamp', { unique: false });
      }

      // Version 2: Add pageVisits store
      if (oldVersion < 2) {
        const pageVisitsStore = db.createObjectStore('pageVisits', { keyPath: 'visitId' });
        pageVisitsStore.createIndex('domain_idx', 'domain', { unique: false });
      }

      // Version 3: Add category index
      if (oldVersion < 3) {
        const transaction = event.target.transaction;
        const pageVisitsStore = transaction.objectStore('pageVisits');
        pageVisitsStore.createIndex('category_idx', 'category', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

### 3. Use Indexes for Performance

```javascript
// Good: Use index for filtering
async function getVisitsByDomain(domain) {
  const db = await initDB();
  const transaction = db.transaction(['pageVisits'], 'readonly');
  const store = transaction.objectStore('pageVisits');
  const index = store.index('domain_idx'); // Use index
  const request = index.getAll(domain);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Bad: Scan all records (slow)
async function getVisitsByDomain(domain) {
  const allVisits = await getAllVisits(); // Gets ALL records
  return allVisits.filter(v => v.domain === domain); // Filter in JS
}
```

### 4. Batch Operations

```javascript
// Good: Single transaction for multiple writes
async function addVisitsBatch(visits) {
  const db = await initDB();
  const transaction = db.transaction(['pageVisits'], 'readwrite');
  const store = transaction.objectStore('pageVisits');

  // Add all visits in one transaction
  visits.forEach(visit => store.put(visit));

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Bad: Separate transaction for each write
async function addVisitsBatch(visits) {
  for (const visit of visits) {
    await addVisit(visit); // Creates new transaction each time!
  }
}
```

---

## Content Scripts

### 1. Minimize Impact on Page Performance

```javascript
// Good: Run after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // Already loaded
  init();
}

// Good: Use requestIdleCallback for non-critical work
function extractMetadata() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const metadata = performExtraction();
      sendToBackground(metadata);
    }, { timeout: 2000 });
  } else {
    // Fallback for Safari
    setTimeout(() => {
      const metadata = performExtraction();
      sendToBackground(metadata);
    }, 100);
  }
}
```

### 2. Detect Single Page Applications (SPAs)

```javascript
let lastUrl = window.location.href;
let urlCheckInterval = null;

function detectNavigation() {
  // Check for URL changes (SPA navigation)
  urlCheckInterval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      onNavigate(currentUrl);
    }
  }, 1000);
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
  }
});
```

### 3. Handle Extension Context Invalidation

```javascript
function sendMessage(message) {
  // Gracefully handle context invalidation
  chrome.runtime.sendMessage(message).catch(error => {
    if (error.message?.includes('Extension context')) {
      // Extension was reloaded/disabled - stop execution
      console.log('[Content] Extension context invalidated, stopping');
      cleanup();
      return null;
    }
    throw error;
  });
}

function cleanup() {
  // Stop all intervals, remove listeners, etc.
  if (urlCheckInterval) clearInterval(urlCheckInterval);
}
```

### 4. Exclude Special URLs

```javascript
function shouldTrack(url) {
  // Don't track extension pages or special URLs
  const excludedPrefixes = [
    'chrome://',
    'about:',
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'edge://',
    'view-source:'
  ];

  return !excludedPrefixes.some(prefix => url.startsWith(prefix));
}

// Usage:
if (!shouldTrack(window.location.href)) {
  return; // Don't run content script
}
```

---

## Background Service Workers

### 1. Understand Service Worker Lifecycle

**Service workers terminate after 30 seconds of inactivity:**

```javascript
// Bad: Long-lived state (lost when service worker terminates)
let authToken = null; // Lost on termination!

// Good: Store in chrome.storage
async function getAuthToken() {
  const result = await chrome.storage.local.get('authToken');
  return result.authToken;
}

async function setAuthToken(token) {
  await chrome.storage.local.set({ authToken: token });
}
```

### 2. Use Alarms for Periodic Tasks

```javascript
// Bad: setInterval (doesn't survive service worker termination)
setInterval(() => {
  syncData();
}, 5 * 60 * 1000);

// Good: Use chrome.alarms API
async function setupSyncAlarm() {
  await chrome.alarms.create('data-sync', {
    periodInMinutes: 5
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'data-sync') {
    syncData();
  }
});
```

### 3. Initialize on Service Worker Startup

```javascript
// Service worker may terminate and restart frequently
// Always initialize when it starts

async function initialize() {
  console.log('Service worker starting...');

  // Initialize modules
  await initStorage();
  await initAuth();
  await setupListeners();
  await setupAlarms();

  console.log('Service worker initialized');
}

// Run initialization
initialize();
```

### 4. Keep Service Worker Alive for Long Operations

```javascript
async function longRunningOperation() {
  // Keep service worker alive during operation
  const port = chrome.runtime.connect({ name: 'keep-alive' });

  try {
    // Perform long operation
    await processLargeDataset();
  } finally {
    // Close port to allow termination
    port.disconnect();
  }
}
```

---

## Message Passing

### 1. Use Structured Message Format

```javascript
// Standard message format
const message = {
  type: 'PAGE_METADATA_EXTRACTED', // SCREAMING_SNAKE_CASE
  data: {
    url: 'https://example.com',
    title: 'Example Page',
    metadata: { /* ... */ }
  },
  timestamp: Date.now(),
  sender: 'content-script' // Optional: for debugging
};

chrome.runtime.sendMessage(message);
```

### 2. Message Type Constants

```javascript
// Define message types in a shared module
const MessageType = {
  // Content → Background
  PAGE_METADATA_EXTRACTED: 'PAGE_METADATA_EXTRACTED',
  PAGE_ENGAGEMENT_UPDATE: 'PAGE_ENGAGEMENT_UPDATE',

  // Background → Content
  CATEGORIZATION_RESULT: 'CATEGORIZATION_RESULT',

  // Popup → Background
  REQUEST_SYNC: 'REQUEST_SYNC',
  REQUEST_STATS: 'REQUEST_STATS',

  // Background → Popup
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  STATS_RESPONSE: 'STATS_RESPONSE'
};

self.MessageType = MessageType;
```

### 3. Centralized Message Handler

```javascript
// In background script
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessageAsync(message, sender, sendResponse);
    return true; // Keep channel open for async response
  });
}

async function handleMessageAsync(message, sender, sendResponse) {
  try {
    const { type, data } = message;

    switch (type) {
      case MessageType.PAGE_METADATA_EXTRACTED:
        await handlePageMetadata(data, sender.tab);
        sendResponse({ success: true });
        break;

      case MessageType.REQUEST_SYNC:
        const result = await syncToBackend();
        sendResponse({ success: true, data: result });
        break;

      default:
        console.warn('[Background] Unknown message type:', type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[Background] Message handling error:', error);
    sendResponse({ success: false, error: error.message });
  }
}
```

### 4. Handle sendResponse Timing

```javascript
// Good: Always call sendResponse
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_REQUEST') {
    // Async operation
    performSync().then(result => {
      sendResponse({ success: true, data: result });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep message channel open
  }

  // Sync response
  sendResponse({ success: true });
  return false; // Close channel immediately
});
```

---

## Performance Guidelines

### 1. Debounce and Throttle

```javascript
/**
 * Debounce: Wait for quiet period before executing
 * Use for: text input, window resize
 */
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle: Execute at most once per interval
 * Use for: scroll events, mouse move
 */
function throttle(fn, interval) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

// Usage:
const debouncedExtraction = debounce(extractMetadata, 500);
const throttledScroll = throttle(trackScroll, 1000);

window.addEventListener('scroll', throttledScroll);
```

### 2. Lazy Initialization

```javascript
// Don't initialize everything immediately
class MetadataExtractor {
  constructor() {
    this._schemaCache = null; // Lazy init
  }

  get schemaCache() {
    if (!this._schemaCache) {
      this._schemaCache = this._buildSchemaCache();
    }
    return this._schemaCache;
  }

  _buildSchemaCache() {
    // Expensive operation - only run when needed
    return { /* ... */ };
  }
}
```

### 3. Limit Data in Memory

```javascript
// Good: Use Map with size limit (LRU cache)
class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recent)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
}

// Usage:
const metadataCache = new LRUCache(50); // Max 50 entries
```

---

## Cross-Browser Compatibility

### 1. Use browser.* API with Polyfill

```javascript
// Modern way: Use browser namespace
// Chrome 91+ supports browser.* natively
// Firefox always used browser.*

// Check which API is available
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Or use a polyfill like webextension-polyfill
// npm install webextension-polyfill
```

### 2. Handle API Differences

```javascript
// Chrome uses callbacks, Firefox uses promises
// Modern Chrome (91+) supports promises

// Good: Use promise-based approach
async function getStorageData(key) {
  if (typeof browser !== 'undefined') {
    // Firefox
    return await browser.storage.local.get(key);
  } else {
    // Chrome
    return new Promise((resolve) => {
      chrome.storage.local.get(key, resolve);
    });
  }
}

// Better: Use browser API everywhere with polyfill
import browser from 'webextension-polyfill';
const data = await browser.storage.local.get(key);
```

### 3. Feature Detection

```javascript
// Good: Check for feature support
function supportsIdleDetection() {
  return typeof chrome !== 'undefined' && chrome.idle !== undefined;
}

if (supportsIdleDetection()) {
  chrome.idle.queryState(60, (state) => {
    console.log('Idle state:', state);
  });
} else {
  console.log('Idle detection not supported in this browser');
}
```

### 4. Manifest Differences

**Chrome (manifest-chrome.json):**
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": ["<all_urls>"]
}
```

**Firefox (manifest-firefox.json):**
```json
{
  "manifest_version": 3,
  "background": {
    "scripts": ["background.js"]
  },
  "permissions": ["<all_urls>"]
}
```

---

## Security

### 1. Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Never use:**
- `'unsafe-eval'` - Allows eval() and Function()
- `'unsafe-inline'` - Allows inline scripts
- Remote scripts from CDNs (bundle locally)

### 2. Validate All External Data

```javascript
// Never trust data from web pages
function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  // Sanitize strings
  const title = String(metadata.title || '').slice(0, 500);
  const url = String(metadata.url || '').slice(0, 2048);

  // Validate types
  const duration = typeof metadata.duration === 'number' ? metadata.duration : 0;

  return {
    title,
    url,
    duration: Math.max(0, duration) // Ensure positive
  };
}
```

### 3. Sanitize User Input

```javascript
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.href;
  } catch (error) {
    return null;
  }
}
```

### 4. Secure Token Storage

```javascript
// Never store tokens in localStorage (accessible to page scripts)
// Use chrome.storage.local (isolated from page)

async function storeAuthToken(token) {
  await chrome.storage.local.set({
    authToken: token,
    tokenExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  });
}

async function getAuthToken() {
  const result = await chrome.storage.local.get(['authToken', 'tokenExpiry']);

  if (!result.authToken) {
    return null;
  }

  // Check if expired
  if (Date.now() > result.tokenExpiry) {
    await chrome.storage.local.remove(['authToken', 'tokenExpiry']);
    return null;
  }

  return result.authToken;
}
```

---

## Testing

### 1. Unit Tests (Jest)

```javascript
// tests/unit/categorizer.test.js
const { PageCategorizer } = require('../../src/background/categorizer');

describe('PageCategorizer', () => {
  describe('categorizeVideo', () => {
    it('should categorize short videos as short-form', () => {
      const pageVisit = {
        url: 'https://youtube.com/watch?v=xyz',
        title: 'Funny cat video',
        metadata: {
          schemaType: 'VideoObject',
          schemaData: { duration: 'PT30S' } // 30 seconds
        }
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('entertainment_short_form');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });
});
```

### 2. Integration Tests

```javascript
// tests/integration/metadata-flow.test.js
describe('Metadata extraction flow', () => {
  it('should extract metadata and categorize page', async () => {
    // Mock content script extraction
    const metadata = MetadataExtractor.extractPageMetadata();

    // Send to background (mock message passing)
    const message = {
      type: 'PAGE_METADATA_EXTRACTED',
      data: { url: testUrl, title: testTitle, metadata }
    };

    // Process message
    await handlePageMetadata(message.data, mockTab);

    // Verify categorization
    const cachedMetadata = MetadataHandler.getMetadata(mockTab.id);
    expect(cachedMetadata).toBeDefined();
  });
});
```

### 3. Manual Testing Checklist

- [ ] Load extension in Chrome
- [ ] Load extension in Firefox
- [ ] Test on various websites (YouTube, GitHub, news sites)
- [ ] Test SPA navigation (YouTube video to video)
- [ ] Test with extension reload (service worker restart)
- [ ] Test with browser restart
- [ ] Test offline mode
- [ ] Check memory usage over time
- [ ] Test with thousands of page visits

---

## Documentation

### 1. JSDoc Comments

```javascript
/**
 * Extracts rich metadata from web pages for categorization.
 *
 * Supports:
 * - Schema.org JSON-LD structured data
 * - Open Graph meta tags
 * - Generic meta tags
 * - Page content signals (video, audio, code editor)
 *
 * @returns {Object} Metadata object
 * @property {string|null} schemaType - Schema.org type (e.g., "VideoObject")
 * @property {Object|null} schemaData - Full Schema.org data
 * @property {string|null} ogType - Open Graph type
 * @property {boolean} hasVideo - Whether page contains video element
 * @property {number} wordCount - Estimated word count
 *
 * @example
 * const metadata = extractPageMetadata();
 * console.log(metadata.schemaType); // "VideoObject"
 */
function extractPageMetadata() {
  // Implementation
}
```

### 2. Function Complexity Comments

```javascript
/**
 * Categorize a page visit based on metadata.
 *
 * Categorization flow:
 * 1. Try Schema.org type (highest confidence: 0.9-0.95)
 * 2. Try Open Graph + URL patterns (confidence: 0.8-0.9)
 * 3. Try domain + URL patterns (confidence: 0.7-0.9)
 * 4. Try content signals (confidence: 0.6-0.8)
 * 5. If confidence < 0.6 → mark as "unclassified"
 *
 * @param {Object} pageVisit - Page visit object
 * @param {string} pageVisit.url - Full URL
 * @param {string} pageVisit.title - Page title
 * @param {string} pageVisit.domain - Extracted domain
 * @param {Object} pageVisit.metadata - Extracted metadata
 * @returns {Object} Categorization result
 * @returns {string} return.category - Category name (e.g., "learning_video")
 * @returns {number} return.confidence - Confidence score (0-1)
 * @returns {string} return.method - Method used ("metadata" or "unclassified")
 */
static categorize(pageVisit) {
  // Implementation
}
```

### 3. Module Documentation

```javascript
/**
 * Metadata Handler Module
 *
 * Handles page metadata from content scripts and caches it for categorization.
 *
 * **Architecture:**
 * - Content script extracts metadata → sends to background
 * - Background script caches metadata by tabId
 * - Aggregator retrieves metadata when creating PageVisits
 * - Cache has 5-minute TTL with periodic cleanup
 *
 * **Usage:**
 * ```javascript
 * // In content script:
 * const metadata = MetadataExtractor.extractPageMetadata();
 * chrome.runtime.sendMessage({
 *   type: 'PAGE_METADATA_EXTRACTED',
 *   data: { url, title, metadata }
 * });
 *
 * // In background script:
 * MetadataHandler.handlePageMetadata(data, tab);
 * const cached = MetadataHandler.getMetadata(tabId);
 * ```
 *
 * @module MetadataHandler
 */
const MetadataHandler = (function() {
  // Implementation
})();
```

---

## Common Patterns

### 1. Initialization Pattern

```javascript
/**
 * Initialize the module
 * Called on service worker startup
 */
async function init() {
  const { IS_DEV_MODE } = self.ConfigModule;

  try {
    // Step 1: Initialize storage
    await initStorage();

    // Step 2: Setup listeners
    setupListeners();

    // Step 3: Setup alarms
    await setupAlarms();

    if (IS_DEV_MODE) {
      console.log('[Module] Initialized successfully');
    }
  } catch (error) {
    console.error('[Module] Initialization failed:', error);
    throw error;
  }
}

// Export module
self.MyModule = { init };
```

### 2. Configuration Pattern

```javascript
// config.js
const IS_DEV_MODE = !('update_url' in chrome.runtime.getManifest());

const CONFIG = {
  // Environment
  isDev: IS_DEV_MODE,

  // API
  api: {
    baseUrl: IS_DEV_MODE
      ? 'http://localhost:3001/api/v1'
      : 'https://api.heyho.com/api/v1',
    timeout: 10000,
    retries: 3
  },

  // Storage
  storage: {
    dbName: 'Heyho_EventsDB',
    dbVersion: 3,
    maxCacheSize: 100
  },

  // Categorization
  categorization: {
    confidenceThreshold: 0.6,
    metadataDelay: 1000,
    cacheTTL: 5 * 60 * 1000
  },

  // Sync
  sync: {
    intervalMinutes: 5,
    batchSize: 1000,
    maxRetries: 3
  }
};

self.ConfigModule = { IS_DEV_MODE, CONFIG };
```

### 3. Singleton Pattern for Storage

```javascript
// storage.js
const StorageManager = (function() {
  let dbInstance = null;

  async function getDB() {
    if (dbInstance) {
      return dbInstance;
    }

    dbInstance = await initDB();
    return dbInstance;
  }

  async function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return { getDB };
})();

self.StorageManager = StorageManager;
```

---

## Checklist Before Committing

- [ ] Code follows naming conventions (camelCase, SCREAMING_SNAKE_CASE)
- [ ] All async operations have try-catch blocks
- [ ] Functions return result objects (not throw errors)
- [ ] Message types use constants from MessageType
- [ ] IndexedDB operations use indexes where possible
- [ ] No long-lived state in service worker (use chrome.storage)
- [ ] Content scripts handle extension context invalidation
- [ ] Dev mode logging uses `if (IS_DEV_MODE)`
- [ ] JSDoc comments added for public functions
- [ ] No console.log in production code (use conditional logging)
- [ ] Tested on Chrome and Firefox
- [ ] Memory usage checked for leaks
- [ ] Permissions justified in manifest

---

## Code Quality Tools

### ESLint + Prettier

This project uses ESLint and Prettier to enforce code quality and consistent formatting.

#### Installation

```bash
# Install dependencies
npm install

# Install git hooks
.githooks/install.sh
```

#### Configuration Files

- **`.eslintrc.json`** - ESLint rules (catches bugs, enforces patterns)
- **`.prettierrc`** - Prettier settings (code formatting)
- **`.prettierignore`** - Files excluded from formatting
- **`.githooks/pre-commit`** - Pre-commit hook (runs ESLint + Prettier)

#### Usage

```bash
# Check code quality (ESLint + Prettier)
npm run quality

# Auto-fix issues
npm run quality:fix

# Run ESLint only
npm run lint
npm run lint:fix

# Run Prettier only
npm run format
npm run format:check

# Run tests
npm test

# Run full validation (quality + tests)
npm run validate
```

#### Pre-commit Hook

The pre-commit hook automatically runs on every commit:

1. **Identifies** staged `.js` files
2. **Runs ESLint** - Blocks commit if errors found
3. **Runs Prettier** - Auto-formats code and re-stages
4. **Allows commit** if all checks pass

**To bypass (not recommended):**
```bash
git commit --no-verify
```

#### ESLint Rules (Highlights)

**Errors (block commit):**
- `no-unused-vars` - No unused variables
- `require-await` - async functions must have await
- `no-eval` - No eval() usage (security)
- `no-undef` - No undefined variables
- `eqeqeq` - Use === not ==
- `no-unsanitized/method` - Prevent XSS vulnerabilities

**Warnings (allow commit):**
- `no-var` - Use const/let not var
- `prefer-const` - Prefer const when not reassigned
- `no-console` - Warn on console.log (allows warn/error)
- `complexity` - Max cyclomatic complexity 15
- `max-lines-per-function` - Max 100 lines per function

**Test file overrides:**
- Test files (*.test.js) have relaxed rules
- console.log allowed
- No line/function length limits

#### Prettier Settings

- **Single quotes** (`'string'` not `"string"`)
- **Semicolons required**
- **2-space indentation**
- **100 character line width**
- **Trailing commas** in ES5 (arrays, objects)
- **Arrow function parens** always `(x) => x`

#### Editor Integration

**VS Code:**

Install extensions:
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Other editors:**
- Vim: ALE or coc-eslint + coc-prettier
- Sublime: SublimeLinter-eslint + JsPrettier
- WebStorm: Built-in support

#### Resources

- [ESLint Documentation](https://eslint.org/docs/rules/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Git Hooks README](./.githooks/README.md)

---

## References

- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [WebExtensions Polyfill](https://github.com/mozilla/webextension-polyfill)
- [Browser Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

---

**Last Updated:** 2025-10-20
**Version:** 1.0.0
