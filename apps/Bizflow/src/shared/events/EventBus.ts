import logger from '../utils/logger'

/**
 * Event Bus
 * 
 * Publish-subscribe event system for decoupled component communication
 * Enables event-driven architecture patterns
 */

/**
 * Event handler function type
 */
type EventHandler<T = unknown> = (data: T) => void | Promise<void>

/**
 * Event subscription
 */
interface EventSubscription {
  unsubscribe: () => void
}

/**
 * Event types registry
 */
export interface EventTypes {
  // Product events
  'product:created': { productId: string; sku: string }
  'product:updated': { productId: string; changes: Record<string, unknown> }
  'product:deleted': { productId: string; sku: string }
  
  // Stock events
  'stock:updated': { variantId: string; oldStock: number; newStock: number }
  'stock:low': { productId: string; variantId: string; stock: number }
  'stock:out': { productId: string; variantId: string }
  
  // Sale events
  'sale:created': { saleId: string; total: number }
  'sale:completed': { saleId: string; total: number; items: number }
  'sale:cancelled': { saleId: string; reason?: string }
  
  // Customer events
  'customer:created': { customerId: string; email: string }
  'customer:updated': { customerId: string; changes: Record<string, unknown> }
  
  // Supplier events
  'supplier:created': { supplierId: string; name: string }
  'supplier:updated': { supplierId: string; name: string }
  'supplier:deleted': { supplierId: string; name: string }
  'supplier:product-added': { supplierId: string; productId: string }
  'supplier:product-updated': { supplierId: string; productId: string }
  'supplier:product-removed': { supplierProductId: string }
  
  // System events
  'system:error': { error: Error; context?: Record<string, unknown> }
  'system:warning': { message: string; context?: Record<string, unknown> }
}

/**
 * Event Bus for publish-subscribe pattern
 */
export class EventBus {
  private static instance: EventBus
  private handlers: Map<keyof EventTypes, Set<EventHandler>>
  private wildcardHandlers: Set<EventHandler<{ event: keyof EventTypes; data: unknown }>>

  private constructor() {
    this.handlers = new Map()
    this.wildcardHandlers = new Set()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * Subscribe to event
   */
  on<K extends keyof EventTypes>(
    event: K,
    handler: EventHandler<EventTypes[K]>
  ): EventSubscription {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    
    const eventHandlers = this.handlers.get(event)!
    eventHandlers.add(handler as EventHandler)

    return {
      unsubscribe: () => {
        eventHandlers.delete(handler as EventHandler)
        if (eventHandlers.size === 0) {
          this.handlers.delete(event)
        }
      }
    }
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAny(handler: EventHandler<{ event: keyof EventTypes; data: unknown }>): EventSubscription {
    this.wildcardHandlers.add(handler)

    return {
      unsubscribe: () => {
        this.wildcardHandlers.delete(handler)
      }
    }
  }

  /**
   * Subscribe once (auto-unsubscribe after first call)
   */
  once<K extends keyof EventTypes>(
    event: K,
    handler: EventHandler<EventTypes[K]>
  ): EventSubscription {
    let subscription: EventSubscription

    const wrappedHandler = async (data: EventTypes[K]) => {
      subscription.unsubscribe()
      await handler(data)
    }

    subscription = this.on(event, wrappedHandler)
    return subscription
  }

  /**
   * Publish event
   */
  async emit<K extends keyof EventTypes>(event: K, data: EventTypes[K]): Promise<void> {
    // Call event-specific handlers
    const eventHandlers = this.handlers.get(event)
    if (eventHandlers) {
      const promises = Array.from(eventHandlers).map(handler =>
        Promise.resolve(handler(data)).catch(error => {
          logger.error(`Error in handler for event "${String(event)}":`, error)
        })
      )
      await Promise.all(promises)
    }

    // Call wildcard handlers
    if (this.wildcardHandlers.size > 0) {
      const promises = Array.from(this.wildcardHandlers).map(handler =>
        Promise.resolve(handler({ event, data })).catch(error => {
          logger.error(`Error in wildcard handler for event "${String(event)}":`, error)
        })
      )
      await Promise.all(promises)
    }
  }

  /**
   * Publish event synchronously (fire and forget)
   */
  emitSync<K extends keyof EventTypes>(event: K, data: EventTypes[K]): void {
    // Call event-specific handlers
    const eventHandlers = this.handlers.get(event)
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          logger.error(`Error in handler for event "${String(event)}":`, error)
        }
      })
    }

    // Call wildcard handlers
    this.wildcardHandlers.forEach(handler => {
      try {
        handler({ event, data })
      } catch (error) {
        logger.error(`Error in wildcard handler for event "${String(event)}":`, error)
      }
    })
  }

  /**
   * Remove all handlers for event
   */
  off<K extends keyof EventTypes>(event: K): void {
    this.handlers.delete(event)
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear()
    this.wildcardHandlers.clear()
  }

  /**
   * Get number of handlers for event
   */
  listenerCount<K extends keyof EventTypes>(event: K): number {
    return this.handlers.get(event)?.size || 0
  }

  /**
   * Get all event names with handlers
   */
  eventNames(): Array<keyof EventTypes> {
    return Array.from(this.handlers.keys())
  }
}

/**
 * Export singleton instance
 */
export const eventBus = EventBus.getInstance()
