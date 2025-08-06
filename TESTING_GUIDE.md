# Testing Guide for Tab Tracker Extension

## 🚀 Quick Start Test

### 1. **Install/Reload the Extension**
- Go to `chrome://extensions/`
- Turn OFF the extension, then turn it back ON
- Click the refresh button (🔄)

### 2. **Generate Some Data**
- Open 3-4 different websites in new tabs
- Spend at least 30-60 seconds on each tab
- Switch between tabs a few times
- Reload some pages

### 3. **View Real-Time Data**
- Click the Tab Tracker extension icon
- You should see:
  - **Current Tab**: Stats for the active tab
  - **All Tabs Summary**: Overview of all tracked tabs
  - **Most Active Tabs**: Top 5 tabs by usage

### 4. **Check Auto-Saved Data**
- Wait 5+ minutes (auto-save runs every 10 seconds)
- Click "View All Data" button
- Check browser console for complete data logs

## 🔍 What You Should See

### In the Popup:
```
📍 Current Tab
URL: example.com/page
Active Time: 2m 15s
Load Count: 3
Engagement: High
Attention: 75.2%

📊 All Tabs Summary
Total Tabs Tracked: 4
Total Active Time: 8m 32s
Total Page Loads: 12
Auto-saved Entries: 2

🏆 Most Active Tabs
#1 news.ycombinator.com
   ⏱️ 3m 45s | 🔄 5 loads
```

### In Console (F12):
```
🆕 Started tracking new tab: https://example.com
👆 Tab activated: https://news.ycombinator.com  
📝 Auto-saved journal entry for tab: https://example.com
🔍 === COMPLETE TAB TRACKER DATA ===
📊 Active Tabs: {1234: {activeSeconds: 125, ...}, ...}
📚 Journal Entries: [{timestamp: "2024-01-15...", autoSaved: true}, ...]
```

## ✨ Key Features Now Working

1. **✅ Automatic Data Saving**: No manual save needed
2. **✅ Real-Time Updates**: Popup refreshes every 5 seconds  
3. **✅ Complete Tab Overview**: See all tabs, not just current
4. **✅ Auto-Generated Insights**: Engagement, attention ratio, priority scores
5. **✅ Console Logging**: Detailed data in developer console
6. **✅ Auto-Journal Entries**: Saves interesting tabs automatically

## 🐛 Troubleshooting

### No Data Showing?
1. Make sure tracking is enabled (checkbox unchecked)
2. Browse to different sites and wait 30+ seconds
3. Check console for "Started tracking" messages

### Still Getting Errors?
1. Completely remove the extension
2. Re-add it fresh with "Load unpacked"
3. Make sure you're on regular (non-incognito) tabs

### Want to Clear Everything?
- Click "Clear Data" button in popup
- Or run `clearAllData()` in console

## 🎯 Expected Behavior

- **Immediate**: Tab switching logged to console
- **30 seconds**: Basic tracking data appears
- **2+ minutes**: Auto-journal entries start generating
- **Real-time**: Popup shows live data that updates automatically

The extension now works completely automatically - just browse normally and check the popup or console to see your data! 