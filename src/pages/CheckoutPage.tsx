import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CartSummary } from '../components/cart/CartSummary'
import { useCart } from '../context/CartContext'
import { attachPaymentResult, createOrderDraft } from '../services/orderService'
import { initiateWayForPayPayment } from '../services/paymentService'
import type { Order, OrderType } from '../types/order'
import { formatUAH } from '../utils/currency'

interface CheckoutFormState {
  firstName: string
  lastName: string
  phone: string
  email: string
  notes: string
  addressLine: string
  city: string
}

const initialForm: CheckoutFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  notes: '',
  addressLine: '',
  city: '',
}

export function CheckoutPage() {
  const { detailedItems, totals, promoCode, clearCart } = useCart()
  const [orderType, setOrderType] = useState<OrderType>('pickup')
  const [form, setForm] = useState<CheckoutFormState>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)

  if (detailedItems.length === 0 && !completedOrder) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-2xl p-10 text-center">
          <h1 className="text-3xl font-semibold text-[#2a2320]">No items to checkout</h1>
          <p className="mt-3 text-[#695f58]">Your cart is currently empty.</p>
          <Link
            to="/menu"
            className="focus-ring mt-6 inline-flex rounded-full bg-[#8b4f38] px-6 py-2.5 text-sm font-medium text-white"
          >
            Go to menu
          </Link>
        </div>
      </section>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (orderType === 'delivery' && (!form.addressLine.trim() || !form.city.trim())) {
      setError('Delivery address and city are required for delivery orders.')
      return
    }

    setIsSubmitting(true)

    const draftOrder = createOrderDraft({
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      },
      items: detailedItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      promoCode,
      orderType,
      deliveryAddress:
        orderType === 'delivery'
          ? {
              addressLine: form.addressLine.trim(),
              city: form.city.trim(),
            }
          : undefined,
      notes: form.notes.trim(),
    })

    try {
      const paymentResult = await initiateWayForPayPayment({
        orderId: draftOrder.id,
        amount: draftOrder.total,
        currency: 'UAH',
        description: `Order ${draftOrder.id} at AURELIA Café`,
      })

      const finalizedOrder = attachPaymentResult(draftOrder, paymentResult)
      setCompletedOrder(finalizedOrder)
      clearCart()
    } catch {
      setError('Payment initialization failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (completedOrder) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-3xl p-8 sm:p-10">
          <h1 className="text-3xl font-semibold text-[#2a2320]">Payment initiated</h1>
          <p className="mt-3 text-[#685d56]">
            Order <strong>{completedOrder.id}</strong> created successfully in mock mode.
          </p>
          <div className="mt-6 rounded-2xl border border-[#e2d5ca] bg-[#fffaf4] p-5">
            <p className="text-sm text-[#524741]">Payment provider: WayForPay (placeholder)</p>
            <p className="mt-1 text-sm text-[#524741]">Payment status: {completedOrder.paymentStatus}</p>
            <p className="mt-1 text-sm text-[#524741]">Payment reference: {completedOrder.paymentReference}</p>
            <p className="mt-3 text-sm text-[#6f635b]">
              In production, final payment status must be confirmed by backend webhook/callback before marking orders as paid.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/menu"
              className="focus-ring rounded-full bg-[#8b4f38] px-5 py-2.5 text-sm font-medium text-white"
            >
              Continue shopping
            </Link>
            <Link
              to="/"
              className="focus-ring rounded-full border border-[#d5c7bc] px-5 py-2.5 text-sm text-[#4f433d]"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="container-shell py-10 sm:py-14">
      <h1 className="text-4xl font-semibold text-[#2a2320]">Checkout</h1>
      <p className="mt-2 text-[#695f58]">Complete your details and continue to WayForPay payment flow.</p>

      <form className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-5">
          <div className="card-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#2a2320]">Customer information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-[#544943]">
                First name
                <input
                  required
                  value={form.firstName}
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
              <label className="text-sm text-[#544943]">
                Last name
                <input
                  required
                  value={form.lastName}
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
              <label className="text-sm text-[#544943]">
                Phone
                <input
                  required
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
              <label className="text-sm text-[#544943]">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
            </div>
          </div>

          <div className="card-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#2a2320]">Order type</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d6c8bc] px-4 py-2 text-sm">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === 'pickup'}
                  onChange={() => setOrderType('pickup')}
                  className="h-4 w-4 accent-[#8b4f38]"
                />
                Pickup
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d6c8bc] px-4 py-2 text-sm">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === 'delivery'}
                  onChange={() => setOrderType('delivery')}
                  className="h-4 w-4 accent-[#8b4f38]"
                />
                Delivery
              </label>
            </div>

            {orderType === 'delivery' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-[#544943] sm:col-span-2">
                  Delivery address
                  <input
                    required={orderType === 'delivery'}
                    value={form.addressLine}
                    onChange={(event) => setForm((current) => ({ ...current, addressLine: event.target.value }))}
                    className="focus-ring mt-1 w-full rounded-xl border border-[#dccfc3] px-4 py-2.5"
                  />
                </label>
                <label className="text-sm text-[#544943]">
                  City
                  <input
                    required={orderType === 'delivery'}
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    className="focus-ring mt-1 w-full rounded-xl border border-[#dccfc3] px-4 py-2.5"
                  />
                </label>
              </div>
            )}

            <label className="mt-4 block text-sm text-[#544943]">
              Notes (optional)
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="focus-ring mt-1 w-full rounded-xl border border-[#dccfc3] px-4 py-2.5"
                placeholder={
                  orderType === 'delivery'
                    ? 'Apartment entrance, call details, or dietary requests.'
                    : 'Pickup timing, cup preferences, or dietary requests.'
                }
              />
            </label>
          </div>

          <div className="card-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#2a2320]">Order summary</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {detailedItems.map((item) => (
                <li key={item.product.id} className="flex items-center justify-between gap-3 text-[#594f49]">
                  <span>
                    {item.product.name} × {item.quantity}
                  </span>
                  <span>{formatUAH(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <CartSummary
            subtotal={totals.subtotal}
            discount={totals.discount}
            total={totals.total}
            ctaLabel={undefined}
            ctaTo={undefined}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="focus-ring w-full rounded-full bg-[#2a2320] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#191413] disabled:opacity-60"
          >
            {isSubmitting ? 'Creating order...' : 'Pay with WayForPay'}
          </button>
          {error && (
            <p className="rounded-xl border border-[#e3b8ab] bg-[#fdeeea] px-4 py-3 text-sm text-[#8e2d1e]" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-[#7a6f66]">
            Payment amount is computed from authoritative product prices and promo rules. Final paid status must be backend-confirmed.
          </p>
        </div>
      </form>
    </section>
  )
}
