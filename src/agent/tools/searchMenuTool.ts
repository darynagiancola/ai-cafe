import { z } from 'zod'
import { menuService } from '../../services/menuService'
import { MENU_CATEGORIES } from '../../types/menu'
import type { MenuItemSummary } from '../types'
import { normalizeText, toMenuItemSummary } from './helpers'

export const searchMenuSchema = z.object({
  query: z.string().optional().describe('Free-form user preference query'),
  category: z.enum(MENU_CATEGORIES).optional(),
  maxBudget: z.number().positive().optional(),
  excludeIngredients: z.array(z.string()).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
})

export type SearchMenuInput = z.infer<typeof searchMenuSchema>

export interface SearchMenuResult {
  items: MenuItemSummary[]
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function buildDeterministicSignals(query: string) {
  const normalizedQuery = normalizeText(query)

  return {
    wantsSweet: hasAnyKeyword(normalizedQuery, [
      'sweet',
      'dessert',
      'cake',
      'pastry',
      'cinnamon',
      'berry',
    ]),
    wantsBreakfast: hasAnyKeyword(normalizedQuery, ['breakfast', 'brunch', 'toast', 'eggs', 'pancake']),
    wantsNoCoffee: hasAnyKeyword(normalizedQuery, [
      "don't drink coffee",
      'do not drink coffee',
      'without coffee',
      'no coffee',
      'not coffee',
    ]),
    wantsLight: hasAnyKeyword(normalizedQuery, ['light', 'not heavy']),
    wantsBerry: hasAnyKeyword(normalizedQuery, ['berry', 'berries']),
  }
}

export function searchMenu(input: SearchMenuInput): SearchMenuResult {
  const query = input.query ?? ''
  const normalizedQuery = normalizeText(query)
  const signals = buildDeterministicSignals(query)
  const excludedIngredients = (input.excludeIngredients ?? []).map((item) => normalizeText(item))
  const dietaryPreferences = (input.dietaryPreferences ?? []).map((item) => normalizeText(item))

  const allItems = menuService.getAllProducts()
  const baseItems = allItems.filter((product) =>
    input.category && input.category !== 'All' ? product.category === input.category : true,
  )

  const filteredItems = baseItems
    .filter((product) => (input.maxBudget ? product.price <= input.maxBudget : true))
    .filter((product) =>
      excludedIngredients.length === 0
        ? true
        : excludedIngredients.every(
            (forbidden) =>
              !product.ingredients.map((ingredient) => normalizeText(ingredient)).some((ingredient) => ingredient.includes(forbidden)),
          ),
    )
    .filter((product) =>
      dietaryPreferences.length === 0
        ? true
        : dietaryPreferences.every((tag) => product.dietaryTags.map((item) => normalizeText(item)).includes(tag)),
    )
    .filter((product) => {
      if (signals.wantsNoCoffee && product.category === 'Coffee') {
        return false
      }

      return true
    })
    .map((product) => {
      let score = 0
      const haystack = normalizeText(
        `${product.name} ${product.description} ${product.category} ${product.ingredients.join(' ')}`,
      )

      if (normalizedQuery.length > 0 && haystack.includes(normalizedQuery)) {
        score += 4
      }
      if (normalizedQuery.length > 0) {
        const queryTokens = normalizedQuery
          .split(/[^a-zа-я0-9₴]+/i)
          .map((token) => token.trim())
          .filter((token) => token.length > 2)

        score += queryTokens.filter((token) => haystack.includes(token)).length
      }
      if (signals.wantsSweet && product.category === 'Desserts') {
        score += 3
      }
      if (signals.wantsBreakfast && product.category === 'Breakfast') {
        score += 3
      }
      if (signals.wantsBerry && haystack.includes('berry')) {
        score += 3
      }
      if (signals.wantsLight && product.price <= 180) {
        score += 2
      }
      if (signals.wantsNoCoffee && product.category !== 'Coffee') {
        score += 2
      }

      return { product, score }
    })
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .map(({ product }) => toMenuItemSummary(product))

  return { items: filteredItems }
}

