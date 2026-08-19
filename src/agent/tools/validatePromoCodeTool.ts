import { z } from 'zod'
import { calculatePromoDiscount, validatePromoCode as validatePromoCodeFromService } from '../../services/promoService.js'
import type { PromoEvaluation } from '../types.js'
import { calculateCart } from './calculateCartTool.js'

export const validatePromoCodeSchema = z.object({
  promoCode: z.string().min(1),
  items: z
    .array(
      z.object({
        product: z.string().min(1),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .optional()
    .describe('Optional proposed order items for evaluating discount amount/updated totals'),
})

export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>

export function validatePromoCode(input: ValidatePromoCodeInput): PromoEvaluation {
  const validation = validatePromoCodeFromService(input.promoCode)
  const cart = input.items ? calculateCart({ items: input.items }) : null
  const subtotal = cart?.subtotal ?? 0

  if (!validation.isValid || !validation.code) {
    return {
      isValid: false,
      code: input.promoCode.trim().toUpperCase(),
      message: validation.message,
      discountPercent: 0,
      discountAmount: 0,
      subtotal,
      updatedTotal: subtotal,
    }
  }

  const promo = calculatePromoDiscount(subtotal, validation.code)

  return {
    isValid: true,
    code: validation.code,
    message: validation.message,
    discountPercent: promo.discountPercent,
    discountAmount: promo.discount,
    subtotal,
    updatedTotal: Math.max(subtotal - promo.discount, 0),
  }
}

