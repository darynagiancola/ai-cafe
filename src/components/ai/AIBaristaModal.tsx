import { Bot, Send, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import {
  confirmProposedItemsForCart,
  getAiBaristaStarterMessage,
  sendMessageToAiBarista,
  type AssistantMessage,
} from '../../services/aiAssistantService'
import { formatUAH } from '../../utils/currency'

interface AIBaristaModalProps {
  open: boolean
  onClose: () => void
}

export function AIBaristaModal({ open, onClose }: AIBaristaModalProps) {
  const { addToCart } = useCart()
  const [messages, setMessages] = useState<AssistantMessage[]>([getAiBaristaStarterMessage()])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return null
  }

  async function handleSend(customInput?: string) {
    const trimmed = (customInput ?? input).trim()
    if (!trimmed) {
      return
    }

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setError(null)
    setMessages((current) => [...current, userMessage])
    setInput('')
    setLoading(true)

    try {
      const reply = await sendMessageToAiBarista(trimmed)
      setMessages((current) => [...current, reply])
    } catch {
      setError('Unable to process this request right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirmAddToCart() {
    const action = confirmProposedItemsForCart()
    if (!action) {
      return
    }

    action.cartItems.forEach((item) => {
      addToCart(item.productId, item.quantity)
    })

    setMessages((current) => [...current, action.assistantMessage])
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1a1512]/60 p-4 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-barista-title"
    >
      <div className="card-surface w-full max-w-2xl overflow-hidden border-[#d4c6b8]">
        <div className="flex items-center justify-between border-b border-[#e6d9cd] bg-[#f6ede1] px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8b4f38]" aria-hidden />
            <h3 id="ai-barista-title" className="text-lg font-semibold text-[#2a2320]">
              Ask our AI Barista
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-md p-1.5 text-[#4f433d] hover:bg-[#f0e4d8]"
            aria-label="Close AI barista panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto bg-[#fffaf4] p-5">
          {messages.map((message, index) => (
            <div
              key={`${message.id}-${index}`}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.role === 'assistant'
                  ? 'bg-[#efe2d4] text-[#2f2621]'
                  : 'ml-auto bg-[#7f4630] text-white'
              }`}
            >
              <div className="mb-1 flex items-center gap-1 text-xs opacity-80">
                {message.role === 'assistant' ? <Bot className="h-3 w-3" aria-hidden /> : null}
                <span>{message.role === 'assistant' ? 'AI Barista' : 'You'}</span>
              </div>
              <p className="whitespace-pre-line">{message.content}</p>

              {message.role === 'assistant' && message.payload?.recommendations && message.payload.recommendations.length > 0 && (
                <div className="mt-3 space-y-2 rounded-xl border border-[#d8c9bc] bg-white/70 p-2">
                  {message.payload.recommendations.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <p className="font-semibold text-[#2c2420]">{item.name}</p>
                        <p className="text-[#62554c]">{item.category}</p>
                      </div>
                      <p className="font-semibold text-[#2c2420]">{formatUAH(item.price)}</p>
                    </div>
                  ))}
                </div>
              )}

              {message.role === 'assistant' && message.payload?.proposedOrder && (
                <div className="mt-3 rounded-xl border border-[#d8c9bc] bg-white/70 p-3 text-xs">
                  <p className="mb-2 font-semibold text-[#2c2420]">Proposed order</p>
                  <ul className="space-y-1 text-[#62554c]">
                    {message.payload.proposedOrder.items.map((item) => (
                      <li key={item.productId} className="flex justify-between gap-2">
                        <span>
                          {item.productName} × {item.quantity}
                        </span>
                        <span>{formatUAH(item.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 border-t border-[#ded1c5] pt-2 text-[#2c2420]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatUAH(message.payload.proposedOrder.subtotal)}</span>
                    </div>
                    {message.payload.proposedOrder.discount > 0 && message.payload.proposedOrder.promoCode && (
                      <div className="mt-1 flex justify-between text-[#3f5f40]">
                        <span>{message.payload.proposedOrder.promoCode}</span>
                        <span>-{formatUAH(message.payload.proposedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatUAH(message.payload.proposedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {message.role === 'assistant' && message.payload?.confirmAddToCart && (
                <button
                  type="button"
                  onClick={handleConfirmAddToCart}
                  className="focus-ring mt-3 inline-flex rounded-full bg-[#7f4630] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6c3c2a]"
                >
                  {message.payload.confirmAddToCart.label}
                </button>
              )}

              {message.role === 'assistant' && message.payload?.suggestedPrompts && message.payload.suggestedPrompts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.payload.suggestedPrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      className="focus-ring rounded-full border border-[#d8c9bc] bg-white/75 px-3 py-1.5 text-[11px] text-[#4a3f39] transition hover:bg-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-[#564a42]">AI Barista is crafting a response...</p>}
          {error && (
            <p className="rounded-xl border border-[#deb8ad] bg-[#f9e7e2] px-3 py-2 text-sm text-[#872f21]" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-[#e6d9cd] bg-[#fffdf9] p-4">
          <label htmlFor="ai-message" className="sr-only">
            Ask AI Barista
          </label>
          <div className="flex gap-2">
            <input
              id="ai-message"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Example: I need a vegan breakfast under ₴300"
              className="focus-ring w-full rounded-2xl border border-[#dccfc3] px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={loading}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#7f4630] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6b3b29] disabled:opacity-60"
            >
              Send <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#72645b]">
            <span>Authoritative data source: menu, promo, and business services.</span>
            <Link className="focus-ring rounded underline-offset-2 hover:underline" to="/menu">
              Open menu
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
