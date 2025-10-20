#!/bin/bash
#
# Git Hooks Installation Script for HeyHo Browser Extension
#
# This script configures Git to use the hooks in .githooks/ directory
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  Git Hooks Installation${NC}"
echo -e "${BLUE}  HeyHo Browser Extension${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo -e "${YELLOW}⚠${NC}  Not a git repository. Run this from the project root."
  exit 1
fi

# Configure git to use .githooks directory
echo -e "${BLUE}→${NC} Configuring Git to use .githooks/ directory..."
git config core.hooksPath .githooks

echo -e "${GREEN}✓${NC} Git hooks path configured"
echo ""

# Make hooks executable
echo -e "${BLUE}→${NC} Making hooks executable..."
chmod +x .githooks/pre-commit

echo -e "${GREEN}✓${NC} Hooks are now executable"
echo ""

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠${NC}  node_modules not found"
  echo -e "  Run ${BLUE}npm install${NC} to install ESLint and Prettier"
  echo ""
else
  echo -e "${GREEN}✓${NC} node_modules found (ESLint/Prettier available)"
  echo ""
fi

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Git hooks installed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "The following hooks are now active:"
echo "  • pre-commit: Runs ESLint and Prettier on staged .js files"
echo ""
echo "To bypass hooks temporarily (not recommended):"
echo "  git commit --no-verify"
echo ""

exit 0
