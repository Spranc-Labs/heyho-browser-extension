document.addEventListener('DOMContentLoaded', async () => {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { tabHistory, tabRecords } = await chrome.storage.local.get(['tabHistory', 'tabRecords']);
  let { trackingOptOut } = await chrome.storage.local.get('trackingOptOut');

  const optOutCheckbox = document.getElementById('opt-out');
  const currentTabDiv = document.getElementById('current-tab');
  const allTabsDiv = document.getElementById('all-tabs');
  const viewButton = document.getElementById('view-records');
  const exportButton = document.getElementById('export-data');
  const clearButton = document.getElementById('clear-data');
  
  // Set up opt-out checkbox
  optOutCheckbox.checked = trackingOptOut || false;

  optOutCheckbox.addEventListener('change', (e) => {
    trackingOptOut = e.target.checked;
    chrome.storage.local.set({ trackingOptOut: trackingOptOut });
    updateAllDisplays();
  });

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  function formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname.substring(0, 30) + '...' : '');
    } catch {
      return url.substring(0, 40) + '...';
    }
  }

  function generateTabInsights(tab) {
    const timeSpent = (tab.lastActive - tab.firstLoad) / 1000;
    return {
      attentionRatio: timeSpent > 0 ? (tab.activeSeconds / timeSpent * 100).toFixed(1) + '%' : 'N/A',
      bounceRate: tab.loadCount === 1 ? 'High' : 'Low',
      priorityScore: calculatePriorityScore(tab),
      engagement: tab.activeSeconds > 120 ? 'High' : tab.activeSeconds > 30 ? 'Medium' : 'Low'
    };
  }

  function calculatePriorityScore(tab) {
    let score = 0;
    if (tab.pinned) score += 2;
    if (tab.bookmarked) score += 2;
    score += tab.navigationHistory?.length > 5 ? 1 : 0;
    score += tab.activeSeconds > 300 ? 1 : 0;
    return score;
  }

  function updateAllDisplays() {
    if (trackingOptOut) {
      currentTabDiv.innerHTML = '<p><i>Tracking is disabled</i></p>';
      allTabsDiv.innerHTML = '<p><i>Enable tracking to see data</i></p>';
      return;
    }

    // Update current tab display
    if (tabHistory && tabHistory[currentTab.id]) {
      const tabData = tabHistory[currentTab.id];
      const insights = generateTabInsights(tabData);
      
      // Calculate current stale time if tab is inactive
      let currentStaleTime = 0;
      if (tabData.inactivityData?.currentStaleStart) {
        currentStaleTime = Date.now() - tabData.inactivityData.currentStaleStart;
      }
      
      const isActive = tabData.isCurrentlyActive;
      const staleRatio = tabData.inactivityData?.staleRatio || 0;
      const returnCount = tabData.returnHistory?.length || 0;
      const totalLifetime = tabData.totalLifetime || (Date.now() - tabData.firstLoad);
      
      currentTabDiv.innerHTML = `
        <h3>Current Tab ${isActive ? '(Active)' : '(Inactive)'}</h3>
        <div style="background: ${isActive ? '#e8f4f8' : '#fff3cd'}; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <p><b>URL:</b> ${formatUrl(tabData.url || 'Hidden for privacy')}</p>
          <p><b>Active Time:</b> ${formatTime(tabData.activeSeconds)}</p>
          <p><b>Total Lifetime:</b> ${formatDuration(totalLifetime)}</p>
          <p><b>Stale Time:</b> ${staleRatio}% (${formatDuration((tabData.inactivityData?.totalStaleTime || 0) + currentStaleTime)})</p>
          <p><b>Return Count:</b> ${returnCount}</p>
          <p><b>Load Count:</b> ${tabData.loadCount}</p>
          <p><b>Engagement:</b> ${insights.engagement}</p>
          ${tabData.pinned ? '<p><b>Pinned</b></p>' : ''}
          ${tabData.bookmarked ? '<p><b>Bookmarked</b></p>' : ''}
          ${!isActive && currentStaleTime > 0 ? `<p><i>Inactive for: ${formatDuration(currentStaleTime)}</i></p>` : ''}
        </div>
      `;
    } else {
      currentTabDiv.innerHTML = `
        <h3>Current Tab</h3>
        <p><i>No tracking data yet. Browse around and come back!</i></p>
      `;
    }

    // Update all tabs summary
    if (tabHistory) {
      const allTabs = Object.values(tabHistory);
      const totalTabs = allTabs.length;
      const totalActiveTime = allTabs.reduce((sum, tab) => sum + tab.activeSeconds, 0);
      const totalLoads = allTabs.reduce((sum, tab) => sum + tab.loadCount, 0);
      const pinnedTabs = allTabs.filter(tab => tab.pinned).length;
      const bookmarkedTabs = allTabs.filter(tab => tab.bookmarked).length;
      
      // Sort tabs by active time for top sites
      const topTabs = allTabs
        .sort((a, b) => b.activeSeconds - a.activeSeconds)
        .slice(0, 5);

             // Calculate stale statistics
       const totalStaleTime = allTabs.reduce((sum, tab) => {
         let staleTime = tab.inactivityData?.totalStaleTime || 0;
         if (tab.inactivityData?.currentStaleStart) {
           staleTime += Date.now() - tab.inactivityData.currentStaleStart;
         }
         return sum + staleTime;
       }, 0);
       
       const totalReturnEvents = allTabs.reduce((sum, tab) => sum + (tab.returnHistory?.length || 0), 0);
       const zombieTabs = allTabs.filter(tab => {
         const lifetime = tab.totalLifetime || (Date.now() - tab.firstLoad);
         return lifetime > 3600000 && tab.activeSeconds < 30; // >1 hour open, <30s active
       }).length;

       allTabsDiv.innerHTML = `
        <h3>All Tabs Summary</h3>
        <div style="background: #f0f8f0; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <p><b>Total Tabs Tracked:</b> ${totalTabs}</p>
          <p><b>Total Active Time:</b> ${formatTime(totalActiveTime)}</p>
          <p><b>Total Stale Time:</b> ${formatDuration(totalStaleTime)}</p>
          <p><b>Total Return Events:</b> ${totalReturnEvents}</p>
          <p><b>Zombie Tabs:</b> ${zombieTabs} (open >1h, active <30s)</p>
          <p><b>Total Page Loads:</b> ${totalLoads}</p>
          <p><b>Pinned Tabs:</b> ${pinnedTabs}</p>
          <p><b>Bookmarked Tabs:</b> ${bookmarkedTabs}</p>
          <p><b>Auto-saved Records:</b> ${tabRecords ? tabRecords.filter(r => r.autoSaved).length : 0}</p>
          <p><b>Manual Records:</b> ${tabRecords ? tabRecords.filter(r => !r.autoSaved).length : 0}</p>
        </div>
        
        <h4>Most Active Tabs</h4>
        <div style="font-size: 12px;">
          ${topTabs.map((tab, index) => {
            const staleRatio = tab.inactivityData?.staleRatio || 0;
            const returnCount = tab.returnHistory?.length || 0;
            const isActive = tab.isCurrentlyActive;
            
            return `
            <div style="background: ${isActive ? '#e8f4f8' : 'white'}; padding: 8px; margin: 5px 0; border-radius: 3px; border-left: 3px solid ${isActive ? '#4285f4' : '#ccc'};">
              <b>#${index + 1}</b> ${formatUrl(tab.url || 'Hidden')} ${isActive ? '(Active)' : ''}
              <br><small>${formatTime(tab.activeSeconds)} active | ${staleRatio}% stale | ${returnCount} returns</small>
            </div>
            `;
          }).join('')}
        </div>
      `;
         } else {
       allTabsDiv.innerHTML = `
         <h3>All Tabs Summary</h3>
         <p><i>No tracking data available yet</i></p>
       `;
     }
  }

  // Initial display update
  updateAllDisplays();

  // Auto-refresh every 5 seconds to show real-time data
  setInterval(async () => {
    const { tabHistory: newTabHistory, tabRecords: newTabRecords } = 
      await chrome.storage.local.get(['tabHistory', 'tabRecords']);
    
    // Update data if changed
    if (JSON.stringify(newTabHistory) !== JSON.stringify(tabHistory) || 
        JSON.stringify(newTabRecords) !== JSON.stringify(tabRecords)) {
      Object.assign(tabHistory || {}, newTabHistory || {});
      Object.assign(tabRecords || [], newTabRecords || []);
      updateAllDisplays();
    }
  }, 5000);

    // View complete records button
  viewButton.addEventListener('click', async () => {
    const { tabHistory, tabRecords, closedTabs } = 
      await chrome.storage.local.get(['tabHistory', 'tabRecords', 'closedTabs']);
    
    console.log("=== COMPLETE TAB TRACKER RECORDS ===");
    console.log("Active Tabs:", tabHistory);
    console.log("All Records:", tabRecords);
    console.log("Closed Tabs:", closedTabs);
    
         // Enhanced analytics with new tracking data
     console.log(`\nACTIVE TABS ANALYTICS:`);
     if (tabHistory && Object.keys(tabHistory).length > 0) {
       const activeTabs = Object.values(tabHistory);
       const totalStaleTime = activeTabs.reduce((sum, tab) => {
         let staleTime = tab.inactivityData?.totalStaleTime || 0;
         if (tab.inactivityData?.currentStaleStart) {
           staleTime += Date.now() - tab.inactivityData.currentStaleStart;
         }
         return sum + staleTime;
       }, 0);
       
       const totalReturnEvents = activeTabs.reduce((sum, tab) => sum + (tab.returnHistory?.length || 0), 0);
       const zombieTabs = activeTabs.filter(tab => {
         const lifetime = tab.totalLifetime || (Date.now() - tab.firstLoad);
         return lifetime > 3600000 && tab.activeSeconds < 30;
       });
       
       console.log(`Total Active Tabs: ${activeTabs.length}`);
       console.log(`Total Stale Time: ${formatDuration(totalStaleTime)}`);
       console.log(`Total Return Events: ${totalReturnEvents}`);
       console.log(`Zombie Tabs: ${zombieTabs.length}`);
       
       // Show tab details with new metrics
       console.log(`\nTAB DETAILS:`);
       activeTabs.forEach((tab, index) => {
         const staleRatio = tab.inactivityData?.staleRatio || 0;
         const returnCount = tab.returnHistory?.length || 0;
         const lifetime = formatDuration(tab.totalLifetime || (Date.now() - tab.firstLoad));
         
         console.log(`${index + 1}. ${tab.url}`);
         console.log(`   Active: ${formatTime(tab.activeSeconds)} | Stale: ${staleRatio}% | Returns: ${returnCount} | Lifetime: ${lifetime}`);
         
         if (tab.returnHistory && tab.returnHistory.length > 0) {
           console.log(`   Recent returns:`, tab.returnHistory.slice(-3));
         }
       });
     }

     if (tabRecords && tabRecords.length > 0) {
       console.log(`\nRECORDS SUMMARY:`);
       console.log(`Total Records: ${tabRecords.length}`);
       console.log(`Auto-saved Records: ${tabRecords.filter(r => r.autoSaved).length}`);
       console.log(`Manual Records: ${tabRecords.filter(r => !r.autoSaved).length}`);
       
       const totalTime = tabRecords.reduce((sum, record) => sum + (record.activeSeconds || 0), 0);
       console.log(`Total Tracked Time: ${formatTime(totalTime)}`);
       
       // Show records by category
       const categories = {};
       tabRecords.forEach(record => {
         const category = record.sessionData?.category || 'Unknown';
         if (!categories[category]) categories[category] = [];
         categories[category].push(record);
       });
       
       console.log(`\nRECORDS BY CATEGORY:`);
       Object.entries(categories).forEach(([category, records]) => {
         const categoryTime = records.reduce((sum, r) => sum + r.activeSeconds, 0);
         console.log(`${category}: ${records.length} records, ${formatTime(categoryTime)} total time`);
       });
       
       // Show top domains
       const domains = {};
       tabRecords.forEach(record => {
         const domain = record.domain || 'unknown';
         if (!domains[domain]) domains[domain] = { count: 0, time: 0 };
         domains[domain].count++;
         domains[domain].time += record.activeSeconds;
       });
       
       const topDomains = Object.entries(domains)
         .sort((a, b) => b[1].time - a[1].time)
         .slice(0, 10);
       
       console.log(`\nTOP 10 DOMAINS BY TIME:`);
       topDomains.forEach(([domain, data], index) => {
         console.log(`${index + 1}. ${domain}: ${formatTime(data.time)} (${data.count} visits)`);
       });
     }
     
     // Show closed tabs with closure data
     if (closedTabs && closedTabs.length > 0) {
       console.log(`\nCLOSED TABS ANALYTICS:`);
       console.log(`Total Closed Tabs: ${closedTabs.length}`);
       
       closedTabs.slice(-5).forEach((tab, index) => {
         if (tab.closureData) {
           console.log(`${index + 1}. ${tab.url}`);
           console.log(`   Closed: ${tab.closureData.closedAt}`);
           console.log(`   Lifetime: ${formatDuration(tab.closureData.totalLifetime)}`);
           console.log(`   Stale Ratio: ${tab.inactivityData?.staleRatio || 0}%`);
           console.log(`   Returns: ${tab.closureData.totalReturnEvents}`);
           console.log(`   Reason: ${tab.closureData.closureReason}`);
         }
       });
     }
    
    alert(`Check console for complete records! Found ${Object.keys(tabHistory || {}).length} active tabs and ${(tabRecords || []).length} total records.`);
  });

  // Export data button  
  exportButton.addEventListener('click', async () => {
    const { tabHistory, tabRecords, closedTabs } = 
      await chrome.storage.local.get(['tabHistory', 'tabRecords', 'closedTabs']);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      activeTabsCount: Object.keys(tabHistory || {}).length,
      totalRecords: (tabRecords || []).length,
      closedTabsCount: (closedTabs || []).length,
      activeTabsData: tabHistory,
      allRecords: tabRecords,
      closedTabsData: closedTabs,
      summary: {
        totalTimeTracked: (tabRecords || []).reduce((sum, r) => sum + (r.activeSeconds || 0), 0),
        autoSavedRecords: (tabRecords || []).filter(r => r.autoSaved).length,
        manualRecords: (tabRecords || []).filter(r => !r.autoSaved).length,
        categoriesBreakdown: getCategoriesBreakdown(tabRecords || []),
        topDomains: getTopDomains(tabRecords || [])
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tab-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("Data exported successfully!", exportData);
    alert('Data exported successfully! Check your downloads folder.');
  });

  function getCategoriesBreakdown(records) {
    const categories = {};
    records.forEach(record => {
      const category = record.sessionData?.category || 'Unknown';
      if (!categories[category]) categories[category] = { count: 0, time: 0 };
      categories[category].count++;
      categories[category].time += record.activeSeconds;
    });
    return categories;
  }

  function getTopDomains(records) {
    const domains = {};
    records.forEach(record => {
      const domain = record.domain || 'unknown';
      if (!domains[domain]) domains[domain] = { count: 0, time: 0 };
      domains[domain].count++;
      domains[domain].time += record.activeSeconds;
    });
    
    return Object.entries(domains)
      .sort((a, b) => b[1].time - a[1].time)
      .slice(0, 10)
      .map(([domain, data]) => ({ domain, ...data }));
  }

  // Clear data button
  clearButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all tracking data?')) {
             await chrome.storage.local.clear();
       console.log("All tracking data cleared!");
       updateAllDisplays();
       alert('All data cleared!');
    }
  });
});