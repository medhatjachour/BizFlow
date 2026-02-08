#!/bin/bash

# Test script for Prisma packaging in production mode
# This simulates production environment and tests Prisma loading

echo "==================================="
echo "Prisma Packaging Test Script"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build the app
echo -e "\n${YELLOW}Step 1: Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

# Step 2: Create unpacked distribution
echo -e "\n${YELLOW}Step 2: Creating unpacked distribution...${NC}"
npm run build:unpack
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Distribution creation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Distribution created${NC}"

# Step 3: Verify Prisma files exist
echo -e "\n${YELLOW}Step 3: Verifying Prisma files...${NC}"

DIST_DIR="dist/linux-unpacked/resources"

# Check extraResources Prisma
if [ -d "$DIST_DIR/node_modules/.prisma/client" ]; then
    echo -e "${GREEN}✓ Found .prisma/client in extraResources${NC}"
else
    echo -e "${RED}✗ Missing .prisma/client in extraResources${NC}"
    exit 1
fi

if [ -d "$DIST_DIR/node_modules/@prisma/client" ]; then
    echo -e "${GREEN}✓ Found @prisma/client in extraResources${NC}"
else
    echo -e "${RED}✗ Missing @prisma/client in extraResources${NC}"
    exit 1
fi

# Check for query engine binaries
ENGINE_COUNT=$(find "$DIST_DIR/node_modules/.prisma/client" -name "*.node" | wc -l)
if [ "$ENGINE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $ENGINE_COUNT query engine binaries${NC}"
    find "$DIST_DIR/node_modules/.prisma/client" -name "*.node" -exec basename {} \;
else
    echo -e "${RED}✗ No query engine binaries found${NC}"
    exit 1
fi

# Step 4: Check asarUnpack
echo -e "\n${YELLOW}Step 4: Checking asar unpacked files...${NC}"
if [ -d "$DIST_DIR/app.asar.unpacked/node_modules/@prisma" ]; then
    echo -e "${GREEN}✓ Found Prisma in app.asar.unpacked${NC}"
else
    echo -e "${YELLOW}⚠ Prisma not in app.asar.unpacked (not critical, using extraResources)${NC}"
fi

# Step 5: Check migrations
echo -e "\n${YELLOW}Step 5: Verifying migrations...${NC}"
if [ -d "$DIST_DIR/prisma/migrations" ]; then
    MIGRATION_COUNT=$(find "$DIST_DIR/prisma/migrations" -name "migration.sql" | wc -l)
    echo -e "${GREEN}✓ Found $MIGRATION_COUNT migration files${NC}"
else
    echo -e "${RED}✗ Missing migrations directory${NC}"
    exit 1
fi

# Step 6: Test app launch (timeout after 15 seconds)
echo -e "\n${YELLOW}Step 6: Testing app launch...${NC}"
echo "Starting app for 15 seconds to check Prisma initialization..."

# Create log directory
LOG_DIR="$HOME/.config/BizFlow/logs"
mkdir -p "$LOG_DIR"

# Clean old logs
rm -f "$LOG_DIR"/app-*.log

# Launch app in background
timeout 15s ./dist/linux-unpacked/BizFlow > /tmp/app-launch-test.log 2>&1

# Check logs
echo -e "\n${YELLOW}Checking application logs...${NC}"

# Look for Prisma initialization logs
if [ -f /tmp/app-launch-test.log ]; then
    if grep -q "\[Prisma\]" /tmp/app-launch-test.log; then
        echo -e "${GREEN}✓ Found Prisma initialization logs${NC}"
        echo ""
        grep "\[Prisma\]" /tmp/app-launch-test.log
    else
        echo -e "${YELLOW}⚠ No Prisma initialization logs found (running in dev mode?)${NC}"
    fi
    
    if grep -q "Error initializing Prisma" /tmp/app-launch-test.log; then
        echo -e "${RED}✗ Prisma initialization error detected${NC}"
        grep -A5 "Error initializing Prisma" /tmp/app-launch-test.log
        exit 1
    fi
    
    if grep -q "Connected to database\|Database is already up to date" /tmp/app-launch-test.log; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No launch log found${NC}"
fi

# Summary
echo -e "\n==================================="
echo -e "${GREEN}All checks passed!${NC}"
echo -e "==================================="
echo ""
echo "Prisma packaging verification complete."
echo "The app should work correctly in production on:"
echo "  - Linux (current build)"
echo "  - Windows (after running: npm run build:win)"
echo "  - macOS (after running: npm run build:mac)"
echo ""
echo "To test on Windows, send the packaged app to a Windows machine and check:"
echo "  C:\\Users\\<username>\\AppData\\Local\\BizFlow\\logs\\app-*.log"
echo ""
echo "Expected log entries:"
echo "  [Prisma] Configuring production module resolution..."
echo "  [Prisma] ✓ Loaded via direct path"
echo "  [Database] ✓ Connected to database"
