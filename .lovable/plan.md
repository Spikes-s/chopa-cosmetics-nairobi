# Chopa VIP Membership, AI Email Marketing & Smart Coupon System

This is a large multi-part build. Here's how I'll deliver it in clear phases so we can ship and verify each piece before stacking the next.

## Phase 1 — Database foundation
New tables (all with RLS + grants):
- `vip_members` — full_name, email (unique, lowercased), status (active/unsubscribed/blocked), joined_at, last_email_sent_at, coupons_used_count
- `vip_coupons` — code (unique), discount_percent, starts_at, expires_at, usage_limit, is_active, created_by, auto-expires when a new coupon is generated or after 7 days
- `vip_coupon_redemptions` — coupon_id, member_email or user_id, order_id, redeemed_at (unique per coupon+email to enforce one-use-per-customer)
- `vip_email_campaigns` — subject, body, sent_by, sent_at, recipient_count, coupon_id (nullable), delivery summary
- `vip_campaign_recipients` — campaign_id, email, status, sent_at (for delivery tracking)
- `products`: add `wholesale_price` and `wholesale_min_qty` columns (retail price already exists)

Security definer helpers: `expire_old_coupons()`, `validate_coupon(code, email)`, `redeem_coupon(code, email, order_id)`.

## Phase 2 — Homepage VIP signup section
- New `VIPMembershipSection` component on `Index.tsx` with Full Name (optional) + Email (required, zod-validated)
- Duplicate-email guard with friendly message
- Success toast: "Welcome to Chopa VIP Membership 💖"
- Honeypot + Lovable AI moderation to block spam/fake signups

## Phase 3 — Admin VIP Members tab
New `VIPMembersManager` tab in `AdminDashboard` (admin + super_admin only), with:
- Stats cards (total, new this week, active, coupons sent, coupons redeemed, campaigns sent)
- Members table: search, status filter, CSV + Excel export
- Per-member actions: change status (active/unsubscribed/blocked)

## Phase 4 — AI Email Generator + Mass Send
- Edge function `vip-generate-email` using Lovable AI (`google/gemini-3-flash-preview`) — admin types rough instructions, gets back subject + branded HTML body in Chopa's friendly beauty-industry tone
- Edge function `vip-send-campaign` — sends via existing Resend integration to all active members, records `vip_email_campaigns` + per-recipient delivery rows, supports an optional coupon block injected into the email
- One-click unsubscribe link in every email (uses `vip_members.status = 'unsubscribed'`)

## Phase 5 — Smart Coupon Generator
- Cosmetic-themed code pool (BEAUTYGLOW, PINKBLUSH, SILKSKIN, GLOWUP, CHOPALOVE, ROSEGLOW, BEAUTYVIP, SKINQUEEN, …) with random unused selection + optional numeric suffix for uniqueness
- Admin UI: Generate New Coupon → edit discount %, dates, usage limit, active flag
- Generating a new coupon auto-expires the previous active VIP coupon
- Daily expiry sweep via pg_cron calling `expire_old_coupons()` (also runs lazily on validate)
- "Send Coupon To VIP Members" — opens AI email composer pre-filled with the coupon block, then mass-sends

## Phase 6 — Pricing upgrade + Checkout coupon engine
- Product admin form: add Wholesale Price + Wholesale Min Qty fields
- Cart/Checkout: apply wholesale price automatically when qty ≥ threshold
- Checkout coupon box: live validation against `validate_coupon` RPC, shows ✓ Applied / ✕ Invalid / ✕ Expired / ✕ Already used, updates totals without refresh
- On order completion: call `redeem_coupon` so each email can only use a coupon once

## Phase 7 — VIP Analytics
New "VIP Analytics" card inside the existing admin dashboard:
- Member growth chart, coupon usage rate, revenue from coupons, revenue from VIP members, top coupons, campaigns sent
- Built with existing Recharts setup

## Phase 8 — Performance pass
- Code-split admin routes and heavy pages with `React.lazy` + `Suspense`
- Add `loading="lazy"` + `decoding="async"` + explicit width/height to product images
- Convert hero/static images to WebP where possible, preload LCP image
- Memoize product grids, debounce search input
- Add `Cache-Control` headers on static assets via Vite build hints

## Phase 9 — Security & validation
- Zod validation on every form (client + edge function)
- RLS: VIP members only writable via edge function (service role); public can insert their own signup via a tightly-scoped policy with rate limit
- Coupon RPCs are `SECURITY DEFINER` with strict checks
- Edge functions: input sanitization, per-IP rate limiting on signup + coupon validate, CORS locked to site origin
- All admin actions gated by `has_role(auth.uid(), 'admin')`

## Phase 10 — Final QA
Manual + console-clean verification of: signup, duplicate guard, AI email generation, mass send delivery rows, coupon generation, auto-expiry on new coupon, 7-day expiry, one-use-per-customer, checkout totals update live, analytics numbers match, no console errors/warnings.

---

## Technical notes
- AI: Lovable AI Gateway (`LOVABLE_API_KEY`) — no extra secrets needed
- Email: existing `RESEND_API_KEY` connector
- DB: 6 new tables + 2 product columns + 3 RPCs + 1 pg_cron job
- New edge functions: `vip-generate-email`, `vip-send-campaign`, `vip-signup` (handles rate-limit + dedupe)
- New admin component: `VIPMembersManager` with sub-tabs (Members, Compose Email, Coupons, Analytics)

## Heads-up on scope
This is roughly 2–3 days of focused build. I'd like to confirm before starting:

1. **Email sender** — keep using Resend with the existing verified sender, or set up Lovable Emails on your own domain?
2. **Coupon stacking** — can a VIP coupon stack with wholesale pricing, or coupon overrides wholesale (one discount only)?
3. **Unsubscribe** — one-click link in every email is fine, right? (Required for deliverability.)
4. **Scope trim** — happy for me to ship all 10 phases, or want me to start with Phases 1–5 (VIP + coupons + AI emails) and do pricing/analytics/perf in a follow-up?

Once you answer those I'll start building immediately.