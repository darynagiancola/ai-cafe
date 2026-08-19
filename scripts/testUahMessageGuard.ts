import { enforceUahMessage } from '../src/agent/langchain/openAiBaristaRuntime.js'
import type { TurnType } from '../src/agent/langchain/openAiBaristaRuntime.js'
import type { AgentProposedOrder, MenuItemSummary } from '../src/agent/types.js'
import { calculateCart, validatePromoCode } from '../src/agent/tools/index.js'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertNoForeignCurrency(text: string) {
  assert(!/\$|usd|dollars?|cents?|eur|€/i.test(text), `Unexpected foreign currency in message: ${text}`)
}

function buildOrder(items: { product: string; quantity: number }[]): AgentProposedOrder {
  const calculated = calculateCart({ items })
  return {
    items: calculated.items,
    subtotal: calculated.subtotal,
    discount: 0,
    deliveryFee: 0,
    total: calculated.subtotal,
  }
}

function buildPromoOrder(
  items: { product: string; quantity: number }[],
  promoCode: string,
): AgentProposedOrder {
  const calculated = calculateCart({ items })
  const promo = validatePromoCode({
    promoCode,
    items: calculated.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    })),
  })

  return {
    items: calculated.items,
    subtotal: calculated.subtotal,
    discount: promo.isValid ? promo.discountAmount : 0,
    deliveryFee: 0,
    total: promo.isValid ? promo.updatedTotal : calculated.subtotal,
    promoCode: promo.isValid ? promo.code : undefined,
  }
}

function runScenario(
  name: string,
  input: {
    rawMessage: string
    turnType: TurnType
    proposedOrder: AgentProposedOrder | null
    orderChanged?: boolean
    promoChanged?: boolean
    promoCode?: string | null
    recommendations?: MenuItemSummary[]
    askToAddToCart?: boolean
  },
  checks: (message: string) => void,
) {
  const message = enforceUahMessage({
    rawMessage: input.rawMessage,
    turnType: input.turnType,
    proposedOrder: input.proposedOrder,
    orderChanged: input.orderChanged ?? Boolean(input.proposedOrder),
    promoChanged: input.promoChanged ?? false,
    promoCode: input.promoCode ?? input.proposedOrder?.promoCode ?? null,
    attemptedPromoCode: input.promoCode ?? '',
    recommendations: input.recommendations ?? [],
    askToAddToCart: input.askToAddToCart ?? false,
  })

  checks(message)
  assertNoForeignCurrency(message)
  console.log(`PASS: ${name}`)
}

runScenario(
  'I want avocado toast and cappuccino',
  {
    rawMessage: 'Avocado Toast — $2.35. Cappuccino — $1.20.',
    turnType: 'ORDER_MUTATION',
    proposedOrder: buildOrder([
      { product: 'avocado toast', quantity: 1 },
      { product: 'cappuccino', quantity: 1 },
    ]),
    askToAddToCart: true,
  },
  (message) => {
    assert(message.includes('355'), `Expected total 355 in message: ${message}`)
    assert(message.includes('₴'), `Expected hryvnia symbol in message: ${message}`)
  },
)

runScenario(
  'I want two cappuccinos',
  {
    rawMessage: 'Two cappuccinos for $2.40.',
    turnType: 'ORDER_MUTATION',
    proposedOrder: buildOrder([{ product: 'cappuccino', quantity: 2 }]),
    askToAddToCart: true,
  },
  (message) => {
    assert(message.includes('240'), `Expected total 240 in message: ${message}`)
    assert(message.includes('₴'), `Expected hryvnia symbol in message: ${message}`)
  },
)

runScenario(
  'What can I get for 300 ₴?',
  {
    rawMessage: 'You can get Berry Cheesecake for $1.90 and cappuccino for $1.20.',
    turnType: 'RECOMMENDATION',
    proposedOrder: null,
    recommendations: [
      {
        id: 'prod-cappuccino',
        slug: 'cappuccino',
        name: 'Cappuccino',
        category: 'Coffee',
        price: 120,
        description: 'Velvety espresso with microfoam and a cocoa finish.',
        dietaryTags: ['Vegetarian'],
        available: true,
      },
      {
        id: 'prod-cinnamon-roll',
        slug: 'cinnamon-roll-cinnabon-style',
        name: 'Cinnamon Roll',
        category: 'Desserts',
        price: 145,
        description: 'Soft Cinnabon-style roll with cream-cheese icing.',
        dietaryTags: ['Vegetarian'],
        available: true,
      },
    ],
  },
  (message) => {
    assert(message.includes('₴'), `Expected hryvnia symbol in message: ${message}`)
    assert(message.includes('Cappuccino'), `Expected recommendation names in message: ${message}`)
  },
)

runScenario(
  'Apply WELCOME10',
  {
    rawMessage: 'WELCOME10 applied. New total is $3.19.',
    turnType: 'PROMO_QUERY',
    proposedOrder: buildPromoOrder(
      [
        { product: 'avocado toast', quantity: 1 },
        { product: 'cappuccino', quantity: 1 },
      ],
      'WELCOME10',
    ),
    promoChanged: true,
    promoCode: 'WELCOME10',
  },
  (message) => {
    assert(message.includes('WELCOME10'), `Expected promo code in message: ${message}`)
    assert(message.includes('₴'), `Expected hryvnia symbol in message: ${message}`)
    assert(message.includes('319'), `Expected total 319 in message: ${message}`)
  },
)

console.log('UAH currency guard scenarios passed.')
