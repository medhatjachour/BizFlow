/**
 * Base Repository Interface
 * 
 * Defines common CRUD operations for all repositories
 * Provides abstraction layer over data access
 */

export interface IRepository<T, ID = string> {
  /**
   * Find entity by ID
   */
  findById(id: ID): Promise<T | null>
  
  /**
   * Find all entities
   */
  findAll(options?: FindOptions): Promise<T[]>
  
  /**
   * Create new entity
   */
  create(data: Partial<T>): Promise<T>
  
  /**
   * Update existing entity
   */
  update(id: ID, data: Partial<T>): Promise<T>
  
  /**
   * Delete entity
   */
  delete(id: ID): Promise<boolean>
  
  /**
   * Count entities matching criteria
   */
  count(options?: FindOptions): Promise<number>
  
  /**
   * Check if entity exists
   */
  exists(id: ID): Promise<boolean>
}

/**
 * Query options for find operations
 */
export interface FindOptions {
  /**
   * Filter criteria
   */
  where?: Record<string, unknown>
  
  /**
   * Include related entities
   */
  include?: Record<string, boolean | object>
  
  /**
   * Order by fields
   */
  orderBy?: Record<string, 'asc' | 'desc'>
  
  /**
   * Number of records to skip (for pagination)
   */
  skip?: number
  
  /**
   * Maximum number of records to return
   */
  take?: number
  
  /**
   * Select specific fields
   */
  select?: Record<string, boolean>
}

/**
 * Pagination result wrapper
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * Repository error types
 */
export class RepositoryError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID ${id} not found`, 'ENTITY_NOT_FOUND')
    this.name = 'EntityNotFoundError'
  }
}

export class DuplicateEntityError extends RepositoryError {
  constructor(entityName: string, field: string, value: unknown) {
    super(`${entityName} with ${field}=${value} already exists`, 'DUPLICATE_ENTITY')
    this.name = 'DuplicateEntityError'
  }
}
