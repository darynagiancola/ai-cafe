import type { IncomingHttpHeaders } from 'node:http'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  action: z.literal('create_invoice'),
  orderReference: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ).min(1),
  currency: z.literal('UAH'),
  promoCode: z.string().optional().nullable(),
  orderType: z.enum(['pickup', 'delivery']),
})

const simulateWebhookSchema = z.object({
  action: z.literal('simulate_webhook'),
  orderReference: z.string().min(1),
  transactionStatus: z.enum(['Approved', 'Declined']),
  eventId: z.string().optional(),
})

const webhookPayloadSchema = z.object({
  action: z.literal('webhook'),
  payload: z.object({
    merchantAccount: z.string().min(1),
    orderReference: z.string().min(1),
    amount: z.number().nonnegative(),
    currency: z.literal('UAH'),
    transactionStatus: z.enum(['Approved', 'Declined']),
    merchantSignature: z.string().min(1),
    eventId: z.string().min(1),
  }),
})

const requestSchema = z.union([
  createInvoiceSchema,
  simulateWebhookSchema,
  webhookPayloadSchema,
])

type ServerlessRequest = {
  method?: string
  headers: IncomingHttpHeaders
  body?: unknown
  url?: string
}

type ServerlessResponse = {
  status: (statusCode: number) => ServerlessResponse
  json: (payload: unknown) => void
  send: (payload?: unknown) => void
  setHeader: (name: string, value: string) => void
}

function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS
  if (configured && configured.trim().length > 0) {
    return configured
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://darynagiancola.github.io',
  ]
}

function setCorsHeaders(req: ServerlessRequest, res: ServerlessResponse) {
  const origin = req.headers.origin
  const allowedOrigins = getAllowedOrigins()

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function parseBody(req: ServerlessRequest): unknown {
  if (!req.body) {
    return {}
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }

  return req.body
}

function getOrderReferenceFromUrl(req: ServerlessRequest): string | null {
  if (!req.url) {
    return null
  }

  try {
    const parsed = new URL(req.url, 'https://local.aurelia')
    const orderReference = parsed.searchParams.get('orderReference')
    return orderReference && orderReference.trim().length > 0
      ? orderReference
      : null
  } catch {
    return null
  }
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse,
) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).send()
    return
  }

  const paymentsModule = await import('../src/server/paymentSimulation.js')

  if (req.method === 'GET') {
    const orderReference = getOrderReferenceFromUrl(req)
    if (!orderReference) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'orderReference query parameter is required.',
      })
      return
    }

    const order = paymentsModule.getSimulatedPaymentOrder(orderReference)
    if (!order) {
      res.status(404).json({
        error: 'not_found',
        message: 'Payment order not found.',
      })
      return
    }

    res.status(200).json({ order })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'method_not_allowed',
      message: 'Only GET, POST and OPTIONS are supported for /api/payments.',
    })
    return
  }

  const parsed = requestSchema.safeParse(parseBody(req))
  if (!parsed.success) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request payload is invalid.',
      details: parsed.error.flatten(),
    })
    return
  }

  try {
    if (parsed.data.action === 'create_invoice') {
      const order = paymentsModule.createSimulatedInvoice({
        orderReference: parsed.data.orderReference,
        items: parsed.data.items,
        currency: parsed.data.currency,
        promoCode: parsed.data.promoCode ?? null,
        orderType: parsed.data.orderType,
      })
      res.status(200).json({ order })
      return
    }

    if (parsed.data.action === 'simulate_webhook') {
      const payload = paymentsModule.buildSimulatedWebhookPayload({
        orderReference: parsed.data.orderReference,
        transactionStatus: parsed.data.transactionStatus,
        eventId: parsed.data.eventId,
      })

      const result = paymentsModule.processSimulatedWebhook(payload)
      res.status(200).json({
        payload,
        result,
      })
      return
    }

    if (parsed.data.action === 'webhook') {
      const result = paymentsModule.processSimulatedWebhook(parsed.data.payload)
      res.status(200).json({
        result,
      })
      return
    }

    res.status(400).json({
      error: 'invalid_request',
      message: 'Unsupported action.',
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Payment simulation failed due to an unknown error.'
    res.status(400).json({
      error: 'payment_simulation_error',
      message,
    })
  }
}
