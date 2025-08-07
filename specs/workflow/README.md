# Development Workflow Guide

This document outlines the development workflow, commit guards, and quality assurance processes for the HeyHo Browser Extension project.

## Overview

Our workflow ensures code quality and prevents regressions through:
- **Automated linting** with ESLint
- **Comprehensive testing** with Jest
- **Pre-commit hooks** to prevent bad commits
- **Structured commit process** with validation

## Quick Start

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd browser-extension
npm install

# This automatically runs:
# - npm prepare (installs husky hooks)
# - Sets up pre-commit validation
```

### Daily Development
```bash
# Make your changes
# ... edit files ...

# Check your work before committing
npm run validate

# Commit (pre-commit hooks run automatically)
git add .
git commit -m "feat: your change description"
```

## Commit Guards

### Pre-Commit Validation

Every commit automatically triggers:

1. **ESLint Check** - Code style and quality validation
2. **Jest Tests** - All tests must pass
3. **Automatic Fixing** - Some issues are auto-fixed

```bash
# What happens on git commit:
.husky/pre-commit → npm run validate → lint + test
```

### Manual Validation
```bash
# Run the same checks manually
npm run validate

# Or run individually:
npm run lint      # Check code quality
npm run test      # Run test suite
npm run lint:fix  # Fix auto-fixable issues
```

## Code Quality Standards

### ESLint Configuration

**Rules Applied:**
- ES2021 syntax standards
- Browser extension globals (chrome, browser)
- Service worker environment support
- 2-space indentation
- Single quotes for strings
- No unused variables (except _prefixed)
- Console logging allowed (for extension debugging)

**File Coverage:**
- `src/` - All source files
- `specs/tests/` - Test files
- `background.js` - Main background script

### Test Requirements

**All tests must pass:**
- Unit tests for storage module
- Integration tests for core functionality
- Cross-browser compatibility tests
- Mock validation tests

**Coverage Goals:**
- Minimum viable coverage for core modules
- Focus on critical path testing
- Mock-based testing for browser APIs

## Workflow Commands

### Development Commands
```bash
npm run test:watch    # Run tests in watch mode
npm run lint:fix      # Auto-fix linting issues
npm run test:coverage # Generate coverage reports
```

### Validation Commands
```bash
npm run lint          # Check code style
npm run test          # Run full test suite
npm run validate      # Run both lint and test
npm run pre-commit    # Same as validate (used by hooks)
```

### Git Integration
```bash
git commit           # Automatic validation via hooks
git commit --no-verify  # Skip hooks (emergency only)
```

## File Structure

### Configuration Files
```
.eslintrc.js         # ESLint configuration
.gitignore           # Git ignore patterns
.husky/              # Git hooks directory
├── pre-commit       # Pre-commit validation hook
package.json         # Scripts and dependencies
```

### Quality Assurance Files
```
specs/
├── tests/           # Test suite
│   ├── setup.js     # Test configuration
│   ├── storage.test.js  # Storage module tests
│   └── README.md    # Testing documentation
└── workflow/        # This documentation
    └── README.md
```

## Troubleshooting

### Common Issues

#### Commit Blocked by Linting
```bash
# Fix automatically
npm run lint:fix

# Or fix manually and try again
git add .
git commit -m "your message"
```

#### Tests Failing
```bash
# Run tests to see failures
npm run test

# Debug specific test
npm test -- --testNamePattern="test name"

# Check coverage
npm run test:coverage
```

#### Hook Not Working
```bash
# Reinstall hooks
npm run prepare
# or
npx husky install
```

### Emergency Bypass
```bash
# Skip pre-commit hooks (use sparingly)
git commit --no-verify -m "emergency fix"

# Then fix issues and clean up
npm run validate
git add .
git commit -m "fix: resolve linting and test issues"
```

## Best Practices

### Commit Messages
Follow conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `style:` - Code style changes

### Code Style
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused
- Handle errors appropriately
- Use async/await for promises

### Testing
- Write tests for new functionality
- Update tests when changing code
- Aim for clear test names
- Test both success and error cases

## Integration with CI/CD

### GitHub Actions (Future)
```yaml
# Recommended workflow
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run validate
```

### Pull Request Process
1. Create feature branch
2. Make changes with commits passing validation
3. Push branch and create PR
4. All checks must pass before merge
5. Squash merge recommended

## Monitoring and Metrics

### Coverage Reports
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### ESLint Reports
```bash
npm run lint > lint-report.txt
```

## Advanced Configuration

### Custom ESLint Rules
Edit `.eslintrc.js` to modify rules:
```javascript
rules: {
  'your-rule': 'error',
  'another-rule': ['warn', { option: 'value' }]
}
```

### Test Configuration
Edit Jest config in `package.json`:
```json
{
  "jest": {
    "testTimeout": 10000,
    "verbose": true
  }
}
```

### Hook Customization
Modify `.husky/pre-commit` for different validation:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run validate
# Add other commands here
```

## Support

### Getting Help
1. Check this documentation
2. Run `npm run validate` to see specific errors
3. Review ESLint and Jest documentation
4. Check Git hooks status: `ls -la .husky/`

### Updating Dependencies
```bash
npm update
npm audit fix
npm run validate  # Ensure everything still works
```

This workflow ensures high code quality while maintaining development velocity. All team members should follow these processes to maintain project standards.