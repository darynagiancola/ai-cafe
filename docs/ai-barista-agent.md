# AURELIA AI Barista Agent (MVP)

## Overview

The AI Barista MVP is implemented as a deterministic, tool-driven assistant that uses authoritative project data and services instead of hallucinated model memory.

- Runtime entry: `src/services/aiAssistantService.ts`
- Agent core: `src/agent/aiBaristaAgent.ts`
- Deterministic tools: `src/agent/tools/*`
- LangChain wrappers (future-provider ready): `src/agent/langchain/createLangChainTools.ts`

## Goals

The agent helps customers:

- discover menu items;
- ask ingredient and allergen questions;
- get budget-aware recommendations;
- validate promo codes;
- build a proposed order with deterministic pricing;
- explicitly confirm before adding suggested items into the real cart.

## Tooling

The agent uses six typed tools:

1. `getMenu` — category/dietary/availability menu retrieval.
2. `getProductDetails` — authoritative product details by id/slug/name.
3. `searchMenu` — deterministic preference/budget search.
4. `calculateCart` — deterministic line totals + subtotal from menu prices.
5. `validatePromoCode` — promo validation/discounts through existing promo service.
6. `getBusinessInfo` — address/hours/contact/pickup-delivery information.

## Safety Constraints

The agent is designed to never:

- invent products/prices/ingredients/allergens;
- invent discounts or promo codes;
- mark orders as paid;
- claim payment status without backend confirmation.

For allergy questions, it only reports explicitly listed allergens/ingredients and warns about uncertainty.

## Session Memory (MVP)

In-memory, browser-session-only state:

- discussed products;
- selected/proposed order lines;
- budget;
- promo code.

No payment secrets or sensitive profile storage.

## Cart Integration

The agent can prepare a proposed order, then emits an explicit UI confirmation action:

`Add N items to cart`

Only that user action triggers existing cart `addToCart` logic.

## MVP without External API Keys

The current MVP runs without paid model credentials by using deterministic intent handling plus tool calls.

LangChain integration is prepared via typed wrappers in:

- `src/agent/langchain/createLangChainTools.ts`

Future server-side model providers (OpenAI/Anthropic/etc.) can call these tools without changing the React UI contract.

## Future Migration

When Supabase is introduced, tool implementations can swap local service access for repository/database implementations while preserving the same tool interfaces and agent behavior.
