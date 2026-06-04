/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UserSession } from './LoginView'

type WorkoutPlan = Record<
  string,
  {
    focus: string
    exercises: string[]
  }
>

type FitnessPlan = {
  'Workout Plan': WorkoutPlan
  'Meal Plan': Record<string, string>
  Notes: string[]
}

type ManagedUser = UserSession & {
  created_at?: string
  last_login?: string
  profile?: Record<string, string | number> | null
  latest_plan?: FitnessPlan | null
  custom_plan?: FitnessPlan | null
}

type Props = {
  user: UserSession
  onLogout: () => void
}

type Analytics = {
  total_users: number
  users_with_profiles: number
  average_bmi: number
  goal_distribution: Record<string, number>
  gender_distribution: Record<string, number>
  workout_preference: Record<string, number>
  diet_preference: Record<string, number>
}

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '/api')

const EMPTY_WORKOUT_PLAN: WorkoutPlan = {
  Monday: {
    focus: 'Custom workout',
    exercises: ['Push-ups', 'Squats', 'Plank'],
  },
}

const CHART_COLORS = ['#5138ee', '#00a878', '#7c6cff', '#f59e0b', '#8ba0c3']

function AnalyticsChart({
  title,
  data,
  type = 'bar',
}: {
  title: string
  data: Record<string, number>
  type?: 'bar' | 'pie'
}) {
  const entries = Object.entries(data)
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  const max = Math.max(...entries.map(([, value]) => value), 1)
  let offset = 0
  const pieBackground = `conic-gradient(${entries
    .map(([, value], index) => {
      const start = offset
      offset += total ? (value / total) * 100 : 0
      return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${offset}%`
    })
    .join(', ')})`

  return (
    <article className="chart-card">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="chart-empty">No profile data yet.</p>
      ) : type === 'pie' ? (
        <div className="pie-chart-wrap">
          <div className="pie-chart" style={{ background: pieBackground }} aria-label={title} />
          <div className="chart-legend">
            {entries.map(([label, value], index) => (
              <span key={label}>
                <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                {label}: {value}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bar-chart">
          {entries.map(([label, value]) => (
            <div className="bar-row" key={label}>
              <span>{label}</span>
              <div><i style={{ width: `${(value / max) * 100}%` }} /></div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function AdminView({ user, onLogout }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [workoutJson, setWorkoutJson] = useState('')
  const [mealJson, setMealJson] = useState('')
  const [notesText, setNotesText] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  const selectedUser = useMemo(
    () => users.find((managedUser) => managedUser.id === selectedUserId) ?? null,
    [selectedUserId, users],
  )

  const loadUsers = useCallback(async () => {
    setError('')

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'X-Session-Role': user.role,
        },
      })

      if (!response.ok) {
        throw new Error('Could not load users')
      }

      const data = (await response.json()) as { users: ManagedUser[] }
      setUsers(data.users)

      if (!selectedUserId && data.users.length > 0) {
        setSelectedUserId(data.users[0].id)
      }
    } catch (loadError) {
      console.error(loadError)
      setError('Could not load users from the backend.')
    }
  }, [selectedUserId, user.role])

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/analytics`, {
        headers: { 'X-Session-Role': user.role },
      })
      if (!response.ok) throw new Error('Could not load analytics')
      setAnalytics((await response.json()) as Analytics)
    } catch (loadError) {
      console.error(loadError)
      setError('Could not load analytics from the backend.')
    }
  }, [user.role])

  useEffect(() => {
    void loadUsers()
    void loadAnalytics()
  }, [loadAnalytics, loadUsers])

  useEffect(() => {
    if (!selectedUser) {
      setWorkoutJson(JSON.stringify(EMPTY_WORKOUT_PLAN, null, 2))
      setMealJson(JSON.stringify({ Breakfast: '', Lunch: '', Dinner: '', Snack: '' }, null, 2))
      setNotesText('')
      return
    }

    const sourcePlan = selectedUser.custom_plan ?? selectedUser.latest_plan

    setWorkoutJson(JSON.stringify(sourcePlan?.['Workout Plan'] ?? EMPTY_WORKOUT_PLAN, null, 2))
    setMealJson(
      JSON.stringify(
        sourcePlan?.['Meal Plan'] ?? {
          Breakfast: '',
          Lunch: '',
          Dinner: '',
          Snack: '',
        },
        null,
        2,
      ),
    )
    setNotesText((sourcePlan?.Notes ?? []).join('\n'))
  }, [selectedUser])

  const handleSave = async () => {
    if (!selectedUser) {
      setError('Select a user before saving.')
      return
    }

    setError('')
    setStatus('')
    setIsSaving(true)

    try {
      const workoutPlan = JSON.parse(workoutJson) as WorkoutPlan
      const mealPlan = JSON.parse(mealJson) as Record<string, string>
      const notes = notesText
        .split('\n')
        .map((note) => note.trim())
        .filter(Boolean)

      const response = await fetch(`${API_URL}/admin/users/${selectedUser.id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Role': user.role,
        },
        body: JSON.stringify({
          workout_plan: workoutPlan,
          meal_plan: mealPlan,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Could not save plan')
      }

      const updatedUser = (await response.json()) as ManagedUser
      setUsers((currentUsers) =>
        currentUsers.map((managedUser) =>
          managedUser.id === updatedUser.id ? updatedUser : managedUser,
        ),
      )
      setStatus(`Saved plan changes for ${updatedUser.name}.`)
    } catch (saveError) {
      console.error(saveError)
      setError('Could not save. Check that workout and meal fields contain valid JSON.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>Manage Fitness Plans</h1>
        </div>
        <div className="session-bar">
          <span>{user.email}</span>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {analytics ? (
        <section className="analytics-shell">
          <div className="section-heading">
            <p className="eyebrow">Data analytics dashboard</p>
            <h2>User Insights</h2>
          </div>
          <div className="analytics-metrics">
            <article><span>Total users</span><strong>{analytics.total_users}</strong></article>
            <article><span>Profiles analyzed</span><strong>{analytics.users_with_profiles}</strong></article>
            <article><span>Average BMI</span><strong>{analytics.average_bmi || 'N/A'}</strong></article>
          </div>
          <div className="charts-grid">
            <AnalyticsChart title="Goal Distribution" data={analytics.goal_distribution} type="pie" />
            <AnalyticsChart title="Gender-wise Analysis" data={analytics.gender_distribution} type="pie" />
            <AnalyticsChart title="Workout Preference" data={analytics.workout_preference} />
            <AnalyticsChart title="Diet Preference" data={analytics.diet_preference} />
          </div>
        </section>
      ) : null}

      <section className="admin-grid">
        <aside className="planner-panel">
          <div className="section-heading">
            <h2>Users</h2>
            <p>Select a user to customize their workout, meals, and notes.</p>
          </div>

          <button type="button" className="ghost-button full-width compact-button" onClick={loadUsers}>
            Refresh Users
          </button>

          <div className="user-list">
            {users.map((managedUser) => (
              <button
                key={managedUser.id}
                type="button"
                className={managedUser.id === selectedUserId ? 'active' : ''}
                onClick={() => setSelectedUserId(managedUser.id)}
              >
                <strong>{managedUser.name}</strong>
                <span>{managedUser.email}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="results-panel">
          {selectedUser ? (
            <>
              <div className="section-heading">
                <h2>{selectedUser.name}</h2>
                <p>
                  {selectedUser.profile
                    ? `Goal: ${selectedUser.profile.goal} | Diet: ${selectedUser.profile.diet} | Place: ${selectedUser.profile.workout_place}`
                    : 'This user has not generated a plan yet.'}
                </p>
              </div>

              <div className="admin-editor">
                <label>
                  Workout Plan JSON
                  <textarea
                    value={workoutJson}
                    onChange={(event) => setWorkoutJson(event.target.value)}
                    rows={14}
                  />
                </label>

                <label>
                  Meal Plan JSON
                  <textarea
                    value={mealJson}
                    onChange={(event) => setMealJson(event.target.value)}
                    rows={8}
                  />
                </label>

                <label>
                  Coach Notes
                  <textarea
                    value={notesText}
                    onChange={(event) => setNotesText(event.target.value)}
                    rows={6}
                    placeholder="One note per line"
                  />
                </label>
              </div>

              {error ? <p className="error-message">{error}</p> : null}
              {status ? <p className="success-message">{status}</p> : null}

              <button
                type="button"
                className="primary-button full-width"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? 'Saving...' : 'Save User Plan'}
              </button>
            </>
          ) : (
            <div className="empty-state">
              <h2>No users yet</h2>
              <p>Ask a user to log in and generate a plan, then refresh this list.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default AdminView
