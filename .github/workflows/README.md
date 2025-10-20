# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for automated testing and code quality checks.

## Workflows

### CI Workflow (`ci.yml`)

Runs on every push and pull request to `main`, `develop`, and feature branches.

**Jobs:**

1. **Code Quality** - Runs ESLint and Prettier checks
   - ESLint: Catches code errors and enforces best practices
   - Prettier: Ensures consistent code formatting

2. **Unit Tests** - Runs Jest test suite
   - Executes all unit tests in `specs/tests/`
   - Generates coverage report
   - Uploads coverage to Codecov (optional)

3. **Full Validation** - Runs after quality and test jobs pass
   - Combines all checks (`npm run validate`)
   - Attempts to build extension (if build script exists)

4. **Security Audit** - Checks for vulnerabilities
   - Runs `npm audit` for known security issues
   - Checks dependencies for vulnerabilities

## Status Badges

Add these to your README.md:

```markdown
![CI](https://github.com/Spranc-Labs/heyho-browser-extension/workflows/CI/badge.svg)
![Tests](https://github.com/Spranc-Labs/heyho-browser-extension/workflows/CI/badge.svg?job=test)
```

## Local Development

All CI checks can be run locally:

```bash
# Run all quality checks
npm run quality

# Auto-fix issues
npm run quality:fix

# Run tests
npm test

# Run full validation (what CI runs)
npm run validate
```

## Pre-commit Hooks

Pre-commit hooks are managed by **Husky** and run automatically before each commit:

1. **lint-staged** - Runs ESLint and Prettier on staged files only
2. **Jest tests** - Runs full test suite to ensure nothing is broken

To install hooks:
```bash
npm install  # Runs husky install automatically
```

To bypass hooks (not recommended):
```bash
git commit --no-verify
```

## CI Requirements

### Branch Protection Rules

Recommended settings for `main` branch:

- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Required checks:
  - `Code Quality`
  - `Unit Tests`
  - `Full Validation`
- ✅ Require pull request reviews (1 approval)
- ✅ Dismiss stale pull request approvals when new commits are pushed

### Secrets (Optional)

For full CI functionality, add these secrets to your repository:

- `CODECOV_TOKEN` - For uploading coverage reports to Codecov

To add secrets:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the secret name and value

## Troubleshooting

### CI Failing on ESLint

```bash
# Run locally to see errors
npm run lint

# Auto-fix issues
npm run lint:fix
```

### CI Failing on Prettier

```bash
# Check formatting
npm run format:check

# Auto-format
npm run format
```

### CI Failing on Tests

```bash
# Run tests locally
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Pre-commit Hooks Not Running

```bash
# Reinstall Husky
rm -rf .husky
npm run prepare

# Verify hooks are installed
ls -la .git/hooks/
```

## Performance

- **Typical CI run time**: 2-4 minutes
- **Quality check**: ~30 seconds
- **Unit tests**: ~1 minute
- **Full validation**: ~1 minute

## Caching

CI uses npm caching to speed up builds:
- `node_modules` cached by GitHub Actions
- Cache key based on `package-lock.json`
- Cache hit rate: ~80%

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add browser compatibility tests (Chrome, Firefox, Safari)
- [ ] Add deployment automation
- [ ] Add release automation with semantic-release
- [ ] Add visual regression testing
- [ ] Add performance benchmarks
