
# Chopa Cosmetics — Production Polish (Wave)

This is a large wave. I'll ship it as three grouped commits so you can review incrementally rather than one giant change.

---

## Group A — Storefront UX (items 1, 2, 3, 6, 7)

**1. Editable quantity input** (`ProductVariantSelector`, `ProductDetail`, `Cart`, POS quantity cells)
- Replace read-only quantity display with a bordered `<input>` between the − / + buttons.
- `type="text" inputMode="numeric" pattern="[0-9]*"` → opens numeric keypad on mobile without spinner arrows.
- On change: parse int, clamp to `1..stock`, block negatives / zero / non-numeric. On blur: if empty → reset to 1.
- Wire the same controlled value everywhere totals are computed so wholesale tier, cart total, coupon %, wallet deduction all recompute in the existing effects (no schema change; existing `cart` context already reacts).

**2. Remove "added to cart" toast**
- Delete the `sonner` toast + the `CartNotification` banner call sites in `CartContext`, `ProductCard`, `ProductDetail`, `ProductQuickView`, `GlobalAddToCart`, `SmartRecommendations`.
- Replace with a 900 ms `animate-cart-pulse` class on the header cart icon (`Header.tsx` + `FloatingCartButton.tsx`) triggered via a new `useCartPulse()` event bus (tiny `EventTarget` in `CartContext`). Counter already updates instantly from context.
- Add keyframes in `index.css` (scale 1 → 1.18 → 1, soft primary glow).

**3. Reorder checkout sections** (`src/pages/Checkout.tsx`)
- New JSX order: Customer Info → Delivery Info → Order Summary (with coupon) → Wallet → Payment Method → I Have Paid → Submit Order.
- Order Summary and Wallet move from the right column into the main flow on mobile; on `lg:` desktop keep the sticky summary but also render the coupon inline above payment so both surfaces stay in sync via shared state.

**6. Delivery location search**
- Add a combobox above the existing select: text input + filtered suggestion list (client-side fuzzy match against the expanded list, debounced 120 ms).
- Pick suggestion → auto-fills the delivery address and fee.
- No match → "Use '<typed value>' as custom location" chip. Custom value is stored verbatim in `orders.delivery_address` (existing column) and rendered in Admin `OrdersManager` and the receipt (`src/lib/receipt.ts` already prints `delivery_address`).

**7. Expanded delivery list**
- Move the fee table into `src/data/deliveryLocations.ts` as `{ name, region, fee }[]` covering:
  - Nairobi estates (CBD, Westlands, Parklands, South B/C, Kilimani, Kileleshwa, Lavington, Karen, Langata, Runda, Ruaka, Kasarani, Roysambu, Zimmerman, Kahawa, Githurai, Umoja, Donholm, Buruburu, Embakasi, Pipeline, Utawala, Ruai, Rongai, etc.)
  - Kiambu belt (Ruiru, Juja, Kiambu, Thika, Kikuyu, Ngong, Limuru, Banana, Kamiti)
  - Machakos belt (Syokimau, Kitengela, Athi River, Machakos, Mlolongo)
  - Upcountry (Naivasha, Nakuru, Nyeri, Murang'a, Embu, Meru, Nanyuki, Kisumu, Eldoret, Kericho, Kisii, Kakamega, Bungoma, Busia, Narok, Isiolo, Garissa, Kitui, Makueni, Voi, Lamu, Malindi, Kilifi, Mombasa)
- Fees tiered by region (in-town / metro / upcountry). Sticker: "Delivery fee paid to driver on delivery" stays.

---

## Group B — Payments, wallet, coupon, branches (items 4, 5, 8, 9)

**4. Wallet-first payment logic** (`Checkout.tsx` + `validate-order` edge fn)
- Compute in this order every render:
  ```
  gross      = subtotal + deliveryFee
  couponOff  = validCoupon ? gross * pct/100 : 0
  netTotal   = max(0, gross - couponOff)
  walletUse  = min(walletBalance, netTotal)   // only if user toggled Apply Wallet
  amountDue  = netTotal - walletUse
  ```
- If `amountDue === 0`:
  - Hide M-Pesa fields, hide "I Have Paid".
  - Auto-set `mpesaConfirmed = true`, `paymentMethod = 'wallet'`.
  - "Submit Order" enabled immediately.
- If `amountDue > 0` and wallet partially used:
  - Show "Wallet: −Ksh X applied · Pay Ksh Y via M-Pesa Till 4623226".
  - Require M-Pesa code + I Have Paid before Submit Order enables.
- Edge fn (`validate-order`) already deducts from `customer_wallets` server-side; extend it to:
  - Accept `payment_method: 'wallet' | 'mpesa' | 'wallet+mpesa'`.
  - When `amountDue == 0`, mark `payment_status = 'paid'`, skip mpesa code requirement.
  - Debit wallet atomically and insert `wallet_transactions` type `spend` with `order_id` reference. Never allow negative balance (server re-checks).

**5. Coupon hardening**
- Client already calls `validate_coupon` RPC. Ensure:
  - Coupon % is applied to `subtotal + deliveryFee` (matches wallet flow above).
  - Rejected reasons (`expired`, `already_used`, `limit_reached`, `invalid`) surface as red helper text under the field, not toast.
  - Recomputed on every quantity/wallet change via existing `useMemo`.
  - Server: `validate_coupon` + `redeem_coupon` already enforce single-use per email + expiry + VIP rules; no schema change needed.
- Final total is `max(0, …)` at every step.

**8. Remove Pay on Delivery**
- Grep `pay.?on.?delivery`, `pod`, `cash_on_delivery` across `src/` and `supabase/functions/`. Remove:
  - Radio option / badge in `Checkout.tsx`.
  - Labels in `OrdersManager`, `POSSystem`, `receipt.ts`, `ai-chat-reply`, `customer-chat-reply` prompts.
  - Any `payment_method === 'cod'` branches (fallback to `'mpesa'`).
- Existing rows keep their historical value; new orders can only be `mpesa` / `wallet` / `wallet+mpesa`.

**9. Thika as main branch**
- Update `branches` rows (INSERT tool): mark Thika `is_main = true`, sort_order 1; Nairobi sort_order 2. If `is_main` column doesn't exist, use existing `is_default` / lowest `sort_order` convention (I'll check schema first and pick the right one).
- Pickup selector in `Checkout.tsx` defaults to Thika, with Nairobi as second option; pickup date/time pickers gated by branch business hours (already stored on `branches`).

---

## Group C — Admin managers (items 10, 11) + QA (12)

**10. Website Links Manager** (new admin section)
- New table `public.website_links` with columns: `label`, `url`, `icon` (lucide name string, optional), `color` (hex/hsl), `sort_order`, `is_active`.
- RLS: public SELECT of `is_active = true`; admins full write. GRANTs for anon (read active), authenticated (read active), service_role (all).
- Admin UI `WebsiteLinksManager.tsx` under Settings tab: add/edit/delete/toggle/reorder (drag handles).
- Frontend `<ExternalLinksRow />` component rendered in `Footer.tsx` and `Contact.tsx` — glassmorphism buttons (`backdrop-blur-md bg-white/10 border border-white/20`), soft primary glow, `hover:scale-105 transition`. `target="_blank" rel="noopener noreferrer"`.

**11. Social Media Manager**
- New table `public.social_links` with `platform` (enum: facebook, instagram, tiktok, whatsapp, telegram, youtube, pinterest, linkedin, x, threads, website, phone, email), `handle_or_url`, `is_active`, `sort_order`.
- Same RLS pattern as website_links.
- Admin UI `SocialLinksManager.tsx`: platform picker maps to lucide/simple-icons; URL auto-formats (`https://wa.me/…`, `mailto:`, `tel:`).
- Icons render in Footer and Contact — only where `is_active = true`. Replace the current hard-coded socials.

**12. QA pass**
- After each group: `tsgo`, `vitest run` (the security regression suite already there), plus a Playwright smoke script that: adds product → edits qty by typing → verifies cart pulse (no toast) → checkout → applies coupon → toggles wallet → confirms amountDue math → submits.
- Manual viewport screenshots at 375, 768, 1280 for storefront + checkout + admin managers.
- Fix any console/network errors surfaced.

---

## Technical notes

- **No breaking schema on existing tables.** Only two new tables (`website_links`, `social_links`); everything else is additive/logic.
- **Realtime:** wallet balance already refetched after order via existing `customer_wallets` query in Checkout; will add a small refresh after `validate-order` returns to sync the header wallet chip.
- **Ordering diagram:**
  ```
  ┌─ Checkout ────────────────────────────┐
  │ 1. Customer info                      │
  │ 2. Delivery info (search + list)      │
  │ 3. Order summary + coupon             │
  │ 4. Wallet (auto-apply toggle)         │
  │ 5. Payment method (only if amountDue) │
  │ 6. I Have Paid (only if M-Pesa)       │
  │ 7. Submit Order                       │
  └───────────────────────────────────────┘
  ```
- **Wallet math source of truth** lives in a new `useCheckoutTotals(cart, coupon, wallet, applyWallet)` hook so the UI, Submit gate, and payload sent to `validate-order` all read the same numbers.

---

## Delivery order

1. Group A (Storefront UX) → review
2. Group B (Payments/Branches) → review
3. Group C (Admin managers + QA) → review + publish

Reply "go" to start with Group A, or tell me to reorder / drop items.
