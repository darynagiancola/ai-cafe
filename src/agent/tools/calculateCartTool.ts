import { z } from 'zod'
import type { CalculatedCart, CalculatedLineItem } from '../types'
import { resolveProductFromQuery } from './helpers'

export const calculateCartSchema = z.object({
  items: z
    .array(
      z.object({
        product: z
          .string()
          .min(1)
          .describe('Authoritative product identifier, slug, or name query'),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .min(1),
})

export type CalculateCartInput = z.infer<typeof calculateCartSchema>

export function calculateCart(input: CalculateCartInput): CalculatedCart {
  const lineItems: CalculatedLineItem[] = []
  const notFound: string[] = []

  for (const item of input.items) {
    const product = resolveProductFromQuery(item.product)
    if (!product) {
      notFound.push(item.product)
      continue
    }

    const quantity = Math.max(1, item.quantity)
    lineItems.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
    })
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)

  return {
    items: lineItems,
    notFound,
    subtotal,
    totalBeforeDiscount: subtotal,
  }
}

