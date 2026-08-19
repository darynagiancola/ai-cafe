import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { validatePromoCode } from '../services/promoService'
import type { CartDetailedItem, CartItem, CartTotals } from '../types/cart'
import { getCartTotals, getDetailedCartItems } from '../utils/cartCalculations'

interface CartContextValue {
  items: CartItem[]
  detailedItems: CartDetailedItem[]
  totals: CartTotals
  promoCode: string | null
  promoMessage: string | null
  addToCart: (productId: string, quantity?: number) => void
  removeFromCart: (productId: string) => void
  increaseQty: (productId: string) => void
  decreaseQty: (productId: string) => void
  clearCart: () => void
  applyPromoCode: (code: string) => boolean
  clearPromoCode: () => void
}

const CART_STORAGE_KEY = 'aurelia-cart-v1'
const PROMO_STORAGE_KEY = 'aurelia-promo-v1'

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useLocalStorage<CartItem[]>(CART_STORAGE_KEY, [])
  const [promoCode, setPromoCode] = useLocalStorage<string | null>(PROMO_STORAGE_KEY, null)
  const [promoMessage, setPromoMessage] = useState<string | null>(null)

  const addToCart = useCallback((productId: string, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId)
      if (existing) {
        return current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + Math.max(1, quantity) }
            : item,
        )
      }

      return [...current, { productId, quantity: Math.max(1, quantity) }]
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId))
  }, [])

  const increaseQty = useCallback((productId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }, [])

  const decreaseQty = useCallback((productId: string) => {
    setItems((current) =>
      current
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setPromoCode(null)
    setPromoMessage(null)
  }, [])

  const applyPromoCode = useCallback((code: string) => {
    const result = validatePromoCode(code)
    setPromoMessage(result.message)

    if (result.isValid && result.code) {
      setPromoCode(result.code)
      return true
    }

    return false
  }, [])

  const clearPromoCode = useCallback(() => {
    setPromoCode(null)
    setPromoMessage('Promo code removed.')
  }, [])

  const detailedItems = useMemo(() => getDetailedCartItems(items), [items])
  const totals = useMemo(() => getCartTotals(items, promoCode), [items, promoCode])

  const value = useMemo(
    () => ({
      items,
      detailedItems,
      totals,
      promoCode,
      promoMessage,
      addToCart,
      removeFromCart,
      increaseQty,
      decreaseQty,
      clearCart,
      applyPromoCode,
      clearPromoCode,
    }),
    [
      items,
      detailedItems,
      totals,
      promoCode,
      promoMessage,
      addToCart,
      removeFromCart,
      increaseQty,
      decreaseQty,
      clearCart,
      applyPromoCode,
      clearPromoCode,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }

  return context
}
