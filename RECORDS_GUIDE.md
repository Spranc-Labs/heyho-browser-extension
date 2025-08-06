# Tab Tracker Records System Guide

## 🎯 **Overview**

Your Tab Tracker extension now uses a comprehensive **records system** instead of simple journal entries. Every piece of browsing data is automatically saved to Chrome storage with rich metadata and insights.

## 📊 **What Gets Recorded**

### **Automatic Records** (Every 2 minutes or on significant activity)
- **Basic Data**: URL (hashed), domain, title, active time, load count
- **Timestamps**: First load, last active, pinned/bookmarked times
- **Engagement Metrics**: Attention ratio, engagement level, bounce rate
- **Website Category**: Social Media, News, Work/Productivity, Entertainment, Shopping, Search, Other
- **Session Data**: Time spent, visits, priority score

### **Manual Records** (Right-click → "Save Tab Record")
- Same comprehensive data as automatic
- Marked as manually saved for easy filtering

## 🔍 **How to View Your Records**

### **1. Extension Popup**
Click the extension icon to see:
- **Current Tab**: Real-time stats for active tab
- **All Tabs Summary**: Overview of all tracked tabs
- **Auto-saved Records**: Count of automatically saved records
- **Manual Records**: Count of manually saved records
- **Most Active Tabs**: Top 5 tabs by usage time

### **2. View Complete Records Button**
Click "View Complete Records" to see in console:
- All stored records with full details
- Records summary (total, auto vs manual)
- Records broken down by website category
- Top 10 domains by time spent
- Comprehensive analytics

### **3. Export Data Button**
Click "Export Data" to download a JSON file with:
- All active tabs data
- All records with full metadata
- Closed tabs history
- Summary analytics
- Categories breakdown
- Top domains analysis

## 📈 **Record Structure**

Each record contains:
```json
{
  "id": "12345_1640995200000_auto",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "tabId": 12345,
  "url": "abc123def", // hashed for privacy
  "originalUrl": "https://example.com/page", // for debugging
  "domain": "example.com",
  "title": "Page Title",
  "activeSeconds": 180,
  "loadCount": 3,
  "firstLoad": "2024-01-15T10:27:00.000Z",
  "lastActive": "2024-01-15T10:30:00.000Z",
  "pinned": false,
  "bookmarked": true,
  "navigationCount": 5,
  "insights": {
    "attentionRatio": "75.2%",
    "bounceRate": "Low", 
    "priorityScore": 3,
    "engagement": "High"
  },
  "autoSaved": true,
  "sessionData": {
    "timeSpent": 180,
    "visits": 3,
    "engagement": "High",
    "category": "Work/Productivity"
  }
}
```

## 🏷️ **Website Categories**

The extension automatically categorizes websites:
- **Social Media**: Twitter, Facebook, Instagram, LinkedIn, Reddit, TikTok
- **News**: CNN, BBC, Reuters, NYTimes, Guardian, etc.
- **Work/Productivity**: GitHub, StackOverflow, Google Docs, Notion, Slack
- **Entertainment**: YouTube, Netflix, Spotify, Twitch, Gaming sites
- **Shopping**: Amazon, eBay, shopping sites
- **Search**: Google, Bing, DuckDuckGo
- **Other**: Everything else

## 📊 **Analytics Available**

### **In Console (View Complete Records)**
- Total records count
- Time breakdown by category
- Top domains by time spent
- Engagement levels distribution
- Auto vs manual save ratio

### **In Export File**
- Complete data dump
- Summary statistics
- Categories breakdown with time spent
- Top 10 domains with visit counts
- Historical data for analysis

## 🔧 **Console Commands**

Open browser console (F12) and use:
- `clearRecords()` - Clear all tab records
- `clearAllData()` - Clear all extension data
- `enableTracking()` - Enable tracking
- `disableTracking()` - Disable tracking

## 🎛️ **Settings**

- **Opt-out checkbox**: Completely disable tracking
- **Privacy**: URLs are hashed before storage
- **Storage**: Everything saved to Chrome local storage
- **Auto-save frequency**: Every 2 minutes for active tabs

## 📱 **Usage Tips**

1. **Regular Monitoring**: Check popup daily to see your browsing patterns
2. **Weekly Exports**: Export data weekly for long-term analysis
3. **Category Analysis**: Use console view to see which categories consume most time
4. **Domain Tracking**: Identify your most-visited sites
5. **Engagement Insights**: See which sites keep your attention longest

## 🔐 **Privacy & Data**

- **URLs are hashed** for privacy protection
- **All data stored locally** in Chrome storage
- **No external servers** - everything stays on your device
- **Original URLs shown** only for debugging (can be disabled)
- **Complete control** - opt-out anytime, clear data anytime

## 🚀 **Getting Started**

1. **Reload the extension** if coming from journal system
2. **Browse normally** for 10-15 minutes
3. **Click extension icon** to see real-time data
4. **Use "View Complete Records"** to see full analytics
5. **Export data** to analyze your browsing patterns

Your browsing data is now comprehensively tracked with rich metadata and insights! 