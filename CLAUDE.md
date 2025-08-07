# Claude Development Guidelines for this Browser Extension

This document outlines the best practices and conventions to follow when writing code for this browser extension. Adhering to these guidelines will help us build a secure, performant, and maintainable product.

## 1. Core Principles

*   **Manifest V3:** The extension MUST use Manifest V3. This is the current standard and offers better security and performance.
*   **Security First:** Browser extensions have privileged access, so security is paramount. All code should be written with a security-conscious mindset.
*   **Minimalism:** Request the fewest permissions possible. Keep the feature set focused and the codebase lean.
*   **Cross-Browser Compatibility:** Use WebExtension APIs that are compatible across major browsers like Chrome, Firefox, and Edge.

## 2. `manifest.json`

*   **Permissions:** Only request permissions that are absolutely essential for the extension's functionality. For each permission, be ready to justify its use.
*   **Action:** Use the `action` key for browser actions. Avoid the deprecated `browser_action` and `page_action` keys.
*   **Content Security Policy (CSP):** Define a strict CSP. Avoid `'unsafe-inline'` and `'unsafe-eval'`. All scripts and resources should be loaded locally from the extension's package.

## 3. Background Service Worker

*   **Event-Driven:** The background script must be a non-persistent service worker. It should be event-driven and terminate when idle.
*   **No DOM Access:** Service workers do not have access to the DOM.
*   **Alarms API:** For tasks that need to run on a schedule, use the `chrome.alarms` API. Avoid `setTimeout` and `setInterval` for long-running tasks.

## 4. Content Scripts

*   **Programmatic Injection:** Whenever possible, inject content scripts programmatically using `chrome.scripting.executeScript()` instead of declaring them statically in `manifest.json`. This gives you more control over when and where your scripts run.
*   **Isolated Worlds:** Content scripts run in an isolated world. To interact with the page's JavaScript, use the `window.postMessage()` API for communication.
*   **Communication:** Use `chrome.runtime.sendMessage()` and `chrome.tabs.sendMessage()` to communicate between content scripts and the service worker.

## 5. UI (Popup, Options, etc.)

*   **Simplicity:** Keep the UI clean, simple, and intuitive.
*   **Plain Stack:** For simple UIs, use plain HTML, CSS, and JavaScript. Avoid heavy frameworks unless the UI is complex.
*   **Accessibility (a11y):** Ensure the UI is accessible. Use semantic HTML, ARIA attributes, and keyboard navigation.

## 6. Storage

*   **`chrome.storage.sync`:** Use for user settings that should be synced across their devices.
*   **`chrome.storage.local`:** Use for larger data or information that is specific to a single browser instance.
*   **Avoid `localStorage`:** Do not use `localStorage`. It is synchronous, blocking, and not available in service workers.

## 7. Security Best Practices

*   **No `innerHTML`:** To prevent Cross-Site Scripting (XSS), do not use `innerHTML` to add content to the DOM. Use `textContent` for text and `document.createElement` for creating HTML elements.
*   **Sanitize Inputs:** Sanitize all user input and data from web pages before using it.
*   **No Remote Code:** Do not fetch and execute remote code. All code must be included in the extension package.

## 8. Code Style & Structure

*   **Linter:** We will use a linter (like ESLint) to enforce a consistent code style.
*   **`async/await`:** Use `async/await` for all asynchronous operations.
*   **Modularity:** Break the code into small, reusable modules.
*   **File Structure:** Maintain a clear and organized file structure. For example:
    *   `/icons`: for extension icons.
    *   `/src/background`: for the service worker.
    *   `/src/content`: for content scripts.
    *   `/src/popup`: for the popup UI.

## 9. Commits

*   **Conventional Commits:** Follow the Conventional Commits specification (e.g., `feat:`, `fix:`, `docs:`, `refactor:`).
*   **Clear Messages:** Write commit messages that are clear, concise, and descriptive.
