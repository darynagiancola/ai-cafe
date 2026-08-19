import { enforceUahMessage } from '../src/agent/langchain/openAiBaristaRuntime.js'
import type { AgentProposedOrder } from '../src/agent/types.js'
import { calculateCart } from '../src/agent/tools/index.js'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function makeOrder(items: { product: string; quantity: number }[]): AgentProposedOrder {
  const cart = calculateCart({ items })
  return {
    items: cart.items,
    subtotal: cart.subtotal,
    discount: 0,
    deliveryFee: 0,
    total: cart.subtotal,
  }
}

function cloneOrder(order: AgentProposedOrder): AgentProposedOrder {
  return JSON.parse(JSON.stringify(order)) as AgentProposedOrder
}

// TEST A: mutation -> mutation -> promo query (no repeated full order in message)
const orderA1 = makeOrder([
  { product: 'avocado toast', quantity: 1 },
  { product: 'cappuccino', quantity: 1 },
])
const orderA2 = makeOrder([
  { product: 'avocado toast', quantity: 1 },
  { product: 'cappuccino', quantity: 1 },
  { product: 'cinnamon roll', quantity: 1 },
])

const messageA1 = enforceUahMessage({
  rawMessage: 'Great choice. I have prepared your order.',
  turnType: 'ORDER_CREATE',
  proposedOrder: orderA1,
  orderChanged: true,
  promoChanged: false,
  promoCode: null,
  attemptedPromoCode: '',
  recommendations: [],
  askToAddToCart: true,
})
assert(messageA1.includes('355'), `Expected 355 total in TEST A1: ${messageA1}`)

const messageA2 = enforceUahMessage({
  rawMessage: 'Great choice. I have prepared your updated order.',
  turnType: 'ORDER_ADD',
  proposedOrder: orderA2,
  orderChanged: true,
  promoChanged: false,
  promoCode: null,
  attemptedPromoCode: '',
  recommendations: [],
  askToAddToCart: true,
})
assert(messageA2.includes('500'), `Expected 500 total in TEST A2: ${messageA2}`)

const snapshotBeforePromoQuestion = cloneOrder(orderA2)
const messageA3 = enforceUahMessage({
  rawMessage:
    "Great choice. I've prepared Avocado Toast × 1, Cappuccino × 1, Cinnamon Roll × 1 for you. Total: 500 ₴. If you have a promo code, share it.",
  turnType: 'PROMO_QUERY',
  proposedOrder: orderA2,
  orderChanged: false,
  promoChanged: false,
  promoCode: null,
  attemptedPromoCode: '',
  recommendations: [],
  askToAddToCart: false,
})
assert(
  !/great choice|i['’]ve prepared/i.test(messageA3),
  `TEST A3 should not repeat full order preface: ${messageA3}`,
)
assert(
  /promo code/i.test(messageA3),
  `TEST A3 should answer promo question directly: ${messageA3}`,
)
assert(
  JSON.stringify(orderA2) === JSON.stringify(snapshotBeforePromoQuestion),
  'TEST A3 should not mutate existing proposed order state',
)

// TEST B: explicit order query may summarize current order/total
const messageB = enforceUahMessage({
  rawMessage: 'Your total is 500 ₴.',
  turnType: 'ORDER_QUERY',
  proposedOrder: orderA2,
  orderChanged: false,
  promoChanged: false,
  promoCode: null,
  attemptedPromoCode: '',
  recommendations: [],
  askToAddToCart: false,
})
assert(/current order|total/i.test(messageB), `TEST B should summarize order: ${messageB}`)
assert(messageB.includes('500'), `TEST B should include total 500: ${messageB}`)

// TEST C: product info should answer directly, no order restatement
const messageC = enforceUahMessage({
  rawMessage:
    "Great choice. I've prepared Avocado Toast × 1, Cappuccino × 1, Cinnamon Roll × 1 for you. Cappuccino contains milk as a listed allergen.",
  turnType: 'PRODUCT_INFO',
  proposedOrder: orderA2,
  orderChanged: false,
  promoChanged: false,
  promoCode: null,
  attemptedPromoCode: '',
  recommendations: [],
  askToAddToCart: false,
})
assert(/allergen|milk/i.test(messageC), `TEST C should answer allergen question: ${messageC}`)
assert(
  !/great choice|i['’]ve prepared/i.test(messageC),
  `TEST C should not repeat full order summary: ${messageC}`,
)

// TEST D: remove item mutation should summarize updated order
const orderD = makeOrder([
  { product: 'avocado toast', quantity: 1 },
  { product: 'cappuccino', quantity: 1 },
])
const messageD = enforceUahMessage({
  rawMessage: 'Updated order prepared.',
  turnType: 'ORDER_REMOVE',
  proposedOrder: orderD,
  orderChanged: true,
  promoChanged: false,
  promoCode: null,
  attemptedPromoCode: '',
  recommendations: [],
  askToAddToCart: true,
})
assert(messageD.includes('355'), `TEST D should include updated total 355: ${messageD}`)
assert(/add this to your cart/i.test(messageD), `TEST D should keep confirmation prompt: ${messageD}`)

console.log('Response policy regression tests passed.')
