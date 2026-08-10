/**
 * Sprint 4 Step 56 — lazily injects Razorpay's Checkout script, only when a
 * student actually clicks "Upgrade," rather than loading it on every page
 * for every visitor (the standard Razorpay-recommended pattern). Resolves
 * once `window.Razorpay` is available; resolves `false` on network failure
 * so the caller can show a real error instead of throwing into a checkout
 * click handler.
 */
const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance
  }
}

export interface RazorpayCheckoutSuccessResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface RazorpayCheckoutFailureResponse {
  error: { code: string; description: string; source: string; step: string; reason: string }
}

export interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  prefill?: { email?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: RazorpayCheckoutSuccessResponse) => void
  modal?: { ondismiss?: () => void }
}

export interface RazorpayCheckoutInstance {
  open: () => void
  on: (event: 'payment.failed', handler: (response: RazorpayCheckoutFailureResponse) => void) => void
}

let loadPromise: Promise<boolean> | null = null

export function loadRazorpayCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  loadPromise ??= new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
  return loadPromise
}
