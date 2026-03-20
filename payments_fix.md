# Payment Stuck as PENDING - Analysis & Fix

## What the screenshots show

| Screenshot | Details |
|---|---|
| 1 | MetaMask SDK connection terminated on NOWPayments |
| 2-3 | NOWPayments: "Payment Processing", Payment ID `4395378406` |
| 4 | Order ID: `34a441d0-c9f0-425a-89f3-426a7effcd6b`, "Professional Plan - MONTHLY" |
| 5 | MetaMask confirmed **29.93 USDC** on Ethereum |
| 6 | Aquafier app: still shows **Free Plan** (ACTIVE) - not upgraded |
| 7 | Payment History: **PENDING**, $0.00 spent, 0 successful |

The user paid. NOWPayments received and processed it. But the app **never transitioned the payment from PENDING to SUCCEEDED**.

---

## ROOT CAUSE: Broken IPN Signature Verification

The **#1 bug** is in `api/src/utils/nowpayments_service.ts:116-124` and `api/src/controllers/payments.ts:417`.

**The problem:** NOWPayments requires the JSON payload to be **sorted by keys** before computing the HMAC-SHA512 signature. The code does NOT sort:

```typescript
// payments.ts:417 - NOT sorted!
const payload = JSON.stringify(request.body);

// nowpayments_service.ts:119-121 - computes HMAC on unsorted payload
const hmac = crypto.createHmac('sha512', ipnSecret);
hmac.update(payload);  // <-- unsorted JSON = wrong signature
const calculatedSignature = hmac.digest('hex');
```

NOWPayments computes their signature on `JSON.stringify(sortedByKeys(body))`. The code computes it on `JSON.stringify(body)` (unsorted). **They will never match.** So every single webhook callback is rejected at line 422:

```typescript
if (!NOWPaymentsService.verifyIPNSignature(signature, payload)) {
    Logger.warn('Invalid NOWPayments IPN signature');
    return reply.code(400).send({ success: false, error: 'Invalid signature' });  // <-- ALWAYS hits this
}
```

This means:
- NOWPayments sends the IPN webhook saying "payment finished"
- The server rejects it with 400 (bad signature)
- NOWPayments retries a few times, then gives up
- Payment stays PENDING forever
- Subscription stays INCOMPLETE, user sees Free Plan

---

## Secondary Issues Found

### 1. No frontend polling after payment redirect

**File:** `web/src/pages/pricing/PricingPage.tsx:65`

After redirecting to NOWPayments, the user comes back to `/app/subscription?success=true` but there's **no polling** of payment status. Even if the webhook worked, the frontend wouldn't update without a manual page refresh.

### 2. `getCryptoPaymentStatus()` API exists but is never called

The backend has an endpoint to check NOWPayments status (`GET /payments/crypto/status/:payment_id`), and the frontend API wrapper exists in `web/src/api/subscriptionApi.ts`, but it's never invoked anywhere in the frontend.

### 3. Silent failure on payment not found

**File:** `api/src/controllers/payments.ts:460-462`

If the `order_id` doesn't match, the webhook returns `{ success: true }` silently — NOWPayments thinks it was processed successfully and won't retry:

```typescript
if (!payment) {
    Logger.warn('Payment not found for IPN', { order_id: ipnData.order_id, payment_id: ipnData.payment_id });
    return reply.send({ success: true });  // <-- NOWPayments thinks all good, stops retrying
}
```

---

## Payment Flow Overview

### How payment creation works

1. User clicks "Subscribe Now" on PricingPage
2. Frontend calls `POST /payments/crypto/create-payment`
3. Backend creates a Subscription with status `INCOMPLETE`
4. Backend calls NOWPayments API to create an invoice
5. Backend stores a Payment record with status `PENDING` and `nowpayments_order_id = subscription.id`
6. Frontend redirects user to NOWPayments payment URL
7. User pays via MetaMask

### How the webhook SHOULD work (but doesn't due to the bug)

1. NOWPayments sends IPN to `POST /payments/crypto/webhook` with status updates
2. Backend verifies signature (**FAILS HERE** — keys not sorted)
3. Backend looks up payment by `nowpayments_order_id` matching `ipnData.order_id`
4. Backend maps NOWPayments status to internal status:
   - `waiting` → PENDING
   - `confirming` / `confirmed` / `sending` / `partially_paid` → PROCESSING
   - `finished` → SUCCEEDED (activates subscription)
   - `failed` → FAILED
   - `refunded` / `expired` → CANCELED
5. If SUCCEEDED: deactivates old subscriptions, activates the new one, generates invoice

---

## Recommended Fix: Signature Verification

The `verifyIPNSignature` method needs to sort the payload keys recursively before hashing:

```typescript
// In nowpayments_service.ts

function sortObject(obj: any): any {
  return Object.keys(obj).sort().reduce((result: any, key: string) => {
    result[key] = obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])
      ? sortObject(obj[key])
      : obj[key];
    return result;
  }, {});
}

static verifyIPNSignature(receivedSignature: string, payload: string): boolean {
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || '';

    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(JSON.stringify(sortObject(JSON.parse(payload))));
    const calculatedSignature = hmac.digest('hex');

    return receivedSignature === calculatedSignature;
}
```

## Recommended Fix: Frontend Polling

After the user returns from NOWPayments to `/app/subscription?success=true`, the SubscriptionPage should:

1. Detect the `?success=true` query parameter
2. Poll `GET /payments/crypto/status/:payment_id` every few seconds
3. Once the payment status is SUCCEEDED, refresh the subscription data
4. Show a loading/waiting state to the user while polling

## Recommended Fix: Silent Failure

When a payment is not found for an IPN, return an error status so NOWPayments retries:

```typescript
if (!payment) {
    Logger.warn('Payment not found for IPN', { order_id: ipnData.order_id, payment_id: ipnData.payment_id });
    return reply.code(404).send({ success: false, error: 'Payment not found' });  // <-- triggers retry
}
```

---

## Key File Locations

| File | Purpose |
|---|---|
| `api/prisma/schema.prisma` (lines 393-609) | Database schema — Payment, Subscription, WebhookEvent models |
| `api/src/controllers/payments.ts` (lines 276-407) | Crypto payment creation endpoint |
| `api/src/controllers/payments.ts` (lines 410-618) | Webhook/IPN handler |
| `api/src/utils/nowpayments_service.ts` | NOWPayments API integration & signature verification |
| `api/src/controllers/subscriptions.ts` (lines 99-197) | Subscription management |
| `web/src/api/subscriptionApi.ts` | Frontend API wrapper (has unused `getCryptoPaymentStatus`) |
| `web/src/pages/pricing/PricingPage.tsx` | Payment initiation & redirect |
| `web/src/pages/subscription/SubscriptionPage.tsx` | Subscription status display (no polling) |
| `web/src/pages/billing/PaymentHistoryPage.tsx` | Payment history view |

---

## Debugging Checklist

1. **Check WebhookEvent table** — look for `source = 'NOWPAYMENTS'` entries; if `processed = false` or no entries exist, the webhook is being rejected
2. **Check server logs** — search for `"Invalid NOWPayments IPN signature"` warnings
3. **Verify environment variables** — `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `BACKEND_URL` must all be set correctly
4. **Check NOWPayments dashboard** — verify IPN callback URL and delivery logs
5. **Check Payment table** — the stuck payment should have `status = 'PENDING'` and `paid_at = NULL`
6. **Check Subscription table** — the associated subscription should have `status = 'INCOMPLETE'`

---

## References

- [NOWPayments IPN Setup Documentation](https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup)
- [NOWPayments WooCommerce Plugin (reference implementation)](https://github.com/NowPaymentsIO/nowpayments-payment-gateway-for-woocommerce/blob/master/class-wc-gateway-nowpayments.php)
