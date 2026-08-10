# features/payments/

Plan comparison, Razorpay checkout, subscription management, invoices — per
`docs/API.md` §8 and `docs/UI_Design_System.md` §36.

- `hooks/use-upgrade-checkout.ts` — Sprint 4 Step 56's full checkout flow
  (order → Razorpay Checkout → signature verify → poll for webhook-driven
  activation). Used by `pages/payments/subscription-page.tsx`.
- `components/payment-history-card.tsx` — Plan/Amount/Status/Date/Receipt
  table, same page.
