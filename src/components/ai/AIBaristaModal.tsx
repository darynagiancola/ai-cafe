import { Bot, Send, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { sendMessageToAiBarista, type AssistantMessage } from '../../services/aiAssistantService'

interface AIBaristaModalProps {
  open: boolean
  onClose: () => void
}

const starterMessage: AssistantMessage = {
  role: 'assistant',
  content:
    'Hi, I’m your AI Barista preview. Ask about flavors, allergens, budget options, or what pairs well together.',
  timestamp: new Date().toISOString(),
}

export function AIBaristaModal({ open, onClose }: AIBaristaModalProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([starterMessage])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) {
    return null
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed) {
      return
    }

    const userMessage: AssistantMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setLoading(true)

    const reply = await sendMessageToAiBarista(trimmed)
    setMessages((current) => [...current, reply])
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f1a17]/50 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-barista-title"
    >
      <div className="card-surface w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e6d9cd] bg-[#f9f2e8] px-5 py-4">
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

        <div className="max-h-[50vh] space-y-3 overflow-y-auto bg-[#fffdfb] p-5">
          {messages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.role === 'assistant'
                  ? 'bg-[#f2e7dc] text-[#3f3530]'
                  : 'ml-auto bg-[#8b4f38] text-white'
              }`}
            >
              <div className="mb-1 flex items-center gap-1 text-xs opacity-80">
                {message.role === 'assistant' ? <Bot className="h-3 w-3" aria-hidden /> : null}
                <span>{message.role === 'assistant' ? 'AI Barista' : 'You'}</span>
              </div>
              <p className="whitespace-pre-line">{message.content}</p>
            </div>
          ))}
          {loading && <p className="text-sm text-[#6a5e57]">AI Barista is crafting a response...</p>}
        </div>

        <div className="border-t border-[#e6d9cd] bg-white p-4">
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
              className="focus-ring w-full rounded-xl border border-[#dccfc3] px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={loading}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#8b4f38] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Send <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
