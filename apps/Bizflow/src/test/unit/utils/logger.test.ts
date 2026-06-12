import { describe, it, expect } from 'vitest'
import { logger } from '../../../shared/utils/logger'

describe('logger', () => {
  it('should export logger object with expected methods', () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.success).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.trace).toBe('function')
  })

  it('should not throw when calling logger methods', () => {
    expect(() => logger.info('test')).not.toThrow()
    expect(() => logger.success('test')).not.toThrow()
    expect(() => logger.error('test')).not.toThrow()
    expect(() => logger.warn('test')).not.toThrow()
    expect(() => logger.debug('test')).not.toThrow()
    expect(() => logger.trace('test')).not.toThrow()
  })
})