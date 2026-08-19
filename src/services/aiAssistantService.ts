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

const aiBaristaAgent = new AureliaAiBaristaAgent()

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
}

export function getAiBaristaToolNames(): string[] {
  return aiBaristaAgent.getAvailableToolNames()
}

export async function sendMessageToAiBarista(input: string): Promise<AssistantMessage> {
  await new Promise((resolve) => setTimeout(resolve, 450))

  const result = await aiBaristaAgent.handleMessage(input)
  return createAssistantMessage(result.message, result.payload)
}

export function confirmProposedItemsForCart(): ConfirmedCartAddAction | null {
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
