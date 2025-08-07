# Testing Guide for HeyHo Browser Extension

This document provides comprehensive instructions for running and understanding the test suite for the HeyHo browser extension.

## Overview

The test suite is designed to verify the core functionality of Phase 1 implementation, specifically focusing on:
- IndexedDB storage module (`storage.js`)
- Cross-browser API compatibility
- Event storage and retrieval functionality

## Prerequisites

Before running tests, ensure you have:
- Node.js (version 14 or higher)
- npm package manager
- All dependencies installed

## Setup

### Initial Installation

```bash
# Install all dependencies including test framework
npm install
```

This will install:
- Jest (testing framework)
- jest-chrome (Chrome extension API mocks)
- jest-environment-jsdom (DOM environment simulation)

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Advanced Commands

```bash
# Run specific test file
npm test specs/tests/storage.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="initDB"

# Run tests in verbose mode
npm test -- --verbose

# Run tests with detailed output
npm test -- --reporters=verbose
```

## Test Structure

### Test Files Location
```
specs/tests/
├── setup.js           # Jest configuration and mocks
├── storage.test.js     # Storage module unit tests
└── README.md          # This file
```

### Mock Implementation

The test suite includes comprehensive mocks for:

#### Browser APIs
- Chrome extension APIs (via jest-chrome)
- `browser.*` namespace compatibility
- Service worker environment (`importScripts`, `self`)

#### IndexedDB
- Complete IndexedDB API simulation
- Database creation and versioning
- Object store and index management
- Transaction handling

## Test Coverage

### Storage Module (`storage.js`)

#### `initDB()` Function Tests
- **Test 1.1.1**: Database opening with correct name and version
- **Test 1.1.2**: Object store and index creation during upgrade
- **Test 1.1.3**: Successful database instance resolution
- **Test 1.1.4**: Error handling for connection failures
- **Test 1.1.5**: Instance caching functionality

#### `addEvent()` Function Tests
- **Test 1.2.1**: Successful CoreEvent object storage
- **Test 1.2.2**: Transaction creation in readwrite mode
- **Test 1.2.3**: Error handling for duplicate keys
- **Test 1.2.4**: Transaction failure handling

#### Integration Tests
- Multi-event storage scenarios
- Cross-function interaction verification
- Event type validation (CREATE, ACTIVATE, NAVIGATE, HEARTBEAT, CLOSE)

## Understanding Test Results

### Passing Tests ✅
```
✓ Test 1.1.1: Should request to open database with correct name and version (12 ms)
✓ Test 1.2.1: Should successfully add a valid CoreEvent object (3 ms)
```

### Failed Tests ❌
```
✕ Test name (time)
    Error details...
    Expected vs Received comparison
```

### Test Execution Time
- Tests typically complete within 1-2 seconds
- Individual test times are shown in parentheses
- Long-running tests (>100ms) may indicate issues

## Mock Behavior

### IndexedDB Mock Features
- Simulates asynchronous database operations
- Handles upgrade scenarios automatically
- Supports key path validation
- Implements basic transaction lifecycle

### Browser API Mocks
- Provides jest-chrome for extension API simulation
- Mocks service worker environment globals
- Supports cross-browser polyfill testing

## Debugging Tests

### Common Issues and Solutions

#### Test Timeout
```bash
# Increase timeout for individual tests
npm test -- --testTimeout=10000
```

#### Mock Issues
```javascript
// Reset mocks between tests (already configured)
beforeEach(() => {
  jest.clearAllMocks();
  storageModule.__resetInstance();
});
```

#### Async Test Debugging
```javascript
// Use async/await properly
test('My test', async () => {
  await expect(myAsyncFunction()).resolves.toBe(expectedValue);
});
```

### Debug Mode
```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Adding New Tests

### Test File Structure
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  test('should do something specific', async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Best Practices
1. **Clear Test Names**: Use descriptive names that explain what is being tested
2. **Isolated Tests**: Each test should be independent
3. **Async Handling**: Use `async/await` for asynchronous operations
4. **Mock Cleanup**: Reset mocks between tests
5. **Error Testing**: Test both success and failure scenarios

## Configuration

### Jest Configuration (`package.json`)
```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/specs/tests/setup.js"],
    "testMatch": ["<rootDir>/specs/tests/**/*.test.js"],
    "collectCoverageFrom": ["src/**/*.js", "!src/**/*.test.js"]
  }
}
```

### Environment Variables
No special environment variables are required for testing.

## Continuous Integration

The test suite is designed to run in CI environments:
```bash
# CI-friendly test command
npm test -- --ci --watchAll=false --coverage
```

## Troubleshooting

### Common Error Messages

#### "chrome.flush is not a function"
This error has been resolved in the current setup. If encountered, ensure `specs/tests/setup.js` is properly configured.

#### "Cannot read properties of null"
Usually indicates mock setup issues. Verify that `beforeEach` cleanup is running properly.

#### "Test timeout"
Increase timeout or check for unresolved promises in async tests.

### Getting Help

1. Check test output for specific error messages
2. Verify mock setup in `specs/tests/setup.js`
3. Ensure all dependencies are installed
4. Review Jest documentation for advanced debugging

## Future Expansion

As new features are added to the extension, corresponding tests should be added:
- Background script event listeners
- Content script functionality
- Popup interface interactions
- Cross-browser compatibility verification

The current test foundation supports easy expansion for additional Phase 1 and future phase testing requirements.