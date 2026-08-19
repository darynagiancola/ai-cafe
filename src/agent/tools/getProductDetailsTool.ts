import { z } from 'zod'
import type { ProductDetails } from '../types'
import { resolveProductFromQuery, toProductDetails } from './helpers'

export const getProductDetailsSchema = z.object({
  query: z.string().min(1).describe('Product id, slug, or product name'),
})

export type GetProductDetailsInput = z.infer<typeof getProductDetailsSchema>

export interface GetProductDetailsResult {
  found: boolean
  product?: ProductDetails
  message?: string
}

export function getProductDetails(input: GetProductDetailsInput): GetProductDetailsResult {
  const product = resolveProductFromQuery(input.query)
  if (!product) {
    return {
      found: false,
      message: `Product "${input.query}" was not found in the menu.`,
    }
  }

  return {
    found: true,
    product: toProductDetails(product),
  }
}

