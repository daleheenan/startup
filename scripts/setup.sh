#!/bin/bash

# Claude Code Project Setup Script
# This script copies Claude agents, commands, and configurations to a target project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STARTUP_DIR="$(dirname "$SCRIPT_DIR")"

# Default target is current directory
TARGET_DIR="${1:-.}"

# Resolve to absolute path
TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || {
    echo -e "${RED}Error: Target directory does not exist: $1${NC}"
    exit 1
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Claude Code Project Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Source:  ${YELLOW}$STARTUP_DIR${NC}"
echo -e "Target:  ${YELLOW}$TARGET_DIR${NC}"
echo ""

# Check if target already has .claude directory
if [ -d "$TARGET_DIR/.claude" ]; then
    echo -e "${YELLOW}Warning: Target already has a .claude directory${NC}"
    read -p "Merge files? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted${NC}"
        exit 1
    fi
fi

# Create directories
echo -e "${GREEN}Creating directories...${NC}"
mkdir -p "$TARGET_DIR/.claude/agents"
mkdir -p "$TARGET_DIR/.claude/commands"

# Copy agents
echo -e "${GREEN}Copying agents...${NC}"
AGENT_COUNT=0
for file in "$STARTUP_DIR/.claude/agents"/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ -f "$TARGET_DIR/.claude/agents/$filename" ]; then
            echo -e "  ${YELLOW}Skipping${NC} $filename (already exists)"
        else
            cp "$file" "$TARGET_DIR/.claude/agents/"
            echo -e "  ${GREEN}Added${NC} $filename"
            ((AGENT_COUNT++))
        fi
    fi
done

# Copy commands
echo -e "${GREEN}Copying commands...${NC}"
COMMAND_COUNT=0
for file in "$STARTUP_DIR/.claude/commands"/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ -f "$TARGET_DIR/.claude/commands/$filename" ]; then
            echo -e "  ${YELLOW}Skipping${NC} $filename (already exists)"
        else
            cp "$file" "$TARGET_DIR/.claude/commands/"
            echo -e "  ${GREEN}Added${NC} $filename"
            ((COMMAND_COUNT++))
        fi
    fi
done

# Copy CLAUDE.md if it exists and target doesn't have one
if [ -f "$STARTUP_DIR/CLAUDE.md" ] && [ ! -f "$TARGET_DIR/CLAUDE.md" ]; then
    echo -e "${GREEN}Copying CLAUDE.md...${NC}"
    cp "$STARTUP_DIR/CLAUDE.md" "$TARGET_DIR/"
    echo -e "  ${GREEN}Added${NC} CLAUDE.md"
fi

# Update .gitignore to not ignore .claude if desired
if [ -f "$TARGET_DIR/.gitignore" ]; then
    if grep -q "^\.claude" "$TARGET_DIR/.gitignore"; then
        echo ""
        echo -e "${YELLOW}Note: .claude/ is in .gitignore${NC}"
        echo "To track agents in git, remove '.claude/' from .gitignore"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Added: $AGENT_COUNT agents, $COMMAND_COUNT commands"
echo ""
echo "Available commands:"
echo "  /feature-workflow - Full feature development cycle"
echo ""
echo "Available agents:"
ls -1 "$TARGET_DIR/.claude/agents" | sed 's/\.md$//' | sed 's/^/  - /'
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
