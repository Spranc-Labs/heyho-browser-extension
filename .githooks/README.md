# Git Hooks for HeyHo Browser Extension

## Overview

This directory contains Git hooks that automatically run code quality checks before commits.

## Available Hooks

### pre-commit

Runs automatically before every commit to ensure code quality.

**What it checks:**
- ✅ **ESLint**: JavaScript linting (catches bugs, enforces best practices)
- ✅ **Prettier**: Code formatting (consistent style)

**What it does:**
1. Identifies staged `.js` files
2. Runs ESLint on each file (blocks commit if errors found)
3. Runs Prettier to auto-format code
4. Re-stages formatted files
5. Allows commit if all checks pass

## Installation

### First Time Setup

```bash
# From the browser extension directory
cd /Users/gabrielocampo/Documents/Dev/heyho-platform/apps/heyho-browser-extension

# Install npm dependencies (ESLint, Prettier)
npm install

# Install git hooks
.githooks/install.sh
```

This configures Git to use hooks from `.githooks/` directory instead of `.git/hooks/`.

### Verify Installation

```bash
# Check git config
git config core.hooksPath
# Should output: .githooks

# Verify hooks are executable
ls -la .githooks/
# pre-commit should have execute permission (x)
```

## Usage

### Normal Workflow (Hooks Run Automatically)

```bash
# Make changes to JavaScript files
vim src/background/storage.js

# Stage changes
git add src/background/storage.js

# Commit (hooks run automatically)
git commit -m "refactor: improve storage error handling"

# Output:
# ═══════════════════════════════════════════════
#   HeyHo Browser Extension - Pre-commit Check
# ═══════════════════════════════════════════════
# 📝 Staged JavaScript files:
#   - src/background/storage.js
#
# 🔍 Running ESLint...
# ✓ ESLint passed
#
# ✨ Running Prettier...
# ✓ Prettier check passed
#
# ═══════════════════════════════════════════════
#   ✓ All code quality checks passed!
# ═══════════════════════════════════════════════
```

### If Checks Fail

**ESLint finds errors:**
```bash
git commit -m "feat: add new feature"

# Output:
# 🔍 Running ESLint...
# src/background/storage.js
#   45:7  error  'unusedVar' is assigned a value but never used  no-unused-vars
#   67:3  error  'await' should be used inside an async function  require-await
#
# ✗ ESLint found issues!
#   Fix them manually or run: npm run lint:fix
```

**Fix options:**

```bash
# Option 1: Auto-fix (recommended)
npm run lint:fix

# Option 2: Fix manually
vim src/background/storage.js

# Then commit again
git add src/background/storage.js
git commit -m "feat: add new feature"
```

**Prettier auto-formats:**
```bash
git commit -m "feat: add new feature"

# Output:
# ✨ Running Prettier...
#   → Formatted: src/background/storage.js
# ✓ Prettier auto-formatted files (re-staged)
#
# ✓ All code quality checks passed!

# Files are automatically formatted and re-staged
# Commit succeeds with formatted code
```

### Bypass Hooks (Not Recommended)

```bash
# Skip all hooks (use only in emergencies)
git commit --no-verify -m "WIP: temp commit"
```

⚠️ **Warning**: Bypassing hooks should be rare. It can introduce bugs or inconsistent code style.

## Manual Quality Checks

You can run quality checks manually without committing:

```bash
# Run ESLint only
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Run Prettier check (no changes)
npm run format:check

# Run Prettier with auto-format
npm run format

# Run both ESLint + Prettier check
npm run quality

# Run both with auto-fix
npm run quality:fix
```

## Configuration Files

### .eslintrc.json

ESLint configuration for JavaScript code quality rules.

**Key rules:**
- `no-unused-vars`: Error on unused variables
- `require-await`: Error on async functions without await
- `no-eval`: Prohibit eval() usage (security)
- `no-console`: Warn on console.log (allows console.warn/error)
- `prefer-const`: Prefer const over let when variable isn't reassigned
- `no-unsanitized/method`: Prevent XSS vulnerabilities

**Override for test files:**
- Test files (*.test.js) allow console.log and have relaxed rules

### .prettierrc

Prettier configuration for code formatting.

**Settings:**
- Single quotes (e.g., `'string'` not `"string"`)
- Semicolons required
- 2-space indentation
- 100 character line width
- Trailing commas in ES5 (arrays, objects)

### .prettierignore

Files excluded from Prettier formatting:
- `node_modules/`
- `dist/` and `build/`
- `coverage/`
- `*.min.js` and `*.bundle.js`

## What Gets Checked

### JavaScript Files Checked:
- ✅ `src/**/*.js` (all source files)
- ✅ `background.js` (service worker entry point)
- ✅ Content scripts, background scripts, popup scripts
- ❌ Test files checked but with relaxed rules

### Not Checked:
- `.json` files (manifest files, package.json)
- `.html` files
- `.css` files
- Files in `node_modules/`
- Minified files (*.min.js)

## Troubleshooting

### "node_modules not found"

```bash
# Install dependencies
npm install
```

### "npx not found"

```bash
# Install Node.js from https://nodejs.org/
# Or via nvm:
nvm install node
```

### Hooks not running

```bash
# Re-run installation
.githooks/install.sh

# Verify configuration
git config core.hooksPath
# Should output: .githooks
```

### "Permission denied" error

```bash
# Make hooks executable
chmod +x .githooks/pre-commit
chmod +x .githooks/install.sh
```

### ESLint shows too many errors

```bash
# Auto-fix what can be fixed automatically
npm run lint:fix

# Review remaining errors manually
npm run lint
```

### Prettier keeps reformatting on every commit

This is expected behavior! Prettier ensures consistent formatting.

**To avoid this:**
1. Install Prettier extension in your editor (VS Code, Vim, etc.)
2. Enable "format on save" in editor settings
3. Code will be formatted as you type (no changes on commit)

## Editor Integration

### VS Code

Install extensions:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Other Editors

- **Vim**: Install ALE or coc-eslint + coc-prettier
- **Sublime**: Install SublimeLinter-eslint + JsPrettier
- **WebStorm**: Built-in ESLint and Prettier support

## Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [Browser Extension Best Practices](../CLAUDE.md)

---

**Last Updated**: 2025-10-20
**Maintained By**: HeyHo Extension Team
