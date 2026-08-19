import { AureliaAiBaristaAgent } from '../agent/aiBaristaAgent'
import { DEFAULT_SUGGESTED_PROMPTS } from '../agent/prompts/aiBaristaPrompt'
import type { AgentMessagePayload } from '../agent/types'

export interface AssistantMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: string
  payload?: AgentMessagePayload
}

export interface ConfirmedCartAddAction {
  cartItems: { productId: string; quantity: number }[]
  assistantMessage: AssistantMessage
}

export interface AssistantConversationMessage {
  role: 'assistant' | 'user'
  content: string
}

interface AiBaristaSessionState {
  proposedItems: { productId: string; quantity: number }[]
  promoCode: string | null
}

interface AiBackendResponse {
  message: string
  payload?: AgentMessagePayload
  sessionState?: AiBaristaSessionState
}

const apiBaseUrl = import.meta.env.VITE_AI_API_URL?.trim() ?? ''
const backendEndpoint = apiBaseUrl
  ? `${apiBaseUrl.replace(/\/$/, '')}/api/barista`
  : '/api/barista'

const aiBaristaAgent = new AureliaAiBaristaAgent()
let fallbackNoticeShown = false
let sessionState: AiBaristaSessionState = {
  proposedItems: [],
  promoCode: null,
}

function createAssistantMessage(
  content: string,
  payload?: AgentMessagePayload,
): AssistantMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    payload,
    timestamp: new Date().toISOString(),
  }
}

export function getAiBaristaStarterMessage(): AssistantMessage {
  return createAssistantMessage(
    'Hi, I’m AURELIA AI Barista. I can help with recommendations, ingredients, allergens, budgets, promo codes, and building your order.',
    { suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS },
  )
}

export function getAiBaristaSuggestedPrompts(): string[] {
  return aiBaristaAgent.getSuggestedPrompts()
}

export function resetAiBaristaSession() {
  aiBaristaAgent.resetSession()
  sessionState = {
    proposedItems: [],
    promoCode: null,
  }
  fallbackNoticeShown = false
}

export function getAiBaristaToolNames(): string[] {
  return aiBaristaAgent.getAvailableToolNames()
}

export async function sendMessageToAiBarista(
  input: string,
  conversation: AssistantConversationMessage[],
): Promise<AssistantMessage> {
  try {
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        conversation,
        sessionState,
      }),
    })

    if (response.ok) {
      const payload = (await response.json()) as AiBackendResponse
      sessionState = payload.sessionState ?? sessionState

      if (payload.payload?.proposedOrder) {
        sessionState.proposedItems = payload.payload.proposedOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      }

      return createAssistantMessage(payload.message, payload.payload)
    }
  } catch {
    // Gracefully fall back below.
  }

  await new Promise((resolve) => setTimeout(resolve, 450))

  const deterministicResult = await aiBaristaAgent.handleMessage(input)
  const fallbackPrefix = !fallbackNoticeShown
    ? 'Live AI backend is unavailable right now, so I switched to local deterministic mode.\n\n'
    : ''
  fallbackNoticeShown = true

  return createAssistantMessage(
    `${fallbackPrefix}${deterministicResult.message}`,
    deterministicResult.payload,
  )
}

export function confirmProposedItemsForCart(
  confirmedItems?: { productId: string; quantity: number }[],
): ConfirmedCartAddAction | null {
  if (confirmedItems && confirmedItems.length > 0) {
    sessionState = {
      ...sessionState,
      proposedItems: [],
    }

    return {
      cartItems: confirmedItems,
      assistantMessage: createAssistantMessage(
        'Great — I added those items to your cart. You can continue to checkout whenever you are ready.',
        { suggestedPrompts: ['Apply WELCOME10', 'Recommend one more dessert', 'Show breakfast options'] },
      ),
    }
  }

  const proposal = aiBaristaAgent.consumeProposedOrderForCart()
  if (!proposal) {
    return null
  }

  return {
    cartItems: proposal.items,
    assistantMessage: createAssistantMessage(
      `Great — ${proposal.summary} You can continue to Cart or Checkout when ready.`,
      { suggestedPrompts: ['Show my cart summary', 'Apply WELCOME10', 'Recommend one more dessert'] },
    ),
  }
}
