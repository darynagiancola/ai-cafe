import { z } from 'zod'
import { menuService } from '../../services/menuService.js'
import { MENU_CATEGORIES } from '../../types/menu.js'
import type { MenuItemSummary } from '../types.js'
import { toMenuItemSummary } from './helpers.js'

export const getMenuSchema = z.object({
  category: z
    .enum(MENU_CATEGORIES)
    .optional()
    .describe('Optional menu category filter'),
  dietaryTags: z
    .array(z.string())
    .optional()
    .describe('Optional dietary tags to include, e.g. vegan'),
  onlyAvailable: z.boolean().optional().default(true),
})

export type GetMenuInput = z.infer<typeof getMenuSchema>

export interface GetMenuResult {
  items: MenuItemSummary[]
}

export function getMenu(input: GetMenuInput): GetMenuResult {
  const category = input.category ?? 'All'
  const requestedTags = (input.dietaryTags ?? []).map((tag) => tag.toLowerCase())

  const items = menuService
    .queryProducts({ category, search: '' })
    .filter((product) => (input.onlyAvailable ?? true ? product.available : true))
    .filter((product) =>
      requestedTags.length === 0
        ? true
        : requestedTags.every((tag) => product.dietaryTags.map((item) => item.toLowerCase()).includes(tag)),
    )
    .map((product) => toMenuItemSummary(product))

  return { items }
}

