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
import {
  createPaperUnlockOrder,
  verifyPaperUnlockPayment,
} from '@/services/questionPapersService'

const BRAND_COLOR = '#4a3fbf'

/**
 * Previous Year Question Papers' one-time ₹29 unlock-all checkout — mirrors
 * `use-upgrade-checkout.ts`'s exact create-order → open Checkout → verify →
 * poll flow, just against the paper-unlock order/verify endpoints instead
 * of the subscription ones. Activation is webhook-driven here too
 * (`backend/src/services/payment.service.ts#activatePaperUnlockForPayment`),
 * so this never marks anything "unlocked" itself — it only re-fetches the
 * papers list until the backend's `isAccessible` flags reflect it.
 */
export function usePaperUnlockCheckout() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useTranslation('questionPapers')
  const [isProcessing, setIsProcessing] = useState(false)

  async function pollForUnlock() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await queryClient.invalidateQueries({ queryKey: ['question-papers'] })
    }
  }

  async function handleSuccess(response: RazorpayCheckoutSuccessResponse) {
    try {
      await verifyPaperUnlockPayment({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      })
      toast.success(t('paywall.verifiedToast'))
      await pollForUnlock()
      toast.success(t('paywall.unlockedToast'))
    } catch {
      toast.error(t('paywall.verifyErrorToast'))
    } finally {
      setIsProcessing(false)
    }
  }

  async function unlock() {
    setIsProcessing(true)
    try {
      const order = await createPaperUnlockOrder()
      const loaded = await loadRazorpayCheckout()
      if (!loaded || !window.Razorpay) {
        toast.error(t('paywall.scriptLoadErrorToast'))
        setIsProcessing(false)
        return
      }

      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Nalanda TNPSC',
        description: t('paywall.title'),
        order_id: order.razorpayOrderId,
        prefill: { email: user?.email },
        theme: { color: BRAND_COLOR },
        handler: (response) => {
          void handleSuccess(response)
        },
        modal: {
          ondismiss: () => {
            toast.info(t('paywall.cancelledToast'))
            setIsProcessing(false)
          },
        },
      })

      checkout.on('payment.failed', (response: RazorpayCheckoutFailureResponse) => {
        toast.error(t('paywall.failedToast', { reason: response.error.description }))
        setIsProcessing(false)
      })

      checkout.open()
    } catch {
      toast.error(t('paywall.orderErrorToast'))
      setIsProcessing(false)
    }
  }

  return { unlock, isProcessing }
}
