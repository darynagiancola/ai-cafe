import {
  buildRecommendationSearchResponse,
  classifyTurnTypeFromMessage,
} from '../src/agent/langchain/openAiBaristaRuntime.js'
import type { BaristaSessionState } from '../src/agent/langchain/openAiBaristaRuntime.js'
import { calculateCart } from '../src/agent/tools/index.js'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function normalizeProposedItems(items: { productId: string; quantity: number }[]) {
  return [...items]
    .sort((a, b) =>
      a.productId === b.productId
        ? a.quantity - b.quantity
        : a.productId.localeCompare(b.productId),
    )
    .map((item) => `${item.productId}:${item.quantity}`)
}

function assertStateUnchanged(before: BaristaSessionState, after: BaristaSessionState) {
  const left = normalizeProposedItems(before.proposedItems)
  const right = normalizeProposedItems(after.proposedItems)
  assert(
    left.length === right.length && left.every((value, index) => value === right[index]),
    'Proposed order state should remain unchanged for recommendation search turn',
  )
  assert(before.promoCode === after.promoCode, 'Promo code state should remain unchanged')
}

const turn1Cart = calculateCart({
  items: [
    { product: 'avocado toast', quantity: 1 },
    { product: 'cappuccino', quantity: 1 },
  ],
})
assert(turn1Cart.subtotal === 355, `TURN 1 expected subtotal 355, got ${turn1Cart.subtotal}`)

const turn2Cart = calculateCart({
  items: [
    { product: 'avocado toast', quantity: 1 },
    { product: 'cappuccino', quantity: 1 },
    { product: 'cinnamon roll', quantity: 1 },
  ],
})
assert(turn2Cart.subtotal === 500, `TURN 2 expected subtotal 500, got ${turn2Cart.subtotal}`)

const sessionBeforeTurn3: BaristaSessionState = {
  proposedItems: turn2Cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  })),
  promoCode: null,
}
const snapshot = JSON.parse(JSON.stringify(sessionBeforeTurn3)) as BaristaSessionState

const turn3Input = 'I want a coffee and something sweet. What can I have under 400 UAH?'
assert(
  classifyTurnTypeFromMessage(turn3Input) === 'RECOMMENDATION_SEARCH',
  'TURN 3 must classify as RECOMMENDATION_SEARCH',
)

const turn3Recommendations = buildRecommendationSearchResponse(turn3Input)
assert(turn3Recommendations.options.length > 0, 'TURN 3 must return recommendation options')
assert(
  turn3Recommendations.options.every((option) => option.total <= 400),
  'TURN 3 must keep every recommendation option <= 400',
)
assert(
  !/great choice|prepared avocado toast|500/i.test(turn3Recommendations.message),
  `TURN 3 must not repeat previous 500 order in response: ${turn3Recommendations.message}`,
)
assertStateUnchanged(snapshot, sessionBeforeTurn3)

const turn4Input = 'Add the cappuccino and cinnamon roll you recommended.'
assert(
  classifyTurnTypeFromMessage(turn4Input) === 'ORDER_ADD',
  'TURN 4 must classify as ORDER_ADD',
)

const budget200 = buildRecommendationSearchResponse('What can I have under 200 UAH?')
assert(budget200.options.length > 0, 'Budget <=200 query should return options')
assert(
  budget200.options.every((option) => option.total <= 200),
  'Every budget <=200 recommendation must be <= 200',
)

const veganBreakfast = buildRecommendationSearchResponse(
  'What vegan breakfast can I have under 350?',
)
assert(veganBreakfast.options.length > 0, 'Vegan breakfast query should return options')
assert(
  veganBreakfast.options.every((option) => option.total <= 350),
  'Every vegan breakfast option must be <= 350',
)
const veganBreakfastNames = veganBreakfast.options.flatMap((option) => option.itemNames)
assert(
  veganBreakfastNames.some((name) => /avocado toast/i.test(name)),
  'Expected vegan breakfast recommendations to include valid vegan breakfast items',
)

console.log('Recommendation intent multi-turn regression tests passed.')
