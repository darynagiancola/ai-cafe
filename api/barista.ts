import type { IncomingHttpHeaders } from 'node:http'
import { z } from 'zod'
import { AI_BARISTA_SYSTEM_PROMPT } from '../src/agent/prompts/aiBaristaPrompt'
import { createLangChainAiBaristaTools } from '../src/agent/langchain/createLangChainTools'
import { runOpenAiBaristaTurn } from '../src/agent/langchain/openAiBaristaRuntime'

const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

const requestSchema = z.object({
  message: z.string().min(1),
  conversation: z.array(conversationMessageSchema).max(40).default([]),
  sessionState: z
    .object({
      proposedItems: z
        .array(
          z.object({
            productId: z.string().min(1),
            quantity: z.number().int().positive(),
          }),
        )
        .default([]),
      promoCode: z.string().nullable().default(null),
    })
    .default({ proposedItems: [], promoCode: null }),
})

type RequestBody = z.infer<typeof requestSchema>

type ServerlessRequest = {
  method?: string
  headers: IncomingHttpHeaders
  body?: unknown
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

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
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

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse,
) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).send()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'method_not_allowed',
      message: 'Only POST is supported for /api/barista.',
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

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({
      error: 'ai_backend_unavailable',
      code: 'OPENAI_API_KEY_MISSING',
      message:
        'OPENAI_API_KEY is not configured on the server. Frontend should use deterministic fallback mode.',
    })
    return
  }

  const body: RequestBody = parsed.data

  try {
    const response = await runOpenAiBaristaTurn({
      message: body.message,
      conversation: body.conversation,
      sessionState: body.sessionState,
      tools: createLangChainAiBaristaTools(),
      systemPrompt: AI_BARISTA_SYSTEM_PROMPT,
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      openAiApiKey: process.env.OPENAI_API_KEY,
    })

    res.status(200).json(response)
  } catch (error) {
    console.error('AURELIA AI backend error:', error)
    res.status(500).json({
      error: 'ai_backend_error',
      message:
        'AI Barista is temporarily unavailable. Please try again in a moment.',
    })
  }
}
