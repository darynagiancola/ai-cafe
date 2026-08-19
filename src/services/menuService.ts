import { menuProducts } from '../data/menu'
import type { MenuCategoryFilter, MenuProduct } from '../types/menu'

export interface MenuQuery {
  category?: MenuCategoryFilter
  search?: string
}

export const menuService = {
  getAllProducts(): MenuProduct[] {
    return menuProducts.filter((product) => product.available)
  },

  getFeaturedProducts(limit = 6): MenuProduct[] {
    return this.getAllProducts()
      .filter((product) => product.featured)
      .slice(0, limit)
  },

  getProductBySlug(slug: string): MenuProduct | undefined {
    return this.getAllProducts().find((product) => product.slug === slug)
  },

  getProductById(id: string): MenuProduct | undefined {
    return this.getAllProducts().find((product) => product.id === id)
  },

  queryProducts({ category = 'All', search = '' }: MenuQuery): MenuProduct[] {
    const normalizedSearch = search.trim().toLowerCase()

    return this.getAllProducts().filter((product) => {
      const categoryMatches = category === 'All' || product.category === category
      const searchMatches =
        normalizedSearch.length === 0 ||
        `${product.name} ${product.description} ${product.ingredients.join(' ')}`.toLowerCase().includes(normalizedSearch)

      return categoryMatches && searchMatches
    })
  },

  getRelatedProducts(product: MenuProduct, limit = 3): MenuProduct[] {
    return this.getAllProducts()
      .filter(
        (candidate) =>
          candidate.id !== product.id &&
          (candidate.category === product.category || candidate.featured),
      )
      .slice(0, limit)
  },
}
