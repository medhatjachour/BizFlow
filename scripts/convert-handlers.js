#!/usr/bin/env node

/**
 * Script to convert Prisma-based IPC handlers to better-sqlite3
 * Automatically converts common patterns
 */

const fs = require('fs');
const path = require('path');

const handlersDir = path.join(__dirname, '../src/main/ipc/handlers');
const files = fs.readdirSync(handlersDir).filter(f => f.endsWith('.handlers.ts') && !f.includes('.sqlite.'));

console.log(`Found ${files.length} handler files to convert\n`);

const conversionPatterns = [
  // Update function signature
  {
    from: /export function register(\w+)Handlers\(prisma: any\)/g,
    to: 'export function register$1Handlers()'
  },
  // Add db import
  {
    from: /(import { ipcMain } from 'electron')/g,
    to: "$1\nimport { db } from '../../database/sqlite'"
  },
  // Remove prisma checks
  {
    from: /if \(!?prisma\) \{[^}]+\}\s*/g,
    to: ''
  },
  {
    from: /if \(prisma\) \{/g,
    to: '{'
  },
  // Convert findMany
  {
    from: /await prisma\.(\w+)\.findMany\(\{[^}]*orderBy: \{ (\w+): '(\w+)' \}[^}]*\}\)/g,
    to: "db.query('SELECT * FROM $1 ORDER BY $2 $3')"
  },
  {
    from: /await prisma\.(\w+)\.findMany\(\)/g,
    to: "db.query('SELECT * FROM $1')"
  },
  // Convert findUnique
  {
    from: /await prisma\.(\w+)\.findUnique\(\{ where: \{ id \} \}\)/g,
    to: "db.queryOne('SELECT * FROM $1 WHERE id = ?', [id])"
  },
  {
    from: /await prisma\.(\w+)\.findUnique\(\{ where: \{ id: (\w+) \} \}\)/g,
    to: "db.queryOne('SELECT * FROM $1 WHERE id = ?', [$2])"
  },
  // Convert count
  {
    from: /await prisma\.(\w+)\.count\(\{ where: \{ (\w+): (\w+) \} \}\)/g,
    to: "db.count('$1', '$2 = ?', [$3])"
  },
  {
    from: /await prisma\.(\w+)\.count\(\)/g,
    to: "db.count('$1')"
  },
  // Convert delete
  {
    from: /await prisma\.(\w+)\.delete\(\{ where: \{ id \} \}\)/g,
    to: "db.execute('DELETE FROM $1 WHERE id = ?', [id])"
  },
  {
    from: /await prisma\.(\w+)\.delete\(\{ where: \{ id: (\w+) \} \}\)/g,
    to: "db.execute('DELETE FROM $1 WHERE id = ?', [$2])"
  },
];

files.forEach(file => {
  const filePath = path.join(handlersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already converted (has 'better-sqlite3' in header)
  if (content.includes('better-sqlite3')) {
    console.log(`✓ ${file} - Already converted`);
    return;
  }
  
  let modified = false;
  
  // Apply all conversion patterns
  conversionPatterns.forEach(pattern => {
    const before = content;
    content = content.replace(pattern.from, pattern.to);
    if (before !== content) modified = true;
  });
  
  if (modified) {
    // Add comment about conversion
    content = content.replace(
      /\/\*\*\s*\n\s*\* (\w+) IPC Handlers/,
      '/**\n * $1 IPC Handlers - better-sqlite3 Version\n * Converted from Prisma for better performance'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${file} - Converted`);
  } else {
    console.log(`○ ${file} - No changes`);
  }
});

console.log('\nConversion complete!');
console.log('Note: Complex handlers may need manual review and adjustment.');
