import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getSimulatedPaymentOrder,
  simulatePaymentWebhook,
} from '../services/paymentService'
import type { SimulatedPaymentOrder } from '../types/paymentSimulation'
import { formatUAH } from '../utils/currency'

type SimulateStatus = 'Approved' | 'Declined'

function getStatusBadgeClass(status: SimulatedPaymentOrder['paymentStatus']) {
  switch (status) {
    case 'approved':
      return 'border-[#b9d8bc] bg-[#eff9f0] text-[#2f5b34]'
    case 'declined':
      return 'border-[#e7b7ac] bg-[#fff0ec] text-[#8f3120]'
    case 'pending':
    default:
      return 'border-[#d6c8bc] bg-[#fffaf4] text-[#5b4f48]'
  }
}

export function PaymentSimulationPage() {
  const { orderReference = '' } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<SimulatedPaymentOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
      } catch (loadError) {
        if (!mounted) {
          return
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load simulated payment order.'
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
  }, [orderReference])

  const canProcessPayment = useMemo(
    () => order?.paymentStatus === 'pending',
    [order?.paymentStatus],
  )

  async function handleSimulate(status: SimulateStatus) {
    if (!orderReference || !order) {
      return
    }

    setProcessing(true)
    setError(null)
    setStatusMessage(null)

    try {
      const response = await simulatePaymentWebhook(orderReference, status)
      setOrder(response.result.order)
      setStatusMessage(
        response.result.alreadyProcessed
          ? `${response.result.message} (idempotency protection active)`
          : response.result.message,
      )

      if (response.result.order.paymentStatus === 'approved') {
        await navigate(`/payment/${orderReference}/success`)
      }
    } catch (simulationError) {
      const message =
        simulationError instanceof Error
          ? simulationError.message
          : 'Simulated payment request failed.'
      setError(message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-3xl bg-[#fffaf4] p-8 text-center">
          <p className="text-sm text-[#6c615a]">Loading payment simulation…</p>
        </div>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface mx-auto max-w-3xl bg-[#fffaf4] p-8 text-center">
          <h1 className="text-2xl font-semibold text-[#2a2320]">Payment order not found</h1>
          <p className="mt-3 text-sm text-[#6c615a]">
            {error ?? 'Unable to load payment simulation order.'}
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/checkout" className="btn-primary">
              Back to checkout
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="container-shell py-10 pb-24 sm:py-14 sm:pb-16">
      <h1 className="display-serif text-5xl leading-[0.95] text-[#2a2320]">
        Simulated payment
      </h1>
      <p className="mt-2 text-[#695f58]">
        Demo-only WayForPay-inspired flow. No real payment data is collected.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-1 min-w-0 space-y-5">
          <div className="card-surface bg-[#fffaf4] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#2a2320]">
              Order #{order.orderReference}
            </h2>
            <p className="mt-2 text-sm text-[#6c615a]">
              Merchant account: {order.merchantAccount}
            </p>
            <p className="mt-1 break-all text-sm text-[#6c615a]">
              Mock signature: {order.merchantSignature}
            </p>
            <p className="mt-1 text-sm text-[#6c615a]">
              Created: {new Date(order.createdAt).toLocaleString('uk-UA')}
            </p>
            <div className="mt-4 rounded-2xl border border-[#decfc3] bg-[#fff7ef] px-4 py-3 text-xs text-[#685c54]">
              Educational simulation only. This page never processes real card information and
              never transfers real funds.
            </div>
          </div>

          <div className="card-surface bg-[#fffaf4] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#2a2320]">Items</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#594f49]">
              {order.items.map((item) => (
                <li
                  key={`${item.productId}-${item.productName}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{formatUAH(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-[#eadfd4] pt-3 text-sm text-[#5a4f48]">
              <p className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatUAH(order.subtotal)}</span>
              </p>
              <p className="mt-1 flex items-center justify-between">
                <span>Discount</span>
                <span>-{formatUAH(order.discount)}</span>
              </p>
              <p className="mt-1 flex items-center justify-between">
                <span>Delivery</span>
                <span>{formatUAH(order.deliveryFee)}</span>
              </p>
            </div>
          </div>
        </div>

        <aside className="card-surface order-2 min-w-0 bg-[#fffaf4] p-5 sm:p-6">
          <h2 className="display-serif text-3xl font-semibold text-[#2a2320]">Payment status</h2>
          <p
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(order.paymentStatus)}`}
          >
            {order.paymentStatus.toUpperCase()}
          </p>
          <p className="mt-4 text-sm text-[#594f49]">
            Total amount: <strong>{formatUAH(order.amount)}</strong>
          </p>
          <p className="mt-1 text-sm text-[#594f49]">Currency: UAH</p>
          <p className="mt-1 text-sm text-[#594f49]">
            is_premium: <strong>{order.is_premium ? 'true' : 'false'}</strong>
          </p>

          {statusMessage && (
            <p className="mt-4 rounded-xl border border-[#d8cbbf] bg-[#fff9f3] px-4 py-3 text-xs text-[#5f534b]">
              {statusMessage}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-[#e5b8ab] bg-[#fff0ec] px-4 py-3 text-xs text-[#8f3120]">
              {error}
            </p>
          )}

          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={!canProcessPayment || processing}
              onClick={() => void handleSimulate('Approved')}
              className="focus-ring w-full rounded-full bg-[#2a2320] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#191413] disabled:opacity-60"
            >
              {processing ? 'Processing…' : 'Simulate APPROVED payment'}
            </button>
            <button
              type="button"
              disabled={!canProcessPayment || processing}
              onClick={() => void handleSimulate('Declined')}
              className="focus-ring w-full rounded-full border border-[#d8c8bc] bg-[#fff9f2] px-4 py-2.5 text-sm font-semibold text-[#2a2320] transition hover:bg-[#f5ebde] disabled:opacity-60"
            >
              Simulate DECLINED payment
            </button>
          </div>

          {order.paymentStatus === 'declined' && (
            <div className="mt-5 rounded-xl border border-[#e7d8cc] bg-[#fff9f3] px-4 py-3 text-xs text-[#5f534b]">
              Payment was declined in demo mode. You can return to checkout and retry by creating a
              new simulated invoice.
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link to="/checkout" className="btn-secondary w-full justify-center sm:w-auto">
              Back to checkout
            </Link>
            <Link to="/menu" className="btn-secondary w-full justify-center sm:w-auto">
              Back to menu
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
