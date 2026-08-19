import type { PaymentProvider, PaymentStatus } from '../types/order'

export interface PaymentRequest {
  orderId: string
  amount: number
  currency: 'UAH'
  description: string
}

export interface PaymentResult {
  provider: PaymentProvider
  status: PaymentStatus
  reference: string
  message: string
}

export async function initiateWayForPayPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, 900))

  // TODO: Replace with secure backend endpoint that signs WayForPay requests.
  // Never expose private merchant keys in frontend code.
  return {
    provider: 'wayforpay',
    status: 'pending',
    reference: `WFP-MOCK-${Date.now()}-${request.orderId.slice(-4)}`,
    message:
      'Payment initialized in mock mode. Backend confirmation is required for authoritative paid status.',
  }
}
