#!/usr/bin/env node
/**
 * Create default setup user for first-time setup
 * Usage: node scripts/create-setup-user.js
 */

const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')
const crypto = require('crypto')

const dbPath = path.join(__dirname, '..', 'bizflow.db')

console.log('[Setup] Creating default admin user...')
console.log('[Setup] Database:', dbPath)

try {
  const db = new Database(dbPath)
  
  // Check if user already exists
  const existing = db.prepare('SELECT COUNT(*) as count FROM User WHERE username = ?').get('setup')
  
  if (existing.count > 0) {
    console.log('[Setup] ✅ Setup user already exists')
    process.exit(0)
  }
  
  // Create password hash
  const passwordHash = bcrypt.hashSync('setup123', 10)
  const userId = crypto.randomUUID()
  
  // Insert setup user
  db.prepare(`
    INSERT INTO User (id, username, passwordHash, role, fullName, email, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    'setup',
    passwordHash,
    'admin',
    'Setup Administrator',
    'setup@bizflow.local',
    1,
    new Date().toISOString(),
    new Date().toISOString()
  )
  
  db.close()
  
  console.log('[Setup] ✅ Default setup user created')
  console.log('[Setup] 📝 Login credentials:')
  console.log('[Setup]    Username: setup')
  console.log('[Setup]    Password: setup123')
  console.log('[Setup] ⚠️  SECURITY: Change this password after first login!')
  
} catch (error) {
  console.error('[Setup] ❌ Failed to create setup user:', error)
  process.exit(1)
}
