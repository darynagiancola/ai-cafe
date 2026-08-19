import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCart } from '../../context/CartContext'

export function AddToCartToast() {
  const { lastAddedItem } = useCart()
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!lastAddedItem) {
      return
    }

    const nextMessage =
      lastAddedItem.quantity > 1
        ? `✓ ${lastAddedItem.productName} (${lastAddedItem.quantity}) added to your cart`
        : `✓ ${lastAddedItem.productName} added to your cart`

    setMessage(nextMessage)
    setVisible(true)

    const timeoutId = window.setTimeout(() => {
      setVisible(false)
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [lastAddedItem?.eventId])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <div
        className={`inline-flex max-w-[min(92vw,560px)] items-center gap-2 rounded-full border border-[#d7c8ba] bg-[#fffaf3] px-4 py-2 text-sm font-medium text-[#2f2824] shadow-[0_12px_28px_-16px_rgba(31,26,23,0.5)] transition-all duration-250 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <Check className="h-4 w-4 text-[#5f705e]" aria-hidden />
        <span>{message}</span>
      </div>
    </div>
  )
}
