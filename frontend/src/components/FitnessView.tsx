import { useMemo, useState } from 'react'
import type { UserSession } from './LoginView'

type Props = {
  user: UserSession
  onBack: () => void
  onLogout: () => void
}

type Goal = 'Muscle Gain' | 'Fat Loss' | 'Maintenance'
type Diet = 'Vegetarian' | 'Non-Vegetarian'
type WorkoutPlace = 'Gym' | 'Home'
type Gender = 'Male' | 'Female'

type FitnessPlan = {
  BMI: number
  'BMI Category': string
  'Daily Calories': number
  Protein: number
  'Water Intake': number
  'Workout Plan': Record<
    string,
    {
      focus: string
      exercises: string[]
    }
  >
  'Meal Plan': Record<string, string>
  Notes: string[]
}

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '/api')

function FitnessView({ user, onBack, onLogout }: Props) {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('Male')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState<Goal>('Muscle Gain')
  const [diet, setDiet] = useState<Diet>('Vegetarian')
  const [workoutPlace, setWorkoutPlace] = useState<WorkoutPlace>('Gym')
  const [result, setResult] = useState<FitnessPlan | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isFormValid = useMemo(() => {
    const numericAge = Number(age)
    const numericWeight = Number(weight)
    const numericHeight = Number(height)

    return (
      Number.isFinite(numericAge) &&
      Number.isFinite(numericWeight) &&
      Number.isFinite(numericHeight) &&
      numericAge >= 13 &&
      numericAge <= 100 &&
      numericWeight > 20 &&
      numericWeight <= 300 &&
      numericHeight > 100 &&
      numericHeight <= 250
    )
  }, [age, weight, height])

  const handleGenerate = async () => {
    setError('')

    if (!isFormValid) {
      setError('Enter a valid age, weight, and height before generating a plan.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/fitness_plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          gender,
          age: Number(age),
          weight: Number(weight),
          height: Number(height),
          goal,
          diet,
          workout_place: workoutPlace,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = (await response.json()) as FitnessPlan
      setResult(data)
    } catch (requestError) {
      console.error(requestError)
      setResult(null)
      setError('Could not reach the backend. Start FastAPI on port 8000 and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <button type="button" className="ghost-button" onClick={onBack}>
          Back
        </button>
        <div>
          <p className="eyebrow">Personalized plan builder</p>
          <h1>AI Fitness Coach</h1>
        </div>
        <div className="session-bar">
          <span>{user.name}</span>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="planner-grid">
        <form className="planner-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="section-heading">
            <h2>Your Details</h2>
            <p>Use realistic values so the plan stays practical.</p>
          </div>

          <div className="field-grid">
            <label>
              Age
              <input
                min="13"
                max="100"
                type="number"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="24"
              />
            </label>

            <label>
              Gender
              <select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
                <option>Male</option>
                <option>Female</option>
              </select>
            </label>

            <label>
              Weight (kg)
              <input
                min="21"
                max="300"
                step="0.1"
                type="number"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="72"
              />
            </label>

            <label>
              Height (cm)
              <input
                min="101"
                max="250"
                step="0.1"
                type="number"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                placeholder="175"
              />
            </label>

            <label>
              Goal
              <select value={goal} onChange={(event) => setGoal(event.target.value as Goal)}>
                <option>Muscle Gain</option>
                <option>Fat Loss</option>
                <option>Maintenance</option>
              </select>
            </label>

            <label>
              Diet Preference
              <select value={diet} onChange={(event) => setDiet(event.target.value as Diet)}>
                <option>Vegetarian</option>
                <option>Non-Vegetarian</option>
              </select>
            </label>

            <label>
              Workout Place
              <select
                value={workoutPlace}
                onChange={(event) => setWorkoutPlace(event.target.value as WorkoutPlace)}
              >
                <option>Gym</option>
                <option>Home</option>
              </select>
            </label>
          </div>

          {error ? <p className="error-message">{error}</p> : null}

          <button
            type="button"
            className="primary-button full-width"
            disabled={isLoading}
            onClick={handleGenerate}
          >
            {isLoading ? 'Generating...' : 'Generate Plan'}
          </button>
        </form>

        <section className="results-panel" aria-live="polite">
          {result ? (
            <>
              <div className="section-heading">
                <h2>Your Plan</h2>
                <p>
                  BMI {result.BMI} is in the {result['BMI Category'].toLowerCase()} range.
                </p>
              </div>

              <div className="metric-grid">
                <article>
                  <span>Calories</span>
                  <strong>{result['Daily Calories']} kcal</strong>
                </article>
                <article>
                  <span>Protein</span>
                  <strong>{result.Protein} g/day</strong>
                </article>
                <article>
                  <span>Water</span>
                  <strong>{result['Water Intake']} L/day</strong>
                </article>
              </div>

              <div className="result-section">
                <h3>Weekly Workout</h3>
                <ul className="schedule-list">
                  {Object.entries(result['Workout Plan']).map(([day, plan]) => (
                    <li key={day}>
                      <strong>{day}</strong>
                      <div>
                        <span>{plan.focus}</span>
                        <div className="exercise-tags">
                          {plan.exercises.map((exercise) => (
                            <span key={exercise}>{exercise}</span>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="result-section">
                <h3>Meal Plan</h3>
                <ul className="meal-list">
                  {Object.entries(result['Meal Plan']).map(([meal, plan]) => (
                    <li key={meal}>
                      <strong>{meal}</strong>
                      <span>{plan}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="result-section">
                <h3>Coach Notes</h3>
                <ul className="notes-list">
                  {result.Notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Ready when you are</h2>
              <p>Fill in your details and generate a plan to see your targets here.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default FitnessView
