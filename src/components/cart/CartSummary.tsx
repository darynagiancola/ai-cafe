import { Link } from 'react-router-dom'
import { formatUAH } from '../../utils/currency'

interface CartSummaryProps {
  subtotal: number
  discount: number
  total: number
  promoCode?: string | null
  deliveryFee?: number
  ctaLabel?: string
  ctaTo?: string
}

export function CartSummary({
  subtotal,
  discount,
  total,
  promoCode = null,
  deliveryFee = 0,
  ctaLabel = 'Proceed to checkout',
  ctaTo = '/checkout',
}: CartSummaryProps) {
  const hasPromoDiscount = Boolean(promoCode) && discount > 0
  const hasDeliveryFee = deliveryFee > 0

  return (
    <aside className="card-surface bg-[#fffaf4] p-5 sm:p-6">
      <h2 className="display-serif text-3xl font-semibold text-[#2a2320]">Order summary</h2>
      <dl className="mt-4 space-y-2 text-sm text-[#584d47]">
        <div className="flex items-center justify-between">
          <dt>Subtotal</dt>
          <dd>{formatUAH(subtotal)}</dd>
        </div>
        {hasPromoDiscount && (
          <div className="flex items-center justify-between text-[#4f5f4e]">
            <dt>{promoCode}</dt>
            <dd>-{formatUAH(discount)}</dd>
          </div>
        )}
        {hasDeliveryFee && (
          <div className="flex items-center justify-between">
            <dt>Delivery</dt>
            <dd>{formatUAH(deliveryFee)}</dd>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-[#eadfd4] pt-3 text-base font-semibold text-[#2a2320]">
          <dt>Total</dt>
          <dd>{formatUAH(total)}</dd>
        </div>
      </dl>
      {ctaLabel && ctaTo && (
        <Link className="btn-primary mt-5 flex" to={ctaTo}>
          {ctaLabel}
        </Link>
      )}
    </aside>
  )
}
