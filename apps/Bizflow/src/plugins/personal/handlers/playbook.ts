// ─── Personal Work: Client communication playbook & scratchpad ───────────────
// Canned scripts (one-click copy with placeholder fill-in) for the awkward
// money/late-work conversations, plus the per-project scratchpad & notes.
//
// IPC channels:
//   personal:playbook:getScripts / getById / create / update / delete / render
//   personal:playbook:getCategories / seedDefaults
//   personal:notes:getAll / getById / create / update / delete / togglePin
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { num, parseJsonArray } from './utils'
import { SCRIPT_CATEGORIES, DEFAULT_SCRIPTS } from './templates'

const log = createLogger('Personal:Playbook')

export function registerPlaybookHandlers(prisma: any) {
  // ── Scripts ──────────────────────────────────────────────────────────────
  ipcMain.handle('personal:playbook:getScripts', async (_e, opts?: {
    category?: string; language?: string; search?: string
  }) => {
    try {
      const where: any = {}
      if (opts?.category) where.category = opts.category
      if (opts?.language) where.language = opts.language
      if (opts?.search) {
        where.OR = [{ title: { contains: opts.search } }, { body: { contains: opts.search } }]
      }
      const scripts = await prisma.personalScript.findMany({
        where,
        orderBy: [{ category: 'asc' }, { level: 'asc' }, { title: 'asc' }]
      })
      return scripts.map((s: any) => ({
        ...s,
        placeholderKeys: parseJsonArray<string>(s.placeholderKeys)
      }))
    } catch (err) { log.error('playbook:getScripts', err); throw err }
  })

  ipcMain.handle('personal:playbook:getById', async (_e, id: string) => {
    try {
      const script = await prisma.personalScript.findUnique({ where: { id } })
      if (!script) return null
      return { ...script, placeholderKeys: parseJsonArray<string>(script.placeholderKeys) }
    } catch (err) { log.error('playbook:getById', err); throw err }
  })

  ipcMain.handle('personal:playbook:create', async (_e, data: any) => {
    try {
      const body = String(data?.body ?? '')
      return await prisma.personalScript.create({
        data: {
          title: String(data?.title ?? '').trim(),
          category: data?.category || 'general',
          tone: data?.tone || 'polite',
          level: Math.round(num(data?.level, 1)),
          body,
          placeholderKeys: JSON.stringify(extractPlaceholders(body)),
          language: data?.language || 'en',
          isBuiltIn: false
        }
      })
    } catch (err) { log.error('playbook:create', err); throw err }
  })

  ipcMain.handle('personal:playbook:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('body' in patch) patch.placeholderKeys = JSON.stringify(extractPlaceholders(String(patch.body ?? '')))
      if ('level' in patch) patch.level = Math.round(num(patch.level, 1))
      return await prisma.personalScript.update({ where: { id }, data: patch })
    } catch (err) { log.error('playbook:update', err); throw err }
  })

  ipcMain.handle('personal:playbook:delete', async (_e, id: string) => {
    try {
      const script = await prisma.personalScript.findUnique({ where: { id } })
      if (script?.isBuiltIn) throw new Error('Built-in scripts cannot be deleted — edit or duplicate them instead')
      return await prisma.personalScript.delete({ where: { id } })
    } catch (err) { log.error('playbook:delete', err); throw err }
  })

  /** Fills `{placeholders}`, bumps the usage counter and returns the final text. */
  ipcMain.handle('personal:playbook:render', async (_e, data: { id: string; values?: Record<string, string> }) => {
    try {
      const script = await prisma.personalScript.findUnique({ where: { id: data?.id } })
      if (!script) throw new Error('Script not found')

      const values = data?.values ?? {}
      let text = script.body
      const missing: string[] = []
      for (const key of parseJsonArray<string>(script.placeholderKeys)) {
        const replacement = values[key]
        if (replacement === undefined || replacement === '') {
          if (!missing.includes(key)) missing.push(key)
          continue
        }
        text = text.split(`{${key}}`).join(replacement)
      }

      await prisma.personalScript.update({
        where: { id: script.id },
        data: { usageCount: num(script.usageCount) + 1, lastUsedAt: new Date() }
      })
      return { text, missing, title: script.title, category: script.category }
    } catch (err) { log.error('playbook:render', err); throw err }
  })

  ipcMain.handle('personal:playbook:getCategories', async () => {
    try {
      const scripts = await prisma.personalScript.findMany({ select: { category: true, language: true, usageCount: true } })
      return SCRIPT_CATEGORIES.map((category) => ({
        ...category,
        count: scripts.filter((s: any) => s.category === category.id).length,
        usageCount: scripts
          .filter((s: any) => s.category === category.id)
          .reduce((sum: number, s: any) => sum + num(s.usageCount), 0)
      }))
    } catch (err) { log.error('playbook:getCategories', err); throw err }
  })

  /** Idempotent: seeds the shipped playbook without duplicating user edits. */
  ipcMain.handle('personal:playbook:seedDefaults', async (_e, opts?: { force?: boolean }) => {
    try {
      const existing = await prisma.personalScript.findMany({ select: { title: true, language: true } })
      const known = new Set(existing.map((s: any) => `${s.title}::${s.language}`))
      let created = 0
      for (const script of DEFAULT_SCRIPTS) {
        if (!opts?.force && known.has(`${script.title}::${script.language}`)) continue
        await prisma.personalScript.create({
          data: {
            title: script.title,
            category: script.category,
            tone: script.tone,
            level: script.level,
            body: script.body,
            placeholderKeys: JSON.stringify(extractPlaceholders(script.body)),
            language: script.language,
            isBuiltIn: true
          }
        })
        created += 1
      }
      return { created, total: DEFAULT_SCRIPTS.length }
    } catch (err) { log.error('playbook:seedDefaults', err); throw err }
  })

  // ── Scratchpad & notes ───────────────────────────────────────────────────
  ipcMain.handle('personal:notes:getAll', async (_e, opts?: {
    projectId?: string; clientId?: string; kind?: string; search?: string; pinnedOnly?: boolean
  }) => {
    try {
      const where: any = {}
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.clientId) where.clientId = opts.clientId
      if (opts?.kind) where.kind = opts.kind
      if (opts?.pinnedOnly) where.isPinned = true
      if (opts?.search) {
        where.OR = [{ title: { contains: opts.search } }, { content: { contains: opts.search } }, { tags: { contains: opts.search } }]
      }
      return await prisma.personalNote.findMany({
        where,
        include: {
          project: { select: { id: true, code: true, title: true } },
          client: { select: { id: true, name: true } }
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }]
      })
    } catch (err) { log.error('notes:getAll', err); throw err }
  })

  ipcMain.handle('personal:notes:getById', async (_e, id: string) => {
    try {
      return await prisma.personalNote.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, code: true, title: true } },
          client: { select: { id: true, name: true } }
        }
      })
    } catch (err) { log.error('notes:getById', err); throw err }
  })

  ipcMain.handle('personal:notes:create', async (_e, data: any) => {
    try {
      return await prisma.personalNote.create({
        data: {
          projectId: data?.projectId || null,
          clientId: data?.clientId || null,
          title: String(data?.title ?? '').trim(),
          content: data?.content ?? '',
          kind: data?.kind || 'note',
          isPinned: data?.isPinned ?? false,
          tags: data?.tags || null
        },
        include: {
          project: { select: { id: true, code: true, title: true } },
          client: { select: { id: true, name: true } }
        }
      })
    } catch (err) { log.error('notes:create', err); throw err }
  })

  ipcMain.handle('personal:notes:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      return await prisma.personalNote.update({
        where: { id },
        data: rest,
        include: {
          project: { select: { id: true, code: true, title: true } },
          client: { select: { id: true, name: true } }
        }
      })
    } catch (err) { log.error('notes:update', err); throw err }
  })

  ipcMain.handle('personal:notes:delete', async (_e, id: string) => {
    try {
      return await prisma.personalNote.delete({ where: { id } })
    } catch (err) { log.error('notes:delete', err); throw err }
  })

  ipcMain.handle('personal:notes:togglePin', async (_e, id: string) => {
    try {
      const note = await prisma.personalNote.findUnique({ where: { id } })
      if (!note) throw new Error('Note not found')
      return await prisma.personalNote.update({ where: { id }, data: { isPinned: !note.isPinned } })
    } catch (err) { log.error('notes:togglePin', err); throw err }
  })
}

function extractPlaceholders(body: string): string[] {
  const found = new Set<string>()
  const regex = /\{([a-zA-Z0-9_]+)\}/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) found.add(match[1])
  return Array.from(found)
}
