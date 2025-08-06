// Simple browser API polyfill for Chrome/Firefox compatibility
(function() {
  'use strict';

  // Check if we're in Firefox (has 'browser' global) or Chrome ('chrome' global)
  if (typeof browser !== 'undefined') {
    // Firefox - already has browser API
    window.extensionAPI = browser;
  } else if (typeof chrome !== 'undefined') {
    // Chrome - create browser-like API from chrome
    window.extensionAPI = chrome;
  } else {
    console.error('Neither chrome nor browser API found');
    return;
  }

  // Add a utility to detect the browser
  window.extensionAPI.isFirefox = typeof browser !== 'undefined';
  window.extensionAPI.isChrome = typeof chrome !== 'undefined' && typeof browser === 'undefined';

})(); 