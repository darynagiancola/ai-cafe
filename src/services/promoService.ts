const PROMO_CODES = {
  WELCOME10: 10,
} as const

export interface PromoValidationResult {
  isValid: boolean
  code?: string
  discountPercent?: number
  message: string
}

export function validatePromoCode(rawCode: string): PromoValidationResult {
  const code = rawCode.trim().toUpperCase()

  if (!code) {
    return {
      isValid: false,
      message: 'Please enter a promo code.',
    }
  }

  const discountPercent = PROMO_CODES[code as keyof typeof PROMO_CODES]

  if (!discountPercent) {
    return {
      isValid: false,
      message: 'Promo code not found.',
    }
  }

  return {
    isValid: true,
    code,
    discountPercent,
    message: `${code} applied: ${discountPercent}% discount.`,
  }
}

export function calculatePromoDiscount(
  subtotal: number,
  promoCode: string | null,
): { discount: number; discountPercent: number } {
  if (!promoCode) {
    return { discount: 0, discountPercent: 0 }
  }

  const discountPercent = PROMO_CODES[promoCode as keyof typeof PROMO_CODES] ?? 0
  const discount = Math.round((subtotal * discountPercent) / 100)

  return { discount, discountPercent }
}
