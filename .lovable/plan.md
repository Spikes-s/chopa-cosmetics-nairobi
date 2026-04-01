

# M-PESA Express (STK Push) Integration Plan

## Overview
Add an M-PESA STK Push payment option alongside the existing manual M-PESA flow. Customers can choose to receive a payment prompt directly on their phone instead of manually paying and pasting the confirmation message.

## Architecture

```text
Customer clicks "Pay with M-PESA"
        │
        ▼
Frontend → supabase.functions.invoke('mpesa-stk-push')
        │
        ▼
Edge Function:
  1. Gets OAuth token from Safaricom Daraja API
  2. Sends STK Push request
  3. Returns CheckoutRequestID
        │
        ▼
Frontend polls → supabase.functions.invoke('mpesa-callback')
  to check payment status
        │
        ▼
Safaricom sends result → mpesa-callback Edge Function
  stores result in mpesa_transactions table
```

## Steps

### 1. Store Daraja API credentials as secrets
Add two secrets using the secrets tool:
- `MPESA_CONSUMER_KEY` — Daraja Consumer Key
- `MPESA_CONSUMER_SECRET` — Daraja Consumer Secret

The passkey and shortcode are sandbox-standard values and can be stored in the edge function code (they are not sensitive — they are published by Safaricom for all sandbox users).

### 2. Create `mpesa_transactions` database table
Stores STK Push transaction state and callback results:
- `id`, `checkout_request_id`, `merchant_request_id`, `phone_number`, `amount`, `status` (pending/completed/failed/cancelled), `mpesa_receipt_number`, `result_code`, `result_desc`, `order_id` (nullable FK to orders), `created_at`, `updated_at`
- RLS: insert/select for authenticated + anon (needed for callback and polling)

### 3. Create `mpesa-stk-push` Edge Function
- Validates phone number (must be 254XXXXXXXXX format) and amount
- Fetches OAuth access token from `https://sandbox.safaricom.co.ke/oauth/v1/generate`
- Constructs password: `base64(ShortCode + Passkey + Timestamp)`
- Sends STK Push to `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
- CallBackURL points to the mpesa-callback edge function
- Inserts a pending record into `mpesa_transactions`
- Returns `CheckoutRequestID` to frontend

### 4. Create `mpesa-callback` Edge Function
- Receives POST from Safaricom with transaction result
- Updates `mpesa_transactions` row with result code, receipt number, status
- No JWT verification (Safaricom cannot send auth headers)
- Validates expected payload structure

### 5. Create `mpesa-query` Edge Function
- Frontend polls this to check transaction status
- Queries `mpesa_transactions` by `checkout_request_id`
- Also optionally queries Safaricom's STK Query API as fallback

### 6. Update Checkout page UI
Add a payment method toggle in the Payment card:
- **Option A: "Pay with M-PESA Express"** — shows phone number input, triggers STK Push, polls for result
- **Option B: "Pay Manually"** — existing flow (paste confirmation message)

When STK Push succeeds:
- Auto-fill the mpesa_code field with the receipt number
- Auto-confirm payment (set `hasPaid = true`)
- Proceed with existing order submission flow

### 7. Add config to `supabase/config.toml`
```toml
[functions.mpesa-stk-push]
verify_jwt = false

[functions.mpesa-callback]
verify_jwt = false

[functions.mpesa-query]
verify_jwt = false
```

## Security considerations
- Consumer Key/Secret stored as backend secrets, never exposed to client
- Phone number validated server-side
- Callback endpoint validates Safaricom payload structure
- STK Push amount validated against order total server-side
- Rate limiting on STK Push requests (one per phone per 30 seconds)

## Technical details
- **Sandbox URL**: `https://sandbox.safaricom.co.ke`
- **Shortcode**: 174379 (standard sandbox)
- **Passkey**: Standard sandbox passkey (hardcoded in edge function — it's public knowledge)
- **Transaction type**: CustomerPayBillOnline
- Polling interval: every 5 seconds for up to 60 seconds

