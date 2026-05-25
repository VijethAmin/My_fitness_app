import { useState } from 'react'

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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (role === 'user' && !trimmedName) {
      setError('Enter your name for user login.')
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
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          name: role === 'admin' ? 'Admin' : trimmedName,
          email: trimmedEmail,
          password,
        }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const session = (await response.json()) as UserSession
      onLogin(session)
    } catch (loginError) {
      console.error(loginError)
      setError(
        role === 'admin'
          ? 'Admin login failed. Default admin is admin@fitness.local / admin123.'
          : 'User login failed. Check your password or create a new user with a new email.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="section-heading">
          <p className="eyebrow">Welcome back</p>
          <h1 id="login-title">Login to AI Fitness Coach</h1>
          <p>Choose user login for fitness plans or admin login to manage users.</p>
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
              onClick={() => setRole('admin')}
            >
              Admin
            </button>
          </div>

          <label>
            Name
            <input
              autoComplete="name"
              disabled={role === 'admin'}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={role === 'admin' ? 'Admin account' : 'Your name'}
            />
          </label>

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
              autoComplete="current-password"
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
            {isLoading ? 'Signing in...' : role === 'admin' ? 'Admin Login' : 'User Login'}
          </button>
        </form>
      </section>
    </main>
  )
}

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '/api')

export default LoginView
