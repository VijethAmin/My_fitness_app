import type { UserSession } from './LoginView'

type Props = {
  user: UserSession
  onStart: () => void
  onDashboard: () => void
  onLogout: () => void
}

function HomeView({ user, onStart, onDashboard, onLogout }: Props) {
  return (
    <main className="home-screen">
      <header className="top-bar home-top-bar">
        <div>
          <p className="eyebrow">AI Fitness Coach</p>
          <h1>Welcome back</h1>
        </div>
        <div className="session-bar">
          <span>{user.name}</span>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="home-content" aria-labelledby="home-title">
        <h2 id="home-title">Build your fitness plan</h2>
        <p className="home-copy">
          Create a weekly workout, meal, BMI, calorie, protein, and water plan from
          your body metrics and preferences.
        </p>

        <div className="home-actions">
          <button type="button" className="primary-button" onClick={onStart}>
            Get Started
          </button>
          <button type="button" className="ghost-button" onClick={onDashboard}>
            View Progress
          </button>
        </div>
      </section>
    </main>
  )
}

export default HomeView
