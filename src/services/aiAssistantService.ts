import { businessService } from './businessService'
import { menuService } from './menuService'

export interface AssistantMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp: string
}

export interface AssistantContext {
  budget?: number
  dietaryPreference?: string
}

const cannedSuggestions = [
  'If you love balanced milk coffee, try Cappuccino with a Cinnamon Roll.',
  'For a lighter option, Matcha Latte with Avocado Toast is a great pair.',
  'On a sweet brunch mood: Pancakes and a Berry Latte work beautifully together.',
]

export async function sendMessageToAiBarista(
  input: string,
  context?: AssistantContext,
): Promise<AssistantMessage> {
  const businessInfo = businessService.getBusinessInfo()
  const products = menuService.getAllProducts()
  const normalized = input.toLowerCase()
  const firstUnderBudget = context?.budget
    ? products.find((product) => product.price <= context.budget!)
    : undefined

  let response = cannedSuggestions[Math.floor(Math.random() * cannedSuggestions.length)]

  if (normalized.includes('vegan')) {
    response =
      'Vegan pick: Avocado Toast and Cold Brew. I can also suggest Specialty Coffee Beans for home brewing.'
  } else if (normalized.includes('allergen')) {
    response =
      'I can help with allergen-aware choices. For example, Espresso and Specialty Coffee Beans contain no listed allergens.'
  } else if (firstUnderBudget) {
    response = `Within ₴${context?.budget}, I’d start with ${firstUnderBudget.name} for ₴${firstUnderBudget.price}.`
  } else if (normalized.includes('where') || normalized.includes('hours')) {
    response = `${businessInfo.brandName} is at ${businessInfo.address}, ${businessInfo.city}. Hours vary by day and are shown on our Contact page.`
  }

  await new Promise((resolve) => setTimeout(resolve, 700))

  return {
    role: 'assistant',
    content:
      `${response} \n\nNote: This is a mock AI barista preview. Future production recommendations will be powered by LangChain tools using authoritative menu and pricing data.`,
    timestamp: new Date().toISOString(),
  }
}
