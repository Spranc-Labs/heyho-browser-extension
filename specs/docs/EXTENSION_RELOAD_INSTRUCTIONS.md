# Extension Reload Instructions

## The "Could not establish connection. Receiving end does not exist" Error

This error occurs when the popup tries to communicate with the background service worker, but the service worker is not responding. This commonly happens after code changes.

## Quick Fix Steps:

### 1. Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find the "HeyHo Browser Extension" 
3. Click the **reload button** (circular arrow icon)
4. Wait for the extension to fully reload

### 2. Check Service Worker Status
1. In `chrome://extensions/`, click **"Details"** on your extension
2. Look for **"service worker"** link 
3. Click it to open the service worker console
4. Check for any error messages

### 3. Test the Popup
1. Click the extension icon in the toolbar
2. Try loading stats again
3. The error should be resolved

## Common Causes:
- **Code changes**: Any modifications to background scripts require reload
- **Service worker timeout**: Chrome terminates idle service workers
- **Import errors**: Issues with module loading can crash the service worker

## Prevention:
- Always reload the extension after making code changes
- Check the service worker console for errors during development
- Use the "Inspect views: service worker" link for debugging

## If Error Persists:
1. **Disable and re-enable** the extension completely
2. Check browser console for additional error messages
3. Verify `manifest.json` permissions are correct
4. Ensure all imported scripts exist and have no syntax errors

The anonymous client ID implementation should work correctly after a proper extension reload.