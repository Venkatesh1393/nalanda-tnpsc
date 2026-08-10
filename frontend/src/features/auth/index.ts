/**
 * The Auth feature's public surface — pages import from here, never by
 * reaching into `features/auth/components/*` directly (per `features/README.md`).
 */
export { GoogleLoginButton } from '@/features/auth/components/google-login-button'
export { OtpVerificationForm } from '@/features/auth/components/otp-verification-form'
export {
  RegisterPathSelector,
  type RegisterPath,
} from '@/features/auth/components/register-path-selector'
