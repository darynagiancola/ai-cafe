import type { CartDetailedItem } from '../types/cart'
import type {
  DeliveryAddress,
  Order,
  OrderCustomer,
  OrderType,
  PaymentProvider,
  PaymentStatus,
} from '../types/order'

interface CreateOrderPayload {
  customer: OrderCustomer
  items: CartDetailedItem[]
  subtotal: number
  discount: number
  total: number
  promoCode?: string | null
  orderType: OrderType
  deliveryAddress?: DeliveryAddress
  notes?: string
}

function createOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createOrderDraft(payload: CreateOrderPayload): Order {
  return {
    id: createOrderId(),
    customer: payload.customer,
    items: payload.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      productSlug: item.product.slug,
      unitPrice: item.product.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: payload.subtotal,
    discount: payload.discount,
    total: payload.total,
    promoCode: payload.promoCode ?? undefined,
    orderType: payload.orderType,
    deliveryAddress: payload.deliveryAddress,
    notes: payload.notes,
    orderStatus: 'pending',
    paymentStatus: 'pending',
    paymentProvider: 'mock',
    createdAt: new Date().toISOString(),
  }
}

export function attachPaymentResult(
  order: Order,
  payment: { provider: PaymentProvider; status: PaymentStatus; reference: string },
): Order {
  return {
    ...order,
    paymentProvider: payment.provider,
    paymentStatus: payment.status,
    paymentReference: payment.reference,
  }
}

// TODO: replace with Supabase persistence and KDS handoff once backend is available.
