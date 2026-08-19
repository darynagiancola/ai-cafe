interface QuantitySelectorProps {
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
}

export function QuantitySelector({ quantity, onDecrease, onIncrease }: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-[#d7c7b8] bg-[#fffcf8] shadow-[0_4px_12px_-8px_rgba(31,26,23,0.4)]">
      <button
        type="button"
        onClick={onDecrease}
        className="focus-ring rounded-l-full px-3 py-1.5 text-lg text-[#4f433d] transition hover:bg-[#f4e9de]"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-medium text-[#2a2320]" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        className="focus-ring rounded-r-full px-3 py-1.5 text-lg text-[#4f433d] transition hover:bg-[#f4e9de]"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
