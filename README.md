# AURELIA Café — Premium Specialty Coffee Website

A production-style responsive customer website for a fictional premium specialty café brand.

This project is intentionally structured to support future integration with:

- **LangChain AI ordering assistant**
- **Supabase (menu/orders persistence)**
- **WayForPay payments**
- **Kitchen Display System (KDS)**

For now, it includes polished frontend UX + local/mock business logic with clean service abstractions.

---

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide icons
- Context API (cart state)

---

## Local Setup

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Current Features

### Brand & Experience

- Fictional premium café brand: **AURELIA Café**
- Warm, modern specialty coffee visual language
- Sticky responsive navigation + elegant mobile menu
- Full responsive layout for mobile/tablet/desktop

### Pages & Customer Journey

- Home page with:
  - Hero section
  - Featured products
  - Brand philosophy section
  - AI Barista teaser + mock chat modal
  - Final ordering CTA
- Menu/catalog page:
  - Category filters
  - Search
  - Product cards with badges and add-to-cart
- Product detail page:
  - Ingredients, allergens, dietary notes
  - Quantity selector
  - Related products
- Cart page:
  - Add/remove/increase/decrease items
  - Promo code application
  - Subtotal / discount / total
- Checkout page:
  - Customer form
  - Pickup/Delivery mode
  - Delivery fields
  - Mock “Pay with WayForPay” flow
- About page
- Contact/location page
- 404 page

### Data & Architecture

- Centralized menu source: `src/data/menu.ts`
- Centralized business source: `src/data/business.ts`
- Strong TypeScript models for:
  - Menu products
  - Cart entities
  - Orders/payment states
- Service layer abstractions:
  - `menuService`
  - `promoService`
  - `orderService`
  - `paymentService`
  - `aiAssistantService`
  - `businessService`
- Deterministic totals calculated from authoritative product prices
- Cart persisted in `localStorage`
- Promo code architecture with controlled rules (`WELCOME10`)

---

## Project Structure

```text
src/
  components/
    ai/
    cart/
    layout/
    menu/
    ui/
  context/
  data/
  hooks/
  pages/
  services/
  types/
  utils/
```

---

## Integration-Ready Principles Implemented

- Product price authority comes from structured menu data
- Totals are calculated programmatically, not by AI
- Payment flow is abstracted behind `paymentService`
- No payment secrets in frontend
- Order model includes statuses/payment metadata for backend validation
- Order shape is prepared for future KDS usage
- React components do not directly depend on Supabase

---

## Planned Integrations

### 1) LangChain AI Barista

Planned: Replace mock AI service with API-backed LangChain agent that can:

- Recommend products by taste/preferences
- Answer ingredient/allergen questions
- Suggest options under budget
- Assist with cart composition (only after user confirmation)

### 2) Supabase

Planned: Replace local data/services with Supabase repositories for:

- Menu catalog
- Orders
- Promo code validation
- Operational analytics

### 3) WayForPay

Planned: Replace mock payment init with secure backend endpoint + signature generation.
Frontend will consume backend payment session responses only.

### 4) KDS

Planned: After successful paid order persistence, expose order stream/queue for Kitchen Display System consumption.

---

## Notes for Future Development

- Keep `src/data/menu.ts` as authoritative reference shape while migrating to Supabase schema.
- Preserve deterministic price/discount calculations server-side as source of truth.
- Treat AI outputs as assistive text only; never authoritative for payment/order status.
