import {
  calculateCart,
  validatePromoCode,
} from '../agent/tools/index.js'
import type { OrderType } from '../types/order.js'
import type {
  SimulatedPaymentOrder,
  SimulatedWebhookPayload,
  SimulatedWebhookTransactionStatus,
} from '../types/paymentSimulation.js'

const MERCHANT_ACCOUNT = 'aurelia-demo-merchant'

export interface CreateSimulatedInvoiceInput {
  orderReference: string
  items: { productId: string; quantity: number }[]
  currency: 'UAH'
  promoCode?: string | null
  orderType: OrderType
}

export interface ProcessWebhookResult {
  order: SimulatedPaymentOrder
  alreadyProcessed: boolean
  message: string
}

interface PaymentRepository {
  save: (order: SimulatedPaymentOrder) => void
  findByOrderReference: (orderReference: string) => SimulatedPaymentOrder | null
  markWebhookProcessed: (
    orderReference: string,
    eventId: string,
    update: (order: SimulatedPaymentOrder) => SimulatedPaymentOrder,
  ) => ProcessWebhookResult
}

class InMemoryPaymentRepository implements PaymentRepository {
  private readonly orders = new Map<string, SimulatedPaymentOrder>()
  private readonly processedEvents = new Set<string>()

  save(order: SimulatedPaymentOrder) {
    this.orders.set(order.orderReference, order)
  }

  findByOrderReference(orderReference: string): SimulatedPaymentOrder | null {
    return this.orders.get(orderReference) ?? null
  }

  markWebhookProcessed(
    orderReference: string,
    eventId: string,
    update: (order: SimulatedPaymentOrder) => SimulatedPaymentOrder,
  ): ProcessWebhookResult {
    const order = this.findByOrderReference(orderReference)
    if (!order) {
      throw new Error('Order not found')
    }

    const eventKey = `${orderReference}:${eventId}`
    if (this.processedEvents.has(eventKey)) {
      return {
        order,
        alreadyProcessed: true,
        message: 'Webhook event was already processed.',
      }
    }

    if (order.paymentStatus !== 'pending') {
      this.processedEvents.add(eventKey)
      return {
        order,
        alreadyProcessed: true,
        message: 'Payment status already finalized for this order.',
      }
    }

    const updated = update(order)
    this.orders.set(orderReference, updated)
    this.processedEvents.add(eventKey)

    return {
      order: updated,
      alreadyProcessed: false,
      message: 'Webhook event processed successfully.',
    }
  }
}

const globalRegistry = globalThis as typeof globalThis & {
  __AURELIA_SIM_PAYMENT_REPOSITORY__?: InMemoryPaymentRepository
}

function getRepository(): PaymentRepository {
  if (!globalRegistry.__AURELIA_SIM_PAYMENT_REPOSITORY__) {
    globalRegistry.__AURELIA_SIM_PAYMENT_REPOSITORY__ = new InMemoryPaymentRepository()
  }

  return globalRegistry.__AURELIA_SIM_PAYMENT_REPOSITORY__
}

export function createMockMerchantSignature({
  orderReference,
  amount,
  currency,
}: {
  orderReference: string
  amount: number
  currency: 'UAH'
}): string {
  // DEMO ONLY: this is not a real WayForPay merchant signature algorithm.
  const source = `AURELIA_DEMO_SIGNATURE|${orderReference}|${amount}|${currency}`
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }

  return `demo-signature-${hash.toString(16).padStart(8, '0')}`
}

function assertValidItems(items: { productId: string; quantity: number }[]) {
  if (items.length === 0) {
    throw new Error('Order must contain at least one item.')
  }

  if (items.some((item) => !item.productId || item.quantity <= 0)) {
    throw new Error('Order items are invalid.')
  }
}

export function createSimulatedInvoice(
  input: CreateSimulatedInvoiceInput,
): SimulatedPaymentOrder {
  if (input.currency !== 'UAH') {
    throw new Error('Only UAH currency is supported.')
  }

  assertValidItems(input.items)

  const cart = calculateCart({
    items: input.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    })),
  })

  if (cart.notFound.length > 0) {
    throw new Error(`Unknown products: ${cart.notFound.join(', ')}`)
  }

  const deliveryFee = input.orderType === 'delivery' ? 60 : 0
  const promo = input.promoCode
    ? validatePromoCode({
        promoCode: input.promoCode,
        items: input.items.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
        })),
      })
    : null

  const discount = promo?.isValid ? promo.discountAmount : 0
  const amount = Math.max(cart.subtotal - discount + deliveryFee, 0)
  const signature = createMockMerchantSignature({
    orderReference: input.orderReference,
    amount,
    currency: input.currency,
  })

  const order: SimulatedPaymentOrder = {
    orderReference: input.orderReference,
    items: cart.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    amount,
    currency: input.currency,
    orderType: input.orderType,
    deliveryFee,
    subtotal: cart.subtotal,
    discount,
    promoCode: promo?.isValid ? promo.code : undefined,
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    merchantAccount: MERCHANT_ACCOUNT,
    merchantSignature: signature,
    is_premium: false,
    processedEventIds: [],
  }

  getRepository().save(order)
  return order
}

export function getSimulatedPaymentOrder(
  orderReference: string,
): SimulatedPaymentOrder | null {
  return getRepository().findByOrderReference(orderReference)
}

export function buildSimulatedWebhookPayload({
  orderReference,
  transactionStatus,
  eventId,
}: {
  orderReference: string
  transactionStatus: SimulatedWebhookTransactionStatus
  eventId?: string
}): SimulatedWebhookPayload {
  const order = getSimulatedPaymentOrder(orderReference)
  if (!order) {
    throw new Error('Order not found')
  }

  return {
    merchantAccount: order.merchantAccount,
    orderReference: order.orderReference,
    amount: order.amount,
    currency: order.currency,
    transactionStatus,
    merchantSignature: createMockMerchantSignature({
      orderReference: order.orderReference,
      amount: order.amount,
      currency: order.currency,
    }),
    eventId: eventId ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }
}

export function processSimulatedWebhook(
  payload: SimulatedWebhookPayload,
): ProcessWebhookResult {
  const order = getSimulatedPaymentOrder(payload.orderReference)
  if (!order) {
    throw new Error('Order not found')
  }

  if (order.currency !== payload.currency) {
    throw new Error('Currency mismatch in webhook payload.')
  }

  if (order.amount !== payload.amount) {
    throw new Error('Amount mismatch in webhook payload.')
  }

  if (order.merchantAccount !== payload.merchantAccount) {
    throw new Error('Merchant account mismatch in webhook payload.')
  }

  const expectedSignature = createMockMerchantSignature({
    orderReference: payload.orderReference,
    amount: payload.amount,
    currency: payload.currency,
  })

  if (expectedSignature !== payload.merchantSignature) {
    throw new Error('Invalid mock merchant signature.')
  }

  return getRepository().markWebhookProcessed(
    payload.orderReference,
    payload.eventId,
    (currentOrder) => {
      const nextStatus = payload.transactionStatus === 'Approved'
        ? 'approved'
        : 'declined'

      return {
        ...currentOrder,
        paymentStatus: nextStatus,
        processedAt: new Date().toISOString(),
        is_premium: nextStatus === 'approved',
        processedEventIds: [...currentOrder.processedEventIds, payload.eventId],
      }
    },
  )
}
