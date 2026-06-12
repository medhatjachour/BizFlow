/**
 * Production Database Seeding
 * Creates default admin user and essential data on first run
 */

import bcrypt from 'bcryptjs'
import { createLogger } from '../utils/logger'

const log = createLogger('DBSeed')

/**
 * Seed database with minimal essential data for first-run
 * This is automatically called when the database is empty
 */
export async function seedProductionDatabase(prisma: any): Promise<void> {
  log.info('[DB Seed] 🌱 Starting first-run database seeding (minimal)...')

  try {
    // Check if database is already seeded
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      log.info('[DB Seed] ℹ️ Database already seeded, skipping...')
      return
    }

    log.info('[DB Seed] Creating default setup admin user (minimal seed)...')

    // Create default setup admin user only (temporary - should be deleted after creating real admin)
    const adminUser = await prisma.user.create({
      data: {
        username: 'setup',
        passwordHash: await bcrypt.hash('setup123', 10),
        role: 'admin',
        fullName: 'Setup Administrator',
        email: 'setup@bizflow.local',
        isActive: true
      }
    })

    log.info('[DB Seed] ✅ Created default setup admin user:', adminUser.username)
    log.info('[DB Seed] 🎉 Minimal first-run seeding completed!')
    log.info('[DB Seed] 📝 Login with username: "setup", password: "setup123"')
    log.info('[DB Seed] ⚠️  IMPORTANT: Use this account ONLY to create your permanent admin, then delete it!')

  } catch (error) {
    log.error('[DB Seed] ❌ Error seeding database:', error)
    throw error
  }
}
