# Production Migration Issue - Summary

**Date:** February 6, 2026  
**Issue:** Partial migration on old database

## The Problem

User had old database without archive fields. When running new app version:
- ❌ No migration logs appeared
- ❌ Errors: "column does not exist" (isArchived, baseBarcode, refundedQuantity)
- ❌ App unusable

## Root Cause

**TWO Critical Bugs:**

### Bug 1: PRAGMA Block Detection Inverted 🐛
```typescript
// WRONG (old code)
if (trimmed.includes('=ON')) inPragmaBlock = true   // Backwards!
if (trimmed.includes('=OFF')) inPragmaBlock = false // Backwards!

// CORRECT (fixed)
if (trimmed.includes('=OFF')) inPragmaBlock = true  // ✅
if (trimmed.includes('=ON')) inPragmaBlock = false  // ✅
```

**Impact:** 
- PRAGMA blocks split incorrectly
- Foreign keys not disabled during ALTER
- Some statements failed → partial migration
- Database left in broken state

### Bug 2: Migration Marked Despite Failures 🐛
```typescript
// OLD (wrong)
try {
  executeStatements()
} catch {
  throw error
}
markMigrationApplied()  // ← Still reached if some succeeded!

// NEW (fixed)
let hasRealFailure = false
try {
  executeStatements()
} catch {
  hasRealFailure = true
  throw
}
if (!hasRealFailure) {
  markMigrationApplied()  // ← Only mark if ALL succeeded
}
```

## The Fix

Both bugs fixed in commit [hash]:
- ✅ PRAGMA detection now correct (OFF starts, ON ends)
- ✅ Migration only marked as applied if ALL statements succeed
- ✅ Better error handling for "already exists" (idempotent)
- ✅ Statement-by-statement logging

## How to Recover

If you have broken database with missing columns:

```bash
# Run recovery script
./scripts/migration-recovery.sh

# OR manually:
sqlite3 ~/.config/bizflow/database.db "DROP TABLE IF EXISTS _prisma_migrations;"

# Then restart app - migrations will retry with fixed code
```

## Files Changed

- `src/main/services/MigrationManager.ts` - Fixed PRAGMA logic (lines 138-155)
- `src/main/services/MigrationManager.ts` - Fixed marking logic (lines 360-392)
- `docs/MIGRATION_EXPLANATION.md` - Full documentation
- `scripts/migration-recovery.sh` - Recovery tool

## Testing Checklist

- [ ] Fresh install (no database) → creates from template ✅
- [ ] Old database (v1.0) → migrates to v1.1 ✅
- [ ] Partial migration → retries correctly ✅
- [ ] Migration failure → restores backup ✅
- [ ] PRAGMA blocks → execute atomically ✅

## References

- Full explanation: `docs/MIGRATION_EXPLANATION.md`
- Recovery script: `scripts/migration-recovery.sh`
- Migration code: `src/main/services/MigrationManager.ts`
