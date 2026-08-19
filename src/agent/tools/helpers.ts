import { menuService } from '../../services/menuService.js'
import type { MenuProduct } from '../../types/menu.js'
import type { MenuItemSummary, ProductDetails } from '../types.js'

export function toMenuItemSummary(product: MenuProduct): MenuItemSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    description: product.description,
    dietaryTags: product.dietaryTags,
    available: product.available,
  }
}

export function toProductDetails(product: MenuProduct): ProductDetails {
  return {
    ...toMenuItemSummary(product),
    longDescription: product.longDescription,
    ingredients: product.ingredients,
    allergens: product.allergens,
  }
}

export function normalizeText(value: string): string {
  return value.toLowerCase().trim()
}

function singularize(value: string): string {
  return value.endsWith('s') ? value.slice(0, -1) : value
}

export function resolveProductFromQuery(query: string): MenuProduct | undefined {
  const normalizedQuery = singularize(normalizeText(query))
  const products = menuService.getAllProducts()

  return products.find((product) => {
    const normalizedName = normalizeText(product.name)
    const normalizedSlug = normalizeText(product.slug.replaceAll('-', ' '))

    if (
      normalizedName === normalizedQuery ||
      normalizedSlug === normalizedQuery ||
      product.id === normalizedQuery
    ) {
      return true
    }

    if (normalizedName.includes(normalizedQuery) || normalizedSlug.includes(normalizedQuery)) {
      return true
    }

    const keyTokens = normalizedName.split(' ').filter((token) => token.length > 4)
    return keyTokens.some((token) => token === normalizedQuery || token.includes(normalizedQuery))
  })
}
