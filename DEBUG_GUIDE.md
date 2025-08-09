# HeyHo Extension - Debug & Testing Guide

## 🎯 Testing the Aggregation System

### **Loading the Extension**

1. **Firefox:**
   ```bash
   # Use the Firefox-compatible manifest
   cp manifest-firefox.json manifest.json
   ```
   - Open Firefox
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

2. **Chrome:**
   ```bash
   # Use the Chrome-compatible manifest (if different)
   cp manifest.json manifest.json  # (already correct)
   ```
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension folder

### **Using the Debug Panel**

1. **Open Debug Panel:**
   - Click the HeyHo extension icon in the toolbar
   - The debug panel popup will open

2. **Debug Panel Features:**
   - **System Status**: Shows counts of raw events, page visits, and tab aggregates
   - **Trigger Aggregation**: Manually runs the aggregation process
   - **View Raw Events**: Downloads and shows raw CoreEvents
   - **Export Data**: Downloads pageVisits or tabAggregates as JSON
   - **Export All**: Downloads complete dataset including stats

### **Testing Workflow**

1. **Generate Some Activity:**
   - Open several tabs
   - Navigate between different websites
   - Close some tabs
   - Switch between tabs

2. **Check Raw Events:**
   - Open debug panel
   - Click "View Raw Events" to see what events were captured
   - Check browser console for event logs (if dev mode is on)

3. **Run Aggregation:**
   - Click "Trigger Aggregation" in the debug panel
   - Watch the activity log for processing results
   - Check the updated counts in System Status

4. **Export & Analyze Data:**
   - Click "Export Page Visits" to see processed page visit data
   - Click "Export Tab Aggregates" to see tab summary data
   - Click "Export All Data" for complete dataset

### **What to Look For**

**✅ Good Signs:**
- Raw events are being captured for tab CREATE/ACTIVATE/NAVIGATE/CLOSE
- Aggregation processes events successfully (shows count processed)
- Page visits have correct visitId, tabId, timestamps
- Tab aggregates have correct totals and navigation counts

**❌ Known Issues (Expected):**
- Page visits will have empty `url` and `domain` fields (identified issue #1)
- Duration calculations might be inaccurate
- Parent-child tab relationships not tracked

### **Browser Console Debugging**

Open browser DevTools console to see:
- Extension initialization logs
- Event capture logs (in dev mode)
- Aggregation processing logs
- Any error messages

### **Data Export Format**

**Raw Events:**
```json
{
  "id": "evt_1234567890_123",
  "timestamp": 1234567890000,
  "type": "ACTIVATE",
  "tabId": 123,
  "url": "https://example.com",
  "domain": "example.com"
}
```

**Page Visits:**
```json
{
  "visitId": "pv_1234567890_123",
  "tabId": 123,
  "url": "",  // ❌ Known issue
  "domain": "",  // ❌ Known issue
  "startedAt": 1234567890000,
  "endedAt": 1234567895000,
  "durationSeconds": 5
}
```

**Tab Aggregates:**
```json
{
  "tabId": 123,
  "isOpen": false,
  "createdAt": 1234567890000,
  "closedAt": 1234567900000,
  "initialUrl": "https://example.com",
  "lastUrl": "https://example.com/page2",
  "totalActiveSeconds": 10,
  "navigationCount": 2,
  "openedByTabId": null,  // ❌ Known issue
  "openedTabs": []
}
```

### **Troubleshooting**

**No events being captured:**
- Check if extension is loaded properly
- Look for errors in browser console
- Verify permissions are granted

**Aggregation not working:**
- Check if there are raw events to process
- Look for errors in debug panel activity log
- Check browser console for detailed error messages

**Export downloads empty:**
- Run aggregation first to process raw events
- Check if there are any raw events captured
- Verify browser allows downloads from extension

---

## 🚀 Ready to Test!

The debug panel provides everything needed to test and validate the aggregation system. The known issues are documented and will be addressed in future iterations.