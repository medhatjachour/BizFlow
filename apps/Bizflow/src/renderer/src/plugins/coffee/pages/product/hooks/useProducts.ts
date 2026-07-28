import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Product, ProductForm } from '../types'
import { formToProductData } from '../utils'

export function useProducts() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const prods = await window.api.coffee.products.getAll()
      setProducts(prods ?? [])
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const createProduct = useCallback(
    async (form: ProductForm, imageFile: string | null, clearImage: boolean) => {
      try {
        let imageFilename: string | undefined
        if (imageFile) {
          imageFilename = await window.api.coffee.products.saveImage(imageFile)
        } else if (clearImage) {
          imageFilename = undefined
        }

        const data = { ...formToProductData(form), image: imageFilename }
        await window.api.coffee.products.create(data)
        await load()
        toast.success('Product created')
        return true
      } catch (err: any) {
        toast.error(err?.message ?? 'Save failed')
        return false
      }
    },
    [toast, load]
  )

  const updateProduct = useCallback(
    async (id: string, form: ProductForm, imageFile: string | null, clearImage: boolean, currentImage?: string) => {
      try {
        let imageFilename: string | undefined = currentImage
        if (imageFile) {
          imageFilename = await window.api.coffee.products.saveImage(imageFile)
        } else if (clearImage) {
          imageFilename = undefined
        }

        const data = { ...formToProductData(form), image: imageFilename }
        await window.api.coffee.products.update({ id, ...data })
        await load()
        toast.success('Product updated')
        return true
      } catch (err: any) {
        toast.error(err?.message ?? 'Update failed')
        return false
      }
    },
    [toast, load]
  )

  const deleteProduct = useCallback(
    async (product: Product) => {
      if (!confirm(`Delete "${product.name}"?`)) return false
      try {
        await window.api.coffee.products.delete(product.id)
        await load()
        toast.success('Product deleted')
        return true
      } catch (err: any) {
        toast.error(err?.message ?? 'Delete failed')
        return false
      }
    },
    [toast, load]
  )

  const toggleAvailability = useCallback(
    async (product: Product) => {
      try {
        await window.api.coffee.products.toggleAvailability(product.id, !product.isAvailable)
        await load()
        return true
      } catch {
        toast.error('Update failed')
        return false
      }
    },
    [toast, load]
  )

  const loadImage = useCallback(async (filename: string): Promise<string | null> => {
    try {
      return await window.api.coffee.products.loadImage(filename)
    } catch {
      return null
    }
  }, [])

  return {
    products,
    loading,
    load,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    loadImage
  }
}
