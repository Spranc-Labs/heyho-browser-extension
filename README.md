# HeyHo Browser Extension

A browser extension to intelligently track browsing habits and generate insights to help users understand and manage their digital activity. This project is built to be compatible with both Chrome and Firefox.

## ✨ Features

*   **Cross-Browser Compatibility:** Works on both Chrome (Manifest V3) and Firefox (Manifest V3).
*   **Core Event Tracking:** Logs key browser events, including:
    *   `CREATE`: When a new tab is created.
    *   `ACTIVATE`: When a user switches to a tab.
    *   `NAVIGATE`: When a tab's URL changes.
    *   `CLOSE`: When a tab is closed.
*   **Local Data Storage:** Events are stored locally and securely using IndexedDB.
*   **Automatic Data Cleanup:** A daily process runs to remove event data older than 7 days to maintain performance and privacy.
*   **Developer Mode:** Includes enhanced logging for easier development and debugging.

## 🛠️ Developer Setup

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd browser-extension
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    This will install Jest for testing, ESLint for code quality, and Husky for pre-commit hooks.

## 🚀 Loading the Extension

To test the extension, you can load it as a temporary add-on in your browser of choice.

### For Google Chrome

1.  Navigate to `chrome://extensions`.
2.  Enable **Developer mode** using the toggle in the top-right corner.
3.  Click the **Load unpacked** button.
4.  Select the `browser-extension` project directory.
    *   **Note:** For Chrome, you may need to temporarily rename `manifest-chrome.json` to `manifest.json`.

### For Mozilla Firefox

1.  Navigate to `about:debugging`.
2.  Click on the **This Firefox** tab on the left.
3.  Click the **Load Temporary Add-on...** button.
4.  Select the `manifest-firefox.json` file from the project directory.

## 🧪 Testing & Development

This project includes a comprehensive testing suite and development workflow:

*   **50+ Unit Tests:** Covers storage, event logging, and cleanup functionality
*   **ESLint Integration:** Code quality enforcement with pre-commit hooks
*   **Cross-browser Testing:** Validated on both Chrome and Firefox environments

Run tests and linting:
```bash
npm test          # Run all tests
npm run lint      # Check code quality
npm run validate  # Run both tests and linting
```

## 📂 Project Structure

```
.
├── background.js                 # Entry point - loads modules and starts extension
├── manifest-chrome.json          # Manifest for Chrome (uses service worker)
├── manifest-firefox.json         # Manifest for Firefox (uses script array)
├── package.json                  # Dependencies, scripts, and testing setup
├── specs/                        # Functional specifications and documentation
│   ├── phase-1/                  # Implementation phase specifications
│   ├── tests/                    # Comprehensive test suite (50+ tests)
│   └── workflow/                 # Development workflow documentation
└── src/
    └── background/               # Modular background script components
        ├── storage.js            # IndexedDB storage operations
        ├── config.js             # Configuration flags and constants
        ├── events.js             # Event creation and logging logic
        ├── listeners.js          # Browser tab event listeners
        ├── cleanup.js            # Data cleanup and alarm management
        └── init.js               # Startup and initialization sequence
```

## 🏗️ Architecture

The extension uses a **modular architecture** for maintainability:

*   **Cross-browser compatibility:** Chrome uses `importScripts()`, Firefox uses manifest script array
*   **Event-driven service worker:** Handles tab events and alarms efficiently  
*   **Modular code organization:** Each module has a single responsibility
*   **Comprehensive error handling:** Graceful degradation and detailed logging

## 🗺️ Future Plans

This project has a solid foundation. Next development goals include:

*   **Data Analysis & Insights:** Develop modules to analyze collected event data and provide meaningful browsing pattern insights
*   **Frontend/UI:** Create user-facing popup and options pages to display insights and configuration
*   **Export Functionality:** Allow users to export their browsing data in various formats
*   **Advanced Analytics:** Time-based analysis, domain grouping, and productivity metrics

---
