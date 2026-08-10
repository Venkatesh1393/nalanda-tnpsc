import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/use-auth'
import {
  loadRazorpayCheckout,
  type RazorpayCheckoutFailureResponse,
  type RazorpayCheckoutSuccessResponse,
} from '@/lib/load-razorpay-checkout'
import { createOrder, verifyPayment } from '@/services/paymentsService'
import type { BillingCycle, CheckoutTier } from '@/types/payments'

const BRAND_COLOR = '#4a3fbf'

/**
 * Sprint 4 Step 56's full student-facing checkout flow: create a Razorpay
 * order → open Checkout → on success, verify the signature server-side →
 * poll `getMySubscription()` a few times since real activation is
 * webhook-driven and can land a second or two after `verify` returns
 * `{status:'processing'}` (see `backend/src/services/payment.service.ts`'s
 * header comment — this hook never marks anything "upgraded" on its own,
 * only the backend does that).
 */
export function useUpgradeCheckout() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useTranslation('payments')
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingTier, setPendingTier] = useState<CheckoutTier | null>(null)

  async function pollForActivation() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await queryClient.invalidateQueries({ queryKey: ['payments', 'subscription'] })
    }
    await queryClient.invalidateQueries({ queryKey: ['payments', 'invoices'] })
  }

  async function handleSuccess(response: RazorpayCheckoutSuccessResponse) {
    try {
      await verifyPayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      })
      toast.success(t('checkout.verifiedToast'))
      await pollForActivation()
    } catch {
      toast.error(t('checkout.verifyErrorToast'))
    } finally {
      setIsProcessing(false)
      setPendingTier(null)
    }
  }

  async function upgrade(tier: CheckoutTier, billingCycle: BillingCycle) {
    setIsProcessing(true)
    setPendingTier(tier)
    try {
      const order = await createOrder(tier, billingCycle)
      const loaded = await loadRazorpayCheckout()
      if (!loaded || !window.Razorpay) {
        toast.error(t('checkout.scriptLoadErrorToast'))
        setIsProcessing(false)
        setPendingTier(null)
        return
      }

      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Nalanda TNPSC',
        description: t('checkout.description', { tier: t(`plans.tierNames.${tier}`) }),
        order_id: order.razorpayOrderId,
        prefill: { email: user?.email },
        theme: { color: BRAND_COLOR },
        handler: (response) => {
          void handleSuccess(response)
        },
        modal: {
          ondismiss: () => {
            toast.info(t('checkout.cancelledToast'))
            setIsProcessing(false)
            setPendingTier(null)
          },
        },
      })

      checkout.on('payment.failed', (response: RazorpayCheckoutFailureResponse) => {
        toast.error(t('checkout.failedToast', { reason: response.error.description }))
        setIsProcessing(false)
        setPendingTier(null)
      })

      checkout.open()
    } catch {
      toast.error(t('checkout.orderErrorToast'))
      setIsProcessing(false)
      setPendingTier(null)
    }
  }

  return { upgrade, isProcessing, pendingTier }
}
