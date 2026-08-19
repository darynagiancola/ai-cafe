import { menuService } from '../services/menuService'
import { calculatePromoDiscount } from '../services/promoService'
import type { CartDetailedItem, CartItem, CartTotals } from '../types/cart'

export function getDetailedCartItems(items: CartItem[]): CartDetailedItem[] {
  return items
    .map((item) => {
      const product = menuService.getProductById(item.productId)
      if (!product) {
        return null
      }

      return {
        product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      } satisfies CartDetailedItem
    })
    .filter((item): item is CartDetailedItem => item !== null)
}

export function getCartTotals(items: CartItem[], promoCode: string | null): CartTotals {
  const detailedItems = getDetailedCartItems(items)
  const subtotal = detailedItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const discount = calculatePromoDiscount(subtotal, promoCode).discount
  const total = Math.max(subtotal - discount, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    subtotal,
    discount,
    total,
    itemCount,
  }
}
