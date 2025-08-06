#!/bin/bash

# Switch extension to Firefox mode
echo "Switching Tab Tracker extension to Firefox mode..."

# Backup current manifest as Chrome version
if [ -f "manifest.json" ] && [ ! -f "manifest-chrome.json" ]; then
    mv manifest.json manifest-chrome.json
    echo "✓ Backed up Chrome manifest as manifest-chrome.json"
fi

# Use Firefox manifest
if [ -f "manifest-firefox.json" ]; then
    cp manifest-firefox.json manifest.json
    echo "✓ Activated Firefox manifest"
    echo ""
    echo "🦊 Extension is now ready for Firefox!"
    echo "Load it in Firefox by going to about:debugging > This Firefox > Load Temporary Add-on"
else
    echo "❌ Error: manifest-firefox.json not found"
fi 