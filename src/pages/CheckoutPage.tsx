import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartSummary } from '../components/cart/CartSummary'
import { useCart } from '../context/CartContext'
import { createOrderDraft } from '../services/orderService'
import { createSimulatedInvoice } from '../services/paymentService'
import type { OrderType } from '../types/order'
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
  const { detailedItems, totals, promoCode, promoMessage, applyPromoCode, clearPromoCode } = useCart()
  const navigate = useNavigate()
  const [orderType, setOrderType] = useState<OrderType>('pickup')
  const [form, setForm] = useState<CheckoutFormState>(initialForm)
  const [promoInput, setPromoInput] = useState(promoCode ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deliveryFee = orderType === 'delivery' ? 60 : 0
  const finalTotal = totals.total + deliveryFee

  useEffect(() => {
    setPromoInput(promoCode ?? '')
  }, [promoCode])

  if (detailedItems.length === 0) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-2xl bg-[#fffaf4] p-10 text-center">
          <h1 className="text-3xl font-semibold text-[#2a2320]">No items to checkout</h1>
          <p className="mt-3 text-[#695f58]">Your cart is currently empty.</p>
          <Link
            to="/menu"
            className="btn-primary mt-6"
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
      total: finalTotal,
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
      const invoice = await createSimulatedInvoice({
        orderReference: draftOrder.id,
        items: draftOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        currency: 'UAH',
        promoCode,
        orderType,
      })

      await navigate(`/payment/${invoice.orderReference}`)
    } catch {
      setError('Unable to create simulated payment invoice. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="container-shell py-10 sm:py-14">
      <h1 className="display-serif text-5xl leading-[0.95] text-[#2a2320]">Checkout</h1>
      <p className="mt-2 text-[#695f58]">Complete your details and continue to simulated WayForPay payment.</p>

      <form className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-5">
          <div className="card-surface bg-[#fffaf4] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#2a2320]">Customer information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-[#544943]">
                First name
                <input
                  required
                  value={form.firstName}
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
              <label className="text-sm text-[#544943]">
                Last name
                <input
                  required
                  value={form.lastName}
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
              <label className="text-sm text-[#544943]">
                Phone
                <input
                  required
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
              <label className="text-sm text-[#544943]">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="focus-ring mt-1 w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5"
                />
              </label>
            </div>
          </div>

          <div className="card-surface bg-[#fffaf4] p-5 sm:p-6">
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
                    className="focus-ring mt-1 w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5"
                  />
                </label>
                <label className="text-sm text-[#544943]">
                  City
                  <input
                    required={orderType === 'delivery'}
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    className="focus-ring mt-1 w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5"
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
                className="focus-ring mt-1 w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5"
                placeholder={
                  orderType === 'delivery'
                    ? 'Apartment entrance, call details, or dietary requests.'
                    : 'Pickup timing, cup preferences, or dietary requests.'
                }
              />
            </label>
          </div>

          <div className="card-surface bg-[#fffaf4] p-5 sm:p-6">
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
          <div className="card-surface bg-[#fffaf4] p-5">
            <h2 className="text-lg font-semibold text-[#2a2320]">Promo code</h2>
            <p className="mt-1 text-sm text-[#695f58]">Use the same promo as in cart. Try WELCOME10.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                placeholder="Enter promo code"
                className="focus-ring min-w-[160px] flex-1 rounded-2xl border border-[#dccfc3] px-4 py-2.5 text-sm"
              />
              <button type="button" onClick={() => applyPromoCode(promoInput)} className="btn-primary">
                Apply
              </button>
              {promoCode && (
                <button type="button" onClick={clearPromoCode} className="btn-secondary">
                  Remove
                </button>
              )}
            </div>
            {promoMessage && (
              <p
                className={`mt-3 text-sm ${
                  promoMessage.toLowerCase().includes('applied')
                    ? 'text-[#466246]'
                    : 'text-[#8e2d1e]'
                }`}
                role="status"
              >
                {promoMessage}
              </p>
            )}
            {!promoMessage && promoCode && (
              <p className="mt-3 text-sm text-[#466246]" role="status">
                {promoCode} is currently applied.
              </p>
            )}
          </div>

          <CartSummary
            subtotal={totals.subtotal}
            discount={totals.discount}
            total={finalTotal}
            promoCode={promoCode}
            deliveryFee={deliveryFee}
            ctaLabel=""
            ctaTo=""
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="focus-ring w-full rounded-full bg-[#2a2320] px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#191413] disabled:opacity-60"
          >
            {isSubmitting ? 'Creating invoice...' : 'Continue to payment simulation'}
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
