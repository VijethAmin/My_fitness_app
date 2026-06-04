/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import type { UserSession } from './LoginView'

type WorkoutPlan = Record<string, { focus: string; exercises: string[] }>

type Progress = {
  user: {
    latest_plan?: {
      BMI: number
      'BMI Category': string
      'Daily Calories': number
      Protein: number
      'Water Intake': number
      'Workout Plan': WorkoutPlan
      'Meal Plan': Record<string, string>
    } | null
  }
  completions: Record<string, boolean>
  completed_workouts: number
  total_workouts: number
  completion_rate: number
}

type Props = {
  user: UserSession
  onBack: () => void
  onBuildPlan: () => void
  onLogout: () => void
}

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '/api')

function DashboardView({ user, onBack, onBuildPlan, onLogout }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState('')
  const [updatingDay, setUpdatingDay] = useState('')

  const loadProgress = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/progress`)
      if (!response.ok) throw new Error('Could not load progress')
      setProgress((await response.json()) as Progress)
    } catch (loadError) {
      console.error(loadError)
      setError('Could not load your progress dashboard.')
    }
  }, [user.id])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const toggleWorkout = async (day: string) => {
    if (!progress) return
    setUpdatingDay(day)
    setError('')

    try {
      const response = await fetch(`${API_URL}/users/${user.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, completed: !progress.completions[day] }),
      })
      if (!response.ok) throw new Error('Could not update workout')
      const update = (await response.json()) as Omit<Progress, 'user'>
      setProgress({ ...progress, ...update })
    } catch (updateError) {
      console.error(updateError)
      setError('Could not save that workout update.')
    } finally {
      setUpdatingDay('')
    }
  }

  const plan = progress?.user.latest_plan

  return (
    <main className="app-shell">
      <header className="top-bar">
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
        <div>
          <p className="eyebrow">Progress tracking dashboard</p>
          <h1>Your Weekly Progress</h1>
        </div>
        <div className="session-bar">
          <span>{user.name}</span>
          <button type="button" className="ghost-button" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <section className="dashboard-shell">
        {plan && progress ? (
          <>
            <div className="dashboard-metrics">
              <article className="progress-card accent-card">
                <span>Weekly completion</span>
                <strong>{progress.completion_rate}%</strong>
                <p>{progress.completed_workouts} of {progress.total_workouts} workouts complete</p>
              </article>
              <article className="progress-card">
                <span>Current BMI</span>
                <strong>{plan.BMI}</strong>
                <p>{plan['BMI Category']} range</p>
              </article>
              <article className="progress-card">
                <span>Consistency target</span>
                <strong>{Math.max(0, progress.total_workouts - progress.completed_workouts)}</strong>
                <p>workouts remaining this week</p>
              </article>
            </div>

            <section className="results-panel compact-results">
              <div className="section-heading">
                <h2>Workout Completion Tracker</h2>
                <p>Mark each workout as you finish it. Your progress is saved to your account.</p>
              </div>
              <div className="completion-list">
                {Object.entries(plan['Workout Plan']).map(([day, workout]) => {
                  const completed = Boolean(progress.completions[day])
                  return (
                    <article className={completed ? 'completed' : ''} key={day}>
                      <button
                        type="button"
                        aria-label={`Mark ${day} workout as ${completed ? 'incomplete' : 'complete'}`}
                        className="completion-check"
                        disabled={updatingDay === day}
                        onClick={() => void toggleWorkout(day)}
                      >
                        {completed ? '\u2713' : ''}
                      </button>
                      <div>
                        <strong>{day}</strong>
                        <span>{workout.focus}</span>
                      </div>
                      <small>{completed ? 'Completed' : 'Pending'}</small>
                    </article>
                  )
                })}
              </div>
            </section>

            <div className="plan-content-grid dashboard-plan-grid">
              <section className="routine-panel">
                <div className="panel-title">
                  <span>+</span>
                  <div>
                    <h2>Your Workout Plan</h2>
                    <p>Saved from your latest fitness plan.</p>
                  </div>
                </div>
                <ul className="schedule-list dashboard-schedule-list">
                  {Object.entries(plan['Workout Plan']).map(([day, workout]) => (
                    <li key={day}>
                      <strong>{day}</strong>
                      <div>
                        <span>{workout.focus}</span>
                        <div className="exercise-tags">
                          {workout.exercises.map((exercise) => (
                            <span key={exercise}>{exercise}</span>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="meals-panel">
                <div className="panel-title">
                  <span>+</span>
                  <div>
                    <h2>Your Meal Plan</h2>
                    <p>Meal suggestions saved with this plan.</p>
                  </div>
                </div>
                <div className="meal-cards">
                  {Object.entries(plan['Meal Plan']).map(([meal, mealPlan]) => (
                    <article key={meal}>
                      <small>{meal}</small>
                      <p>{mealPlan}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="results-panel">
            <div className="empty-state">
              <h2>Build your first plan</h2>
              <p>Generate a fitness plan before tracking your weekly workout progress.</p>
              <button type="button" className="primary-button" onClick={onBuildPlan}>
                Build Fitness Plan
              </button>
            </div>
          </section>
        )}
        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  )
}

export default DashboardView
