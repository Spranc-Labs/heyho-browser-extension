# Browser Extension Development Guide

This document outlines coding standards and best practices for the HeyHo browser extension (Manifest V3).

---

## Architecture Principles

### 1. Manifest V3 First
- Use service workers (not persistent background pages)
- Design for service worker termination (no long-lived state)
- Service workers terminate after 30s of inactivity

### 2. Cross-Browser Compatibility
- Target Chrome, Firefox, Safari
- Use `browser.*` API with polyfills
- Use feature detection, not browser detection

### 3. Privacy-First Design
- Minimize permissions
- Never collect PII without consent
- Use anonymous identifiers (UUIDs)
- Store sensitive data securely

### 4. Offline-First Architecture
- Extension works without internet
- Use IndexedDB for large data (not chrome.storage)
- Sync to backend asynchronously
- Handle network failures gracefully

### 5. Performance & Resource Efficiency
- Minimize memory usage (content scripts run in every tab)
- Use alarms for periodic tasks (not setInterval)
- Batch operations to reduce CPU usage

---

## Code Organization

### Directory Structure

```
heyho-browser-extension/
├── manifest-chrome.json
├── manifest-firefox.json
├── src/
│   ├── background/           # Service worker scripts
│   │   ├── init.js
│   │   ├── config.js
│   │   ├── storage.js
│   │   ├── categorizer.js
│   │   ├── metadata-handler.js
│   │   ├── sync-manager.js
│   │   └── ...
│   ├── content/              # Content scripts
│   │   ├── metadata-extractor.js
│   │   ├── page-tracker.js
│   │   └── ...
│   ├── popup/
│   └── options/
├── tests/
└── CLAUDE.md
```

### File Naming
- Use **kebab-case**: `metadata-extractor.js`, `auth-manager.js`
- Use descriptive names: `page-tracker.js` not `tracker.js`

---

## Naming Conventions

```javascript
// Variables and functions: camelCase
const metadataCache = new Map();
function extractPageMetadata() { }

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.heyho.com';
const MAX_RETRY_ATTEMPTS = 3;

// Enum-like objects: PascalCase
const EventType = {
  CREATE: 'CREATE',
  ACTIVATE: 'ACTIVATE',
  CLOSE: 'CLOSE'
};

// Classes: PascalCase
class PageCategorizer { }

// Private methods: prefix with underscore
class PageCategorizer {
  categorize(pageVisit) {
    return this._applyRules(pageVisit);
  }
  _applyRules(pageVisit) { }
}

// Message types: SCREAMING_SNAKE_CASE
const MessageType = {
  PAGE_METADATA_EXTRACTED: 'PAGE_METADATA_EXTRACTED',
  SYNC_COMPLETED: 'SYNC_COMPLETED'
};
```

---

## JavaScript Best Practices

### Modern JavaScript (ES2022)

**Use:**
- `const`/`let` (never `var`)
- Arrow functions for callbacks
- Template literals: `` `User ${username}` ``
- Destructuring: `const { url, title } = pageVisit`
- Default parameters: `function fetch(url, timeout = 5000) { }`
- async/await (not callbacks)
- Optional chaining: `pageVisit?.metadata?.title`
- Nullish coalescing: `const port = config.port ?? 3000`

**Avoid:**
- `var` declarations
- Callback hell (use async/await)
- String concatenation (use template literals)
- Manual null checks (use `??` and `?.`)

### Variable Declaration

```javascript
// Use const by default
const MAX_RETRIES = 3;

// Use let when you need to reassign
let retryCount = 0;

// Never use var
```

### Functions

```javascript
// Arrow functions for callbacks
const data = items.map((item) => item.value);

// Regular functions for methods (correct 'this')
const obj = {
  name: 'test',
  getName() {
    return this.name;
  }
};

// Default parameters
function fetchData(url, timeout = 5000) { }

// Rest parameters
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
```

### Array and Object Methods

```javascript
// Use modern array methods
const domains = pageVisits.map((v) => v.domain);
const workVisits = pageVisits.filter((v) => v.category.startsWith('work_'));
const visit = pageVisits.find((v) => v.id === targetId);
const hasWork = pageVisits.some((v) => v.category.startsWith('work_'));

// Use object spread
const newConfig = { ...oldConfig, port: 3001 };
```

### Async/Await

```javascript
// Always use try-catch
async function syncData() {
  try {
    const data = await collectData();
    return { success: true, data };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  }
}

// Run operations in parallel
const [user, settings, visits] = await Promise.all([
  fetchUser(),
  fetchSettings(),
  fetchVisits()
]);
```

### Other Best Practices

```javascript
// Use strict equality
if (value === 0) { }

// Use includes for multiple checks
if (['work_coding', 'work_docs'].includes(category)) { }

// Named constants (no magic numbers)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Early returns
function processData(data) {
  if (!data) return null;
  if (data.length === 0) return [];
  return processedData;
}

// Avoid memory leaks
const intervalId = setInterval(callback, 1000);
window.addEventListener('beforeunload', () => clearInterval(intervalId));
```

### Comments

```javascript
// Write self-documenting code
const isUserAuthenticated = checkAuthStatus();

// Explain "why", not "what"
// Safari doesn't support requestIdleCallback, so fall back to setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(callback);
} else {
  setTimeout(callback, 100);
}

// JSDoc for public APIs
/**
 * Categorizes a page visit based on metadata.
 * @param {Object} pageVisit - Page visit object
 * @returns {{category: string, confidence: number}} Categorization result
 */
function categorize(pageVisit) { }
```

---

## Module Pattern

### Browser Environment Export

```javascript
const StorageModule = (function() {
  'use strict';

  let dbInstance = null;

  function _handleError(error) {
    console.error('[Storage]', error);
  }

  async function initDB() { }
  async function addEvent(event) { }

  return { initDB, addEvent };
})();

// Export for browser (works in service workers)
self.StorageModule = StorageModule;

// Node.js compatibility (for testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageModule };
}
```

### Module Dependencies

```javascript
async function processEvent(event) {
  // Access modules via self
  const { IS_DEV_MODE } = self.ConfigModule;
  const db = await self.StorageModule.initDB();

  if (IS_DEV_MODE) {
    console.log('Processing event:', event);
  }
}
```

---

## Error Handling

### 1. Always Use Try-Catch for Async

```javascript
async function syncToBackend() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Sync] Failed:', error);
    return { success: false, error: error.message };
  }
}
```

### 2. Return Result Objects (Don't Throw)

```javascript
async function processData() {
  try {
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Usage
const result = await processData();
if (!result.success) {
  console.warn('Failed:', result.error);
}
```

### 3. Global Error Handlers

```javascript
// Service Worker
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled rejection:', event.reason);
});

// Content Script
window.addEventListener('error', (event) => {
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_ERROR',
    data: { message: event.message, stack: event.error?.stack }
  }).catch(() => {
    // Extension context invalidated - ignore
  });
});
```

### 4. Handle Extension Context Invalidation

```javascript
function sendMessage(message) {
  return chrome.runtime.sendMessage(message).catch(error => {
    if (error.message?.includes('Extension context')) {
      console.warn('[Content] Context invalidated');
      return null;
    }
    throw error;
  });
}
```

### 5. Retry Logic

```javascript
async function withRetry(fn, { maxRetries = 3, delay = 1000, backoff = 2 } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

---

## Storage Best Practices

### When to Use What

| Data Type | Storage | Reason |
|-----------|---------|--------|
| Settings, preferences | `chrome.storage.sync` | Small, syncs across devices |
| Auth tokens, state | `chrome.storage.local` | Small, survives restart |
| Events, page visits | IndexedDB | Large volume, needs indexes |

### IndexedDB Schema Versioning

```javascript
const DB_NAME = 'Heyho_EventsDB';
const DB_VERSION = 3;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const store = db.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('timestamp_idx', 'timestamp', { unique: false });
      }
      if (oldVersion < 2) {
        const store = db.createObjectStore('pageVisits', { keyPath: 'visitId' });
        store.createIndex('domain_idx', 'domain', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

### Use Indexes for Performance

```javascript
// Good: Use index
async function getVisitsByDomain(domain) {
  const db = await initDB();
  const store = db.transaction(['pageVisits'], 'readonly').objectStore('pageVisits');
  const index = store.index('domain_idx');
  return new Promise((resolve, reject) => {
    const request = index.getAll(domain);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Bad: Scan all records
async function getVisitsByDomain(domain) {
  const all = await getAllVisits();
  return all.filter(v => v.domain === domain);
}
```

### Batch Operations

```javascript
// Good: Single transaction
async function addVisitsBatch(visits) {
  const db = await initDB();
  const transaction = db.transaction(['pageVisits'], 'readwrite');
  const store = transaction.objectStore('pageVisits');
  visits.forEach(visit => store.put(visit));
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
```

---

## Content Scripts

### Minimize Performance Impact

```javascript
// Run after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Use requestIdleCallback
function extractMetadata() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => sendToBackground(performExtraction()), { timeout: 2000 });
  } else {
    setTimeout(() => sendToBackground(performExtraction()), 100);
  }
}
```

### Detect SPA Navigation

```javascript
let lastUrl = window.location.href;
const urlCheckInterval = setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    onNavigate(currentUrl);
  }
}, 1000);

window.addEventListener('beforeunload', () => clearInterval(urlCheckInterval));
```

### Exclude Special URLs

```javascript
function shouldTrack(url) {
  const excluded = ['chrome://', 'about:', 'chrome-extension://', 'moz-extension://'];
  return !excluded.some(prefix => url.startsWith(prefix));
}
```

---

## Background Service Workers

### No Long-Lived State

```javascript
// Bad: Lost on termination
let authToken = null;

// Good: Store in chrome.storage
async function getAuthToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken;
}
```

### Use Alarms for Periodic Tasks

```javascript
// Bad: Doesn't survive termination
setInterval(() => syncData(), 5 * 60 * 1000);

// Good: Use alarms
await chrome.alarms.create('data-sync', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'data-sync') syncData();
});
```

### Initialize on Startup

```javascript
async function initialize() {
  await initStorage();
  await setupListeners();
  await setupAlarms();
}

initialize();
```

---

## Message Passing

### Structured Format

```javascript
const message = {
  type: 'PAGE_METADATA_EXTRACTED',
  data: { url, title, metadata },
  timestamp: Date.now()
};

chrome.runtime.sendMessage(message);
```

### Message Type Constants

```javascript
const MessageType = {
  PAGE_METADATA_EXTRACTED: 'PAGE_METADATA_EXTRACTED',
  REQUEST_SYNC: 'REQUEST_SYNC',
  SYNC_COMPLETED: 'SYNC_COMPLETED'
};
self.MessageType = MessageType;
```

### Centralized Handler

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessageAsync(message, sender, sendResponse);
  return true; // Keep channel open
});

async function handleMessageAsync(message, sender, sendResponse) {
  try {
    const { type, data } = message;
    switch (type) {
      case MessageType.PAGE_METADATA_EXTRACTED:
        await handlePageMetadata(data, sender.tab);
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown type' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

---

## Performance Guidelines

### Debounce and Throttle

```javascript
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

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
```

### Lazy Initialization

```javascript
class MetadataExtractor {
  constructor() {
    this._cache = null;
  }
  get cache() {
    if (!this._cache) this._cache = this._buildCache();
    return this._cache;
  }
}
```

### LRU Cache

```javascript
class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
}
```

---

## Cross-Browser Compatibility

### Use browser.* API

```javascript
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Or use webextension-polyfill
import browser from 'webextension-polyfill';
const data = await browser.storage.local.get(key);
```

### Feature Detection

```javascript
function supportsIdleDetection() {
  return typeof chrome !== 'undefined' && chrome.idle !== undefined;
}

if (supportsIdleDetection()) {
  chrome.idle.queryState(60, (state) => console.log(state));
}
```

### Manifest Differences

**Chrome:**
```json
{
  "background": { "service_worker": "background.js" },
  "host_permissions": ["<all_urls>"]
}
```

**Firefox:**
```json
{
  "background": { "scripts": ["background.js"] },
  "permissions": ["<all_urls>"]
}
```

---

## Security

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

Never use: `'unsafe-eval'`, `'unsafe-inline'`, or remote scripts.

### Validate External Data

```javascript
function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;

  return {
    title: String(metadata.title || '').slice(0, 500),
    url: String(metadata.url || '').slice(0, 2048),
    duration: Math.max(0, metadata.duration || 0)
  };
}
```

### Secure Token Storage

```javascript
// Never use localStorage - use chrome.storage.local
async function storeAuthToken(token) {
  await chrome.storage.local.set({
    authToken: token,
    tokenExpiry: Date.now() + (24 * 60 * 60 * 1000)
  });
}

async function getAuthToken() {
  const { authToken, tokenExpiry } = await chrome.storage.local.get(['authToken', 'tokenExpiry']);
  if (!authToken || Date.now() > tokenExpiry) {
    await chrome.storage.local.remove(['authToken', 'tokenExpiry']);
    return null;
  }
  return authToken;
}
```

---

## Testing

### Unit Tests

```javascript
// tests/unit/categorizer.test.js
describe('PageCategorizer', () => {
  it('should categorize videos', () => {
    const result = PageCategorizer.categorize(pageVisit);
    expect(result.category).toBe('entertainment_short_form');
  });
});
```

### Manual Testing Checklist

- [ ] Chrome and Firefox
- [ ] Various websites (YouTube, GitHub, news)
- [ ] SPA navigation
- [ ] Extension reload (service worker restart)
- [ ] Browser restart
- [ ] Offline mode
- [ ] Memory usage over time

---

## Common Patterns

### Initialization

```javascript
async function init() {
  const { IS_DEV_MODE } = self.ConfigModule;
  try {
    await initStorage();
    setupListeners();
    await setupAlarms();
    if (IS_DEV_MODE) console.log('[Module] Initialized');
  } catch (error) {
    console.error('[Module] Init failed:', error);
    throw error;
  }
}
```

### Configuration

```javascript
const IS_DEV_MODE = !('update_url' in chrome.runtime.getManifest());

const CONFIG = {
  isDev: IS_DEV_MODE,
  api: {
    baseUrl: IS_DEV_MODE ? 'http://localhost:3001' : 'https://api.heyho.com',
    timeout: 10000
  },
  storage: { dbName: 'Heyho_EventsDB', dbVersion: 3 }
};

self.ConfigModule = { IS_DEV_MODE, CONFIG };
```

---

## Checklist Before Committing

- [ ] Naming conventions (camelCase, SCREAMING_SNAKE_CASE)
- [ ] Async operations have try-catch
- [ ] Functions return result objects
- [ ] Message types use constants
- [ ] IndexedDB uses indexes
- [ ] No long-lived state in service worker
- [ ] Content scripts handle context invalidation
- [ ] Dev mode logging uses `IS_DEV_MODE`
- [ ] JSDoc for public functions
- [ ] Tested on Chrome and Firefox
- [ ] No memory leaks

---

## Code Quality Tools

### Setup

```bash
npm install              # Install dependencies
.githooks/install.sh     # Install git hooks
```

### Usage

```bash
npm run quality          # Check ESLint + Prettier
npm run quality:fix      # Auto-fix issues
npm run lint             # ESLint only
npm run format           # Prettier only
npm test                 # Run tests
npm run validate         # Full validation
```

### Pre-commit Hook

Auto-runs on commit:
1. Runs ESLint (blocks if errors)
2. Runs Prettier (auto-formats)
3. Re-stages formatted files

Bypass: `git commit --no-verify` (not recommended)

### Key ESLint Rules

**Errors:**
- `no-unused-vars` - No unused variables
- `require-await` - async must have await
- `eqeqeq` - Use === not ==
- `no-eval` - Security

**Warnings:**
- `no-var` - Use const/let
- `prefer-const` - Prefer const
- `no-console` - Warn on console.log
- `complexity` - Max 15
- `max-lines-per-function` - Max 100

### Prettier Settings

- Single quotes
- Semicolons required
- 2-space indentation
- 100 character line width
- Trailing commas (ES5)

### Editor Setup (VS Code)

Install: ESLint + Prettier extensions

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## References

- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [WebExtensions Polyfill](https://github.com/mozilla/webextension-polyfill)
- [ESLint Documentation](https://eslint.org/docs/rules/)
- [Prettier Documentation](https://prettier.io/docs/)

---

**Last Updated:** 2025-10-20
**Version:** 1.1.0
