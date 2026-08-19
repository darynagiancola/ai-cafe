# AURELIA AI Barista Agent

## Overview

The project now supports two AI runtimes behind the same UI and service interface:

1. **Real LLM-backed mode (preferred):**
   - Frontend calls backend `/api/barista`
   - Backend runs LangChain tool-calling agent with OpenAI
   - Agent calls authoritative AURELIA tools only
2. **Deterministic fallback mode:**
   - Used when backend or `OPENAI_API_KEY` is unavailable
   - Keeps app usable locally without paid credentials

Core files:

- Frontend service bridge: `src/services/aiAssistantService.ts`
- Deterministic fallback agent: `src/agent/aiBaristaAgent.ts`
- Authoritative deterministic tools: `src/agent/tools/*`
- LangChain tool wrappers: `src/agent/langchain/createLangChainTools.ts`
- OpenAI/LangChain runtime: `src/agent/langchain/openAiBaristaRuntime.ts`
- Backend endpoint: `api/barista.ts`

## Goals

The agent helps customers:

- discover menu items;
- ask ingredient and allergen questions;
- get budget-aware recommendations;
- validate promo codes;
- build a proposed order with deterministic pricing;
- explicitly confirm before adding suggested items into the real cart.

## Tooling (Authoritative Layer)

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

## Session Memory

Short-term memory is session-scoped only (no long-term profile storage):

- conversation history (recent turns);
- proposed order lines;
- promo code context.

No payment secrets or sensitive profile storage.

## Cart Integration

The agent can prepare a proposed order, then emits an explicit UI confirmation action:

`Add N items to cart`

Only that user action triggers existing cart `addToCart` logic.

## Frontend/Backend Security Model

- OpenAI key is read only on backend (`OPENAI_API_KEY`).
- Frontend never sends key and never calls OpenAI directly.
- No `VITE_OPENAI_API_KEY` is used.
- Public frontend config uses only non-secret `VITE_AI_API_URL`.
- API input is validated; error responses are sanitized.

## Backend Request Flow

`React AI modal -> /api/barista -> LangChain agent -> OpenAI -> AURELIA tools -> structured response -> React modal`

## Environment Variables

Required for backend LLM mode:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
- `ALLOWED_ORIGINS` (CORS allow-list)

Frontend public:

- `VITE_AI_API_URL` (backend base URL)

Optional tracing:

- `LANGSMITH_TRACING`
- `LANGSMITH_API_KEY`
- `LANGSMITH_PROJECT`

## Local Development

1. Frontend only (fallback mode):
   - `npm run dev`
2. Frontend + real backend:
   - set `OPENAI_API_KEY` in `.env`
   - run `npx vercel dev`
   - run frontend with `VITE_AI_API_URL=http://localhost:3000 npm run dev`

## Future Migration

When Supabase is introduced, tool implementations can swap local service access for repository/database implementations while preserving identical tool interfaces and frontend contracts.
