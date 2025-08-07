/**
 * Unit Tests for Event Logging Functions
 * Tests the helper functions used in background.js for event logging
 */

// Standalone implementations for testing (extracted from background.js)
const IS_DEV_MODE = true;
const devLogBuffer = [];

function getDomain(url) {
  try {
    if (!url) {return '';}
    
    // Handle special chrome URLs and about: URLs
    if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('moz-extension://') || url.startsWith('chrome-extension://')) {
      return url.split('/')[2] || url;
    }
    
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // Return a safe fallback for invalid URLs
    if (IS_DEV_MODE) {
      console.warn('Failed to extract domain from URL:', url, error);
    }
    return url || '';
  }
}

function createCoreEvent(type, tabId, url = '') {
  const timestamp = Date.now();
  return {
    id: `evt_${timestamp}_${tabId}`,
    timestamp,
    type,
    tabId,
    url,
    domain: getDomain(url)
  };
}

// Mock the storage module
global.self = {
  StorageModule: {
    addEvent: jest.fn(() => Promise.resolve())
  }
};

async function logAndSaveEvent(eventObject) {
  // Dev mode logging
  if (IS_DEV_MODE) {
    console.log(`CoreEvent ${eventObject.type}:`, eventObject);
    
    // Add to dev buffer and log table for first 10 events
    devLogBuffer.push(eventObject);
    if (devLogBuffer.length <= 10) {
      console.table(devLogBuffer);
    }
  }
  
  // Save to IndexedDB
  try {
    const { addEvent } = global.self.StorageModule;
    await addEvent(eventObject);
  } catch (error) {
    console.error('Failed to save CoreEvent to IndexedDB:', error);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure the mock exists and reset it
  global.self = {
    StorageModule: {
      addEvent: jest.fn(() => Promise.resolve())
    }
  };
  // Reset console methods
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'table').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
});

describe('Event Logging Helper Functions', () => {
  
  describe('getDomain() Function', () => {
    
    test('Should extract domain from valid HTTP URL', () => {
      const result = getDomain('https://www.example.com/path/to/page');
      expect(result).toBe('www.example.com');
    });

    test('Should extract domain from HTTPS URL', () => {
      const result = getDomain('https://github.com/user/repo');
      expect(result).toBe('github.com');
    });

    test('Should handle chrome:// URLs', () => {
      const result = getDomain('chrome://settings/');
      expect(result).toBe('settings');
    });

    test('Should handle about: URLs', () => {
      const result = getDomain('about:blank');
      expect(result).toBe('about:blank');
    });

    test('Should handle empty or invalid URLs gracefully', () => {
      expect(getDomain('')).toBe('');
      expect(getDomain(null)).toBe('');
      expect(getDomain('invalid-url')).toBe('invalid-url');
    });

    test('Should handle chrome-extension:// URLs', () => {
      const result = getDomain('chrome-extension://abcdef123456/popup.html');
      expect(result).toBe('abcdef123456');
    });
  });

  describe('createCoreEvent() Function', () => {
    
    test('Should create CoreEvent with all required properties', () => {
      const event = createCoreEvent('CREATE', 123, 'https://example.com');
      
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('type', 'CREATE');
      expect(event).toHaveProperty('tabId', 123);
      expect(event).toHaveProperty('url', 'https://example.com');
      expect(event).toHaveProperty('domain', 'example.com');
    });

    test('Should generate unique ID with timestamp and tabId', () => {
      const event = createCoreEvent('ACTIVATE', 456, 'https://github.com');
      
      expect(event.id).toMatch(/^evt_\d+_456$/);
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
    });

    test('Should handle missing URL parameter', () => {
      const event = createCoreEvent('CLOSE', 789);
      
      expect(event.url).toBe('');
      expect(event.domain).toBe('');
      expect(event.type).toBe('CLOSE');
      expect(event.tabId).toBe(789);
    });

    test('Should create different event types correctly', () => {
      const types = ['CREATE', 'ACTIVATE', 'NAVIGATE', 'CLOSE'];
      
      types.forEach(type => {
        const event = createCoreEvent(type, 100, 'https://test.com');
        expect(event.type).toBe(type);
      });
    });
  });

  describe('Dev Mode Configuration', () => {
    
    test('IS_DEV_MODE should be enabled', () => {
      expect(IS_DEV_MODE).toBe(true);
    });
  });
});

describe('Event Logging Integration', () => {
  
  test('logAndSaveEvent should log to console in dev mode', async () => {
    const mockEvent = createCoreEvent('NAVIGATE', 200, 'https://test.com');
    
    await logAndSaveEvent(mockEvent);

    expect(console.log).toHaveBeenCalledWith(`CoreEvent ${mockEvent.type}:`, mockEvent);
    expect(console.table).toHaveBeenCalled();
  });
});