import { useState } from 'react'
import HomeView from './components/HomeView'
import FitnessView from './components/FitnessView'
import LoginView, { type UserSession } from './components/LoginView'
import AdminView from './components/AdminView'
import DashboardView from './components/DashboardView'

const SESSION_KEY = 'ai-fitness-coach-session'

function getStoredSession(): UserSession | null {
  const storedSession = localStorage.getItem(SESSION_KEY)

  if (!storedSession) {
    return null
  }

  try {
    return JSON.parse(storedSession) as UserSession
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

function App() {
  const [user, setUser] = useState<UserSession | null>(() => getStoredSession())
  const [view, setView] = useState<'home' | 'fitness' | 'dashboard'>(() =>
    user?.role === 'user' ? 'dashboard' : 'home',
  )

  const handleLogin = (session: UserSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    setView(session.role === 'user' ? 'dashboard' : 'home')
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setView('home')
    setUser(null)
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />
  }

  if (user.role === 'admin') {
    return <AdminView user={user} onLogout={handleLogout} />
  }

  return (
    <>
      {view === 'fitness' ? (
        <FitnessView user={user} onBack={() => setView('home')} onLogout={handleLogout} />
      ) : view === 'dashboard' ? (
        <DashboardView
          user={user}
          onBack={() => setView('home')}
          onBuildPlan={() => setView('fitness')}
          onLogout={handleLogout}
        />
      ) : (
        <HomeView
          user={user}
          onStart={() => setView('fitness')}
          onDashboard={() => setView('dashboard')}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}

export default App
