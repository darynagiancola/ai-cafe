import {
  buildSimulatedWebhookPayload,
  createSimulatedInvoice,
  getSimulatedPaymentOrder,
  processSimulatedWebhook,
} from '../src/server/paymentSimulation.js'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function uniqueRef(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const approvedOrderRef = uniqueRef('ord_approved')
const approvedInvoice = createSimulatedInvoice({
  orderReference: approvedOrderRef,
  items: [
    { productId: 'prod-avocado-toast', quantity: 1 },
    { productId: 'prod-cappuccino', quantity: 1 },
  ],
  currency: 'UAH',
  orderType: 'pickup',
  promoCode: 'WELCOME10',
})

assert(approvedInvoice.currency === 'UAH', 'Currency must remain UAH')
assert(approvedInvoice.paymentStatus === 'pending', 'Invoice should start as pending')
assert(approvedInvoice.amount === 319, `Expected discounted total 319, got ${approvedInvoice.amount}`)

const approvedPayload = buildSimulatedWebhookPayload({
  orderReference: approvedOrderRef,
  transactionStatus: 'Approved',
  eventId: 'evt-approved-once',
})
const approvedResult = processSimulatedWebhook(approvedPayload)
assert(!approvedResult.alreadyProcessed, 'First approved webhook should be processed')
assert(approvedResult.order.paymentStatus === 'approved', 'Order should become approved')
assert(approvedResult.order.is_premium, 'Approved payment should set is_premium=true')
assert(Boolean(approvedResult.order.processedAt), 'Approved webhook should set processedAt')

const duplicateApprovedResult = processSimulatedWebhook(approvedPayload)
assert(
  duplicateApprovedResult.alreadyProcessed,
  'Duplicate webhook event should be idempotently ignored',
)
assert(
  duplicateApprovedResult.order.paymentStatus === 'approved',
  'Duplicate event must not change approved status',
)
assert(
  duplicateApprovedResult.order.amount === approvedInvoice.amount,
  'Duplicate event must not change order amount',
)
assert(
  duplicateApprovedResult.order.is_premium === true,
  'Duplicate event must not alter is_premium after approval',
)
assert(
  duplicateApprovedResult.order.processedEventIds.length === 1,
  'Duplicate event must not append another processed event id',
)

const declinedOrderRef = uniqueRef('ord_declined')
createSimulatedInvoice({
  orderReference: declinedOrderRef,
  items: [
    { productId: 'prod-cappuccino', quantity: 1 },
    { productId: 'prod-cinnamon-roll', quantity: 1 },
  ],
  currency: 'UAH',
  orderType: 'pickup',
})
const declinedPayload = buildSimulatedWebhookPayload({
  orderReference: declinedOrderRef,
  transactionStatus: 'Declined',
  eventId: 'evt-declined-once',
})
const declinedResult = processSimulatedWebhook(declinedPayload)
assert(!declinedResult.alreadyProcessed, 'First declined webhook should be processed')
assert(declinedResult.order.paymentStatus === 'declined', 'Order should become declined')
assert(!declinedResult.order.is_premium, 'Declined payment should keep is_premium=false')

const fetchedDeclinedOrder = getSimulatedPaymentOrder(declinedOrderRef)
assert(Boolean(fetchedDeclinedOrder), 'Stored declined order should be retrievable')
assert(
  fetchedDeclinedOrder?.paymentStatus === 'declined',
  'Fetched order should preserve declined status',
)

console.log('Payment simulation flow tests passed.')
