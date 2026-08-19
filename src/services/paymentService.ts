import type {
  SimulatedPaymentOrder,
  SimulatedWebhookTransactionStatus,
} from '../types/paymentSimulation'
import type { OrderType } from '../types/order'

const apiBaseUrl = import.meta.env.VITE_AI_API_URL?.trim() ?? ''
const paymentsEndpoint = apiBaseUrl
  ? `${apiBaseUrl.replace(/\/$/, '')}/api/payments`
  : '/api/payments'

export interface CreateSimulatedInvoiceRequest {
  orderReference: string
  items: { productId: string; quantity: number }[]
  currency: 'UAH'
  promoCode?: string | null
  orderType: OrderType
}

export interface SimulatedWebhookResultResponse {
  result: {
    order: SimulatedPaymentOrder
    alreadyProcessed: boolean
    message: string
  }
}

async function safeJsonParse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function createSimulatedInvoice(
  request: CreateSimulatedInvoiceRequest,
): Promise<SimulatedPaymentOrder> {
  const response = await fetch(paymentsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_invoice',
      ...request,
    }),
  })

  const payload = await safeJsonParse<{ order?: SimulatedPaymentOrder; message?: string }>(
    response,
  )

  if (!response.ok || !payload?.order) {
    throw new Error(payload?.message ?? 'Failed to create simulated invoice.')
  }

  return payload.order
}

export async function getSimulatedPaymentOrder(
  orderReference: string,
): Promise<SimulatedPaymentOrder> {
  const response = await fetch(
    `${paymentsEndpoint}?orderReference=${encodeURIComponent(orderReference)}`,
    {
      method: 'GET',
    },
  )

  const payload = await safeJsonParse<{ order?: SimulatedPaymentOrder; message?: string }>(
    response,
  )

  if (!response.ok || !payload?.order) {
    throw new Error(payload?.message ?? 'Unable to fetch simulated payment order.')
  }

  return payload.order
}

export async function simulatePaymentWebhook(
  orderReference: string,
  transactionStatus: SimulatedWebhookTransactionStatus,
): Promise<SimulatedWebhookResultResponse> {
  const response = await fetch(paymentsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'simulate_webhook',
      orderReference,
      transactionStatus,
      eventId: `evt_${orderReference}_${transactionStatus}`,
    }),
  })

  const payload = await safeJsonParse<SimulatedWebhookResultResponse & { message?: string }>(
    response,
  )

  if (!response.ok || !payload?.result) {
    throw new Error(payload?.message ?? 'Failed to simulate payment webhook.')
  }

  return payload
}
