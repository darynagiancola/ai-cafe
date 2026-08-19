import type { StructuredTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { createAgent } from 'langchain'
import { z } from 'zod'
import { DEFAULT_SUGGESTED_PROMPTS } from '../prompts/aiBaristaPrompt.js'
import type { AgentMessagePayload, AgentProposedOrder, MenuItemSummary } from '../types.js'
import { calculateCart, getProductDetails, validatePromoCode } from '../tools/index.js'

export const llmOutputSchema = z.object({
  message: z.string().min(1),
  recommendedProductQueries: z.array(z.string()),
  proposedItems: z.array(
    z.object({
      product: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
  askToAddToCart: z.boolean(),
  promoCode: z.string(),
  clearProposedOrder: z.boolean(),
  suggestedPrompts: z.array(z.string()),
})

export interface BaristaConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BaristaSessionState {
  proposedItems: { productId: string; quantity: number }[]
  promoCode: string | null
}

export interface BaristaBackendResponse {
  message: string
  payload?: AgentMessagePayload
  sessionState: BaristaSessionState
  mode: 'llm'
}

export interface RunOpenAiBaristaTurnParams {
  message: string
  conversation: BaristaConversationMessage[]
  sessionState: BaristaSessionState
  tools: StructuredTool[]
  systemPrompt: string
  model: string
  openAiApiKey: string
}

function buildSessionStateSummary(state: BaristaSessionState): string {
  if (state.proposedItems.length === 0) {
    return `{"proposedOrder":"none","promoCode":${state.promoCode ? `"${state.promoCode}"` : 'null'}}`
  }

  const cart = calculateCart({
    items: state.proposedItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    })),
  })

  return JSON.stringify({
    proposedOrder: cart.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: cart.subtotal,
    promoCode: state.promoCode,
  })
}

function toSummaryFromDetails(query: string): MenuItemSummary | null {
  const details = getProductDetails({ query })
  if (!details.found || !details.product) {
    return null
  }

  return {
    id: details.product.id,
    slug: details.product.slug,
    name: details.product.name,
    category: details.product.category,
    price: details.product.price,
    description: details.product.description,
    dietaryTags: details.product.dietaryTags,
    available: details.product.available,
  }
}

function proposedOrderFromItems(
  items: { product: string; quantity: number }[],
  promoCode: string | null,
): AgentProposedOrder | null {
  const calculated = calculateCart({ items })
  if (calculated.items.length === 0) {
    return null
  }

  const promoEvaluation = promoCode
    ? validatePromoCode({
        promoCode,
        items: calculated.items.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
        })),
      })
    : null

  const discount = promoEvaluation?.isValid ? promoEvaluation.discountAmount : 0

  return {
    items: calculated.items,
    subtotal: calculated.subtotal,
    discount,
    deliveryFee: 0,
    total: Math.max(calculated.subtotal - discount, 0),
    promoCode: promoEvaluation?.isValid ? promoEvaluation.code : undefined,
  }
}

function isRestrictedPaidStatusRequest(input: string): boolean {
  const normalized = input.toLowerCase()
  return (
    normalized.includes("i've paid") ||
    normalized.includes('i paid') ||
    normalized.includes('mark my order as paid')
  )
}

export async function runOpenAiBaristaTurn({
  message,
  conversation,
  sessionState,
  tools,
  systemPrompt,
  model,
  openAiApiKey,
}: RunOpenAiBaristaTurnParams): Promise<BaristaBackendResponse> {
  if (isRestrictedPaidStatusRequest(message)) {
    return {
      mode: 'llm',
      message:
        'I cannot mark orders as paid. Payment status must be confirmed by the payment/backend system.',
      sessionState,
    }
  }

  const llm = new ChatOpenAI({
    apiKey: openAiApiKey,
    model,
    temperature: 0.2,
  })

  const agent = createAgent({
    model: llm,
    tools,
    systemPrompt: `${systemPrompt}

You are a tool-calling assistant. Always rely on tools for products, prices, ingredients, allergens, promo codes, and totals.
Return structured output using the provided response format.
Always include ALL output keys from the schema.
When a field is not relevant, use safe empty values:
- arrays: []
- booleans: false
- promoCode: ""
If user modifies an in-progress order ("also add", "make that two", "remove item", "total now"), return the FULL updated proposedItems list.
If request is ambiguous, ask one concise clarification question in "message".
Never claim payment is successful.`,
    responseFormat: llmOutputSchema,
  })

  const historyMessages = conversation.slice(-20).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }))

  const messageAlreadyIncluded =
    historyMessages.length > 0 &&
    historyMessages[historyMessages.length - 1].role === 'user' &&
    historyMessages[historyMessages.length - 1].content.trim() === message.trim()

  const messages = [
    {
      role: 'system' as const,
      content: `Current session state JSON: ${buildSessionStateSummary(sessionState)}`,
    },
    ...historyMessages,
    ...(messageAlreadyIncluded ? [] : [{ role: 'user' as const, content: message }]),
  ]

  const execution = await agent.invoke({
    messages,
  })

  const parsedOutput = execution.structuredResponse
  if (!parsedOutput) {
    return {
      mode: 'llm',
      message:
        'I had trouble formatting that response. Please repeat your request and I will try again.',
      sessionState,
      payload: { suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS },
    }
  }

  const nextState: BaristaSessionState = {
    ...sessionState,
    proposedItems: [...sessionState.proposedItems],
  }

  if (parsedOutput.clearProposedOrder) {
    nextState.proposedItems = []
  }

  const recommendations = parsedOutput.recommendedProductQueries
    .map((query) => toSummaryFromDetails(query))
    .filter((item): item is MenuItemSummary => item !== null)

  let appliedPromoCode = nextState.promoCode
  let promoInvalidMessage: string | null = null

  const requestedPromoCode = parsedOutput.promoCode.trim()
  if (requestedPromoCode) {
    const promoEvaluation = validatePromoCode({
      promoCode: requestedPromoCode,
      items: nextState.proposedItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
      })),
    })

    if (!promoEvaluation.isValid) {
      promoInvalidMessage = `${promoEvaluation.message} I can only apply valid promo codes from official promo rules.`
    } else {
      appliedPromoCode = promoEvaluation.code
    }
  }

  let proposedOrder: AgentProposedOrder | null = null
  if (parsedOutput.proposedItems.length > 0) {
    proposedOrder = proposedOrderFromItems(
      parsedOutput.proposedItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      })),
      appliedPromoCode,
    )
    if (proposedOrder) {
      nextState.proposedItems = proposedOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    }
  } else if (nextState.proposedItems.length > 0) {
    proposedOrder = proposedOrderFromItems(
      nextState.proposedItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
      })),
      appliedPromoCode,
    )
  }

  nextState.promoCode = appliedPromoCode

  const payload: AgentMessagePayload = {}
  if (recommendations.length > 0) {
    payload.recommendations = recommendations
  }
  if (proposedOrder) {
    payload.proposedOrder = proposedOrder
  }
  if (parsedOutput.suggestedPrompts.length > 0) {
    payload.suggestedPrompts = parsedOutput.suggestedPrompts.slice(0, 4)
  } else if (!parsedOutput.askToAddToCart) {
    payload.suggestedPrompts = DEFAULT_SUGGESTED_PROMPTS
  }

  if (proposedOrder && parsedOutput.askToAddToCart) {
    const totalCount = proposedOrder.items.reduce((sum, item) => sum + item.quantity, 0)
    payload.confirmAddToCart = {
      label: `Add ${totalCount} item${totalCount > 1 ? 's' : ''} to cart`,
      items: proposedOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }
  }

  const safeMessage = promoInvalidMessage ?? parsedOutput.message

  return {
    mode: 'llm',
    message: safeMessage,
    payload: Object.keys(payload).length > 0 ? payload : undefined,
    sessionState: nextState,
  }
}
