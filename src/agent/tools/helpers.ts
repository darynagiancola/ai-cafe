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
  const normalizedQuery = normalizeText(query)
  const singularQuery = singularize(normalizedQuery)
  const products = menuService.getAllProducts()

  return products.find((product) => {
    const normalizedName = normalizeText(product.name)
    const normalizedSlug = normalizeText(product.slug.replaceAll('-', ' '))

    if (
      // Preserve exact product-id matching for authoritative cart/payment item IDs.
      product.id === normalizedQuery ||
      normalizedName === normalizedQuery ||
      normalizedName === singularQuery ||
      normalizedSlug === normalizedQuery ||
      normalizedSlug === singularQuery
    ) {
      return true
    }

    if (
      normalizedName.includes(normalizedQuery) ||
      normalizedName.includes(singularQuery) ||
      normalizedSlug.includes(normalizedQuery) ||
      normalizedSlug.includes(singularQuery)
    ) {
      return true
    }

    const keyTokens = normalizedName.split(' ').filter((token) => token.length > 4)
    return keyTokens.some(
      (token) =>
        token === normalizedQuery ||
        token === singularQuery ||
        token.includes(normalizedQuery) ||
        token.includes(singularQuery),
    )
  })
}
