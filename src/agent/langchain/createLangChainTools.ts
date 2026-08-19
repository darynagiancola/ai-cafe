import type { StructuredTool } from '@langchain/core/tools'
import { DynamicStructuredTool } from '@langchain/core/tools'
import {
  calculateCart,
  calculateCartSchema,
  getBusinessInfo,
  getBusinessInfoSchema,
  getMenu,
  getMenuSchema,
  getProductDetails,
  getProductDetailsSchema,
  searchMenu,
  searchMenuSchema,
  validatePromoCode,
  validatePromoCodeSchema,
} from '../tools'

export function createLangChainAiBaristaTools(): StructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: 'getMenu',
      description:
        'Retrieve products from authoritative AURELIA menu with category, dietary tag, and availability filters.',
      schema: getMenuSchema,
      func: async (input) => JSON.stringify(getMenu(input)),
    }),
    new DynamicStructuredTool({
      name: 'getProductDetails',
      description:
        'Get authoritative details for one product including ingredients and allergens.',
      schema: getProductDetailsSchema,
      func: async (input) => JSON.stringify(getProductDetails(input)),
    }),
    new DynamicStructuredTool({
      name: 'searchMenu',
      description:
        'Deterministically search the menu by intent, budget, dietary preferences, and exclusions.',
      schema: searchMenuSchema,
      func: async (input) => JSON.stringify(searchMenu(input)),
    }),
    new DynamicStructuredTool({
      name: 'calculateCart',
      description:
        'Calculate line totals and subtotal from authoritative menu prices.',
      schema: calculateCartSchema,
      func: async (input) => JSON.stringify(calculateCart(input)),
    }),
    new DynamicStructuredTool({
      name: 'validatePromoCode',
      description:
        'Validate promo code and return deterministic discount/updated total.',
      schema: validatePromoCodeSchema,
      func: async (input) => JSON.stringify(validatePromoCode(input)),
    }),
    new DynamicStructuredTool({
      name: 'getBusinessInfo',
      description:
        'Get business metadata including address, opening hours, and contact info.',
      schema: getBusinessInfoSchema,
      func: async (input) => JSON.stringify(getBusinessInfo(input)),
    }),
  ]
}
