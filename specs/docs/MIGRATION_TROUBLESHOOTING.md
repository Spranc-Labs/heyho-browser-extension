# Anonymous Client ID Migration Troubleshooting

## Why You Don't See Anonymous Client IDs in Exported Data

The exported data doesn't contain anonymous client IDs because:

1. **Extension needs to be reloaded** - The new anonymous ID code hasn't been loaded yet
2. **Migration hasn't run** - Existing data doesn't have anonymous client IDs
3. **Service worker issues** - Background script may have crashed during code changes

## Step-by-Step Solution

### Step 1: Reload the Extension
1. Go to `chrome://extensions/`
2. Find "HeyHo Browser Extension"
3. Click the **reload button** (🔄 circular arrow icon)
4. Wait for complete reload

### Step 2: Check Service Worker Status
1. In `chrome://extensions/`, click **"Details"** on your extension
2. Look for **"service worker"** link and click it
3. Check console for any errors or migration messages
4. You should see: `✅ Anonymous client ID migration completed`

### Step 3: Manual Migration (If Needed)
If automatic migration didn't work:
1. Open the extension popup (click the extension icon)
2. Click the new **"Run Migration"** button (🔄 yellow button)
3. Watch the console for success message
4. This will add anonymous client IDs to ALL existing data

### Step 4: Verify Migration
1. Open the popup and export data again
2. Look for `anonymousClientId` field in the JSON
3. All records should now have this field

## Expected Data Structure After Migration

### Raw Events (IndexedDB)
```javascript
{
  "id": "evt_1694567890123_456",
  "timestamp": 1694567890123,
  "type": "CREATE",
  "tabId": 456,
  "url": "https://example.com",
  "domain": "example.com",
  "anonymousClientId": "550e8400-e29b-41d4-a716-446655440000"  // ← NEW
}
```

### Page Visits (Chrome Storage)
```javascript
{
  "id": "pv_1694567890123_456",
  "tabId": 456,
  "url": "https://example.com",
  "domain": "example.com",
  "timestamp": 1694567890123,
  "duration": 45000,
  "anonymousClientId": "550e8400-e29b-41d4-a716-446655440000"  // ← NEW
}
```

### Tab Aggregates (Chrome Storage)
```javascript
{
  "tabId": 456,
  "startTime": 1694567890123,
  "totalActiveDuration": 120000,
  "domainDurations": { "example.com": 45000 },
  "anonymousClientId": "550e8400-e29b-41d4-a716-446655440000"  // ← NEW
}
```

## Troubleshooting Migration Issues

### If Migration Button Shows Error
1. **"Anonymous ID module not available"** - Extension wasn't reloaded properly
2. **"Could not establish connection"** - Service worker crashed, reload extension
3. **Migration timeout** - Large dataset, wait longer or check console

### If Data Still Missing Anonymous IDs
1. **Clear all data** and start fresh (use "Clear All Data" in popup)
2. **Check console** for migration error messages
3. **Verify module loading** in service worker console

### Console Debug Messages
Look for these messages in the service worker console:
```
✅ Anonymous client ID migration completed
🔍 DEBUG: Migration status: completed
🔍 DEBUG: Found X page visits in storage
```

## Manual Verification Steps

### 1. Check Anonymous ID Generation
```javascript
// In service worker console:
self.AnonymousIdModule.getOrCreateAnonymousId().then(id => console.log('ID:', id))
```

### 2. Check Migration Status
```javascript
// In service worker console:
self.AnonymousIdModule.isMigrationCompleted().then(status => console.log('Migration:', status))
```

### 3. Verify Data Schema
Export data and verify every record has `anonymousClientId` field.

## Prevention for Future Development

1. **Always reload extension** after code changes
2. **Check service worker console** for initialization errors  
3. **Test migration** on fresh installations
4. **Verify data schema** after major changes

## Success Indicators

✅ **Extension reloaded without errors**  
✅ **Service worker shows migration completed**  
✅ **All exported data contains `anonymousClientId` fields**  
✅ **Same anonymous ID across all data types**  
✅ **No console errors during export**

After following these steps, all your data should contain anonymous client IDs ready for the backend claiming process.