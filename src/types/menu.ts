export const MENU_CATEGORIES = [
  'All',
  'Coffee',
  'Matcha & Specialty Drinks',
  'Breakfast',
  'Desserts',
  'Coffee Beans',
  'Gifts',
] as const

export type MenuCategory = Exclude<(typeof MENU_CATEGORIES)[number], 'All'>
export type MenuCategoryFilter = (typeof MENU_CATEGORIES)[number]

export type ProductBadge = 'Popular' | 'New' | 'Vegan'

export interface MenuProduct {
  id: string
  slug: string
  name: string
  category: MenuCategory
  price: number
  currency: 'UAH'
  description: string
  longDescription: string
  image: string
  ingredients: string[]
  allergens: string[]
  dietaryTags: string[]
  available: boolean
  featured: boolean
  badges?: ProductBadge[]
}
