#!/bin/bash

# Migration Recovery Script
# Use this if you have an old database that failed to migrate

echo "🔧 Migration Recovery Script"
echo "=============================="
echo ""

DB_PATH="$HOME/.config/bizflow/database.db"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at: $DB_PATH"
    echo "   App will create a fresh one on next start."
    exit 0
fi

echo "📊 Current database: $DB_PATH"
echo ""

# Show database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
echo "   Size: $DB_SIZE"

# Check if migration table exists
MIGRATION_TABLE=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations';" 2>/dev/null)

if [ -z "$MIGRATION_TABLE" ]; then
    echo "   Migration tracking: ❌ Not initialized"
else
    echo "   Migration tracking: ✅ Exists"
    
    # Show applied migrations
    MIGRATION_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null)
    echo "   Applied migrations: $MIGRATION_COUNT"
fi

echo ""

# Check for missing columns
echo "🔍 Checking for common missing columns..."
echo ""

HAS_CUSTOMER_ARCHIVED=$(sqlite3 "$DB_PATH" ".schema Customer" | grep -c "isArchived" || true)
HAS_PRODUCT_ARCHIVED=$(sqlite3 "$DB_PATH" ".schema Product" | grep -c "isArchived" || true)
HAS_PRODUCT_BARCODE=$(sqlite3 "$DB_PATH" ".schema Product" | grep -c "baseBarcode" || true)

if [ "$HAS_CUSTOMER_ARCHIVED" -eq 0 ]; then
    echo "   ❌ Customer.isArchived missing"
fi

if [ "$HAS_PRODUCT_ARCHIVED" -eq 0 ]; then
    echo "   ❌ Product.isArchived missing"
fi

if [ "$HAS_PRODUCT_BARCODE" -eq 0 ]; then
    echo "   ❌ Product.baseBarcode missing"
fi

if [ "$HAS_CUSTOMER_ARCHIVED" -gt 0 ] && [ "$HAS_PRODUCT_ARCHIVED" -gt 0 ] && [ "$HAS_PRODUCT_BARCODE" -gt 0 ]; then
    echo "   ✅ All columns present - migration looks complete!"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔄 Recovery Options:"
echo ""
echo "Option 1: Force Re-Migration (Recommended)"
echo "   This will make the app retry all migrations"
echo ""
echo "   1. Backup current database (automatically done)"
echo "   2. Delete migration tracking table"
echo "   3. Restart app"
echo ""
echo "   Run this command:"
echo "   sqlite3 \"$DB_PATH\" \"DROP TABLE IF EXISTS _prisma_migrations;\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option 2: Fresh Start (Lose Data)"
echo "   Delete database and let app create new one"
echo ""
echo "   Run this command:"
echo "   rm \"$DB_PATH\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Do you want to force re-migration? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Creating backup..."
    BACKUP_PATH="${DB_PATH}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$DB_PATH" "$BACKUP_PATH"
    echo "✅ Backup created: $BACKUP_PATH"
    echo ""
    
    echo "Removing migration tracking..."
    sqlite3 "$DB_PATH" "DROP TABLE IF EXISTS _prisma_migrations;"
    echo "✅ Migration tracking removed"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Done! Now restart your app."
    echo ""
    echo "The app will:"
    echo "  1. Detect missing migrations"
    echo "  2. Show migration dialog"
    echo "  3. Apply all migrations"
    echo "  4. Update database schema"
    echo ""
    echo "If migration fails, restore from:"
    echo "  $BACKUP_PATH"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "No changes made. See options above to fix manually."
fi
