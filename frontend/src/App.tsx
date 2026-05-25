import { useState } from 'react'
import HomeView from './components/HomeView'
import FitnessView from './components/FitnessView'
import LoginView, { type UserSession } from './components/LoginView'
import AdminView from './components/AdminView'

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
  const [showFitness, setShowFitness] = useState(false)
  const [user, setUser] = useState<UserSession | null>(() => getStoredSession())

  const handleLogin = (session: UserSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setShowFitness(false)
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
      {
        showFitness
          ? <FitnessView user={user} onBack={() => setShowFitness(false)} onLogout={handleLogout} />
          : <HomeView user={user} onStart={() => setShowFitness(true)} onLogout={handleLogout} />
      }
    </>
  )
}

export default App
