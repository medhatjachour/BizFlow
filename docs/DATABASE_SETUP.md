# Database Setup Guide

## Quick Start - Automatic Setup ✨

The application now handles database setup automatically!

### 1. Just run the application
```bash
npm run dev
```

**What happens automatically:**
- ✅ Creates database file if missing
- ✅ Detects if schema is missing
- ✅ Applies all migrations with user confirmation
- ✅ Creates default admin user (`setup` / `setup123`)
- ✅ Shows migration progress in UI

**Default Login Credentials:**
- Username: `setup`
- Password: `setup123`

⚠️ **SECURITY WARNING:** Change this password immediately after first login!

### 2. First-time migration flow
When you run the app with a fresh or empty database:

1. App detects missing schema
2. Shows dialog: "Database Update Required"
3. Click "Update Now"
4. Migrations apply automatically (with progress UI)
5. Default admin user created
6. App is ready to use!

## How It Works

The `SimpleMigrationManager` automatically:
1. **Detects empty databases** - Checks if actual tables exist (not just tracking table)
2. **Resets stale migration records** - Clears tracking if database has no schema
3. **Applies all migrations** - Runs SQL migrations from `prisma/migrations/`
4. **Creates setup user** - Automatically creates default admin after migrations
5. **Shows UI dialogs** - User-friendly migration progress

## Manual Database Reset

To completely reset and recreate the database:

```bash
# Delete database
rm bizflow.db

# Run app - migrations will run automatically
npm run dev

# Click "Update Now" in the dialog
# Setup user will be created automatically
```

## Database Location

- **Development:** `<project-root>/bizflow.db`
- **Production:** `<userData>/database.db`

## Common Issues

### "no such table: User"
**Automatic Fix:** The migration system now detects this and prompts you to run migrations.

**Manual Fix (if needed):**
1. Delete `bizflow.db`
2. Restart app
3. Click "Update Now" when prompted

### Migrations folder missing
**Solution:** Restore from git
```bash
git restore --source=HEAD~5 prisma/migrations/
```

### Setup user already exists
The migration system checks before creating. If users exist, it skips user creation.

## Migration System Features

### Automatic Detection
- Checks if database has actual schema
- Resets migration tracking if database is empty
- Prevents false "migrations up to date" when tables are missing

### Backup Creation
- Automatically creates backup before migrations
- Format: `bizflow.db.backup-<timestamp>`
- Located in same directory as database

### Transaction Safety
- All migrations run in a single transaction
- If one fails, all changes are rolled back
- Database remains in consistent state

## Adding New Migrations

1. Create migration folder:
```bash
mkdir prisma/migrations/$(date +%Y%m%d%H%M%S)_description
```

2. Add `migration.sql`:
```sql
-- Your SQL here
ALTER TABLE User ADD COLUMN newField TEXT;
```

3. Restart app - migration applies automatically

## Production Deployment

The migration system works identically in production:
1. Packaged app includes `prisma/migrations/` folder
2. On first run, migrations apply automatically
3. Setup user created automatically
4. Database location: `<userData>/database.db`

## Manual Setup User Creation (Rarely Needed)

Only needed if automatic creation fails:
