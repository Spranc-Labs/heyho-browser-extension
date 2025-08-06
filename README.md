# Tab Tracker

Tab Tracker is a browser extension that monitors your tab activity to provide insights into your browsing habits. It tracks metrics like how long you spend on each tab, how many times you reload a page, and more.

## Features

*   **Track Active Time:** See how many seconds you've actively spent on the current tab.
*   **Monitor Load Count:** Keep track of how many times you've reloaded a page.
*   **Pin and Bookmark Detection:** See if your current tab is pinned or bookmarked.
*   **Opt-Out of Tracking:** You can choose to disable tracking at any time from the popup.
*   **Save to Journal:** Save the current tab's stats to a "journal" (currently logs to the console with insights).
*   **Background Tracking:** The extension tracks tab activity in the background, including when tabs are opened, closed, updated, and activated.
*   **Privacy-focused:** To protect your privacy, the extension hashes the URLs you visit before storing them.
*   **Context Menu Integration:** Right-click on any page to save the current tab's data to your journal.

## How to Install and Test

To test this extension, you can load it into your browser as an unpacked extension. Here's how to do it in Google Chrome:

1.  **Download the code:** Clone or download this repository to your local machine.
2.  **Open the Extension Management page:** Navigate to `chrome://extensions` in your browser.
3.  **Enable Developer Mode:** In the top right corner of the Extension Management page, toggle the "Developer mode" switch to the "on" position.
4.  **Load the extension:** Click the "Load unpacked" button that appears on the left side of the page.
5.  **Select the extension directory:** In the file selection dialog, choose the directory where you saved the extension's code.

The extension should now be loaded and active in your browser. You can click on the extension's icon in the toolbar to see the popup and interact with its features.

## How to Use

1. **View Stats:** Click the extension icon to see stats for the current tab including active time, load count, pin status, and bookmark status.
2. **Opt-out:** Use the checkbox in the popup to disable/enable tracking at any time.
3. **Save to Journal:** Click the "Save to Journal" button in the popup or right-click on any page and select "Save to Journal" to log the current tab's data and insights to the console.
4. **Monitor Background Activity:** The extension automatically tracks your tab usage in the background when tracking is enabled.

## Privacy

This extension tracks your browsing activity, but it takes steps to protect your privacy by hashing the URLs you visit. This means that the extension does not store the actual web addresses you go to, but rather a unique, irreversible "fingerprint" of each URL.

However, please be aware that the extension still collects data about your browsing habits, such as which tabs you have open, how long you spend on them, and whether you have them pinned or bookmarked.

**You have full control over your privacy:**
- All data is stored locally on your device
- No data is shared with third parties
- You can opt-out of tracking at any time
- URL hashing ensures your browsing history remains private
# heyho-browser-ext
