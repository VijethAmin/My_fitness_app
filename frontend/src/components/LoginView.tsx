import { useState } from 'react'
import { API_URL } from '../api'

export type UserSession = {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

type Props = {
  onLogin: (user: UserSession) => void
}

function LoginView({ onLogin }: Props) {
  const [role, setRole] = useState<UserSession['role']>('user')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (role === 'user' && authMode === 'signup' && !trimmedName) {
      setError('Enter your name to create an account.')
      return
    }

    if (!trimmedEmail || !password) {
      setError('Enter your email and password.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/${role === 'user' && authMode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(role === 'admin' || authMode === 'login' ? { role } : {}),
          ...(role === 'admin' ? { name: 'Admin' } : authMode === 'signup' ? { name: trimmedName } : {}),
          email: trimmedEmail,
          password,
        }),
      })

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(responseBody?.detail ?? 'Request failed')
      }

      const session = (await response.json()) as UserSession
      onLogin(session)
    } catch (loginError) {
      console.error(loginError)
      const isNetworkError =
        loginError instanceof TypeError && loginError.message.toLowerCase().includes('failed to fetch')
      setError(
        role === 'admin'
          ? 'Admin login failed. Default admin is admin@fitness.local / admin123.'
          : isNetworkError
            ? 'Could not reach the backend. Start FastAPI on port 8000 and try again.'
            : loginError instanceof Error
            ? loginError.message
            : 'Could not complete your request. Try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-title">
        <span className="login-icon">+</span>
        <div className="section-heading">
          <p className="eyebrow">{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
          <h1 id="login-title">{authMode === 'signup' ? 'Sign Up' : 'Login'} to AI Fitness Coach</h1>
          <p>Log in to your account or sign up to start building fitness plans.</p>
        </div>

        <form className="field-grid" onSubmit={(event) => event.preventDefault()}>
          <div className="segmented-control" aria-label="Login role">
            <button
              type="button"
              className={role === 'user' ? 'active' : ''}
              onClick={() => setRole('user')}
            >
              User
            </button>
            <button
              type="button"
              className={role === 'admin' ? 'active' : ''}
              onClick={() => {
                setRole('admin')
                setAuthMode('login')
              }}
            >
              Admin
            </button>
          </div>

          {role === 'user' && authMode === 'signup' ? (
            <label>
              Name
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
            />
          </label>

          {error ? <p className="error-message">{error}</p> : null}

          <button
            type="button"
            className="primary-button full-width"
            disabled={isLoading}
            onClick={handleSubmit}
          >
            {isLoading
              ? authMode === 'signup' ? 'Creating account...' : 'Signing in...'
              : role === 'admin' ? 'Admin Login  ->' : authMode === 'signup' ? 'Create Account  ->' : 'Log In to Dashboard  ->'}
          </button>

          {role === 'user' ? (
            <p className="auth-switch">
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login')
                  setError('')
                }}
              >
                {authMode === 'login' ? 'Sign up' : 'Login'}
              </button>
            </p>
          ) : null}
        </form>
      </section>
    </main>
  )
}

export default LoginView
