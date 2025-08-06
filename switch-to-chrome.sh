#!/bin/bash

# Switch extension to Chrome mode
echo "Switching Tab Tracker extension to Chrome mode..."

# Use Chrome manifest
if [ -f "manifest-chrome.json" ]; then
    cp manifest-chrome.json manifest.json
    echo "✓ Activated Chrome manifest"
    echo ""
    echo "🔵 Extension is now ready for Chrome!"
    echo "Load it in Chrome by going to chrome://extensions and clicking 'Load unpacked'"
else
    echo "❌ Error: manifest-chrome.json not found"
fi 