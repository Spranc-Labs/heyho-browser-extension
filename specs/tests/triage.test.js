/**
 * Unit Tests for Triage System
 * Tests the TriageModule filtering logic for event storage decisions
 */

const { shouldStoreEvent } = require('../../src/background/triage.js');

// Helper function to create test events
const createEvent = (type, domain) => ({
  type, domain, id: 'test', timestamp: Date.now(), tabId: 123, url: ''
});

// Helper to test filtering behavior
const expectFiltered = (type, domain) => 
  expect(shouldStoreEvent(createEvent(type, domain))).toBe(false);
const expectAllowed = (type, domain) => 
  expect(shouldStoreEvent(createEvent(type, domain))).toBe(true);

describe('Triage System', () => {
  describe('Rule 1: Filter Uninteresting Domains', () => {
    const blockedDomains = [
      'newtab', 'about:newtab', 'about:blank', 'chrome-extension', 'moz-extension'
    ];
    
    test.each(blockedDomains)('should filter domain: %s', (domain) => {
      expectFiltered('CREATE', domain);
    });

    test('should filter domains containing blocked patterns', () => {
      expectFiltered('ACTIVATE', 'chrome-extension://abcd/options.html');
      expectFiltered('NAVIGATE', 'my-chrome-extension-site.com');
    });

    test.each(['google.com', 'mail.google.com', 'example.org'])(
      'should allow valid domain: %s', (domain) => {
        expectAllowed('CREATE', domain);
      }
    );
  });

  describe('Rule 2: Filter Events Without URL/Domain', () => {
    const emptyDomains = ['', null, undefined];
    const nonCloseTypes = ['CREATE', 'ACTIVATE', 'NAVIGATE'];

    test.each(nonCloseTypes.flatMap(type => emptyDomains.map(domain => [type, domain])))(
      'should filter %s events with empty domain (%s)', (type, domain) => {
        expectFiltered(type, domain);
      }
    );

    test.each(emptyDomains)('should allow CLOSE events with empty domain (%s)', (domain) => {
      expectAllowed('CLOSE', domain);
    });

    test('should still filter CLOSE events from blocked domains', () => {
      expectFiltered('CLOSE', 'chrome-extension');
    });
  });

  describe('Acceptance Criteria', () => {
    test('AC-1: Blank tab events are filtered', () => {
      expectFiltered('CREATE', 'about:blank');
      expectFiltered('ACTIVATE', 'about:blank');
    });

    test('AC-2: Extension page events are filtered', () => {
      expectFiltered('NAVIGATE', 'chrome-extension://abcd/options.html');
      expectFiltered('NAVIGATE', 'moz-extension://xyz/settings.html');
    });

    test('AC-3: CLOSE events always stored (except blocked domains)', () => {
      expectAllowed('CLOSE', 'example.com');
      expectAllowed('CLOSE', '');
      expectAllowed('CLOSE', null);
    });

    test('AC-4: Empty domain non-CLOSE events are filtered', () => {
      ['CREATE', 'ACTIVATE', 'NAVIGATE'].forEach(type => {
        expectFiltered(type, '');
        expectFiltered(type, null);
      });
    });

    test('AC-5: Standard website events are stored', () => {
      ['CREATE', 'ACTIVATE', 'NAVIGATE', 'CLOSE'].forEach(type => {
        expectAllowed(type, 'google.com');
      });
    });
  });

  describe('Edge Cases', () => {
    test('case sensitivity - Chrome-Extension allowed (exact match required)', () => {
      expectAllowed('CREATE', 'Chrome-Extension');
    });

    test('substring matching works as expected', () => {
      expectFiltered('CREATE', 'newtab-dashboard.com'); // Contains 'newtab'
    });
  });
});