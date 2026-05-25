import type { UserSession } from './LoginView'

type Props = {
  user: UserSession
  onStart: () => void
  onLogout: () => void
}

function HomeView({ user, onStart, onLogout }: Props) {
  return (
    <main className="home-screen">
      <div className="session-bar session-bar-home">
        <span>Signed in as {user.name}</span>
        <button type="button" className="ghost-button light-button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <section className="home-content" aria-labelledby="home-title">
        <p className="eyebrow">Smart training and nutrition planner</p>
        <h1 id="home-title">AI Fitness Coach</h1>
        <p className="home-copy">
          Build a simple weekly workout plan with calorie, protein, water, BMI,
          and meal guidance based on your body metrics and preferences.
        </p>

        <div className="home-actions">
          <button type="button" className="primary-button" onClick={onStart}>
            Get Started
          </button>
        </div>

        <div className="feature-grid" aria-label="Coach features">
          <span>BMI analysis</span>
          <span>Workout schedule</span>
          <span>Meal ideas</span>
          <span>Daily targets</span>
        </div>
      </section>
    </main>
  )
}

export default HomeView
