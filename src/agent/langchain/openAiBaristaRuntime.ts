import type { StructuredTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { createAgent } from 'langchain'
import { z } from 'zod'
import { DEFAULT_SUGGESTED_PROMPTS } from '../prompts/aiBaristaPrompt.js'
import type { AgentMessagePayload, AgentProposedOrder, MenuItemSummary } from '../types.js'
import {
  calculateCart,
  getMenu,
  getProductDetails,
  searchMenu,
  validatePromoCode,
} from '../tools/index.js'
import { formatUAH } from '../../utils/currency.js'

export const llmOutputSchema = z.object({
  message: z.string().min(1),
  turnType: z.enum([
    'RECOMMENDATION_SEARCH',
    'ORDER_CREATE',
    'ORDER_ADD',
    'ORDER_REMOVE',
    'ORDER_REPLACE',
    'ORDER_QUANTITY_CHANGE',
    'ORDER_QUERY',
    'PROMO_QUERY',
    'PRODUCT_INFO',
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
const ORDER_TURN_TYPES: TurnType[] = [
  'ORDER_CREATE',
  'ORDER_ADD',
  'ORDER_REMOVE',
  'ORDER_REPLACE',
  'ORDER_QUANTITY_CHANGE',
  'ORDER_QUERY',
]

export interface RecommendationOption {
  itemNames: string[]
  total: number
}

export interface RecommendationSearchResult {
  message: string
  recommendations: MenuItemSummary[]
  options: RecommendationOption[]
}

function normalizeForIntent(input: string): string {
  return input.toLowerCase().trim()
}

function extractBudgetLimit(input: string): number | null {
  const explicitBudget = input.match(
    /(?:under|below|up to|<=?|within|до)\s*([0-9]{2,5})\s*(?:₴|uah|грн)?/i,
  )
  if (explicitBudget) {
    return Number(explicitBudget[1])
  }

  const amountWithCurrency = input.match(/([0-9]{2,5})\s*(?:₴|uah|грн)/i)
  return amountWithCurrency ? Number(amountWithCurrency[1]) : null
}

function includesAny(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input))
}

export function classifyTurnTypeFromMessage(input: string): TurnType {
  const normalized = normalizeForIntent(input)
  const budgetLimit = extractBudgetLimit(normalized)
  const recommendationPhrases = includesAny(normalized, [
    /\brecommend\b/,
    /what can i (?:have|get|try)/,
    /\bcheaper option\b/,
    /\bsomething sweet\b/,
    /\bwhich .* recommend\b/,
  ])
  const recommendationWithConstraint =
    includesAny(normalized, [/\bvegan\b/, /\bbreakfast\b/, /\bdessert\b/]) &&
    includesAny(normalized, [/\bunder\b/, /\bbelow\b/, /\bwithin\b/, /\bfor\b/])

  if (recommendationPhrases || budgetLimit !== null || recommendationWithConstraint) {
    return 'RECOMMENDATION_SEARCH'
  }

  if (
    includesAny(normalized, [
      /\bstart over\b/,
      /\bnew order\b/,
      /\bclear(?: my)? order\b/,
      /\breset\b/,
    ])
  ) {
    return 'ORDER_REPLACE'
  }

  if (
    includesAny(normalized, [
      /\bwhat(?:'s| is) my (?:total|order)\b/,
      /\bshow (?:my )?(?:order|total)\b/,
      /\btotal now\b/,
    ])
  ) {
    return 'ORDER_QUERY'
  }

  if (
    includesAny(normalized, [
      /\bpromo\b/,
      /\bdiscount\b/,
      /\boffer\b/,
      /\bcoupon\b/,
      /\bwelcome10\b/,
    ])
  ) {
    return 'PROMO_QUERY'
  }

  if (
    includesAny(normalized, [
      /\ballergen\b/,
      /\bingredient\b/,
      /\bcontains?\b/,
      /what(?:'s| is) in\b/,
    ])
  ) {
    return 'PRODUCT_INFO'
  }

  if (
    includesAny(normalized, [
      /\btime do you close\b/,
      /\bhours?\b/,
      /\bopen\b/,
      /\baddress\b/,
      /\bcontact\b/,
      /\bpay by card\b/,
      /\bpayment\b/,
    ])
  ) {
    return 'BUSINESS_INFO'
  }

  if (includesAny(normalized, [/\breplace\b/, /\bswap\b/])) {
    return 'ORDER_REPLACE'
  }

  if (includesAny(normalized, [/\bremove\b/, /\bdelete\b/, /\bwithout\b/])) {
    return 'ORDER_REMOVE'
  }

  if (
    includesAny(normalized, [
      /\bmake that\b/,
      /\bchange (?:it )?to\b/,
      /\bincrease\b/,
      /\bdecrease\b/,
    ])
  ) {
    return 'ORDER_QUANTITY_CHANGE'
  }

  if (includesAny(normalized, [/\badd\b/, /\balso\b/, /\binclude\b/])) {
    return 'ORDER_ADD'
  }

  if (includesAny(normalized, [/\bi want\b/, /\bcan i have\b/, /\bi'?ll take\b/, /\border\b/])) {
    return 'ORDER_CREATE'
  }

  return 'GENERAL_CONVERSATION'
}

function resolveEffectiveTurnType({
  userMessageTurnType,
  modelTurnType,
}: {
  userMessageTurnType: TurnType
  modelTurnType: TurnType
}): TurnType {
  if (userMessageTurnType === 'GENERAL_CONVERSATION') {
    return modelTurnType
  }

  if (
    userMessageTurnType === 'RECOMMENDATION_SEARCH' ||
    userMessageTurnType === 'ORDER_QUERY' ||
    userMessageTurnType === 'PROMO_QUERY' ||
    userMessageTurnType === 'PRODUCT_INFO' ||
    userMessageTurnType === 'BUSINESS_INFO'
  ) {
    return userMessageTurnType
  }

  if (ORDER_TURN_TYPES.includes(userMessageTurnType)) {
    return userMessageTurnType
  }

  return modelTurnType
}

function isVeganItem(item: MenuItemSummary): boolean {
  return item.dietaryTags.some((tag) => tag.toLowerCase() === 'vegan')
}

function buildCoffeeSweetOptions({
  budgetLimit,
  veganOnly,
}: {
  budgetLimit: number | null
  veganOnly: boolean
}): RecommendationOption[] {
  const coffees = getMenu({ category: 'Coffee', onlyAvailable: true }).items.filter((item) =>
    veganOnly ? isVeganItem(item) : true,
  )
  const sweets = getMenu({ category: 'Desserts', onlyAvailable: true }).items.filter((item) =>
    veganOnly ? isVeganItem(item) : true,
  )

  const options: RecommendationOption[] = []
  for (const coffee of coffees) {
    for (const sweet of sweets) {
      const calculated = calculateCart({
        items: [
          { product: coffee.id, quantity: 1 },
          { product: sweet.id, quantity: 1 },
        ],
      })
      const total = calculated.subtotal
      if (budgetLimit !== null && total > budgetLimit) {
        continue
      }
      options.push({ itemNames: [coffee.name, sweet.name], total })
    }
  }

  return options.sort((a, b) => a.total - b.total).slice(0, 3)
}

function buildSingleItemOptions(
  items: MenuItemSummary[],
  budgetLimit: number | null,
): RecommendationOption[] {
  return items
    .filter((item) => (budgetLimit !== null ? item.price <= budgetLimit : true))
    .map((item) => ({ itemNames: [item.name], total: item.price }))
    .sort((a, b) => a.total - b.total)
    .slice(0, 4)
}

export function buildRecommendationSearchResponse(
  input: string,
): RecommendationSearchResult {
  const normalized = normalizeForIntent(input)
  const budgetLimit = extractBudgetLimit(normalized)
  const veganOnly = /\bvegan\b/.test(normalized)
  const wantsCoffee = /\bcoffee|cappuccino|espresso|latte|flat white|cold brew\b/.test(
    normalized,
  )
  const wantsSweet =
    /\bsweet|dessert|cake|roll|croissant|cheesecake|pastry|cinnamon\b/.test(
      normalized,
    )
  const wantsBreakfast = /\bbreakfast|brunch|toast|eggs|pancake\b/.test(normalized)

  const recommendations = searchMenu({
    query: input,
    maxBudget: budgetLimit ?? undefined,
    dietaryPreferences: veganOnly ? ['vegan'] : undefined,
  }).items

  let options: RecommendationOption[] = []
  if (wantsCoffee && wantsSweet) {
    options = buildCoffeeSweetOptions({ budgetLimit, veganOnly })
  } else if (wantsBreakfast) {
    const breakfastItems = getMenu({
      category: 'Breakfast',
      onlyAvailable: true,
    }).items.filter((item) => (veganOnly ? isVeganItem(item) : true))
    options = buildSingleItemOptions(breakfastItems, budgetLimit)
  } else {
    options = buildSingleItemOptions(recommendations, budgetLimit)
  }

  if (options.length === 0) {
    const budgetLabel = budgetLimit !== null ? ` under ${formatUAH(budgetLimit)}` : ''
    return {
      message: `I couldn't find an available option${budgetLabel} that matches those preferences. Try a slightly higher budget or different constraints.`,
      recommendations: recommendations.slice(0, 4),
      options,
    }
  }

  const optionsText = options
    .map((option) => `${option.itemNames.join(' + ')} — ${formatUAH(option.total)}`)
    .join('; ')
  const budgetPrefix =
    budgetLimit !== null ? `Under ${formatUAH(budgetLimit)}, ` : ''

  return {
    message: `${budgetPrefix}you could have: ${optionsText}. Tell me which option to add to your order.`,
    recommendations: recommendations.slice(0, 6),
    options,
  }
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
    case 'ORDER_CREATE':
    case 'ORDER_ADD':
    case 'ORDER_REMOVE':
    case 'ORDER_REPLACE':
    case 'ORDER_QUANTITY_CHANGE':
    case 'ORDER_QUERY':
      if (proposedOrder) {
        return buildDeterministicOrderMessage(proposedOrder, turnType, askToAddToCart)
      }
      return 'You do not have a proposed order yet. Tell me what you want, and I can prepare one.'
    case 'PROMO_QUERY':
      return buildPromoMessage({ proposedOrder, promoChanged, promoCode })
    case 'RECOMMENDATION_SEARCH':
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
  const userMessageTurnType = classifyTurnTypeFromMessage(message)

  if (isRestrictedPaidStatusRequest(message)) {
    return {
      mode: 'llm',
      message:
        'I cannot mark orders as paid. Payment status must be confirmed by the payment/backend system.',
      sessionState,
    }
  }

  if (userMessageTurnType === 'RECOMMENDATION_SEARCH') {
    const recommendationResult = buildRecommendationSearchResponse(message)
    return {
      mode: 'llm',
      message: recommendationResult.message,
      sessionState,
      payload: {
        recommendations: recommendationResult.recommendations,
        suggestedPrompts: [
          'Add the first option',
          'Show another option under 400 ₴',
          'What is currently in my order?',
        ],
      },
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
- RECOMMENDATION_SEARCH (menu search/recommendations with constraints)
- ORDER_CREATE
- ORDER_ADD
- ORDER_REMOVE
- ORDER_REPLACE
- ORDER_QUANTITY_CHANGE
- ORDER_QUERY (user asks for current order or total)
- PROMO_QUERY (promo/discount question or promo application)
- PRODUCT_INFO (ingredients/allergens/product details)
- BUSINESS_INFO (hours/location/contact/payment options)
- GENERAL_CONVERSATION (other)
When a field is not relevant, use safe empty values:
- arrays: []
- booleans: false
- promoCode: ""
Never use $, USD, dollars, cents, EUR, or €.
All menu prices are in Ukrainian hryvnia (UAH). Numeric values are whole hryvnias, never cents.
Never divide prices by 100 and never convert currencies.
Only restate the full order in message when turnType is ORDER_CREATE, ORDER_ADD, ORDER_REMOVE, ORDER_REPLACE, ORDER_QUANTITY_CHANGE, or ORDER_QUERY.
For PROMO_QUERY, PRODUCT_INFO, RECOMMENDATION_SEARCH, BUSINESS_INFO, and GENERAL_CONVERSATION: answer directly and avoid repeating the full order summary.
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

  const execution = await agent.invoke({ messages })
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

  const effectiveTurnType = resolveEffectiveTurnType({
    userMessageTurnType,
    modelTurnType: parsedOutput.turnType,
  })

  const nextState: BaristaSessionState = {
    ...sessionState,
    proposedItems: [...sessionState.proposedItems],
  }
  if (parsedOutput.clearProposedOrder && effectiveTurnType === 'ORDER_REPLACE') {
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

  const orderMutationTurn =
    effectiveTurnType === 'ORDER_CREATE' ||
    effectiveTurnType === 'ORDER_ADD' ||
    effectiveTurnType === 'ORDER_REMOVE' ||
    effectiveTurnType === 'ORDER_REPLACE' ||
    effectiveTurnType === 'ORDER_QUANTITY_CHANGE'

  let proposedOrder: AgentProposedOrder | null = null
  if (orderMutationTurn && parsedOutput.proposedItems.length > 0) {
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

  const shouldExposeProposedOrder =
    proposedOrder !== null &&
    (ORDER_TURN_TYPES.includes(effectiveTurnType) || promoChanged)
  if (shouldExposeProposedOrder && proposedOrder) {
    payload.proposedOrder = proposedOrder
  }

  if (parsedOutput.suggestedPrompts.length > 0) {
    payload.suggestedPrompts = parsedOutput.suggestedPrompts.slice(0, 4)
  } else if (!parsedOutput.askToAddToCart) {
    payload.suggestedPrompts = DEFAULT_SUGGESTED_PROMPTS
  }

  if (shouldExposeProposedOrder && parsedOutput.askToAddToCart && proposedOrder) {
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
    turnType: effectiveTurnType,
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
