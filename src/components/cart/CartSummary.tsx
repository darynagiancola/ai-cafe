import { Link } from 'react-router-dom'
import { formatUAH } from '../../utils/currency'

interface CartSummaryProps {
  subtotal: number
  discount: number
  total: number
  ctaLabel?: string
  ctaTo?: string
}

export function CartSummary({
  subtotal,
  discount,
  total,
  ctaLabel = 'Proceed to checkout',
  ctaTo = '/checkout',
}: CartSummaryProps) {
  return (
    <aside className="card-surface p-5">
      <h2 className="text-lg font-semibold text-[#2a2320]">Order summary</h2>
      <dl className="mt-4 space-y-2 text-sm text-[#584d47]">
        <div className="flex items-center justify-between">
          <dt>Subtotal</dt>
          <dd>{formatUAH(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Promo discount</dt>
          <dd>-{formatUAH(discount)}</dd>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#eadfd4] pt-3 text-base font-semibold text-[#2a2320]">
          <dt>Total</dt>
          <dd>{formatUAH(total)}</dd>
        </div>
      </dl>
      {ctaLabel && ctaTo && (
        <Link
          className="focus-ring mt-5 block rounded-full bg-[#8b4f38] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#72402b]"
          to={ctaTo}
        >
          {ctaLabel}
        </Link>
      )}
    </aside>
  )
}
