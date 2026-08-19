export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentProvider = 'wayforpay' | 'mock'
export type OrderType = 'pickup' | 'delivery'

export interface OrderCustomer {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export interface DeliveryAddress {
  addressLine: string
  city: string
}

export interface OrderItem {
  productId: string
  productName: string
  productSlug: string
  unitPrice: number
  quantity: number
  lineTotal: number
  modifiers?: string[]
}

export interface Order {
  id: string
  customer: OrderCustomer
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  promoCode?: string
  orderType: OrderType
  deliveryAddress?: DeliveryAddress
  notes?: string
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  paymentProvider: PaymentProvider
  paymentReference?: string
  createdAt: string
}
