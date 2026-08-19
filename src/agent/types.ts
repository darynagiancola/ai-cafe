import type { MenuCategory } from '../types/menu.js'

export interface MenuItemSummary {
  id: string
  slug: string
  name: string
  category: MenuCategory
  price: number
  description: string
  dietaryTags: string[]
  available: boolean
}

export interface ProductDetails extends MenuItemSummary {
  longDescription: string
  ingredients: string[]
  allergens: string[]
}

export interface CalculatedLineItem {
  productId: string
  productSlug: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface CalculatedCart {
  items: CalculatedLineItem[]
  notFound: string[]
  subtotal: number
  totalBeforeDiscount: number
}

export interface PromoEvaluation {
  isValid: boolean
  code: string
  message: string
  discountPercent: number
  discountAmount: number
  subtotal: number
  updatedTotal: number
}

export interface AgentProposedOrder {
  items: CalculatedLineItem[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  promoCode?: string
}

export interface SessionMemoryState {
  discussedProductIds: string[]
  selectedItems: CalculatedLineItem[]
  proposedOrder: AgentProposedOrder | null
  budget: number | null
  tastePreferences: string[]
  excludedIngredients: string[]
  dietaryPreferences: string[]
  promoCode: string | null
}

export interface AgentMessagePayload {
  recommendations?: MenuItemSummary[]
  suggestedPrompts?: string[]
  proposedOrder?: AgentProposedOrder
  confirmAddToCart?: {
    label: string
    items: { productId: string; quantity: number }[]
  }
}

export interface AgentResponse {
  message: string
  payload?: AgentMessagePayload
}
