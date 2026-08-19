import type { StructuredTool } from '@langchain/core/tools'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import {
  calculateCart,
  getBusinessInfo,
  getMenu,
  getProductDetails,
  searchMenu,
  validatePromoCode,
} from '../tools/index.js'
import { MENU_CATEGORIES } from '../../types/menu.js'

export const OPENAI_TOOL_SCHEMAS = {
  getMenu: z.object({
    category: z.enum(MENU_CATEGORIES),
    dietaryTags: z.array(z.string()),
    onlyAvailable: z.boolean(),
  }),
  getProductDetails: z.object({
    query: z.string().min(1),
  }),
  searchMenu: z.object({
    query: z.string(),
    category: z.enum(MENU_CATEGORIES),
    maxBudget: z.number().nonnegative(),
    excludeIngredients: z.array(z.string()),
    dietaryPreferences: z.array(z.string()),
  }),
  calculateCart: z.object({
    items: z
      .array(
        z.object({
          product: z.string().min(1),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
  }),
  validatePromoCode: z.object({
    promoCode: z.string().min(1),
    items: z.array(
      z.object({
        product: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    ),
  }),
  getBusinessInfo: z.object({
    topic: z.enum(['all', 'address', 'hours', 'contact', 'pickup-delivery']),
  }),
}

export function createLangChainAiBaristaTools(): StructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: 'getMenu',
      description:
        'Retrieve products from authoritative AURELIA menu with category, dietary tag, and availability filters.',
      schema: OPENAI_TOOL_SCHEMAS.getMenu,
      func: async (input) =>
        JSON.stringify(
          getMenu({
            category: input.category,
            dietaryTags: input.dietaryTags,
            onlyAvailable: input.onlyAvailable,
          }),
        ),
    }),
    new DynamicStructuredTool({
      name: 'getProductDetails',
      description:
        'Get authoritative details for one product including ingredients and allergens.',
      schema: OPENAI_TOOL_SCHEMAS.getProductDetails,
      func: async (input) => JSON.stringify(getProductDetails({ query: input.query })),
    }),
    new DynamicStructuredTool({
      name: 'searchMenu',
      description:
        'Deterministically search the menu by intent, budget, dietary preferences, and exclusions.',
      schema: OPENAI_TOOL_SCHEMAS.searchMenu,
      func: async (input) =>
        JSON.stringify(
          searchMenu({
            query: input.query.trim().length > 0 ? input.query : undefined,
            category: input.category,
            maxBudget: input.maxBudget > 0 ? input.maxBudget : undefined,
            excludeIngredients: input.excludeIngredients,
            dietaryPreferences: input.dietaryPreferences,
          }),
        ),
    }),
    new DynamicStructuredTool({
      name: 'calculateCart',
      description:
        'Calculate line totals and subtotal from authoritative menu prices.',
      schema: OPENAI_TOOL_SCHEMAS.calculateCart,
      func: async (input) =>
        JSON.stringify(
          calculateCart({
            items: input.items,
          }),
        ),
    }),
    new DynamicStructuredTool({
      name: 'validatePromoCode',
      description:
        'Validate promo code and return deterministic discount/updated total.',
      schema: OPENAI_TOOL_SCHEMAS.validatePromoCode,
      func: async (input) =>
        JSON.stringify(
          validatePromoCode({
            promoCode: input.promoCode,
            items: input.items,
          }),
        ),
    }),
    new DynamicStructuredTool({
      name: 'getBusinessInfo',
      description:
        'Get business metadata including address, opening hours, and contact info.',
      schema: OPENAI_TOOL_SCHEMAS.getBusinessInfo,
      func: async (input) => JSON.stringify(getBusinessInfo({ topic: input.topic })),
    }),
  ]
}
