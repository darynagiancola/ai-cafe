import { Link } from 'react-router-dom'
import { CartSummary } from '../components/cart/CartSummary'
import { QuantitySelector } from '../components/cart/QuantitySelector'
import { useCart } from '../context/CartContext'
import { formatUAH } from '../utils/currency'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

export function CartPage() {
  const {
    detailedItems,
    totals,
    promoCode,
    promoMessage,
    applyPromoCode,
    clearPromoCode,
    increaseQty,
    decreaseQty,
    removeFromCart,
  } = useCart()
  const [promoInput, setPromoInput] = useState(promoCode ?? '')

  if (detailedItems.length === 0) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-2xl p-10 text-center">
          <h1 className="text-3xl font-semibold text-[#2a2320]">Your cart is empty</h1>
          <p className="mt-3 text-[#695f58]">Add something from the menu to start your order.</p>
          <Link
            to="/menu"
            className="focus-ring mt-6 inline-flex rounded-full bg-[#8b4f38] px-6 py-2.5 text-sm font-medium text-white"
          >
            Explore menu
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="container-shell py-10 sm:py-14">
      <h1 className="text-4xl font-semibold text-[#2a2320]">Your cart</h1>
      <p className="mt-2 text-[#695f58]">Review your products, apply promo code, then continue to checkout.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="card-surface divide-y divide-[#eadfd4]">
            {detailedItems.map((item) => (
              <article key={item.product.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-18 w-18 rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div>
                    <h2 className="text-base font-semibold text-[#2a2320]">{item.product.name}</h2>
                    <p className="text-sm text-[#7a6f66]">{formatUAH(item.product.price)} each</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <QuantitySelector
                    quantity={item.quantity}
                    onDecrease={() => decreaseQty(item.product.id)}
                    onIncrease={() => increaseQty(item.product.id)}
                  />
                  <p className="w-20 text-right font-medium text-[#2a2320]">{formatUAH(item.lineTotal)}</p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="focus-ring rounded-md p-2 text-[#705e52] hover:bg-[#f2e7dc]"
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="card-surface p-5">
            <h2 className="text-lg font-semibold text-[#2a2320]">Promo code</h2>
            <p className="mt-1 text-sm text-[#695f58]">Try WELCOME10 for 10% off your order.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                placeholder="Enter promo code"
                className="focus-ring min-w-[200px] flex-1 rounded-xl border border-[#dccfc3] px-4 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={() => applyPromoCode(promoInput)}
                className="focus-ring rounded-full bg-[#8b4f38] px-5 py-2.5 text-sm font-medium text-white"
              >
                Apply
              </button>
              {promoCode && (
                <button
                  type="button"
                  onClick={clearPromoCode}
                  className="focus-ring rounded-full border border-[#d6c8bc] px-5 py-2.5 text-sm text-[#4f433d]"
                >
                  Remove
                </button>
              )}
            </div>
            {promoMessage && (
              <p className="mt-3 text-sm text-[#5f534b]" role="status">
                {promoMessage}
              </p>
            )}
          </div>
        </div>

        <CartSummary subtotal={totals.subtotal} discount={totals.discount} total={totals.total} />
      </div>
    </section>
  )
}
