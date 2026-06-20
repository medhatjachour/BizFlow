import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('SaleTransactions')

/**
 * Sale Transaction Handlers
 * Handles creating transactions with multiple items
 */

export function registerSaleTransactionHandlers(prisma: any) {
  /**
   * Create a new sale transaction with multiple items
   * @param items - Array of { productId, variantId, quantity, price }
   * @param transactionData - { userId, paymentMethod, customerName, subtotal, tax, total }
   */
  ipcMain.handle('saleTransactions:create', async (_, { items, transactionData }) => {
    try {
      if (!prisma) {
        return { success: false, error: 'Database not initialized' }
      }

      // Validate inputs
      if (!items || items.length === 0) {
        return { success: false, error: 'No items provided' }
      }

      if (!transactionData.userId) {
        return { success: false, error: 'User ID required' }
      }

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Create the sale transaction
        const saleTransaction = await tx.saleTransaction.create({
          data: {
            userId: transactionData.userId,
            customerId: transactionData.customerId || null,
            paymentMethod: transactionData.paymentMethod || 'cash',
            status: 'completed',
            customerName: transactionData.customerName || null,
            subtotal: transactionData.subtotal,
            tax: transactionData.tax || 0,
            total: transactionData.total
          }
        })

        // 2. Create all sale items
        const saleItems = await Promise.all(
          items.map((item: any) =>
            tx.saleItem.create({
              data: {
                transactionId: saleTransaction.id,
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                // Discount fields
                discountType: item.discountType || 'NONE',
                discountValue: item.discountValue || 0,
                finalPrice: item.price, // price passed is already the final price after discount
                discountReason: item.discountReason || null,
                discountAppliedBy: item.discountAppliedBy || null,
                discountAppliedAt: item.discountAppliedBy ? new Date() : null
              }
            })
          )
        )

        // 3. Update stock and record stock movements for each item
        await Promise.all(
          items.map(async (item: any) => {
            if (item.variantId) {
              // Handle variant stock
              const variant = await tx.productVariant.findUnique({
                where: { id: item.variantId }
              })
              
              if (variant) {
                const previousStock = variant.stock
                const newStock = previousStock - item.quantity
                
                // Update variant stock
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: newStock }
                })
                
                // Record stock movement
                await tx.stockMovement.create({
                  data: {
                    variantId: item.variantId,
                    type: 'SALE',
                    quantity: -item.quantity, // Negative for sales
                    previousStock,
                    newStock,
                    referenceId: saleTransaction.id,
                    userId: transactionData.userId,
                    notes: `Sale transaction ${saleTransaction.id}`
                  }
                })
              }
            } else {
              // Handle product without variants - update all variants' stock
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                include: { variants: true }
              })
              
              if (product && product.variants && product.variants.length > 0) {
                // Use the first variant (default variant) for simple products
                const defaultVariant = product.variants[0]
                
                if (defaultVariant && defaultVariant.stock >= item.quantity) {
                  const previousStock = defaultVariant.stock
                  const newStock = previousStock - item.quantity
                  
                  // Update variant stock
                  await tx.productVariant.update({
                    where: { id: defaultVariant.id },
                    data: { stock: newStock }
                  })
                  
                  // Update the sale item with the variantId so we can refund properly later
                  const saleItemToUpdate = saleItems.find((si: any) => si.productId === item.productId)
                  if (saleItemToUpdate) {
                    await tx.saleItem.update({
                      where: { id: saleItemToUpdate.id },
                      data: { variantId: defaultVariant.id }
                    })
                  }
                  
                  // Record stock movement
                  await tx.stockMovement.create({
                    data: {
                      variantId: defaultVariant.id,
                      type: 'SALE',
                      quantity: -item.quantity,
                      previousStock,
                      newStock,
                      referenceId: saleTransaction.id,
                      userId: transactionData.userId,
                      notes: `Sale transaction ${saleTransaction.id} (simple product)`
                    }
                  })
                }
              }
            }
            return Promise.resolve()
          })
        )

        return { transaction: saleTransaction, items: saleItems }
      }, {
        maxWait: 30000,
        timeout: 30000
      })

      // Fetch the transaction with user info for receipt display
      const transactionWithUser = await prisma.saleTransaction.findUnique({
        where: { id: result.transaction.id },
        include: {
          user: {
            select: {
              username: true,
              fullName: true
            }
          },
          customer: {
            select: {
              name: true,
              phone: true
            }
          },
          installments: {
            orderBy: {
              dueDate: 'asc'
            }
          },
          deposits: true
        }
      })

      // After successful transaction, recalculate customer totalSpent if customerId provided
      if (transactionData.customerId) {
        try {
          const customerTotal = await prisma.saleTransaction.aggregate({
            where: {
              customerId: transactionData.customerId,
              status: 'completed'
            },
            _sum: { total: true }
          })
          
          await prisma.customer.update({
            where: { id: transactionData.customerId },
            data: { totalSpent: customerTotal._sum.total || 0 }
          })
          
        } catch (error) {
          log.error('Error updating customer totalSpent:', error)
          // Don't fail the transaction if this update fails
        }
      }

      return { success: true, transaction: transactionWithUser, items: result.items }
    } catch (error) {
      log.error('Error creating sale transaction:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Get all sale transactions with items
   */
  ipcMain.handle('saleTransactions:getAll', async () => {
    try {
      if (!prisma) return []

      const transactions = await prisma.saleTransaction.findMany({
        include: {
          user: {
            select: {
              username: true,
              fullName: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  category: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          deposits: true,
          installments: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return transactions
    } catch (error) {
      log.error('Error fetching sale transactions:', error)
      throw error
    }
  })

  /**
   * Get sale transaction by ID
   */
  ipcMain.handle('saleTransactions:getById', async (_, id: string) => {
    try {
      if (!prisma) return null

      const transaction = await prisma.saleTransaction.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              username: true,
              fullName: true
            }
          },
          customer: {
            select: {
              name: true,
              phone: true,
              email: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  baseSKU: true,
                  category: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          installments: {
            orderBy: {
              dueDate: 'asc'
            }
          },
          deposits: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      })

      return transaction
    } catch (error) {
      log.error('Error fetching sale transaction:', error)
      throw error
    }
  })

  /**
   * Refund a sale transaction
   */
  ipcMain.handle('saleTransactions:refund', async (_, id: string) => {
    try {
      if (!prisma) {
        return { success: false, error: 'Database not initialized' }
      }

      const result = await prisma.$transaction(async (tx: any) => {
        // Get transaction with items
        const transaction = await tx.saleTransaction.findUnique({
          where: { id },
          include: { items: true }
        })

        if (!transaction) {
          throw new Error('Transaction not found')
        }

        if (transaction.status === 'refunded') {
          throw new Error('Transaction already refunded')
        }

        // Update transaction status
        const updated = await tx.saleTransaction.update({
          where: { id },
          data: { status: 'refunded' }
        })
        
        await Promise.all(
          transaction.items.map(async (item: any) => {
            
            if (item.variantId) {
              // Get current stock before update
              const variant = await tx.productVariant.findUnique({
                where: { id: item.variantId },
                include: {
                  product: {
                    select: { name: true, baseSKU: true }
                  }
                }
              })
              
              if (variant) {
                const previousStock = variant.stock
                const newStock = previousStock + item.quantity
                
                // Update stock
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: newStock }
                })
                
                // Record stock movement as RETURN
                await tx.stockMovement.create({
                  data: {
                    variantId: item.variantId,
                    type: 'RETURN',
                    quantity: item.quantity, // Positive for returns
                    previousStock,
                    newStock,
                    referenceId: transaction.id,
                    userId: transaction.userId,
                    reason: 'Refund/Return',
                    notes: `Refund of transaction ${transaction.id}`
                  }
                })
               
              } else {
                log.error(`[REFUND-ALL] ERROR: Variant ${item.variantId} not found!`)
              }
            } else {
              // Handle legacy sales with null variantId - find the default variant
              log.warn(`[REFUND-ALL] Item ${item.id} has no variantId, searching for default variant...`)
              
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                include: { variants: true }
              })
              
              if (product && product.variants && product.variants.length > 0) {
                const defaultVariant = product.variants[0]
                
                const previousStock = defaultVariant.stock
                const newStock = previousStock + item.quantity
                
                // Update stock
                await tx.productVariant.update({
                  where: { id: defaultVariant.id },
                  data: { stock: newStock }
                })
                
                // Update sale item with the variantId for future reference
                await tx.saleItem.update({
                  where: { id: item.id },
                  data: { variantId: defaultVariant.id }
                })
                
                // Record stock movement as RETURN
                await tx.stockMovement.create({
                  data: {
                    variantId: defaultVariant.id,
                    type: 'RETURN',
                    quantity: item.quantity,
                    previousStock,
                    newStock,
                    referenceId: transaction.id,
                    userId: transaction.userId,
                    reason: 'Refund/Return',
                    notes: `Refund of transaction ${transaction.id} (legacy null variantId)`
                  }
                })
                
              } else {
                log.error(`[REFUND-ALL] ERROR: Could not find product or variants for item ${item.id}`)
              }
            }
            return Promise.resolve()
          })
        )
        
        return updated
      })

      // After successful refund, recalculate customer totalSpent if customerId exists
      if (result.customerId) {
        try {
          const customerTotal = await prisma.saleTransaction.aggregate({
            where: {
              customerId: result.customerId,
              status: 'completed'
            },
            _sum: { total: true }
          })
          
          await prisma.customer.update({
            where: { id: result.customerId },
            data: { totalSpent: customerTotal._sum.total || 0 }
          })
          
        } catch (error) {
          log.error('Error updating customer totalSpent after refund:', error)
        }
      }

      return { success: true, transaction: result }
    } catch (error) {
      log.error('Error refunding transaction:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Refund specific items (partial refund)
   */
  ipcMain.handle('saleTransactions:refundItems', async (_, { transactionId, items }: {
    transactionId: string
    items: Array<{
      saleItemId: string
      quantityToRefund: number
    }>
  }) => {
    try {
      if (!prisma) {
        return { success: false, error: 'Database not initialized' }
      }

      const result = await prisma.$transaction(async (tx: any) => {
        // Get transaction with items
        const transaction = await tx.saleTransaction.findUnique({
          where: { id: transactionId },
          include: { items: true }
        })

        if (!transaction) {
          throw new Error('Transaction not found')
        }

        if (transaction.status === 'refunded') {
          throw new Error('Transaction already fully refunded')
        }

        // Validate and process each item refund
        for (const refundItem of items) {
          const saleItem = transaction.items.find((item: any) => item.id === refundItem.saleItemId)
          
          if (!saleItem) {
            throw new Error(`Sale item ${refundItem.saleItemId} not found`)
          }

          const remainingQuantity = saleItem.quantity - saleItem.refundedQuantity
          
          if (refundItem.quantityToRefund <= 0) {
            throw new Error('Refund quantity must be greater than 0')
          }

          if (refundItem.quantityToRefund > remainingQuantity) {
            throw new Error(`Cannot refund ${refundItem.quantityToRefund} units. Only ${remainingQuantity} units available for refund`)
          }

          const newRefundedQuantity = saleItem.refundedQuantity + refundItem.quantityToRefund
          const isFullyRefunded = newRefundedQuantity === saleItem.quantity

          // Update sale item
          await tx.saleItem.update({
            where: { id: refundItem.saleItemId },
            data: {
              refundedQuantity: newRefundedQuantity,
              refundedAt: isFullyRefunded && !saleItem.refundedAt ? new Date() : saleItem.refundedAt
            }
          })

          // Restore stock and record stock movement
          if (saleItem.variantId) {
         
            
            const variant = await tx.productVariant.findUnique({
              where: { id: saleItem.variantId },
              include: {
                product: {
                  select: { name: true, baseSKU: true }
                }
              }
            })
            
            if (variant) {
              log.info(`[REFUND] Variant found:`, {
                id: variant.id,
                sku: variant.sku,
                product: variant.product.name,
                currentStock: variant.stock
              })
              
              const previousStock = variant.stock
              const newStock = previousStock + refundItem.quantityToRefund
              
              // Update stock
              await tx.productVariant.update({
                where: { id: saleItem.variantId },
                data: { stock: newStock }
              })
              
              // Record stock movement as RETURN
              await tx.stockMovement.create({
                data: {
                  variantId: saleItem.variantId,
                  type: 'RETURN',
                  quantity: refundItem.quantityToRefund,
                  previousStock,
                  newStock,
                  referenceId: transactionId,
                  userId: transaction.userId,
                  reason: 'Partial Refund',
                  notes: `Partial refund: ${refundItem.quantityToRefund} of ${saleItem.quantity} units from transaction ${transactionId}`
                }
              })
              
            } else {
              log.error(`[REFUND] ERROR: Variant ${saleItem.variantId} not found in database!`)
            }
          } else {
            // Handle legacy sales with null variantId
            log.warn(`[REFUND] Sale item ${saleItem.id} has no variantId, searching for default variant...`)
            
            const product = await tx.product.findUnique({
              where: { id: saleItem.productId },
              include: { variants: true }
            })
            
            if (product && product.variants && product.variants.length > 0) {
              const defaultVariant = product.variants[0]
              
              const previousStock = defaultVariant.stock
              const newStock = previousStock + refundItem.quantityToRefund
              
              // Update stock
              await tx.productVariant.update({
                where: { id: defaultVariant.id },
                data: { stock: newStock }
              })
              
              
              // Update sale item with variantId for future reference
              await tx.saleItem.update({
                where: { id: saleItem.id },
                data: { variantId: defaultVariant.id }
              })
              
              // Record stock movement
              await tx.stockMovement.create({
                data: {
                  variantId: defaultVariant.id,
                  type: 'RETURN',
                  quantity: refundItem.quantityToRefund,
                  previousStock,
                  newStock,
                  referenceId: transactionId,
                  userId: transaction.userId,
                  reason: 'Partial Refund',
                  notes: `Partial refund: ${refundItem.quantityToRefund} of ${saleItem.quantity} units from transaction ${transactionId} (legacy null variantId)`
                }
              })
              
            } else {
              log.error(`[REFUND] ERROR: Could not find product or variants for sale item ${saleItem.id}`)
            }
          }
        }

        // Check if all items are fully refunded
        const updatedItems = await tx.saleItem.findMany({
          where: { transactionId }
        })

        const allFullyRefunded = updatedItems.every((item: any) => 
          item.refundedQuantity === item.quantity
        )
        const anyRefunded = updatedItems.some((item: any) => 
          item.refundedQuantity > 0
        )

        // Update transaction status
        const newStatus = allFullyRefunded ? 'refunded' : (anyRefunded ? 'partially_refunded' : 'completed')
        
        const updatedTransaction = await tx.saleTransaction.update({
          where: { id: transactionId },
          data: { status: newStatus }
        })

        return updatedTransaction
      })

      // Recalculate customer totalSpent if customerId exists
      if (result.customerId) {
        try {
          // Get completed transactions total
          const completedTotal = await prisma.saleTransaction.aggregate({
            where: {
              customerId: result.customerId,
              status: 'completed'
            },
            _sum: { total: true }
          })
          
          // Get partially_refunded transactions and calculate net amounts
          const partiallyRefundedTransactions = await prisma.saleTransaction.findMany({
            where: {
              customerId: result.customerId,
              status: 'partially_refunded'
            },
            select: {
              total: true,
              items: {
                select: {
                  price: true,
                  refundedQuantity: true
                }
              }
            }
          })
          
          // Calculate net amount for partially refunded transactions
          const partiallyRefundedTotal = partiallyRefundedTransactions.reduce((sum, tx) => {
            const refundedAmount = tx.items.reduce((itemSum, item) => {
              const refunded = item.refundedQuantity || 0
              return itemSum + (refunded * (item.finalPrice || item.price))
            }, 0)
            return sum + (tx.total - refundedAmount)
          }, 0)
          
          const totalSpent = (completedTotal._sum.total || 0) + partiallyRefundedTotal
          
          await prisma.customer.update({
            where: { id: result.customerId },
            data: { totalSpent }
          })
        } catch (error) {
          log.error('Error updating customer totalSpent:', error)
        }
      }

      return { success: true, transaction: result }
    } catch (error) {
      log.error('Error refunding items:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Get transactions by date range
   */
  ipcMain.handle('saleTransactions:getByDateRange', async (_, { startDate, endDate }) => {
    try {
      if (!prisma) return []

      const transactions = await prisma.saleTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: {
          user: {
            select: {
              username: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  baseCost: true,
                  category: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          deposits: true,
          installments: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return transactions
    } catch (error) {
      log.error('Error fetching transactions by date range:', error)
      throw error
    }
  })
}
