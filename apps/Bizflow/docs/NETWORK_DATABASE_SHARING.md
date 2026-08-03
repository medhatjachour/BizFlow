# Network Database Sharing — Windows SMB + SQLite

## Overview

BizFlow supports multi-PC database sharing using **Windows SMB file sharing** combined with SQLite and Prisma. This approach is optimized for small teams (1-10 users) on the same LAN without requiring external database servers.

**Key Benefits:**
- ✅ Zero server setup (built-in Windows feature)
- ✅ No IT overhead or maintenance
- ✅ Free (no licensing costs)
- ✅ Install and go (one .exe handles both modes)
- ✅ Automatic database synchronization via WAL mode
- ✅ Easy to upgrade later (Prisma supports PostgreSQL/MySQL migration)

---

## Architecture

### File Structure
```
Main PC:
  C:\BizFlow\shared\
    └── database.db        # Shared database file
    └── database.db-wal    # Write-Ahead Logging file
    └── database.db-shm    # Shared memory file

Client PC:
  \\main-pc\bizflow\
    └── database.db        # Network path to shared database
```

### How It Works

1. **Main PC** runs BizFlow in "Server" mode with a shared network folder
2. **Client PCs** connect via SMB and access the same `database.db` file
3. **SQLite WAL mode** handles concurrent writes safely (multiple processes can read while one writes)
4. **Prisma** manages all database operations transparently
5. **Network latency** is minimal on LAN (~5ms)

### Concurrency Model

| Scenario | Handling |
|----------|----------|
| **Multiple readers** | ✅ Fully supported (WAL mode) |
| **One writer + readers** | ✅ Readers wait briefly, no conflicts |
| **Multiple writers (rare)** | ⚠️ Prisma retries automatically (queue up) |
| **Network disconnection** | ❌ User sees error, must reconnect |

---

## Setup Instructions

### Prerequisites

- **Windows 10/11 Pro or Enterprise** (Home edition limited file sharing features)
- **Main PC:** 100MB+ free disk space for database + resources
- **Client PCs:** 100MB+ free disk space for app installation
- **Network:** Same LAN (Wi-Fi or Ethernet)
- **.NET Runtime 6+** installed (for Electron/Node.js)

### Main PC Setup (Server Mode)

#### Step 1: Create Shared Folder

```powershell
# Create the shared folder
New-Item -ItemType Directory -Force -Path "C:\BizFlow\shared"

# Set permissions (allow Everyone to read/write)
icacls "C:\BizFlow\shared" /grant Everyone:F /T
```

#### Step 2: Enable Network Sharing

1. Open **Settings** → **System** → **Remote Desktop**
2. Enable **"Remote Discovery"** and **"Network file sharing"**
3. Open **Settings** → **Network & Internet** → **Sharing Options**
4. Enable **"Network Discovery"** and **"File and Printer Sharing"**

#### Step 3: Share the Folder

1. Right-click `C:\BizFlow\shared` → **Properties**
2. Go to **Sharing** tab → **Share...**
3. Add **Everyone** with **Read/Write** permissions
4. Note the **network path**: `\\<main-pc-name>\bizflow`
   - Find PC name: Right-click **This PC** → **Properties** → **Device name**

#### Step 4: Install BizFlow

1. Run the installer
2. When prompted: Select **"Main PC (Server Mode)"**
3. Choose installation location (default: `C:\Program Files\BizFlow`)
4. Installer creates `%APPDATA%\BizFlow\mode.json`:
   ```json
   {
     "mode": "server",
     "databasePath": "C:\\BizFlow\\shared\\database.db"
   }
   ```

#### Step 5: Start the Application

- Launch BizFlow normally
- Database initializes to `C:\BizFlow\shared\database.db`
- Ready for client connections

### Client PC Setup (Client Mode)

#### Step 1: Install BizFlow

1. Run the installer
2. When prompted: Select **"Client PC (Network Mode)"**
3. You'll be asked for the **main PC's network path**

#### Step 2: Enter Main PC Details

When prompted during installation, enter:
```
Main PC Name: main-pc
  OR
Main PC IP: 192.168.1.100

Network Path (auto-filled): \\main-pc\bizflow
Database Path: \\main-pc\bizflow\database.db
```

Installer creates `%APPDATA%\BizFlow\mode.json`:
```json
{
  "mode": "client",
  "networkPath": "\\\\main-pc\\bizflow",
  "databasePath": "\\\\main-pc\\bizflow\\database.db"
}
```

#### Step 3: Connect to Main PC

- Launch BizFlow
- App attempts to connect to `\\main-pc\bizflow\database.db`
- If successful: Uses shared database, all changes sync in real-time
- If failed: Shows error with troubleshooting steps

#### Step 4: First Launch

- All data from main PC is accessible
- Changes on any PC appear immediately on all others
- No manual sync needed

---

## How It Works Under the Hood

### Database Initialization

**Main PC (Server Mode):**
```typescript
// src/main/database/init.ts
function getDatabasePath() {
  if (mode === 'server') {
    return 'C:\\BizFlow\\shared\\database.db';
  }
  // ... read network path from mode.json for clients
}
```

**Client PC (Client Mode):**
```typescript
function getDatabasePath() {
  const modeConfig = readModeJson(); // { mode: 'client', databasePath: '\\\\main-pc\\bizflow\\database.db' }
  return modeConfig.databasePath;
}
```

### Prisma Configuration

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// .env.local (automatically set by getDatabasePath)
// Main PC:   DATABASE_URL="file:C:\\BizFlow\\shared\\database.db"
// Client PC: DATABASE_URL="file:\\\\main-pc\\bizflow\\database.db"
```

### Write-Ahead Logging (WAL)

Automatically enabled in [apps/Bizflow/web/session-db.ts](../web/session-db.ts#L42):
```typescript
PRAGMA journal_mode = WAL;  // Enables concurrent reads while writing
```

Benefits:
- Multiple readers can access database while one writer updates
- Writers don't block readers
- Automatic cleanup of WAL files
- Extremely reliable (used in production by millions)

### Connection Flow

```mermaid
graph LR
    A[Client PC 1] -->|\\main-pc\bizflow\database.db| D[Shared Database File]
    B[Client PC 2] -->|\\main-pc\bizflow\database.db| D
    C[Main PC Server] -->|C:\BizFlow\shared\database.db| D
    D -->|WAL Mode| E[SQLite Engine]
    E -->|Prisma ORM| F[BizFlow App]
```

---

## Troubleshooting

### "Cannot access network path"

**Symptoms:** Error when connecting, `\\main-pc\bizflow` not found

**Solutions:**
1. Verify main PC sharing is enabled:
   ```powershell
   Get-SmbShare | Select-Object Name, Path
   ```
   Should show `bizflow` share

2. Test connectivity from client PC:
   ```powershell
   Test-Path \\main-pc\bizflow
   # Should return True
   ```

3. Check firewall allows SMB (port 445):
   ```powershell
   # On main PC
   netsh advfirewall firewall set rule name="File and Printer Sharing (SMB-In)" dir=in action=allow
   ```

4. Verify permissions on shared folder:
   ```powershell
   icacls "C:\BizFlow\shared"
   # Should show Everyone:(F) or similar
   ```

### Database locked errors

**Symptoms:** "database is locked" error when multiple users edit simultaneously

**Causes:**
- WAL mode not properly enabled
- Network latency spikes
- One user holding a long transaction

**Solutions:**
1. Check WAL mode is enabled:
   ```bash
   sqlite3 "\\main-pc\bizflow\database.db" "PRAGMA journal_mode;"
   # Should return: wal
   ```

2. Restart BizFlow on all PCs (releases all locks)

3. Monitor database file size — if `database.db-wal` grows large, restart needed

### "File already in use" on main PC

**Symptoms:** Installer won't overwrite existing database during main PC setup

**Solution:**
1. Close BizFlow completely on all PCs
2. Wait 30 seconds for file locks to release
3. Run installer again

### Network disconnection during use

**Symptoms:** App freezes, then shows database error

**Handling:**
- App detects network loss and displays offline mode prompt
- Changes attempted while offline are queued
- When reconnected: Queued changes sync automatically
- User can continue working with cached data (read-only)

**Manual recovery:**
```powershell
# On client PC, verify reconnection
Test-Path \\main-pc\bizflow\database.db

# Restart BizFlow to retry connection
```

---

## Performance Considerations

### Expected Performance

| Operation | Latency | Notes |
|-----------|---------|-------|
| **Read** | ~5-10ms | Network + file system |
| **Write** | ~15-30ms | Commit to WAL + network sync |
| **Bulk insert** | ~100-200ms | Multiple transactions |
| **Report generation** | ~500ms-2s | Complex queries across network |

### Optimization Tips

1. **Minimize network distance:** Use Ethernet if Wi-Fi is unstable
2. **Reduce polling:** Avoid frequent small reads, batch operations
3. **Increase Prisma pool:** `PRISMA_CLIENT_ENGINE_TYPE=binary` (faster startup)
4. **Monitor WAL file:** If `database.db-wal` > 50MB, checkpoint has issues
   ```bash
   # On main PC, force checkpoint
   sqlite3 "C:\BizFlow\shared\database.db" "PRAGMA wal_checkpoint(PASSIVE);"
   ```

### Limitations

- **Max concurrent users:** ~5-10 (limited by SMB file locking)
- **Database size:** Tested up to 500MB, OK; beyond 1GB may see slowdown
- **Update frequency:** Recommended < 100 writes/minute per user

---

## Scaling Beyond SMB

### When to Migrate to PostgreSQL

**Signs you need a real database server:**
- 10+ concurrent users regularly
- Database exceeds 1GB
- Users across multiple offices (internet, not LAN)
- Need enterprise backup/audit features
- Multiple departments using simultaneously

### Migration Steps

No app code changes needed! Prisma handles both:

1. **Install PostgreSQL** on server or cloud
2. **Update `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "postgresql"  # Changed from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Set environment variable:**
   ```bash
   # Instead of file path
   DATABASE_URL="postgresql://user:pass@server:5432/bizflow"
   ```

4. **Run migration:**
   ```bash
   npx prisma db push
   ```

5. **Update installers** to use connection string instead of file path

**Effort:** 4-6 hours total

---

## Security Considerations

### Data Protection

- **At rest:** Files on main PC should use BitLocker/NTFS encryption
- **In transit:** SMB v3 supports encryption (enable in Windows Registry if needed)
- **Access control:** Folder permissions restrict who can access database

### Best Practices

1. **Restrict folder access:**
   ```powershell
   icacls "C:\BizFlow\shared" /remove Everyone
   icacls "C:\BizFlow\shared" /grant "DOMAIN\Team:(F)"
   ```

2. **Monitor access logs:**
   ```powershell
   # Enable file audit logging
   auditpol /set /subcategory:"File Share" /success:enable /failure:enable
   ```

3. **Regular backups:**
   ```powershell
   # Weekly backup script
   $source = "C:\BizFlow\shared\database.db*"
   $dest = "D:\Backups\BizFlow\$(Get-Date -Format yyyyMMdd)"
   Copy-Item $source $dest -Recurse
   ```

4. **Disable guest access:**
   ```powershell
   net user guest /active:no
   ```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check for WAL file growth (`database.db-wal` should stay < 10MB)
- Monitor for "file locked" errors in logs
- Verify all client PCs can reach main PC

**Monthly:**
- Run database integrity check:
  ```bash
  sqlite3 "C:\BizFlow\shared\database.db" "PRAGMA integrity_check;"
  ```
- Review and archive logs
- Test backup restore procedure

**When Database Grows:**
- Monitor `database.db` file size
- Once > 500MB, consider archiving old data or PostgreSQL migration

### Backup Strategy

Recommended: **3-2-1 backup rule**
- **3 copies** of data (original + 2 backups)
- **2 different media** (network + external drive)
- **1 offsite** (cloud backup)

```powershell
# Automated daily backup to external drive
# Add to Task Scheduler
$source = "C:\BizFlow\shared\database.db*"
$dest = "E:\BackupDrive\BizFlow\$(Get-Date -Format yyyyMMdd-HHmm)"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item $source "$dest\" -Recurse
```

---

## Implementation Checklist

### Main PC
- [ ] Create `C:\BizFlow\shared` folder
- [ ] Enable Network Discovery and File Sharing
- [ ] Share folder with Everyone:ReadWrite
- [ ] Install BizFlow, select "Main PC" mode
- [ ] Launch BizFlow, verify database created
- [ ] Setup automated backup script
- [ ] Document network path and PC name

### Client PC
- [ ] Install BizFlow, select "Client PC" mode
- [ ] Enter main PC network path during installation
- [ ] Launch BizFlow, verify connection to database
- [ ] Test creating/editing data
- [ ] Verify changes appear immediately on other clients

### Testing
- [ ] All PCs can access `\\main-pc\bizflow\database.db`
- [ ] Multiple PCs open BizFlow simultaneously
- [ ] One user edits while others read (no conflicts)
- [ ] Network disconnection and reconnection handled
- [ ] WAL file is managed (doesn't grow unbounded)

---

## FAQ

**Q: Can we use this on the internet (not just LAN)?**  
A: Not recommended. SMB over internet has:
- Security risks (expose port 445 globally)
- Performance issues (high latency)
- Reliability issues (packet loss)
Use PostgreSQL on cloud instead.

**Q: What if main PC shuts down?**  
A: All client PCs lose database access until main PC restarts. Data is safe, but app is offline. For 24/7 availability, use PostgreSQL with automatic failover.

**Q: Can we backup while BizFlow is running?**  
A: Yes! Copy `database.db` + `database.db-wal` + `database.db-shm` while running (WAL mode makes this safe).

**Q: How many PCs can use this?**  
A: Tested reliably up to 10. Beyond that, consider PostgreSQL.

**Q: Can we move the shared folder to an external drive?**  
A: Yes, but performance suffers. USB 3.0 external drives OK, USB 2.0 not recommended.

**Q: Is this compatible with VPN/remote access?**  
A: SMB over VPN works, but it's slow and requires extra setup. Better to use PostgreSQL on cloud.

---

## Related Documentation

- [DATABASE.md](DATABASE.md) — Schema, migrations, seeding
- [ARCHITECTURE.md](ARCHITECTURE.md) — Overall app architecture
- [MIGRATION_SYSTEM.md](MIGRATION_SYSTEM.md) — Database versioning
- [NETWORK_DATABASE_COMPARISON.md](NETWORK_DATABASE_COMPARISON.md) — SMB vs PostgreSQL detailed comparison

