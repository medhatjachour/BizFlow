import { ipcMain } from 'electron'
import { app } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import path from 'node:path'
import fs from 'node:fs'

const log = createLogger('Vet:CheckResults')

function getResultsDir(): string {
  const dir = path.join(app.getPath('userData'), 'vet-results')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function registerVetCheckResultHandlers(prisma: any) {
  // ─── Get All Results for a Patient ───────────────────────────────────────
  ipcMain.handle('vet:checkResults:getAll', async (_e, params?: {
    patientId?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.patientId) where.patientId = params.patientId

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetCheckResult.count({ where })
      const data  = await prisma.vetCheckResult.findMany({
        where,
        orderBy: { resultDate: 'desc' },
        skip,
        take
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Save (upload) file ───────────────────────────────────────────────────
  ipcMain.handle('vet:checkResults:create', async (_e, params: {
    patientId: string; title: string; description?: string; resultDate?: string
    fileName: string; buffer: number[]; mimeType?: string
  }) => {
    try {
      const { patientId, title, description, resultDate, fileName, buffer } = params
      const dir  = path.join(getResultsDir(), patientId)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      // Sanitise filename to prevent path traversal
      const safeName  = path.basename(fileName).replace(/[^a-zA-Z0-9._\-]/g, '_')
      const destName  = `${Date.now()}_${safeName}`
      const destPath  = path.join(dir, destName)

      fs.writeFileSync(destPath, Buffer.from(buffer))

      return await prisma.vetCheckResult.create({
        data: {
          patientId,
          title,
          description,
          fileName: safeName,
          filePath: destPath,
          fileSize: buffer.length,
          resultDate: resultDate ? new Date(resultDate) : new Date()
        }
      })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:checkResults:delete', async (_e, id: string) => {
    try {
      const record = await prisma.vetCheckResult.findUnique({ where: { id } })
      if (!record) throw new Error('Result not found')

      // Remove the file from disk if it exists
      if (record.filePath && fs.existsSync(record.filePath)) {
        fs.unlinkSync(record.filePath)
      }

      return await prisma.vetCheckResult.delete({ where: { id } })
    } catch (err) { log.error('delete', err); throw err }
  })

  // ─── Open file with system viewer ────────────────────────────────────────
  ipcMain.handle('vet:checkResults:openFile', async (_e, id: string) => {
    try {
      const record = await prisma.vetCheckResult.findUnique({ where: { id }, select: { filePath: true } })
      if (!record?.filePath) throw new Error('File not found')
      const { shell } = await import('electron')
      await shell.openPath(record.filePath)
      return true
    } catch (err) { log.error('openFile', err); throw err }
  })
}
