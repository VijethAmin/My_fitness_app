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

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '/api')

const EMPTY_WORKOUT_PLAN: WorkoutPlan = {
  Monday: {
    focus: 'Custom workout',
    exercises: ['Push-ups', 'Squats', 'Plank'],
  },
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

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

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
