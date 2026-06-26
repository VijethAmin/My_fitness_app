import { useMemo, useState } from 'react'
import { API_URL } from '../api'
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
  'Workout Plan': Record<string, { focus: string; exercises: string[] }>
  'Meal Plan': Record<string, string>
  Notes: string[]
}

type ProgressUpdate = {
  completions: Record<string, boolean>
  completed_workouts: number
  total_workouts: number
  completion_rate: number
}

const GOALS: { value: Goal; copy: string }[] = [
  { value: 'Muscle Gain', copy: 'Hypertrophy focused calorie surplus with higher daily protein.' },
  { value: 'Fat Loss', copy: 'Cardio-supplemented calorie deficit to preserve lean mass.' },
  { value: 'Maintenance', copy: 'Balanced calories and structured fitness for consistency.' },
]

const DIETS: { value: Diet; copy: string }[] = [
  { value: 'Vegetarian', copy: 'Tofu, lentils, paneer, oats' },
  { value: 'Non-Vegetarian', copy: 'Chicken, fish, eggs, balanced meals' },
]

const PLACES: { value: WorkoutPlace; title: string; copy: string }[] = [
  { value: 'Gym', title: 'Gym-Only', copy: 'Uses dumbbells, barbells and weight machines' },
  { value: 'Home', title: 'Home-Only', copy: 'Bodyweight resistance and flexible routines' },
]

function FitnessView({ user, onBack, onLogout }: Props) {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('Male')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState<Goal>('Muscle Gain')
  const [diet, setDiet] = useState<Diet>('Vegetarian')
  const [workoutPlace, setWorkoutPlace] = useState<WorkoutPlace>('Gym')
  const [activity, setActivity] = useState('Moderately Active (3-5 days/week)')
  const [result, setResult] = useState<FitnessPlan | null>(null)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [updatingDay, setUpdatingDay] = useState('')

  const isFormValid = useMemo(() => {
    const numericAge = Number(age)
    const numericWeight = Number(weight)
    const numericHeight = Number(height)
    return numericAge >= 13 && numericAge <= 100 && numericWeight > 20 && numericWeight <= 300
      && numericHeight > 100 && numericHeight <= 250
  }, [age, weight, height])

  const loadProgress = async () => {
    const response = await fetch(`${API_URL}/users/${user.id}/progress`)
    if (response.ok) setProgress((await response.json()) as ProgressUpdate)
  }

  const handleGenerate = async () => {
    setError('')
    if (!isFormValid) {
      setError('Enter a valid age, height, and weight before generating your plan.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/fitness_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (!response.ok) throw new Error('Could not generate plan')
      const plan = (await response.json()) as FitnessPlan
      setResult(plan)
      setSelectedDay(Object.keys(plan['Workout Plan'])[0] ?? 'Monday')
      await loadProgress()
    } catch (requestError) {
      console.error(requestError)
      setError('Could not reach the backend. Start FastAPI on port 8000 and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleWorkout = async (day: string) => {
    setUpdatingDay(day)
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, completed: !progress?.completions[day] }),
      })
      if (!response.ok) throw new Error('Could not update workout')
      setProgress((await response.json()) as ProgressUpdate)
    } catch (requestError) {
      console.error(requestError)
      setError('Could not save that workout update.')
    } finally {
      setUpdatingDay('')
    }
  }

  if (result) {
    const workoutDays = Object.entries(result['Workout Plan'])
    const selectedWorkout = result['Workout Plan'][selectedDay]
    return (
      <main className="app-shell">
        <header className="top-bar compact-top-bar">
          <button type="button" className="ghost-button" onClick={() => setResult(null)}>Edit Details</button>
          <div>
            <p className="eyebrow">Your personalized fitness journey</p>
            <h1>Fitness Plan Dashboard</h1>
          </div>
          <div className="session-bar">
            <span>{user.name}</span>
            <button type="button" className="ghost-button" onClick={onLogout}>Logout</button>
          </div>
        </header>

        <section className="plan-dashboard">
          <div className="target-grid">
            <article><span>Body Mass Index (BMI)</span><strong>{result.BMI}</strong><small>{result['BMI Category']} weight</small></article>
            <article><span>Daily Calorie Target</span><strong>{result['Daily Calories']} <em>kcal</em></strong><small>Adjusted for {goal}</small></article>
            <article><span>Daily Protein Target</span><strong>{result.Protein} <em>g / day</em></strong><small>Based on {weight}kg body mass</small></article>
            <article><span>Daily Hydration Target</span><strong>{result['Water Intake']} <em>liters</em></strong><small>Adjusted for your body metrics</small></article>
          </div>

          <section className="tracker-panel">
            <div className="tracker-heading">
              <div><h2>Weekly Workout Completion Tracker</h2><p>Toggle and log done workouts to track your weekly adherence rate.</p></div>
              <strong>{progress?.completed_workouts ?? 0} / {progress?.total_workouts ?? workoutDays.length} Days ({progress?.completion_rate ?? 0}%)</strong>
            </div>
            <div className="completion-list">
              {workoutDays.map(([day, workout]) => {
                const completed = Boolean(progress?.completions[day])
                return (
                  <article className={completed ? 'completed' : ''} key={day}>
                    <div><small>{day.slice(0, 3)}</small><strong>{workout.focus}</strong></div>
                    <button className="completion-check" type="button" disabled={updatingDay === day} onClick={() => void toggleWorkout(day)}>
                      {completed ? '\u2713' : ''}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <div className="plan-content-grid">
            <section className="routine-panel">
              <div className="panel-title"><span>+</span><div><h2>Weekly Workout Training Routine</h2><p>Tailor: {workoutPlace} • Goal: {goal}</p></div></div>
              <div className="day-tabs">
                {workoutDays.map(([day]) => <button className={selectedDay === day ? 'active' : ''} key={day} type="button" onClick={() => setSelectedDay(day)}>{day}</button>)}
              </div>
              {selectedWorkout ? (
                <div className="selected-workout">
                  <small>Selected Day Focus</small>
                  <h3>{selectedWorkout.focus}</h3>
                  <ul>{selectedWorkout.exercises.map((exercise, index) => <li key={exercise}><b>{index + 1}</b><strong>{exercise}</strong><span>3 Sets</span><span>10-12 Reps</span></li>)}</ul>
                </div>
              ) : null}
            </section>

            <section className="meals-panel">
              <div className="panel-title"><span>+</span><div><h2>Daily Meal Suggestions</h2><p>Diet Style: {diet}</p></div></div>
              <div className="meal-cards">
                {Object.entries(result['Meal Plan']).map(([meal, plan]) => <article key={meal}><small>{meal}</small><p>{plan}</p></article>)}
              </div>
            </section>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="top-bar compact-top-bar">
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
        <div><p className="eyebrow">Personalized plan builder</p><h1>Configure Your Fitness Plan</h1></div>
        <div className="session-bar"><span>{user.name}</span><button type="button" className="ghost-button" onClick={onLogout}>Logout</button></div>
      </header>

      <section className="config-card">
        <div className="panel-title config-title"><span>+</span><div><h2>Configure Physical Metrics</h2><p>Enter details for gender-aware hydration, calorie, macro calculations and fitness planning.</p></div></div>
        <div className="metrics-input-grid">
          <label>Age (Years)<input type="number" min="13" max="100" value={age} onChange={(event) => setAge(event.target.value)} placeholder="25" /></label>
          <label>Height (CM)<input type="number" min="101" max="250" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="175" /></label>
          <label>Weight (KG)<input type="number" min="21" max="300" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="70" /></label>
        </div>

        <div className="config-row">
          <fieldset><legend>Biological Gender</legend><div className="choice-strip">{(['Male', 'Female'] as Gender[]).map((value) => <button className={gender === value ? 'active' : ''} key={value} type="button" onClick={() => setGender(value)}>{value}</button>)}</div></fieldset>
          <label>Daily Activity Level<select value={activity} onChange={(event) => setActivity(event.target.value)}><option>Sedentary (Little to no exercise)</option><option>Lightly Active (1-3 days/week)</option><option>Moderately Active (3-5 days/week)</option><option>Very Active (6-7 intense days/week)</option></select></label>
        </div>

        <fieldset className="config-section"><legend>Primary Fitness Goal</legend><div className="selection-grid goal-options">{GOALS.map((item) => <button className={goal === item.value ? 'active' : ''} key={item.value} type="button" onClick={() => setGoal(item.value)}><strong>{item.value}</strong><span>{item.copy}</span></button>)}</div></fieldset>
        <div className="config-row">
          <fieldset><legend>Dietary Preferences</legend><div className="selection-grid">{DIETS.map((item) => <button className={diet === item.value ? 'active' : ''} key={item.value} type="button" onClick={() => setDiet(item.value)}><strong>{item.value}</strong><span>{item.copy}</span></button>)}</div></fieldset>
          <fieldset><legend>Workout Environment</legend><div className="selection-grid">{PLACES.map((item) => <button className={workoutPlace === item.value ? 'active' : ''} key={item.value} type="button" onClick={() => setWorkoutPlace(item.value)}><strong>{item.title}</strong><span>{item.copy}</span></button>)}</div></fieldset>
        </div>
        {error ? <p className="error-message">{error}</p> : null}
        <button className="generate-button" type="button" disabled={isLoading} onClick={() => void handleGenerate()}>{isLoading ? 'Generating Your Plan...' : 'Calculate Targets & Generate Fitness Plan  ->'}</button>
      </section>
    </main>
  )
}

export default FitnessView
