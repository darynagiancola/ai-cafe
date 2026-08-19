import type { MenuProduct } from './menu'

export interface CartItem {
  productId: string
  quantity: number
}

export interface CartDetailedItem {
  product: MenuProduct
  quantity: number
  lineTotal: number
}

export interface CartTotals {
  subtotal: number
  discount: number
  total: number
  itemCount: number
}
