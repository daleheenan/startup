#!/bin/bash
# Pre-deployment validation script for NovelForge
# Run this before committing to catch deployment issues early

set -e

echo "========================================"
echo "NovelForge Pre-Deployment Check"
echo "========================================"
echo ""

# Check Node.js version
echo "[1/5] Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "ERROR: Node.js version must be >= 20. Current: $(node -v)"
    echo "Run: nvm use 20"
    exit 1
fi
echo "OK: Node.js $(node -v)"
echo ""

# Check frontend build
echo "[2/5] Building frontend..."
cd "$(dirname "$0")/.."
npm ci --silent
npm run build
echo "OK: Frontend build passed"
echo ""

# Check backend build
echo "[3/5] Building backend..."
cd backend
npm ci --silent
npm run build
echo "OK: Backend build passed"
echo ""

# Check TypeScript errors
echo "[4/5] Checking TypeScript..."
npx tsc --noEmit
echo "OK: No TypeScript errors"
echo ""

# Verify required files exist
echo "[5/5] Verifying deployment files..."
REQUIRED_FILES=(
    "../.nvmrc"
    "../nixpacks.toml"
    "../railway.toml"
    ".nvmrc"
    "nixpacks.toml"
    "railway.toml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "ERROR: Missing required file: $file"
        exit 1
    fi
done
echo "OK: All deployment files present"
echo ""

echo "========================================"
echo "All pre-deployment checks PASSED"
echo "Safe to deploy!"
echo "========================================"
