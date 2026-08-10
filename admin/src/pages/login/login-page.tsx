import { ShieldAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  loginWithEmailPassword,
  loginWithGoogle,
  registerWithEmailPassword,
} from '@/services/authService'
import { ADMIN_ACCESS_ROLES, type EstablishedSession } from '@/types/auth'

type Mode = 'sign-in' | 'create-account'

/**
 * The Admin Panel's sign-in screen — Google Login (as before) plus
 * Email/Password sign-in and registration (Step 52 follow-up: "register
 * account for new admins"), through the exact same Firebase project and
 * backend `POST /auth/{google,email}` endpoints the Student Web App uses.
 * **Registering an account here never grants admin access by itself** —
 * every brand-new account lands as `role: 'user'` unless a `super_admin`
 * already created a matching invite in Users Management, in which case the
 * invited role applies automatically on this exact sign-in. What decides
 * admin access is always the `role` the backend returns, never a separate
 * admin credential store or a "register as admin" checkbox.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleSession(session: EstablishedSession) {
    if (!ADMIN_ACCESS_ROLES.includes(session.user.role)) {
      setDeniedMessage(
        `${session.user.email} is signed in as a student account and does not have access to the Admin Panel. If you were invited as an admin, ask your super_admin to confirm the invite used this exact email.`,
      )
      return
    }
    login(session.user, session.accessToken)
    navigate(ROUTES.dashboard, { replace: true })
  }

  async function withSubmitState(action: () => Promise<EstablishedSession>) {
    setIsSubmitting(true)
    setDeniedMessage(null)
    setErrorMessage(null)
    try {
      handleSession(await action())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleLogin() {
    void withSubmitState(loginWithGoogle)
  }

  function handleEmailSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'sign-in') {
      void withSubmitState(() => loginWithEmailPassword(email, password))
    } else {
      void withSubmitState(() => registerWithEmailPassword(name, email, password))
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 text-primary mb-1 flex size-11 items-center justify-center rounded-full">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-base">Nalanda TNPSC Admin</CardTitle>
          <CardDescription>Sign in with your admin-staff account</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleGoogleLogin} loading={isSubmitting} variant="outline">
            Continue with Google
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">or</span>
            <div className="bg-border h-px flex-1" />
          </div>

          <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
            {(['sign-in', 'create-account'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setDeniedMessage(null)
                  setErrorMessage(null)
                }}
                className={cn(
                  'rounded-md py-1.5 text-xs font-medium transition-colors',
                  mode === m
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground',
                )}
              >
                {m === 'sign-in' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            {mode === 'create-account' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              />
            </div>
            <Button type="submit" loading={isSubmitting}>
              {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {deniedMessage && (
            <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-xs">
              {deniedMessage}
            </p>
          )}
          {errorMessage && (
            <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-xs">
              {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
