import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface AddToCartButtonProps {
  onAdd: () => void
  className?: string
  defaultLabel?: string
  successLabel?: string
  successDurationMs?: number
}

export function AddToCartButton({
  onAdd,
  className = '',
  defaultLabel = 'Add to cart',
  successLabel = 'Added',
  successDurationMs = 1200,
}: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    },
    [],
  )

  const handleClick = () => {
    if (isAdded) {
      return
    }

    onAdd()
    setIsAdded(true)

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsAdded(false)
    }, successDurationMs)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isAdded}
      className={`btn-primary active:scale-[0.99] ${
        isAdded ? 'bg-[#5f705e] hover:translate-y-0 hover:bg-[#5f705e]' : ''
      } ${className}`}
    >
      {isAdded ? (
        <>
          {successLabel} <Check className="h-4 w-4" aria-hidden />
        </>
      ) : (
        defaultLabel
      )}
    </button>
  )
}
