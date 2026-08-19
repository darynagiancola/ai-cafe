import type { OrderType } from './order.js'

export type SimulatedPaymentStatus = 'pending' | 'approved' | 'declined'
export type SimulatedWebhookTransactionStatus = 'Approved' | 'Declined'

export interface SimulatedPaymentLineItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface SimulatedPaymentOrder {
  orderReference: string
  items: SimulatedPaymentLineItem[]
  amount: number
  currency: 'UAH'
  orderType: OrderType
  deliveryFee: number
  subtotal: number
  discount: number
  promoCode?: string
  paymentStatus: SimulatedPaymentStatus
  createdAt: string
  processedAt?: string
  merchantAccount: string
  merchantSignature: string
  is_premium: boolean
  processedEventIds: string[]
}

export interface SimulatedWebhookPayload {
  merchantAccount: string
  orderReference: string
  amount: number
  currency: 'UAH'
  transactionStatus: SimulatedWebhookTransactionStatus
  merchantSignature: string
  eventId: string
}
