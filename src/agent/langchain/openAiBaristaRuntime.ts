import type { StructuredTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { createAgent } from 'langchain'
import { z } from 'zod'
import { DEFAULT_SUGGESTED_PROMPTS } from '../prompts/aiBaristaPrompt.js'
import type { AgentMessagePayload, AgentProposedOrder, MenuItemSummary } from '../types.js'
import { calculateCart, getProductDetails, validatePromoCode } from '../tools/index.js'
import { formatUAH } from '../../utils/currency.js'

export const llmOutputSchema = z.object({
  message: z.string().min(1),
  turnType: z.enum([
    'ORDER_MUTATION',
    'ORDER_QUERY',
    'PROMO_QUERY',
    'PRODUCT_INFO',
    'RECOMMENDATION',
    'BUSINESS_INFO',
    'GENERAL_CONVERSATION',
  ]),
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

export type TurnType = z.infer<typeof llmOutputSchema>['turnType']

const FORBIDDEN_CURRENCY_PATTERN = /\$|usd|dollars?|cents?|eur|€/i

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

function formatOrderItemsForMessage(items: AgentProposedOrder['items']): string {
  return items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')
}

function buildDeterministicOrderMessage(
  order: AgentProposedOrder,
  turnType: TurnType,
  askToAddToCart: boolean,
): string {
  const introLine =
    turnType === 'ORDER_QUERY'
      ? `Your current order is ${formatOrderItemsForMessage(order.items)}.`
      : `Great choice. I’ve prepared ${formatOrderItemsForMessage(order.items)} for you.`

  const lines: string[] = [introLine]

  if (order.promoCode && order.discount > 0) {
    lines.push(
      `Subtotal: ${formatUAH(order.subtotal)}. Discount (${order.promoCode}): −${formatUAH(order.discount)}.`,
    )
  }

  lines.push(`Total: ${formatUAH(order.total)}.`)

  if (askToAddToCart) {
    lines.push('Would you like me to add this to your cart?')
  }

  return lines.join('\n')
}

function buildDeterministicRecommendationMessage(
  recommendations: MenuItemSummary[],
): string {
  const top = recommendations.slice(0, 4)
  if (top.length === 0) {
    return 'All menu prices are listed in Ukrainian hryvnia (₴).'
  }

  return `Here are recommendations in ₴: ${top
    .map((item) => `${item.name} — ${formatUAH(item.price)}`)
    .join(', ')}.`
}

function normalizeMessageSpacing(message: string): string {
  return message
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function stripOrderRestatement(message: string): string {
  return normalizeMessageSpacing(
    message
      .replace(/^\s*Great choice\.?\s*/i, '')
      .replace(/I['’]ve prepared[^.!?\n]*(?:[.!?]\s*)?/gi, '')
      .replace(/(?:^|\n)\s*•[^\n]*$/gm, '')
      .replace(/(?:^|\n)\s*(Subtotal|Total):[^\n]*$/gim, '')
      .replace(/Would you like me to add this to your cart\??/gi, '')
      .replace(/Add \d+ items? to cart/gi, ''),
  )
}

function hasOrderRestatementPattern(message: string): boolean {
  return (
    /great choice|i['’]ve prepared|would you like me to add this to your cart/i.test(
      message,
    ) || /(?:^|\n)\s*•[^\n]*$/m.test(message)
  )
}

function areCartItemsEqual(
  left: { productId: string; quantity: number }[],
  right: { productId: string; quantity: number }[],
): boolean {
  if (left.length !== right.length) {
    return false
  }

  const normalize = (items: { productId: string; quantity: number }[]) =>
    [...items]
      .sort((a, b) =>
        a.productId === b.productId
          ? a.quantity - b.quantity
          : a.productId.localeCompare(b.productId),
      )
      .map((item) => `${item.productId}:${item.quantity}`)

  const leftNormalized = normalize(left)
  const rightNormalized = normalize(right)
  return leftNormalized.every((value, index) => value === rightNormalized[index])
}

function shouldRestateOrderMessage({
  turnType,
  orderChanged,
}: {
  turnType: TurnType
  orderChanged: boolean
}): boolean {
  return orderChanged || turnType === 'ORDER_QUERY'
}

function buildPromoMessage({
  proposedOrder,
  promoChanged,
  promoCode,
}: {
  proposedOrder: AgentProposedOrder | null
  promoChanged: boolean
  promoCode: string | null
}): string {
  if (promoChanged && proposedOrder && promoCode) {
    if (proposedOrder.discount > 0) {
      return `${promoCode} is valid. Your updated total is ${formatUAH(proposedOrder.total)}.`
    }

    return `${promoCode} has been noted, and your current total is ${formatUAH(proposedOrder.total)}.`
  }

  return 'Yes — I can apply a valid promo code. If you have one, send it to me.'
}

function fallbackMessageForTurnType({
  turnType,
  proposedOrder,
  recommendations,
  promoChanged,
  promoCode,
  askToAddToCart,
}: {
  turnType: TurnType
  proposedOrder: AgentProposedOrder | null
  recommendations: MenuItemSummary[]
  promoChanged: boolean
  promoCode: string | null
  askToAddToCart: boolean
}): string {
  switch (turnType) {
    case 'ORDER_MUTATION':
    case 'ORDER_QUERY':
      if (proposedOrder) {
        return buildDeterministicOrderMessage(proposedOrder, turnType, askToAddToCart)
      }
      return 'You do not have a proposed order yet. Tell me what you want, and I can prepare one.'
    case 'PROMO_QUERY':
      return buildPromoMessage({ proposedOrder, promoChanged, promoCode })
    case 'RECOMMENDATION':
      return buildDeterministicRecommendationMessage(recommendations)
    default:
      return 'All menu prices are listed in Ukrainian hryvnia (₴).'
  }
}

export function enforceUahMessage({
  rawMessage,
  turnType,
  proposedOrder,
  orderChanged,
  promoChanged,
  promoCode,
  attemptedPromoCode,
  recommendations,
  askToAddToCart,
}: {
  rawMessage: string
  turnType: TurnType
  proposedOrder: AgentProposedOrder | null
  orderChanged: boolean
  promoChanged: boolean
  promoCode: string | null
  attemptedPromoCode: string
  recommendations: MenuItemSummary[]
  askToAddToCart: boolean
}): string {
  const shouldRestateOrder = shouldRestateOrderMessage({ turnType, orderChanged })

  if (proposedOrder && shouldRestateOrder) {
    return buildDeterministicOrderMessage(proposedOrder, turnType, askToAddToCart)
  }

  let normalizedMessage = normalizeMessageSpacing(rawMessage)
  if (proposedOrder && !shouldRestateOrder && hasOrderRestatementPattern(normalizedMessage)) {
    normalizedMessage = stripOrderRestatement(normalizedMessage)
  }

  if (!normalizedMessage) {
    return fallbackMessageForTurnType({
      turnType,
      proposedOrder,
      recommendations,
      promoChanged,
      promoCode,
      askToAddToCart,
    })
  }

  if (turnType === 'PROMO_QUERY' && !promoChanged && attemptedPromoCode.length === 0) {
    return buildPromoMessage({ proposedOrder, promoChanged, promoCode })
  }

  if (!FORBIDDEN_CURRENCY_PATTERN.test(normalizedMessage)) {
    if (turnType === 'PROMO_QUERY' && !promoChanged && /^great choice/i.test(normalizedMessage)) {
      return buildPromoMessage({ proposedOrder, promoChanged, promoCode })
    }
    return normalizedMessage
  }

  return fallbackMessageForTurnType({
    turnType,
    proposedOrder,
    recommendations,
    promoChanged,
    promoCode,
    askToAddToCart,
  })
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
  const previousItems = sessionState.proposedItems.map((item) => ({ ...item }))
  const previousPromoCode = sessionState.promoCode

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
Set turnType to one of:
- ORDER_MUTATION (create/add/remove/replace/quantity change)
- ORDER_QUERY (user asks for current order or total)
- PROMO_QUERY (promo/discount question or promo application)
- PRODUCT_INFO (ingredients/allergens/product details)
- RECOMMENDATION (suggestions/budget/taste alternatives)
- BUSINESS_INFO (hours/location/contact/payment options)
- GENERAL_CONVERSATION (other)
When a field is not relevant, use safe empty values:
- arrays: []
- booleans: false
- promoCode: ""
Never use $, USD, dollars, cents, EUR, or €.
All menu prices are in Ukrainian hryvnia (UAH). Numeric values are whole hryvnias, never cents.
Never divide prices by 100 and never convert currencies.
Only restate the full order in message when turnType is ORDER_MUTATION or ORDER_QUERY.
For PROMO_QUERY, PRODUCT_INFO, RECOMMENDATION, BUSINESS_INFO, and GENERAL_CONVERSATION: answer directly and avoid repeating the full order summary.
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

  const orderChanged = !areCartItemsEqual(previousItems, nextState.proposedItems)
  const promoChanged = (previousPromoCode ?? '') !== (nextState.promoCode ?? '')

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

  const safeMessage = enforceUahMessage({
    rawMessage: promoInvalidMessage ?? parsedOutput.message,
    turnType: parsedOutput.turnType,
    proposedOrder,
    orderChanged,
    promoChanged,
    promoCode: nextState.promoCode,
    attemptedPromoCode: requestedPromoCode,
    recommendations,
    askToAddToCart: parsedOutput.askToAddToCart,
  })

  return {
    mode: 'llm',
    message: safeMessage,
    payload: Object.keys(payload).length > 0 ? payload : undefined,
    sessionState: nextState,
  }
}
