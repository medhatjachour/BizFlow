/**
 * Database initialization for production builds
 * Uses Electron's userData directory for proper cross-platform support
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { app } from 'electron'
import { createLogger } from '../utils/logger'

const log = createLogger('DBInit')

/**
 * Initialize database file and directory structure
 * Creates empty database on first run in production
 */
export async function initializeDatabase(): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    log.info('[DB Init] Running in development mode, using project database')
    
    // Check if dev database exists and has tables
    const devDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
    if (!fs.existsSync(devDbPath) || fs.statSync(devDbPath).size < 1024) {
      log.info('[DB Init] 🔧 Dev database missing or empty, initializing...')
      await initializeDevelopmentDatabase(devDbPath)
    }
    
    return
  }

  // Production: Use Electron's userData directory (cross-platform)
  const appDataPath = app.getPath('userData')
  const dbPath = path.join(appDataPath, 'database.db')
  
  log.info('[DB Init] Production mode - App data directory:', appDataPath)
  log.info('[DB Init] Database path:', dbPath)
  
  try {
    // Ensure app data directory exists
    if (!fs.existsSync(appDataPath)) {
      log.info('[DB Init] Creating app data directory...')
      fs.mkdirSync(appDataPath, { recursive: true })
    }

    // Check if database already exists AND has real content.
    // IMPORTANT: handlers/index.ts initialises the Prisma client at module-load time
    // (before app.whenReady fires), which causes SQLite to create an empty database.db
    // file in userData.  If we only check fs.existsSync we will see that empty file and
    // bail out before copying the seeded template — leaving the app with no users.
    // We therefore treat any file below 50 KB as "pre-created empty" and overwrite it.
    const dbExists = fs.existsSync(dbPath)
    const dbSizeBytes = dbExists ? fs.statSync(dbPath).size : 0
    const EMPTY_DB_THRESHOLD = 50 * 1024 // 50 KB — real seeded template is ~400 KB

    if (dbExists && dbSizeBytes >= EMPTY_DB_THRESHOLD) {
      log.info(`[DB Init] Database already exists and has real content (${(dbSizeBytes / 1024).toFixed(1)} KB), skipping init`)
      return
    }

    if (dbExists && dbSizeBytes < EMPTY_DB_THRESHOLD) {
      log.info(`[DB Init] ⚠️  Database file exists but looks empty (${dbSizeBytes} bytes) — likely pre-created by Prisma before init ran. Removing and re-initialising from template.`)
      fs.unlinkSync(dbPath)
    }

    log.info('[DB Init] 🎉 First run or empty DB — initialising database from template...')
    
    // Copy the template.db from resources to initialize with schema (recommended)
    const templateDbPath = path.join(process.resourcesPath, 'prisma', 'template.db')
    
    // Debug: Log resource paths to diagnose issues
    log.info('[DB Init] Resource path:', process.resourcesPath)
    log.info('[DB Init] Looking for template at:', templateDbPath)
    
    // Check if template exists
    if (fs.existsSync(templateDbPath)) {
      const templateSize = fs.statSync(templateDbPath).size
      log.info(`[DB Init] Found template database (${(templateSize / 1024).toFixed(2)} KB)`)
      
      // Verify template has content
      if (templateSize < 10240) { // Less than 10KB
        log.warn('[DB Init] ⚠️  Template database seems empty, falling back to schema creation')
        await createDatabaseWithSchema(dbPath)
      } else {
        log.info('[DB Init] Copying template database to user data...')
        fs.copyFileSync(templateDbPath, dbPath)
        
        // Verify copy succeeded
        if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 10240) {
          log.info('[DB Init] ✅ Database initialized from template')
          await verifyAndSeedDatabaseAfterCopy(dbPath)
        } else {
          log.error('[DB Init] ❌ Copy failed, creating from scratch')
          await createDatabaseWithSchema(dbPath)
        }
      }
    } else {
      // Fallback: create database with schema using Prisma migrations
      log.warn('[DB Init] ⚠️  Template not found at expected location')
      log.info('[DB Init] Checking alternative locations...')
      
      // Try alternative locations
      const altPaths = [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'prisma', 'template.db'),
        path.join(__dirname, '..', '..', 'prisma', 'template.db')
      ]
      
      let templateFound = false
      for (const altPath of altPaths) {
        log.info('[DB Init] Checking:', altPath)
        if (fs.existsSync(altPath)) {
          log.info('[DB Init] ✅ Found template at alternative location')
          fs.copyFileSync(altPath, dbPath)
          templateFound = true
          await verifyAndSeedDatabaseAfterCopy(dbPath)
          break
        }
      }
      
      if (!templateFound) {
        log.info('[DB Init] Creating database with schema from migrations...')
        await createDatabaseWithSchema(dbPath)
      }
    }
    
    log.info('[DB Init] ℹ️ Default setup user: username="setup", password="setup123"')
    
  } catch (error) {
    log.error('[DB Init] ❌ Error initializing database:', error)
    throw error
  }
}

/**
 * Get database path for the current environment
 */
export function getDatabasePath(): string {
  const isDev = process.env.NODE_ENV === 'development'
  return isDev 
    ? path.resolve(process.cwd(), 'prisma', 'dev.db')
    : path.join(app.getPath('userData'), 'database.db')
}

/**
 * Create production database with schema from migrations
 * Uses embedded Prisma migrations to initialize the database
 */
async function createDatabaseWithSchema(dbPath: string): Promise<void> {
  try {
    log.info('[DB Init] 🔧 Creating database with schema from migrations...')
    
    // Create empty database file
    fs.writeFileSync(dbPath, '')
    
    // Import Prisma using the environment-aware helper
    let PrismaClient
    try {
      PrismaClient = loadPrismaClient()
    } catch (requireError) {
      // Last-resort fallback to the @prisma/client package itself
      log.warn('[DB Init] Primary Prisma path failed, trying @prisma/client fallback...')
      try {
        PrismaClient = require('@prisma/client').PrismaClient
      } catch (customError) {
        log.error('[DB Init] ❌ Could not load PrismaClient from any location')
        throw new Error('Prisma client not found. Please ensure the app is properly packaged.')
      }
    }
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`
        }
      }
    })

    try {
      // Execute the migrations SQL to create schema
      // This reads from the migration files bundled with the app
      const migrationsPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'prisma', 'migrations')
      
      log.info('[DB Init] Looking for migrations in:', migrationsPath)
      
      if (fs.existsSync(migrationsPath)) {
        const migrationDirs = fs.readdirSync(migrationsPath).filter(f => 
          fs.statSync(path.join(migrationsPath, f)).isDirectory()
        ).sort()
        
        log.info(`[DB Init] Found ${migrationDirs.length} migrations to apply`)
        
        for (const migDir of migrationDirs) {
          const sqlFile = path.join(migrationsPath, migDir, 'migration.sql')
          if (fs.existsSync(sqlFile)) {
            const sql = fs.readFileSync(sqlFile, 'utf-8')
            log.info(`[DB Init] Applying migration: ${migDir}`)
            
            // Split SQL by statements and execute each
            const statements = sql.split(';').filter(s => s.trim())
            for (const statement of statements) {
              if (statement.trim()) {
                await prisma.$executeRawUnsafe(statement)
              }
            }
          }
        }
        
        log.info('[DB Init] ✅ Schema created successfully from migrations')
      } else {
        log.info('[DB Init] ⚠️ Migrations folder not found, attempting direct schema creation...')
        // Fallback: Create basic tables manually
        await createBasicSchema(prisma)
      }
      
      // Create default admin user
      await createDefaultAdminUser(prisma)
      
    } finally {
      await prisma.$disconnect()
    }
    
    log.info('[DB Init] 🎉 Database initialization complete!')
    
  } catch (error) {
    log.error('[DB Init] ❌ Failed to create database:', error)
    throw error
  }
}

/**
 * Create basic schema tables (fallback method)
 */
async function createBasicSchema(prisma: any): Promise<void> {
  log.info('[DB Init] Creating basic schema tables...')
  
  // Execute raw SQL to create essential tables
  const schema = `
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'sales',
      "fullName" TEXT,
      "email" TEXT UNIQUE,
      "phone" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "lastLogin" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
    CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
    CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
  `
  
  const statements = schema.split(';').filter(s => s.trim())
  for (const statement of statements) {
    if (statement.trim()) {
      await prisma.$executeRawUnsafe(statement)
    }
  }
  
  log.info('[DB Init] ✅ Basic schema created')
}

/**
 * Create default admin user for first-time setup
 */
async function createDefaultAdminUser(prisma: any): Promise<void> {
  try {
    const bcrypt = await import('bcryptjs')
    
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      log.info('[DB Init] Creating default setup user...')
      const passwordHash = await bcrypt.hash('setup123', 10)
      
      await prisma.user.create({
        data: {
          id: '00000000-0000-0000-0000-000000000000',
          username: 'setup',
          passwordHash,
          role: 'admin',
          fullName: 'Setup Administrator',
          email: 'setup@bizflow.local',
          isActive: true
        }
      })
      
      log.info('[DB Init] ✅ Default setup user created')
      log.info('[DB Init] 📝 Login: username="setup", password="setup123"')
      log.info('[DB Init] ⚠️  SECURITY: Change this password after first login!')
    }
  } catch (error) {
    log.error('[DB Init] ⚠️ Failed to create setup user:', error)
  }
}

/**
 * Resolve the correct Prisma client for the current environment.
 * In production the generated client is unpacked from asar; in dev it lives in the source tree.
 */
function loadPrismaClient(): any {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return require(path.join(process.cwd(), 'src', 'generated', 'prisma')).PrismaClient
  }
  // Production: electron-builder unpacks src/generated/prisma/** outside the asar.
  // __dirname at runtime = <install>/resources/app.asar/out/main
  // so three levels up lands at resources/, then into app.asar.unpacked/src/generated/prisma
  const prodPath = path.resolve(__dirname, '..', '..', '..', 'app.asar.unpacked', 'src', 'generated', 'prisma')
  log.info('[DB Init] Loading Prisma from:', prodPath)
  return require(prodPath).PrismaClient
}

/**
 * Verify the copied template DB and seed if no users are present.
 */
async function verifyAndSeedDatabaseAfterCopy(dbPath: string): Promise<void> {
  try {
    let PrismaClient: any
    try {
      PrismaClient = loadPrismaClient()
    } catch {
      PrismaClient = require('@prisma/client').PrismaClient
    }

    const runtimePrisma = new PrismaClient({
      datasources: {
        db: { url: `file:${dbPath}` }
      }
    })

    try {
      const userCount = await runtimePrisma.user.count()
      if (userCount === 0) {
        log.info('[DB Init] Template DB flagged with 0 users after copy, seeding default setup user...')
        await createDefaultAdminUser(runtimePrisma)
      } else {
        log.info(`[DB Init] Template DB has ${userCount} user(s) after copy`)
      }
    } catch (err: any) {
      log.warn('[DB Init] Could not verify copied template DB user count:', err?.message || err)
    } finally {
      try { await runtimePrisma.$disconnect() } catch {}
    }
  } catch (err: any) {
    log.warn('[DB Init] Prisma unavailable for post-copy DB verification:', err?.message || err)
  }
}

/**
 * Initialize development database with schema and default admin user
 */
async function initializeDevelopmentDatabase(dbPath: string): Promise<void> {
  try {
    // Ensure prisma directory exists
    const prismaDir = path.dirname(dbPath)
    if (!fs.existsSync(prismaDir)) {
      fs.mkdirSync(prismaDir, { recursive: true })
    }

    log.info('[DB Init] 🔧 Creating database schema...')
    log.info('[DB Init] ℹ️  This will run "prisma db push" - please wait...')
    
    // Run Prisma DB push to create schema (non-blocking)
    const { spawn } = require('node:child_process')
    
    // Use merged.prisma so plugin tables (bakery, etc.) are included
    const pushProcess = spawn('npx', ['prisma', 'db', 'push', '--schema=prisma/merged.prisma', '--accept-data-loss', '--skip-generate'], {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
    })

    // Wait for the push to complete
    await new Promise<void>((resolve, reject) => {
      let output = ''
      
      pushProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        output += text
        if (text.includes('Your database is now in sync')) {
          log.info('[DB Init] ✅ Schema created successfully')
        }
      })

      pushProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        // Prisma outputs info to stderr too, so don't treat all as errors
        if (!text.includes('Prisma schema loaded') && !text.includes('Datasource')) {
          log.error('[DB Init] Warning:', text)
        }
      })

      pushProcess.on('close', (code: number) => {
        if (code === 0 || output.includes('Your database is now in sync')) {
          resolve()
        } else {
          reject(new Error(`Prisma push failed with code ${code}`))
        }
      })

      pushProcess.on('error', reject)
    })

    // Now create the setup admin user
    log.info('[DB Init] Creating default setup admin user...')
    
    // Import Prisma and bcrypt dynamically
    const bcrypt = require('bcryptjs')
    const { PrismaClient } = require(path.join(process.cwd(), 'src', 'generated', 'prisma'))
    
    const setupPrisma = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}` } }
    })

    try {
      const existing = await setupPrisma.user.count()
      if (existing > 0) {
        log.info('[DB Init] ℹ️  Users already exist, skipping setup user creation')
      } else {
        const passwordHash = await bcrypt.hash('setup123', 10)
        await setupPrisma.user.create({
          data: {
            id: '00000000-0000-0000-0000-000000000000',
            username: 'setup',
            passwordHash: passwordHash,
            role: 'admin',
            fullName: 'Setup Administrator',
            email: 'setup@bizflow.local',
            isActive: true
          }
        })
        
        log.info('[DB Init] ✅ Created setup admin user')
        log.info('[DB Init] 📝 Login credentials:')
        log.info('[DB Init]    Username: setup')
        log.info('[DB Init]    Password: setup123')
        log.info('[DB Init] ⚠️  SECURITY: Change this password after first login!')
      }
    } finally {
      await setupPrisma.$disconnect()
    }

    log.info('[DB Init] 🎉 Database initialization complete!')
    
  } catch (error) {
    log.error('[DB Init] ❌ Failed to initialize database:', error)
    log.error('[DB Init] 💡 You can manually run: npm run prisma:push && npm run prisma:seed')
    throw error
  }
}
