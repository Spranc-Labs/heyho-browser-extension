# Specification: Phase 1, Step 1 - Basic Extension Setup (Cross-Browser)

## 1. Objective

To create the foundational structure of the browser extension, ensuring compatibility with both **Chrome (Manifest V3)** and **Firefox (Manifest V3)**. This involves defining core properties, permissions, and establishing the main background script. The successful completion of this step means the extension can be loaded into both Chrome and Firefox without errors.

## 2. Cross-Browser Compatibility Strategy

To support both browsers, we will use a strategy that addresses the key differences in their Manifest V3 implementations.

1.  **Separate Manifests:** The primary difference is the `background` script definition. Chrome uses a `service_worker`, while Firefox uses `scripts`. We will maintain two separate manifest files (`manifest-chrome.json` and `manifest-firefox.json`) to handle this. In a future step, we can automate the generation of these from a single template.
2.  **API Polyfill:** To write unified JavaScript code, we will use the **WebExtension Browser API Polyfill**. This library allows us to use the standardized `browser.*` namespace in our code, which it automatically translates to the `chrome.*` namespace where necessary. This lets us write one `background.js` that works everywhere.

## 3. Files to Create

1.  `manifest-chrome.json` (For Chrome and Chromium-based browsers)
2.  `manifest-firefox.json` (For Firefox)
3.  `background.js` (Shared logic for both)
4.  `browser-polyfill.js` (The compatibility layer)

---

## 4. Manifest Requirements

### 4.1. Chrome Manifest (`manifest-chrome.json`)

This version uses the `service_worker` property for the background script as required by Chrome's Manifest V3.

```json
{
  "manifest_version": 3,
  "name": "HeyHo Extension - Analyze browser journey",
  "version": "1.0.0",
  "description": "A browser extension to intelligently track browsing habits and generate insights to help users understand and manage their digital activity.",
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "tabs",
    "storage",
    "idle",
    "alarms"
  ]
}
```

### 4.2. Firefox Manifest (`manifest-firefox.json`)

This version uses the `scripts` property for the background script and includes the polyfill. It also includes a `browser_specific_settings` key required by Firefox for identification.

```json
{
  "manifest_version": 3,
  "name": "HeyHo Extension - Analyze browser journey",
  "version": "1.0.0",
  "description": "A browser extension to intelligently track browsing habits and generate insights to help users understand and manage their digital activity.",
  "background": {
    "scripts": ["browser-polyfill.js", "background.js"]
  },
  "permissions": [
    "tabs",
    "storage",
    "idle",
    "alarms"
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "heyho@bext.com",
      "strict_min_version": "109.0"
    }
  }
}
```

---

## 5. Script Requirements

### 5.1. `browser-polyfill.js`

*   **Action:** Download the latest version of the polyfill from Mozilla's official repository. A simple way is to search for "webextension browser polyfill" and download the `browser-polyfill.min.js` file, renaming it to `browser-polyfill.js`.
*   **Purpose:** To enable the use of the promise-based `browser.*` API namespace in all browsers, ensuring code compatibility.

### 5.2. `background.js`

*   **Initial Content:** The file should be updated to use the `browser.*` namespace for all API calls.
*   **Purpose:** This script will contain the central, cross-browser logic for the extension.

### 5.3. Example Initial `background.js` Content

```javascript
// background.js
// This is the service worker for the Cognitive Load Monitor extension.
// It uses the browser.* namespace for cross-browser compatibility via the polyfill.

console.log("HeyHo background script loaded.");

// Example of using the browser.* namespace
browser.alarms.onAlarm.addListener((alarm) => {
  console.log("Alarm fired!", alarm);
});

// Event listeners and other logic will be added in subsequent steps.
```

---

## 6. Acceptance Criteria

This step is considered complete when:

1.  All four files (`manifest-chrome.json`, `manifest-firefox.json`, `background.js`, `browser-polyfill.js`) have been created.
2.  The project can be loaded as an "unpacked extension" in **Chrome** (using `manifest-chrome.json`, potentially by temporarily renaming it to `manifest.json`).
3.  The project can be loaded as a "temporary add-on" in **Firefox** (by selecting the `manifest-firefox.json` file).
4.  The message "Cognitive Load Monitor background script loaded." is visible in the console for both browsers.
