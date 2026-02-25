/**
 * ImageService - Handles image file storage for the application
 * Saves images to filesystem instead of database for better performance
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { app } from 'electron'
import { createLogger } from '../utils/logger'

const log = createLogger('Image')

export class ImageService {
  private imagesDir: string

  constructor() {
    // Determine images directory based on environment
    const isDev = process.env.NODE_ENV === 'development'
    
    if (isDev) {
      // Development: Save in project/prisma/images/
      this.imagesDir = path.resolve(process.cwd(), 'prisma', 'images')
    } else {
      // Production: Save next to database in userData
      const dbDir = path.dirname(path.join(app.getPath('userData'), 'database.db'))
      this.imagesDir = path.join(dbDir, 'images')
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true })
    } 
  }

  /**
   * Save a Base64 image to filesystem
   * @param base64Data - Base64 encoded image (with or without data URI prefix)
   * @param originalName - Optional original filename for extension detection
   * @returns Filename of saved image
   */
  async saveImage(base64Data: string, originalName?: string): Promise<string> {
    try {
      // Extract base64 content and determine file type
      let base64Content: string
      let mimeType: string

      if (base64Data.startsWith('data:')) {
        // Extract from data URI: data:image/jpeg;base64,/9j/4AAQ...
        const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) {
          throw new Error('Invalid data URI format')
        }
        mimeType = matches[1]
        base64Content = matches[2]
      } else {
        // Plain base64, detect from original name or default to jpeg
        base64Content = base64Data
        mimeType = this.getMimeTypeFromName(originalName) || 'image/jpeg'
      }

      // Get file extension
      const extension = this.getExtensionFromMime(mimeType)

      // Generate unique filename using hash
      const hash = crypto.createHash('md5').update(base64Content).digest('hex')
      const filename = `${hash}${extension}`
      const filePath = path.join(this.imagesDir, filename)

      // Check if file already exists (deduplication)
      if (fs.existsSync(filePath)) {
        return filename
      }

      // Convert base64 to buffer and save
      const buffer = Buffer.from(base64Content, 'base64')
      fs.writeFileSync(filePath, buffer)

      return filename
    } catch (error) {
      log.error('[ImageService] Failed to save image:', error)
      throw new Error('Failed to save image')
    }
  }

  /**
   * Get image as Base64 data URL for display
   * @param filename - Image filename
   * @returns Base64 data URL
   */
  async getImageDataUrl(filename: string): Promise<string | null> {
    try {
      const filePath = path.join(this.imagesDir, filename)

      if (!fs.existsSync(filePath)) {
        log.warn(`[ImageService] Image not found: ${filename}`)
        return null
      }

      // Read file and convert to base64
      const buffer = fs.readFileSync(filePath)
      const base64 = buffer.toString('base64')

      // Determine mime type from extension
      const ext = path.extname(filename).toLowerCase()
      const mimeType = this.getMimeTypeFromExtension(ext)

      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      log.error(`[ImageService] Failed to read image ${filename}:`, error)
      return null
    }
  }

  /**
   * Check if image file exists
   * @param filename - Image filename
   * @returns True if exists
   */
  imageExists(filename: string): boolean {
    const filePath = path.join(this.imagesDir, filename)
    return fs.existsSync(filePath)
  }

  /**
   * Delete image file
   * @param filename - Image filename
   */
  async deleteImage(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.imagesDir, filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
      log.error(`[ImageService] Failed to delete image ${filename}:`, error)
      throw error
    }
  }

  /**
   * Clean up orphaned images (not referenced in database)
   * @param referencedFilenames - Array of filenames currently in database
   * @returns Number of deleted files
   */
  async cleanupOrphanedImages(referencedFilenames: string[]): Promise<number> {
    try {
      const files = fs.readdirSync(this.imagesDir)
      const referencedSet = new Set(referencedFilenames)
      let deletedCount = 0

      for (const file of files) {
        if (!referencedSet.has(file)) {
          const filePath = path.join(this.imagesDir, file)
          fs.unlinkSync(filePath)
          deletedCount++
        }
      }

      return deletedCount
    } catch (error) {
      log.error('[ImageService] Cleanup failed:', error)
      throw error
    }
  }

  /**
   * Get total disk usage of images directory
   * @returns Size in bytes
   */
  getImagesDiskUsage(): number {
    try {
      const files = fs.readdirSync(this.imagesDir)
      let totalSize = 0

      for (const file of files) {
        const filePath = path.join(this.imagesDir, file)
        const stats = fs.statSync(filePath)
        totalSize += stats.size
      }

      return totalSize
    } catch (error) {
      log.error('[ImageService] Failed to get disk usage:', error)
      return 0
    }
  }

  /**
   * Get images directory path (for debugging)
   */
  getImagesDirectory(): string {
    return this.imagesDir
  }

  // Helper methods
  private getMimeTypeFromName(filename?: string): string | null {
    if (!filename) return null
    const ext = path.extname(filename).toLowerCase()
    return this.getMimeTypeFromExtension(ext)
  }

  private getMimeTypeFromExtension(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp'
    }
    return mimeTypes[ext] || 'image/jpeg'
  }

  private getExtensionFromMime(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp'
    }
    return extensions[mimeType] || '.jpg'
  }
}

// Singleton instance
let imageServiceInstance: ImageService | null = null

export function getImageService(): ImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new ImageService()
  }
  return imageServiceInstance
}
