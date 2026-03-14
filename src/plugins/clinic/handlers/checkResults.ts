import { ipcMain, dialog, shell, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('ClinicCheckResults')

function getCheckResultsDir(): string {
  const isDev = process.env.NODE_ENV === 'development'
  const base = isDev
    ? path.resolve(process.cwd(), 'prisma', 'clinic-results')
    : path.join(app.getPath('userData'), 'clinic-results')
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true })
  return base
}

export function registerCheckResultHandlers(prisma: any) {
  // ─── Get check results for a patient ─────────────────────────────────
  ipcMain.handle('clinic:checkResults:getByPatient', async (_e, patientId: string) => {
    return prisma.clinicCheckResult.findMany({
      where: { patientId },
      orderBy: { resultDate: 'desc' }
    })
  })

  // ─── Upload a PDF (copies to app storage, creates DB record) ─────────
  ipcMain.handle('clinic:checkResults:upload', async (_e, data: {
    patientId: string
    title: string
    description?: string
    resultDate?: string
  }) => {
    // Open file picker for PDFs
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Check Result (PDF)',
      filters: [
        { name: 'PDF Documents', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) return null

    const srcPath = filePaths[0]
    const originalName = path.basename(srcPath)
    const ext = path.extname(originalName)
    const timestamp = Date.now()
    const destName = `${data.patientId}_${timestamp}${ext}`
    const destDir = path.join(getCheckResultsDir(), data.patientId)
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
    const destPath = path.join(destDir, destName)

    try {
      fs.copyFileSync(srcPath, destPath)
      const stats = fs.statSync(destPath)

      return prisma.clinicCheckResult.create({
        data: {
          patientId: data.patientId,
          title: data.title,
          description: data.description ?? null,
          fileName: originalName,
          filePath: destPath,
          fileSize: stats.size,
          resultDate: data.resultDate ? new Date(data.resultDate) : new Date()
        }
      })
    } catch (err) {
      log.error('Failed to copy check result file:', err)
      throw new Error('Failed to save file')
    }
  })

  // ─── Stream a check result file as base64 (for in-app PDF viewer) ────
  ipcMain.handle('clinic:checkResults:getBuffer', async (_e, filePath: string) => {
    // Validate path is strictly inside the expected results directory
    const baseDir = path.resolve(getCheckResultsDir())
    const resolved = path.resolve(filePath)
    const rel = path.relative(baseDir, resolved)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('Access denied: file is outside results directory')
    }
    if (!fs.existsSync(resolved)) return null
    return fs.readFileSync(resolved).toString('base64')
  })

  // ─── Open/View a check result file in system app (accepts DB record id) ────
  ipcMain.handle('clinic:checkResults:open', async (_e, id: string) => {
    const record = await prisma.clinicCheckResult.findUnique({ where: { id } })
    if (!record?.filePath) throw new Error('Check result not found')
    const baseDir = path.resolve(getCheckResultsDir())
    const resolved = path.resolve(record.filePath)
    const rel = path.relative(baseDir, resolved)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('Access denied: file is outside results directory')
    }
    if (!fs.existsSync(resolved)) throw new Error('File not found')
    await shell.openPath(resolved)
    return true
  })

  // ─── Delete a check result ─────────────────────────────────────────
  ipcMain.handle('clinic:checkResults:delete', async (_e, id: string) => {
    const result = await prisma.clinicCheckResult.findUnique({ where: { id } })
    if (!result) return false

    // Remove physical file if it exists
    try {
      if (result.filePath && fs.existsSync(result.filePath)) {
        fs.unlinkSync(result.filePath)
      }
    } catch (err) {
      log.warn('Could not delete file from disk:', err)
    }

    await prisma.clinicCheckResult.delete({ where: { id } })
    return true
  })
}
