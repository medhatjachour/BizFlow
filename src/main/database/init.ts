/**
 * Database initialization for production builds
 * Uses Electron's userData directory for proper cross-platform support
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { app } from 'electron'

/**
 * Get Prisma client with correct path for dev/production
 */
function getPrismaClient() {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    return require('@prisma/client').PrismaClient
  } else {
    // Production: load from resources (outside asar)
    const prismaClientPath = path.join(process.resourcesPath, 'node_modules', '@prisma', 'client')
    return require(prismaClientPath).PrismaClient
  }
}

/**
 * Initialize database file and directory structure
 * Creates empty database on first run in production
 */
export async function initializeDatabase(): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    console.log('[DB Init] Running in development mode, using project database')
    
    // Check if dev database exists and has tables
    const devDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
    if (!fs.existsSync(devDbPath) || fs.statSync(devDbPath).size < 1024) {
      console.log('[DB Init] 🔧 Dev database missing or empty, initializing...')
      await initializeDevelopmentDatabase(devDbPath)
    }
    
    return
  }

  // Production: Use Electron's userData directory (cross-platform)
  const appDataPath = app.getPath('userData')
  const dbPath = path.join(appDataPath, 'database.db')
  
  console.log('[DB Init] Production mode - App data directory:', appDataPath)
  console.log('[DB Init] Database path:', dbPath)
  
  try {
    // Ensure app data directory exists
    if (!fs.existsSync(appDataPath)) {
      console.log('[DB Init] Creating app data directory...')
      fs.mkdirSync(appDataPath, { recursive: true })
    }

    // Check if database already exists
    const isFirstRun = !fs.existsSync(dbPath)
    
    if (!isFirstRun) {
      console.log('[DB Init] Database already exists')
      return
    }

    console.log('[DB Init] 🎉 First run detected - Creating new database with schema...')
    
    // Copy the template.db from resources to initialize with schema (recommended)
    const templateDbPath = path.join(process.resourcesPath, 'prisma', 'template.db')
    
    console.log('[DB Init] Looking for template database at:', templateDbPath)

    if (fs.existsSync(templateDbPath)) {
      const templateSize = fs.statSync(templateDbPath).size
      console.log(`[DB Init] Found template database (${(templateSize / 1024).toFixed(2)} KB)`)
      console.log('[DB Init] Copying template database from resources...')
      fs.copyFileSync(templateDbPath, dbPath)
      
      const copiedSize = fs.statSync(dbPath).size
      console.log(`[DB Init] ✅ Database initialized from template (${(copiedSize / 1024).toFixed(2)} KB)`)
      console.log('[DB Init] Database contains schema and seed data')
    } else {
      // Fallback: create database with schema using Prisma migrations
      console.warn('[DB Init] ⚠️ Template database not found at:', templateDbPath)
      console.log('[DB Init] Attempting to create database with schema from migrations...')
      
      try {
        await createDatabaseWithSchema(dbPath)
        console.log('[DB Init] ✅ Database created successfully')
      } catch (error) {
        console.error('[DB Init] ❌ Failed to create database:', error)
        throw new Error(
          'Failed to initialize database. Template file is missing and migration failed. ' +
          'Please reinstall the application.'
        )
      }
    }
    
    console.log('[DB Init] ℹ️ Default setup user: username="setup", password="setup123"')
    
  } catch (error) {
    console.error('[DB Init] ❌ Error initializing database:', error)
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
    console.log('[DB Init] 🔧 Creating database with schema from migrations...')
    
    // Create empty database file
    fs.writeFileSync(dbPath, '')
    
    // Get Prisma client from correct location
    const PrismaClient = getPrismaClient()
    
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
      
      console.log('[DB Init] Looking for migrations in:', migrationsPath)
      
      if (fs.existsSync(migrationsPath)) {
        const migrationDirs = fs.readdirSync(migrationsPath).filter(f => 
          fs.statSync(path.join(migrationsPath, f)).isDirectory()
        ).sort()
        
        console.log(`[DB Init] Found ${migrationDirs.length} migrations to apply`)
        
        for (const migDir of migrationDirs) {
          const sqlFile = path.join(migrationsPath, migDir, 'migration.sql')
          if (fs.existsSync(sqlFile)) {
            const sql = fs.readFileSync(sqlFile, 'utf-8')
            console.log(`[DB Init] Applying migration: ${migDir}`)
            
            // Split SQL by statements and execute each
            const statements = sql.split(';').filter(s => s.trim())
            for (const statement of statements) {
              if (statement.trim()) {
                await prisma.$executeRawUnsafe(statement)
              }
            }
          }
        }
        
        console.log('[DB Init] ✅ Schema created successfully from migrations')
      } else {
        console.log('[DB Init] ⚠️ Migrations folder not found, attempting direct schema creation...')
        // Fallback: Create basic tables manually
        await createBasicSchema(prisma)
      }
      
      // Create default admin user
      await createDefaultAdminUser(prisma)
      
    } finally {
      await prisma.$disconnect()
    }
    
    console.log('[DB Init] 🎉 Database initialization complete!')
    
  } catch (error) {
    console.error('[DB Init] ❌ Failed to create database:', error)
    throw error
  }
}

/**
 * Create basic schema tables (fallback method)
 */
async function createBasicSchema(prisma: any): Promise<void> {
  console.log('[DB Init] Creating basic schema tables...')
  
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
  
  console.log('[DB Init] ✅ Basic schema created')
}

/**
 * Create default admin user for first-time setup
 */
async function createDefaultAdminUser(prisma: any): Promise<void> {
  try {
    const bcrypt = await import('bcryptjs')
    
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      console.log('[DB Init] Creating default setup user...')
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
      
      console.log('[DB Init] ✅ Default setup user created')
      console.log('[DB Init] 📝 Login: username="setup", password="setup123"')
      console.log('[DB Init] ⚠️  SECURITY: Change this password after first login!')
    }
  } catch (error) {
    console.error('[DB Init] ⚠️ Failed to create setup user:', error)
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

    console.log('[DB Init] 🔧 Creating database schema...')
    console.log('[DB Init] ℹ️  This will run "prisma db push" - please wait...')
    
    // Run Prisma DB push to create schema (non-blocking)
    const { spawn } = require('node:child_process')
    
    const pushProcess = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate'], {
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
          console.log('[DB Init] ✅ Schema created successfully')
        }
      })

      pushProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        // Prisma outputs info to stderr too, so don't treat all as errors
        if (!text.includes('Prisma schema loaded') && !text.includes('Datasource')) {
          console.error('[DB Init] Warning:', text)
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
    console.log('[DB Init] Creating default setup admin user...')
    
    // Import Prisma and bcrypt dynamically
    const bcrypt = require('bcryptjs')
    const PrismaClient = getPrismaClient()
    
    const setupPrisma = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}` } }
    })

    try {
      const existing = await setupPrisma.user.count()
      if (existing > 0) {
        console.log('[DB Init] ℹ️  Users already exist, skipping setup user creation')
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
        
        console.log('[DB Init] ✅ Created setup admin user')
        console.log('[DB Init] 📝 Login credentials:')
        console.log('[DB Init]    Username: setup')
        console.log('[DB Init]    Password: setup123')
        console.log('[DB Init] ⚠️  SECURITY: Change this password after first login!')
      }
    } finally {
      await setupPrisma.$disconnect()
    }

    console.log('[DB Init] 🎉 Database initialization complete!')
    
  } catch (error) {
    console.error('[DB Init] ❌ Failed to initialize database:', error)
    console.error('[DB Init] 💡 You can manually run: npm run prisma:push && npm run prisma:seed')
    throw error
  }
}
