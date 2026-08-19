import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { getSimulatedPaymentOrder } from '../services/paymentService'
import type { SimulatedPaymentOrder } from '../types/paymentSimulation'
import { formatUAH } from '../utils/currency'

export function PaymentSuccessPage() {
  const { orderReference = '' } = useParams()
  const { clearCart } = useCart()
  const [order, setOrder] = useState<SimulatedPaymentOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadOrder() {
      if (!orderReference) {
        setError('Order reference is missing.')
        setLoading(false)
        return
      }

      try {
        const result = await getSimulatedPaymentOrder(orderReference)
        if (!mounted) {
          return
        }
        setOrder(result)
        if (result.paymentStatus === 'approved') {
          clearCart()
        }
      } catch (loadError) {
        if (!mounted) {
          return
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load payment confirmation.'
        setError(message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadOrder()
    return () => {
      mounted = false
    }
  }, [clearCart, orderReference])

  if (loading) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-3xl bg-[#fffaf4] p-8 text-center">
          <p className="text-sm text-[#6c615a]">Loading payment confirmation…</p>
        </div>
      </section>
    )
  }

  if (!order || error) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-3xl bg-[#fffaf4] p-8 text-center">
          <h1 className="text-2xl font-semibold text-[#2a2320]">Payment confirmation unavailable</h1>
          <p className="mt-3 text-sm text-[#6c615a]">
            {error ?? 'Unable to load payment order.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/checkout" className="btn-primary">
              Back to checkout
            </Link>
            <Link to="/menu" className="btn-secondary">
              Back to menu
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (order.paymentStatus !== 'approved') {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-3xl bg-[#fffaf4] p-8 text-center">
          <h1 className="text-3xl font-semibold text-[#2a2320]">Payment not approved</h1>
          <p className="mt-3 text-sm text-[#6c615a]">
            Order {order.orderReference} has status <strong>{order.paymentStatus}</strong>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to={`/payment/${order.orderReference}`} className="btn-primary">
              Return to payment simulation
            </Link>
            <Link to="/checkout" className="btn-secondary">
              Back to checkout
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="container-shell py-14">
      <div className="card-surface mx-auto max-w-3xl bg-[#fffaf4] p-8 sm:p-10">
        <h1 className="text-4xl font-semibold text-[#2a2320]">Payment successful!</h1>
        <p className="mt-3 text-[#685d56]">Thank you for your order.</p>

        <div className="mt-6 rounded-2xl border border-[#dfd2c6] bg-[#fff8f1] p-5">
          <p className="text-sm text-[#544943]">
            Order ID: <strong>{order.orderReference}</strong>
          </p>
          <p className="mt-1 text-sm text-[#544943]">
            Payment status: <strong>{order.paymentStatus}</strong>
          </p>
          <p className="mt-1 text-sm text-[#544943]">
            Total paid: <strong>{formatUAH(order.amount)}</strong>
          </p>
          <p className="mt-1 text-sm text-[#544943]">
            Currency: <strong>UAH</strong>
          </p>
          <p className="mt-1 text-sm text-[#544943]">
            is_premium: <strong>{order.is_premium ? 'true' : 'false'}</strong>
          </p>
          <p className="mt-3 text-xs text-[#6f635b]">
            Demo note: is_premium is enabled after approved payment to demonstrate paid/free access
            state without changing the existing café business model.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/menu" className="btn-primary">
            Return to menu
          </Link>
          <Link to="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}
