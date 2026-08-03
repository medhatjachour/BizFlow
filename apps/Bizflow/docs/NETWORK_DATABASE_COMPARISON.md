# Database Architecture Comparison: SMB vs Prisma Server

## Overview

This document compares two approaches for multi-PC database sharing in BizFlow:
1. **Windows SMB + SQLite** (recommended for small teams)
2. **Prisma + Centralized Database Server** (PostgreSQL/MySQL)

---

## 1. Setup Complexity

| **Aspect** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **Initial Setup** | ✅ Enable file sharing on main PC (built-in Windows feature) | ❌ Install PostgreSQL/MySQL, configure server, open ports |
| **Installer** | Single .exe, prompts for mode (Main/Client) | Single .exe, but requires DB connection string setup |
| **Network Configuration** | Set shared folder, add users to access list | Configure DB server IP, port, firewall rules, SSL certs |
| **Time to Deploy** | 5-10 minutes (share folder + install on each PC) | 30-45 minutes (server install + config + client setup) |
| **IT Knowledge Required** | Basic (Windows file sharing) | Advanced (SQL server admin, networking) |

---

## 2. Cost Analysis

| **Aspect** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **Server License** | $0 (built-in Windows) | $0-$300/mo (PostgreSQL free, MySQL free, managed services paid) |
| **Infrastructure** | Use existing main PC | Need dedicated server/VPS or cloud database |
| **Backup Tools** | $0 (Windows file backup) | $0-$500/mo (managed backups) |
| **SSL Certificates** | $0 (local network) | $0-$120/yr (for remote access) |
| **Total 1st Year** | **$0** | **$300-$1,500+** |

---

## 3. Architecture & Code Changes

| **Aspect** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **Prisma Schema Changes** | **Minimal** — Change provider from `sqlite` to `postgresql` or `mysql` | **Moderate** — Update datasource, update all connection pooling |
| **DATABASE_URL Format** | Local: `file:./dev.db`<br/>Network: `file://\\\\server\\share\\db.db` | `postgresql://user:pass@server:5432/bizflow`<br/>`mysql://user:pass@server:3306/bizflow` |
| **Code Changes** | ✅ None (existing getDatabasePath() already supports both) | ⚠️ Update getDatabasePath() to return DB connection string |
| **WAL Mode** | ✅ Already enabled in session-db.ts | ❌ Not applicable (PostgreSQL uses different concurrency) |
| **Connection Pooling** | Built-in via Prisma SQLite driver | Requires PgBouncer/MaxScale (additional setup) |
| **Per-Session Isolation** | ✅ Works (copy database per session) | ⚠️ Requires connection pooling + isolation via schemas/databases |

---

## 4. Concurrency & Performance

| **Aspect** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **Max Concurrent Users** | ~5-10 (limited by file locking on SMB) | 50-500+ (depends on server specs) |
| **Write Conflicts** | Handled by SQLite WAL + Prisma retries | Handled by SQL server transactions |
| **Latency** | ⚡ <5ms (local network) | ~10-50ms (network + query processing) |
| **Scalability** | ⚠️ Limited to local network | ✅ Can grow to hundreds of users |
| **File Locking Issues** | Possible under heavy load | Not applicable |

---

## 5. Security

| **Aspect** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **Encryption at Rest** | ⚠️ Requires BitLocker/EFS (manual setup) | ✅ Often built-in or via extension |
| **Encryption in Transit** | ❌ SMB traffic not encrypted by default | ✅ SSL/TLS support standard |
| **Access Control** | ✅ Windows NTLM authentication | ✅ SQL server user/password + roles |
| **Firewall Exposure** | ⚠️ SMB port (445) must be open on LAN | ⚠️ DB port must be open (public or VPN) |
| **Data Isolation** | ✅ File system permissions | ✅ SQL-level permissions + row-level security |
| **Audit Logging** | ⚠️ Windows file access logs only | ✅ Query audit logs available |

---

## 6. Reliability & Failover

| **Aspect** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **High Availability** | ❌ No built-in failover (main PC crash = all users down) | ✅ Can setup replication + failover |
| **Backup Strategy** | Manual file backups or Windows Backup | Automated backups + point-in-time recovery |
| **Recovery Time** | ⚠️ Manual restore from backup | ✅ Minutes (automated) |
| **Data Corruption** | Rare (SQLite WAL is robust) | Very rare (SQL server checksums) |
| **Network Outage** | ❌ All users affected | Depends on redundancy setup |

---

## 7. Maintenance & Monitoring

| **Aspect** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **Daily Maintenance** | ✅ None required | Backup checks, log rotation, connection pool monitoring |
| **Updates** | ✅ Just rebuild Prisma client | SQL server patches, potential downtime |
| **Monitoring** | File size, folder access logs | Query logs, connection pools, CPU/memory |
| **Troubleshooting** | Simple (file access, SMB connectivity) | Complex (query performance, locks, replication lag) |
| **Learning Curve** | Low (Windows file sharing) | High (SQL administration) |

---

## 8. Scalability Timeline

| **Phase** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **1-3 users** | ✅ Perfect fit | Overkill |
| **5-10 users** | ✅ Still works well | Good, but overcomplicated |
| **10-20 users** | ⚠️ May see contention | ✅ Ideal |
| **20+ users** | ❌ Performance degrades | ✅ Still scaling well |
| **100+ users** | ❌ Not viable | ✅ Need read replicas |

---

## 9. Implementation Cost (Dev Hours)

| **Phase** | **Windows SMB + SQLite** | **Prisma + DB Server** |
|---|---|---|
| **Planning** | 2 hours | 4 hours |
| **Code Modifications** | 2-4 hours | 8-12 hours |
| **Testing** | 4 hours | 8 hours |
| **Deployment** | 2 hours | 4 hours |
| ****Total**** | **~10 hours** | **~28 hours** |

---

## 10. Deployment Walkthrough

### Windows SMB + SQLite

**Main PC Setup:**
```
1. Enable Network Discovery + File Sharing
2. Create shared folder: C:\BizFlow\shared
3. Set permissions: Users can read/write
4. Install BizFlow desktop app, select "Main PC" mode
5. Launch, verify database created
```

**Client PC Setup:**
```
1. Install BizFlow, select "Client PC" mode
2. When prompted, enter: \\<main-pc-name>\bizflow
3. App connects to shared database, ready to use
```

### Prisma + PostgreSQL

**Server Setup:**
```
1. Install PostgreSQL on main PC or dedicated server
2. Create database: CREATE DATABASE bizflow;
3. Configure firewall rules for port 5432
4. Set user permissions and connection pooling
```

**Client Setup:**
```
1. Install BizFlow
2. Set DATABASE_URL=postgresql://user:pass@server:5432/bizflow
3. Run: npx prisma db push
4. Install app and configure connection string
5. Ongoing: Monitor connection pooling, update PostgreSQL regularly
```

---

## 11. When to Choose Which

### ✅ Choose Windows SMB + SQLite if:
- 1-10 users on same LAN
- No complex enterprise requirements
- Want zero server maintenance
- Budget is tight ($0 setup cost)
- Minimal IT staff
- Willing to upgrade later
- **This is BizFlow's recommended approach ✓**

### ✅ Choose Prisma + DB Server if:
- 20+ concurrent users expected
- Users span multiple offices/internet
- Need high availability/failover
- Complex backup/audit requirements
- SQL server already in use
- Plan to grow beyond 1 office
- Cloud deployment required

---

## 12. Migration Path Forward

### Upgrading from SMB to PostgreSQL

If you start with SMB and later need PostgreSQL:

```
1. Export SQLite data to CSV (optional, Prisma handles it)
2. Update prisma/schema.prisma:
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
3. Run: npx prisma db push
4. Set DATABASE_URL to PostgreSQL connection string
5. No app code changes needed (Prisma handles both)
```

**Effort:** 4-6 hours (after server is running)

---

## 13. Real-World Use Cases

### Small Clinic (Recommended: SMB + SQLite)
- **Users:** 3 (doctor, receptionist, admin)
- **Setup:** Main PC in reception, backup on USB daily
- **Cost:** $0
- **Result:** ✅ Perfect fit, instant deployment

### Multi-Location Restaurant Chain (Recommended: PostgreSQL)
- **Users:** 25+ (across 3 locations)
- **Setup:** PostgreSQL on VPS, clients connect remotely
- **Cost:** $300/mo
- **Result:** ✅ Scales reliably, supports remote locations

### Growing Consulting Firm (Start with SMB, Upgrade Later)
- **Year 1:** 5 users on LAN → SMB ($0)
- **Year 2:** 15 users → Plan migration to PostgreSQL
- **Year 3:** 30 users → Full PostgreSQL + cloud backup ($500/mo)
- **Result:** ✅ No rework, smooth scaling

---

## 14. Decision Tree

```
Do you have 1-10 users on the same LAN?
├─ YES → Are you willing to upgrade later?
│   ├─ YES → Use SMB + SQLite (This guide)
│   └─ NO → Use PostgreSQL (skip ahead)
└─ NO → Need users across multiple offices?
    ├─ YES → Use PostgreSQL + cloud
    └─ MAYBE FUTURE → Start with SMB, plan migration path
```

---

## Implementation Recommendations

### For Small Teams (Start Here)
1. Follow [NETWORK_DATABASE_SHARING.md](NETWORK_DATABASE_SHARING.md)
2. Setup main PC with SMB sharing
3. Install app on each client PC
4. Deploy within 1 day

### For Growing Teams
1. Start with SMB while < 10 users
2. At 10-15 users, plan PostgreSQL migration
3. Document your data model for export
4. Test migration on staging first

### For Enterprise Customers
1. Skip SMB, go straight to PostgreSQL + cloud
2. Setup managed database service (AWS RDS, Azure Database, etc.)
3. Configure backup and replication upfront
4. Use Prisma for connection pooling

---

## Related Documentation

- [NETWORK_DATABASE_SHARING.md](NETWORK_DATABASE_SHARING.md) — Step-by-step setup for SMB approach
- [DATABASE.md](DATABASE.md) — Schema design, migrations, seeding
- [ARCHITECTURE.md](ARCHITECTURE.md) — Overall system architecture
- [MIGRATION_SYSTEM.md](MIGRATION_SYSTEM.md) — Database versioning and upgrades

