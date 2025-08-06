const tabHistory = {};
const closedTabs = [];

// Check if tracking is opted out
async function isTrackingOptedOut() {
  const { trackingOptOut } = await chrome.storage.local.get('trackingOptOut');
  return trackingOptOut || false;
}

// Tab Lifecycle Tracking
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only track top-level frames
  if (await isTrackingOptedOut()) return; // Respect opt-out

  const tab = await chrome.tabs.get(details.tabId);
  if (tab.incognito) return;

  const url = details.url;

  if (!tabHistory[details.tabId]) {
    const now = Date.now();
    tabHistory[details.tabId] = {
      tabId: details.tabId,
      url: url,
      firstLoad: details.timeStamp,
      lastActive: now,
      loadCount: 1,
      activeSeconds: 0,
      pinned: tab.pinned,
      pinnedAt: tab.pinned ? now : null,
      bookmarked: false,
      bookmarkedAt: null,
      navigationHistory: [],
      // Enhanced tracking data
      inactivityData: {
        totalStaleTime: 0,
        currentStaleStart: null, // Tab starts active
        staleRatio: 0,
        longestStaleStreak: 0,
        staleStreaks: [] // Track all periods of inactivity
      },
      returnHistory: [], // Track each time user returns to this tab
      viewingSessions: [], // Track distinct viewing periods
      isCurrentlyActive: true, // Track if tab is currently active
      totalLifetime: 0,
      windowFocused: false // Track if window is focused when tab is active
    };
    console.log("Started tracking new tab:", url);
  }

  tabHistory[details.tabId].navigationHistory.push({
    url: url,
    timestamp: details.timeStamp,
    transitionType: details.transitionType,
  });

  tabHistory[details.tabId].loadCount++;
});

// Track the currently active tab globally
let currentActiveTabId = null;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (await isTrackingOptedOut()) return;
  
  const now = Date.now();
  const newActiveTabId = activeInfo.tabId;
  
  // Mark previous tab as inactive
  if (currentActiveTabId && tabHistory[currentActiveTabId] && currentActiveTabId !== newActiveTabId) {
    const prevTab = tabHistory[currentActiveTabId];
    prevTab.isCurrentlyActive = false;
    prevTab.currentStaleStart = now;
    
    // End current viewing session for previous tab
    if (prevTab.viewingSessions.length > 0) {
      const lastSession = prevTab.viewingSessions[prevTab.viewingSessions.length - 1];
      if (!lastSession.endTime) {
        lastSession.endTime = new Date(now).toISOString();
        lastSession.duration = now - new Date(lastSession.startTime).getTime();
      }
    }
  }
  
  // Mark new tab as active
  if (tabHistory[newActiveTabId]) {
    const tab = tabHistory[newActiveTabId];
    const wasInactive = !tab.isCurrentlyActive;
    
    tab.lastActive = now;
    tab.isCurrentlyActive = true;
    
    // If tab was inactive, calculate stale time and record return
    if (wasInactive && tab.inactivityData.currentStaleStart) {
      const staleTime = now - tab.inactivityData.currentStaleStart;
      tab.inactivityData.totalStaleTime += staleTime;
      tab.inactivityData.staleStreaks.push({
        start: new Date(tab.inactivityData.currentStaleStart).toISOString(),
        end: new Date(now).toISOString(),
        duration: staleTime
      });
      
      if (staleTime > tab.inactivityData.longestStaleStreak) {
        tab.inactivityData.longestStaleStreak = staleTime;
      }
      
      tab.inactivityData.currentStaleStart = null;
      
      // Record return event
      tab.returnHistory.push({
        returnTime: new Date(now).toISOString(),
        timeSinceLastView: staleTime,
        trigger: 'tab_switch'
      });
      
      console.log(`Tab returned to after ${Math.round(staleTime / 1000)}s inactive:`, tab.url);
    }
    
    // Start new viewing session
    tab.viewingSessions.push({
      startTime: new Date(now).toISOString(),
      endTime: null, // Will be set when tab becomes inactive
      duration: null,
      windowFocused: false // Will be updated by window focus listener
    });
    
    console.log("Tab activated:", tab.url || 'Hidden');
  }
  
  currentActiveTabId = newActiveTabId;
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  if (await isTrackingOptedOut()) return;
  if (tabHistory[tabId]) {
    const now = Date.now();
    const tab = tabHistory[tabId];
    
    // Calculate final stale time if tab was inactive when closed
    if (tab.inactivityData.currentStaleStart) {
      const finalStaleTime = now - tab.inactivityData.currentStaleStart;
      tab.inactivityData.totalStaleTime += finalStaleTime;
      tab.inactivityData.staleStreaks.push({
        start: new Date(tab.inactivityData.currentStaleStart).toISOString(),
        end: new Date(now).toISOString(),
        duration: finalStaleTime
      });
    }
    
    // End final viewing session
    if (tab.viewingSessions.length > 0) {
      const lastSession = tab.viewingSessions[tab.viewingSessions.length - 1];
      if (!lastSession.endTime) {
        lastSession.endTime = new Date(now).toISOString();
        lastSession.duration = now - new Date(lastSession.startTime).getTime();
      }
    }
    
    // Calculate total lifetime and stale ratio
    const totalLifetime = now - tab.firstLoad;
    tab.totalLifetime = totalLifetime;
    tab.inactivityData.staleRatio = totalLifetime > 0 ? 
      (tab.inactivityData.totalStaleTime / totalLifetime * 100).toFixed(1) : 0;
    
    // Add closure data
    tab.closureData = {
      closedAt: new Date(now).toISOString(),
      totalLifetime: totalLifetime,
      closureReason: removeInfo.isWindowClosing ? 'window_close' : 'manual',
      finalUrl: tab.url,
      wasActive: tab.isCurrentlyActive,
      totalStalePeriods: tab.inactivityData.staleStreaks.length,
      totalReturnEvents: tab.returnHistory.length
    };
    
    console.log(`Tab closed: ${tab.url} (lifetime: ${Math.round(totalLifetime / 1000)}s, stale: ${tab.inactivityData.staleRatio}%)`);
    
    // Move to closed tabs and remove from active tracking
    closedTabs.push(tab);
    delete tabHistory[tabId];
    
    // Clear current active tab if this was it
    if (currentActiveTabId === tabId) {
      currentActiveTabId = null;
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.incognito) return;
  if (await isTrackingOptedOut()) return;

  if (tabHistory[tabId]) {
    if (changeInfo.pinned !== undefined) {
      tabHistory[tabId].pinned = changeInfo.pinned;
      tabHistory[tabId].pinnedAt = changeInfo.pinned ? Date.now() : null;
    }
  }
});

chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (await isTrackingOptedOut()) return;
  const tabs = await chrome.tabs.query({url: bookmark.url});
  for (const tab of tabs) {
    if (tabHistory[tab.id]) {
      tabHistory[tab.id].bookmarked = true;
      tabHistory[tab.id].bookmarkedAt = Date.now();
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (await isTrackingOptedOut()) return;
  
  const now = Date.now();
  const windowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
  
  // Update window focus status for all tabs
  Object.values(tabHistory).forEach(tab => {
    tab.windowFocused = windowFocused;
    
    // Update current viewing session with window focus info
    if (tab.viewingSessions.length > 0) {
      const currentSession = tab.viewingSessions[tab.viewingSessions.length - 1];
      if (!currentSession.endTime) { // Only for active sessions
        currentSession.windowFocused = windowFocused;
      }
    }
  });
  
  if (windowFocused) {
    const [tab] = await chrome.tabs.query({active: true, windowId: windowId});
    if (tab && tabHistory[tab.id]) {
      tabHistory[tab.id].lastActive = now;
      console.log("Window focused on tab:", tabHistory[tab.id].url);
    }
  } else {
    console.log("Browser window lost focus");
  }
});

// Enhanced active time tracking with stale time calculation
setInterval(async () => {
  if (await isTrackingOptedOut()) return;
  
  const now = Date.now();
  const [activeTab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
  
  // Update all tabs with lifetime and stale calculations
  Object.values(tabHistory).forEach(tab => {
    // Calculate total lifetime
    tab.totalLifetime = now - tab.firstLoad;
    
    // Update stale ratio for all tabs
    if (tab.totalLifetime > 0) {
      let currentStaleTime = 0;
      if (tab.inactivityData.currentStaleStart) {
        currentStaleTime = now - tab.inactivityData.currentStaleStart;
      }
      
      const totalStaleTime = tab.inactivityData.totalStaleTime + currentStaleTime;
      tab.inactivityData.staleRatio = (totalStaleTime / tab.totalLifetime * 100).toFixed(1);
    }
  });
  
  // Update active time for currently active tab only
  if (activeTab && tabHistory[activeTab.id]) {
    const tab = tabHistory[activeTab.id];
    const window = await chrome.windows.get(activeTab.windowId, {populate: false});
    
    if (window.focused && tab.isCurrentlyActive) {
      tab.activeSeconds += 5;
      
      // Update return history with session duration
      if (tab.returnHistory.length > 0) {
        const lastReturn = tab.returnHistory[tab.returnHistory.length - 1];
        if (!lastReturn.sessionDuration) {
          const sessionStart = new Date(lastReturn.returnTime).getTime();
          lastReturn.sessionDuration = Math.round((now - sessionStart) / 1000);
        }
      }
    }
  }
}, 5000);

// Auto-save tracking data and journal entries
setInterval(async () => {
  if (await isTrackingOptedOut()) return;
  
  // Save tracking data
  chrome.storage.local.set({ tabHistory, closedTabs });
  
    // Auto-generate comprehensive records for active tabs
  const now = Date.now();
  for (const [tabId, tabData] of Object.entries(tabHistory)) {
    if (tabData.activeSeconds > 15 && tabData.loadCount >= 1) {
      // Check if we already have a recent record for this tab
      const { tabRecords } = await chrome.storage.local.get('tabRecords');
      const records = tabRecords || [];
      
      const lastRecordForTab = records
        .filter(record => record.tabId === parseInt(tabId))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      // Create new record if none exists or if significant changes occurred
      const shouldCreateRecord = !lastRecordForTab || 
        (now - new Date(lastRecordForTab.timestamp).getTime()) > 120000 || // 2 minutes
        (tabData.activeSeconds - (lastRecordForTab.activeSeconds || 0)) > 30 || // 30 seconds more activity
        (tabData.loadCount !== (lastRecordForTab.loadCount || 0)); // Load count changed
      
      if (shouldCreateRecord) {
        const record = {
          id: `${tabId}_${now}`,
          timestamp: new Date().toISOString(),
          tabId: parseInt(tabId),
          url: tabData.url,
          domain: extractDomain(tabData.url),
          title: tabData.title || 'Unknown',
          activeSeconds: tabData.activeSeconds,
          loadCount: tabData.loadCount,
          firstLoad: new Date(tabData.firstLoad).toISOString(),
          lastActive: new Date(tabData.lastActive).toISOString(),
          pinned: tabData.pinned,
          pinnedAt: tabData.pinnedAt ? new Date(tabData.pinnedAt).toISOString() : null,
          bookmarked: tabData.bookmarked,
          bookmarkedAt: tabData.bookmarkedAt ? new Date(tabData.bookmarkedAt).toISOString() : null,
          navigationCount: tabData.navigationHistory?.length || 0,
          insights: generateTabInsights(tabData),
          autoSaved: true,
          sessionData: {
            timeSpent: tabData.activeSeconds,
            visits: tabData.loadCount,
            engagement: calculateEngagement(tabData),
            category: categorizeWebsite(tabData.url)
          }
        };
        
        records.push(record);
        chrome.storage.local.set({ tabRecords: records });
        console.log("Auto-saved record for tab:", tabData.url);
      }
    }
  }
}, 10000);

// Analytics Generation
function generateTabInsights(tab) {
  return {
    attentionRatio: (tab.activeSeconds / ((tab.lastActive - tab.firstLoad)/1000)).toFixed(2),
    bounceRate: tab.loadCount === 1 ? 1 : 0,
    readingDepth: classifyReadingDepth(tab.activeSeconds, tab.contentLength), // contentLength not available yet
    priorityScore: calculatePriorityScore(tab),
    navigationPattern: analyzeNavigationPattern(tab.navigationHistory)
  };
}

function classifyReadingDepth(seconds, wordCount) {
  if (!wordCount) return "N/A";
  const wpm = (wordCount / (seconds/60)).toFixed(0);
  return wpm > 400 ? "Skimmed" : wpm > 200 ? "Normal" : "Deep";
}

function calculatePriorityScore(tab) {
  let score = 0;
  if (tab.pinned) score += 2;
  if (tab.bookmarked) score += 2;
  score += tab.navigationHistory.length > 5 ? 1 : 0;
  score += tab.activeSeconds > 300 ? 1 : 0;
  return score;
}

function analyzeNavigationPattern(history) {
  const transitions = history.map(h => h.transitionType);
  if (transitions.includes('typed') && transitions.includes('link')) return 'Mixed';
  if (transitions.every(t => t === 'link')) return 'Browsing';
  if (transitions.every(t => t === 'typed')) return 'Direct';
  return 'Other';
}

// Helper functions for enhanced records
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

function calculateEngagement(tabData) {
  const timeSpent = (tabData.lastActive - tabData.firstLoad) / 1000;
  const attentionRatio = timeSpent > 0 ? (tabData.activeSeconds / timeSpent) : 0;
  
  if (attentionRatio > 0.7 && tabData.activeSeconds > 120) return 'High';
  if (attentionRatio > 0.4 && tabData.activeSeconds > 60) return 'Medium';
  if (tabData.activeSeconds > 15) return 'Low';
  return 'Minimal';
}

function categorizeWebsite(url) {
  if (!url) return 'Unknown';
  
  const domain = extractDomain(url).toLowerCase();
  
  // Social Media
  if (domain.includes('twitter') || domain.includes('facebook') || 
      domain.includes('instagram') || domain.includes('linkedin') ||
      domain.includes('reddit') || domain.includes('tiktok')) {
    return 'Social Media';
  }
  
  // News
  if (domain.includes('news') || domain.includes('cnn') || 
      domain.includes('bbc') || domain.includes('reuters') ||
      domain.includes('nytimes') || domain.includes('guardian')) {
    return 'News';
  }
  
  // Work/Productivity
  if (domain.includes('github') || domain.includes('stackoverflow') ||
      domain.includes('docs.google') || domain.includes('notion') ||
      domain.includes('slack') || domain.includes('teams')) {
    return 'Work/Productivity';
  }
  
  // Entertainment
  if (domain.includes('youtube') || domain.includes('netflix') ||
      domain.includes('spotify') || domain.includes('twitch') ||
      domain.includes('gaming')) {
    return 'Entertainment';
  }
  
  // Shopping
  if (domain.includes('amazon') || domain.includes('ebay') ||
      domain.includes('shop') || domain.includes('store')) {
    return 'Shopping';
  }
  
  // Search
  if (domain.includes('google') || domain.includes('bing') ||
      domain.includes('duckduckgo') || domain.includes('search')) {
    return 'Search';
  }
  
  return 'Other';
}

// Context Menu Setup - using try-catch for safety
chrome.runtime.onInstalled.addListener(() => {
  try {
    if (chrome.contextMenus) {
      chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
      id: "saveToJournal",
      title: "Save Tab Record",
      contexts: ["page"]
    });
      });
    }
  } catch (error) {
    console.log("Context menu setup failed:", error);
  }
});

// Context Menu Click Handler - using try-catch for safety
try {
  if (chrome.contextMenus && chrome.contextMenus.onClicked) {
          chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        try {
          if (info.menuItemId === "saveToJournal" && tabHistory[tab.id]) {
            const tabData = tabHistory[tab.id];
            const now = Date.now();
            
            // Create comprehensive record
            const record = {
              id: `${tab.id}_${now}_manual`,
              timestamp: new Date().toISOString(),
              tabId: tab.id,
              url: tabData.url,
              domain: extractDomain(tabData.url),
              title: tab.title || 'Unknown',
              activeSeconds: tabData.activeSeconds,
              loadCount: tabData.loadCount,
              firstLoad: new Date(tabData.firstLoad).toISOString(),
              lastActive: new Date(tabData.lastActive).toISOString(),
              pinned: tabData.pinned,
              pinnedAt: tabData.pinnedAt ? new Date(tabData.pinnedAt).toISOString() : null,
              bookmarked: tabData.bookmarked,
              bookmarkedAt: tabData.bookmarkedAt ? new Date(tabData.bookmarkedAt).toISOString() : null,
              navigationCount: tabData.navigationHistory?.length || 0,
              insights: generateTabInsights(tabData),
              autoSaved: false, // manually saved
              sessionData: {
                timeSpent: tabData.activeSeconds,
                visits: tabData.loadCount,
                engagement: calculateEngagement(tabData),
                category: categorizeWebsite(tabData.url)
              }
            };
            
            console.log("RECORD SAVED:", record);
            
            // Save to records storage
            const { tabRecords } = await chrome.storage.local.get('tabRecords');
            const records = tabRecords || [];
            records.push(record);
            chrome.storage.local.set({ tabRecords: records });
          }
        } catch (error) {
          console.log("Error saving record:", error);
        }
      });
  }
} catch (error) {
  console.log("Context menu click handler setup failed:", error);
}
