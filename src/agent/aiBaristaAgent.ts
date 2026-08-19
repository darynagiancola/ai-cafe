import { menuService } from '../services/menuService'
import { AI_BARISTA_SYSTEM_PROMPT, DEFAULT_SUGGESTED_PROMPTS } from './prompts/aiBaristaPrompt'
import {
  calculateCart,
  getBusinessInfo,
  getMenu,
  getProductDetails,
  searchMenu,
  validatePromoCode,
} from './tools'
import { normalizeText, resolveProductFromQuery } from './tools/helpers'
import type {
  AgentProposedOrder,
  AgentResponse,
  CalculatedLineItem,
  SessionMemoryState,
} from './types'

const TOOL_NAMES = [
  'getMenu',
  'getProductDetails',
  'searchMenu',
  'calculateCart',
  'validatePromoCode',
  'getBusinessInfo',
] as const

const QUANTITY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
}

const ORDER_INTENT_PATTERNS = [
  /\badd\b/,
  /\border\b/,
  /\bi want\b/,
  /\bi'd like\b/,
  /\bi would like\b/,
  /\bi'll take\b/,
  /\bi will take\b/,
  /\bgive me\b/,
  /\bcan i have\b/,
  /\bcan i get\b/,
]

const DISCOUNT_INTENT_PATTERNS = [
  /\bdiscount\b/,
  /\bdiscounts\b/,
  /\bpromo\b/,
  /\bpromotion\b/,
  /\bpromo code\b/,
  /\bapply\b/,
  /\boff\b/,
  /%/,
]

function createInitialMemoryState(): SessionMemoryState {
  return {
    discussedProductIds: [],
    selectedItems: [],
    proposedOrder: null,
    budget: null,
    tastePreferences: [],
    excludedIngredients: [],
    dietaryPreferences: [],
    promoCode: null,
  }
}

function parseBudget(input: string): number | null {
  const match = input.match(/(\d{2,5})\s*₴?/)
  if (!match) {
    return null
  }

  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePromoCode(input: string): string | null {
  const tokenMatches = input.match(/\b[a-zA-Z][a-zA-Z0-9]{3,}\b/g) ?? []
  for (const token of tokenMatches) {
    const hasDigit = /\d/.test(token)
    const isLikelyCodeStyle = token === token.toUpperCase() && token.length >= 4
    if (hasDigit || isLikelyCodeStyle) {
      return token.toUpperCase()
    }
  }

  return null
}

function getMentionedProductQuery(input: string): string | null {
  const normalizedInput = normalizeText(input)
  const products = menuService.getAllProducts()

  for (const product of products) {
    const name = normalizeText(product.name)
    if (normalizedInput.includes(name)) {
      return product.name
    }

    const keyTokens = name.split(' ').filter((token) => token.length > 4)
    const tokenMatch = keyTokens.find((token) => normalizedInput.includes(token))
    if (tokenMatch) {
      return tokenMatch
    }
  }

  return null
}

function mergeSelectedItems(
  current: CalculatedLineItem[],
  incoming: CalculatedLineItem[],
): CalculatedLineItem[] {
  const next = [...current]

  for (const item of incoming) {
    const existing = next.find((candidate) => candidate.productId === item.productId)
    if (existing) {
      existing.quantity += item.quantity
      existing.lineTotal = existing.quantity * existing.unitPrice
      continue
    }

    next.push({ ...item })
  }

  return next
}

function parseOrderItemsFromText(input: string): { product: string; quantity: number }[] {
  const cleanInput = normalizeText(input)
  const splitParts = cleanInput.split(/,| and |\+| та /i).map((part) => part.trim())
  const items: { product: string; quantity: number }[] = []
  const products = menuService.getAllProducts()

  const singularizeWord = (word: string) => {
    if (word.endsWith('ies')) {
      return `${word.slice(0, -3)}y`
    }

    return word.endsWith('s') ? word.slice(0, -1) : word
  }

  const normalizeForMatching = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => singularizeWord(token))
      .join(' ')
  }

  for (const part of splitParts) {
    if (!part) {
      continue
    }

    const normalizedPart = part
      .replace(/^please\s+/i, '')
      .replace(/^give me\s+/i, '')
      .replace(/^i want\s+/i, '')
      .replace(/^can i get\s+/i, '')
      .replace(/^add\s+/i, '')
      .replace(/\bto my order\b/i, '')
      .replace(/\bplease\b/i, '')
      .trim()

    const quantityMatch = normalizedPart.match(/\b(\d+|a|an|one|two|three|four|five|six)\b/)
    const quantityRaw = quantityMatch?.[1] ?? '1'
    const quantity = Number.isFinite(Number(quantityRaw))
      ? Number(quantityRaw)
      : (QUANTITY_WORDS[quantityRaw] ?? 1)

    const query = normalizedPart
      .replace(/^(\d+|a|an|one|two|three|four|five|six)\s+/i, '')
      .trim()
      .replace(/[.!?]/g, '')

    if (!query) {
      continue
    }

    const directResolved = resolveProductFromQuery(query)
    const normalizedQuery = normalizeForMatching(query)
    const fuzzyResolved = products
      .map((product) => ({
        product,
        key: normalizeForMatching(product.name),
      }))
      .sort((a, b) => b.key.length - a.key.length)
      .find(({ key }) => normalizedQuery.includes(key) || key.includes(normalizedQuery))
      ?.product

    const resolved = directResolved ?? fuzzyResolved
    if (!resolved) {
      continue
    }

    items.push({
      product: resolved.id,
      quantity: Math.max(1, quantity),
    })
  }

  return items
}

function hasOrderIntent(input: string): boolean {
  return ORDER_INTENT_PATTERNS.some((pattern) => pattern.test(input))
}

function hasDiscountIntent(input: string): boolean {
  return DISCOUNT_INTENT_PATTERNS.some((pattern) => pattern.test(input))
}

function parseRequestedDiscountPercent(input: string): number | null {
  const percentMatch =
    input.match(/(\d{1,2})\s*%/) ??
    input.match(/(\d{1,2})\s*percent\b/) ??
    input.match(/(\d{1,2})\s*off\b/)

  if (!percentMatch) {
    return null
  }

  const value = Number.parseInt(percentMatch[1], 10)
  return Number.isFinite(value) ? value : null
}

function formatOrderSummary(proposal: AgentProposedOrder): string {
  const lines = proposal.items
    .map((item) => `• ${item.productName} × ${item.quantity} — ₴${item.lineTotal}`)
    .join('\n')
  const discountLine =
    proposal.discount > 0 && proposal.promoCode
      ? `\n${proposal.promoCode}: −₴${proposal.discount}`
      : ''

  return `${lines}\n\nSubtotal: ₴${proposal.subtotal}${discountLine}\nTotal: ₴${proposal.total}`
}

function toProposedOrder(
  lineItems: CalculatedLineItem[],
  promoCode: string | null,
): AgentProposedOrder {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  let discount = 0

  if (promoCode) {
    const promo = validatePromoCode({
      promoCode,
      items: lineItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
      })),
    })
    if (promo.isValid) {
      discount = promo.discountAmount
    }
  }

  return {
    items: lineItems,
    subtotal,
    discount,
    deliveryFee: 0,
    total: Math.max(subtotal - discount, 0),
    promoCode: promoCode ?? undefined,
  }
}

export class AureliaAiBaristaAgent {
  private readonly systemPrompt = AI_BARISTA_SYSTEM_PROMPT
  private memory: SessionMemoryState = createInitialMemoryState()

  getAvailableToolNames(): string[] {
    return [...TOOL_NAMES]
  }

  getSystemPrompt(): string {
    return this.systemPrompt
  }

  getSuggestedPrompts(): string[] {
    return DEFAULT_SUGGESTED_PROMPTS
  }

  resetSession() {
    this.memory = createInitialMemoryState()
  }

  consumeProposedOrderForCart():
    | { items: { productId: string; quantity: number }[]; summary: string }
    | null {
    if (!this.memory.proposedOrder) {
      return null
    }

    const proposal = this.memory.proposedOrder
    this.memory.selectedItems = mergeSelectedItems(this.memory.selectedItems, proposal.items)
    this.memory.proposedOrder = null

    return {
      items: proposal.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      summary: `${proposal.items.length} item(s) added to your cart.`,
    }
  }

  async handleMessage(input: string): Promise<AgentResponse> {
    const trimmedInput = input.trim()
    const normalizedInput = normalizeText(trimmedInput)

    if (!trimmedInput) {
      return {
        message: 'Tell me what you are in the mood for and I will help.',
        payload: { suggestedPrompts: this.getSuggestedPrompts() },
      }
    }

    const budget = parseBudget(trimmedInput)
    if (budget !== null) {
      this.memory.budget = budget
    }

    if (
      normalizedInput.includes("i've paid") ||
      normalizedInput.includes('i paid') ||
      normalizedInput.includes('mark my order as paid')
    ) {
      return {
        message:
          'I cannot mark orders as paid. Payment status must be confirmed by the payment/backend system.',
      }
    }

    if (
      normalizedInput.includes('sweet') &&
      (normalizedInput.includes('not too heavy') || normalizedInput.includes('light'))
    ) {
      return {
        message:
          'Would you prefer something fruity or more cinnamon/chocolate-forward?',
      }
    }

    const requestedPercent = parseRequestedDiscountPercent(normalizedInput)
    const promoCodeCandidate = parsePromoCode(trimmedInput)
    const hasPromoApplyIntent =
      /\b(apply|use)\b/.test(normalizedInput) && Boolean(promoCodeCandidate)

    if (hasDiscountIntent(normalizedInput) || hasPromoApplyIntent) {
      if (normalizedInput.includes('half price') || requestedPercent !== null) {
        return {
          message:
            'I cannot invent discounts. I can only apply valid promo codes such as WELCOME10 through the official promo rules.',
        }
      }

      if (
        !promoCodeCandidate &&
        (normalizedInput.includes('i have a promo code') ||
          normalizedInput.includes('i have promo code'))
      ) {
        return {
          message:
            'Great — share the promo code and I will validate it using official promo rules.',
        }
      }

      if (!promoCodeCandidate) {
        const welcome = validatePromoCode({ promoCode: 'WELCOME10' })
        if (welcome.isValid) {
          return {
            message:
              'Discounts are available only through valid promo rules. You can use WELCOME10 for the current demo offer.',
          }
        }

        return {
          message:
            'Discounts are available only through valid promo codes. Share a promo code and I will validate it for you.',
        }
      }

      const cartItemsForPromo =
        this.memory.proposedOrder?.items ??
        this.memory.selectedItems

      const promo = validatePromoCode({
        promoCode: promoCodeCandidate,
        items: cartItemsForPromo.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
        })),
      })

      if (!promo.isValid) {
        return {
          message:
            `${promo.message} I can only apply valid promo codes from the official promo rules.`,
        }
      }

      this.memory.promoCode = promo.code

      if (this.memory.proposedOrder) {
        this.memory.proposedOrder = {
          ...this.memory.proposedOrder,
          promoCode: promo.code,
          discount: promo.discountAmount,
          total: promo.updatedTotal + this.memory.proposedOrder.deliveryFee,
        }
      }

      return {
        message: `${promo.code} is valid. Discount: ₴${promo.discountAmount}. Updated total: ₴${promo.updatedTotal}.`,
      }
    }

    const orderItems = parseOrderItemsFromText(trimmedInput)
    const isOrderBuildRequest =
      orderItems.length > 0 && hasOrderIntent(normalizedInput)

    if (isOrderBuildRequest) {
      const cart = calculateCart({ items: orderItems })
      if (cart.items.length === 0) {
        return {
          message:
            'I could not match those products in the menu. Please name the item again and I will help.',
        }
      }

      const proposal = toProposedOrder(cart.items, this.memory.promoCode)
      this.memory.proposedOrder = proposal
      this.memory.discussedProductIds.push(...proposal.items.map((item) => item.productId))

      return {
        message: `Great choice.\n\n${formatOrderSummary(proposal)}\n\nWould you like me to add this to your cart?`,
        payload: {
          proposedOrder: proposal,
          confirmAddToCart: {
            label: `Add ${proposal.items.reduce((sum, item) => sum + item.quantity, 0)} item${proposal.items.reduce((sum, item) => sum + item.quantity, 0) > 1 ? 's' : ''} to cart`,
            items: proposal.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      }
    }

    if (hasOrderIntent(normalizedInput) && orderItems.length === 0) {
      if (
        normalizedInput.includes('something') ||
        normalizedInput.includes('drink') ||
        normalizedInput.includes('dessert') ||
        normalizedInput.includes('food')
      ) {
        return {
          message:
            'Happy to help. Which exact item would you like to order from the menu?',
        }
      }

      return {
        message:
          'I could not find that product in the menu. Please share the exact item name and I will prepare it for your cart.',
      }
    }

    if (
      normalizedInput.includes('dessert') &&
      (normalizedInput.includes('what') || normalizedInput.includes('have') || normalizedInput.includes('?'))
    ) {
      const desserts = getMenu({ category: 'Desserts', onlyAvailable: true }).items
      return {
        message: `Here are our current desserts: ${desserts
          .map((item) => `${item.name} (₴${item.price})`)
          .join(', ')}.`,
        payload: { recommendations: desserts },
      }
    }

    if (
      normalizedInput.includes("what's in") ||
      normalizedInput.includes('what is in') ||
      normalizedInput.includes('ingredients')
    ) {
      const query = getMentionedProductQuery(trimmedInput)
      if (!query) {
        return {
          message: 'Tell me the exact item name and I will share its ingredients.',
        }
      }

      const details = getProductDetails({ query })
      if (!details.found || !details.product) {
        return { message: details.message ?? 'I could not find that product.' }
      }

      this.memory.discussedProductIds.push(details.product.id)

      return {
        message: `${details.product.name} includes: ${details.product.ingredients.join(', ')}.`,
      }
    }

    if (normalizedInput.includes('allergen')) {
      const query = getMentionedProductQuery(trimmedInput)
      if (!query) {
        return {
          message:
            'Please tell me which product you want to check. I can share listed allergens and ingredients.',
        }
      }

      const details = getProductDetails({ query })
      if (!details.found || !details.product) {
        return { message: details.message ?? 'I could not find that product.' }
      }

      const allergensText =
        details.product.allergens.length > 0
          ? details.product.allergens.join(', ')
          : 'No allergens are explicitly listed'

      return {
        message: `${details.product.name}: listed allergens — ${allergensText}. Listed ingredients: ${details.product.ingredients.join(
          ', ',
        )}. I can only rely on listed data and cannot guarantee medical allergy safety.`,
      }
    }

    if (
      normalizedInput.includes("don't drink coffee") ||
      normalizedInput.includes('do not drink coffee') ||
      normalizedInput.includes('without coffee')
    ) {
      const nonCoffee = searchMenu({ query: trimmedInput })
        .items.filter(
          (item) =>
            item.category !== 'Coffee' &&
            item.category !== 'Coffee Beans' &&
            item.category !== 'Gifts',
        )
        .slice(0, 4)

      return {
        message: `Great non-coffee options: ${nonCoffee
          .map((item) => `${item.name} (₴${item.price})`)
          .join(', ')}.`,
        payload: { recommendations: nonCoffee },
      }
    }

    if (
      normalizedInput.includes('recommend') ||
      normalizedInput.includes('under') ||
      normalizedInput.includes('budget')
    ) {
      const workingBudget = budget ?? this.memory.budget
      const matches = searchMenu({
        query: trimmedInput,
        maxBudget: workingBudget ?? undefined,
      }).items

      const drinks = matches.filter(
        (item) => item.category === 'Coffee' || item.category === 'Matcha & Specialty Drinks',
      )
      const sweets = matches.filter((item) => item.category === 'Desserts')

      if (workingBudget && drinks.length > 0 && sweets.length > 0) {
        const combinations = drinks
          .flatMap((drink) =>
            sweets.map((sweet) => ({
              drink,
              sweet,
              total: drink.price + sweet.price,
            })),
          )
          .filter((combo) => combo.total <= workingBudget)
          .sort((a, b) => b.total - a.total)

        if (combinations.length > 0) {
          const best = combinations[0]
          return {
            message: `Within ₴${workingBudget}, I recommend ${best.drink.name} + ${best.sweet.name} for ₴${best.total}. Would you like a lighter or sweeter alternative as well?`,
            payload: { recommendations: [best.drink, best.sweet] },
          }
        }
      }

      return {
        message: `Here are strong picks from our menu: ${matches
          .slice(0, 4)
          .map((item) => `${item.name} (₴${item.price})`)
          .join(', ')}.`,
        payload: { recommendations: matches.slice(0, 4) },
      }
    }

    if (
      normalizedInput.includes('where') ||
      normalizedInput.includes('address') ||
      normalizedInput.includes('open') ||
      normalizedInput.includes('hours') ||
      normalizedInput.includes('phone') ||
      normalizedInput.includes('email')
    ) {
      const info = getBusinessInfo({ topic: 'all' })
      return {
        message: `${info.brandName} is at ${info.address}. Hours: ${info.openingHours?.join(' | ')}. Contact: ${info.contact?.phone}, ${info.contact?.email}. Pickup and delivery are available.`,
      }
    }

    return {
      message:
        'I can help with menu recommendations, ingredients, allergens, budgets, promo codes, and preparing an order for your cart.',
      payload: { suggestedPrompts: this.getSuggestedPrompts() },
    }
  }
}
