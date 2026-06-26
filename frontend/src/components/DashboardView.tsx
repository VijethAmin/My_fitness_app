/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { API_URL } from '../api'
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

type CoachTip = {
  message: string
  source: 'openai' | 'local'
  completion_rate: number
}

type CoachMessage = {
  id: string
  role: 'user' | 'coach'
  message: string
  source?: CoachTip['source']
  completionRate?: number
}

type ExerciseInfo = {
  category: string
  muscles: string
  cue: string
  caution: string
}

type Props = {
  user: UserSession
  onBack: () => void
  onBuildPlan: () => void
  onLogout: () => void
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const EXERCISE_LIBRARY: Record<string, ExerciseInfo> = {
  'bench press': {
    category: 'Strength',
    muscles: 'Chest, shoulders, triceps',
    cue: 'Keep shoulder blades pulled back and press in a steady line over the chest.',
    caution: 'Use a spotter or safety pins when the load feels challenging.',
  },
  'incline dumbbell press': {
    category: 'Strength',
    muscles: 'Upper chest, shoulders, triceps',
    cue: 'Lower the dumbbells under control and keep wrists stacked over elbows.',
    caution: 'Avoid flaring elbows too wide at the bottom.',
  },
  'chest press machine': {
    category: 'Strength',
    muscles: 'Chest, shoulders, triceps',
    cue: 'Set handles around mid-chest and press without shrugging.',
    caution: 'Do not let the weight stack slam between reps.',
  },
  'cable fly': {
    category: 'Accessory',
    muscles: 'Chest',
    cue: 'Use a soft elbow bend and bring hands together with chest tension.',
    caution: 'Reduce weight if shoulders roll forward.',
  },
  'triceps pushdown': {
    category: 'Accessory',
    muscles: 'Triceps',
    cue: 'Pin elbows beside your ribs and straighten arms fully.',
    caution: 'Keep the torso still instead of leaning into the cable.',
  },
  'lat pulldown': {
    category: 'Strength',
    muscles: 'Lats, upper back, biceps',
    cue: 'Pull elbows down toward your ribs and pause near the collarbone.',
    caution: 'Avoid pulling behind the neck.',
  },
  'seated cable row': {
    category: 'Strength',
    muscles: 'Mid-back, lats, biceps',
    cue: 'Sit tall, drive elbows back, and squeeze shoulder blades gently.',
    caution: 'Keep the lower back neutral throughout the pull.',
  },
  'one-arm dumbbell row': {
    category: 'Strength',
    muscles: 'Lats, mid-back, biceps',
    cue: 'Row the dumbbell toward your hip while keeping hips square.',
    caution: 'Avoid twisting the torso to lift heavier.',
  },
  'face pull': {
    category: 'Accessory',
    muscles: 'Rear delts, upper back',
    cue: 'Pull toward eye level and rotate thumbs slightly back.',
    caution: 'Use light weight and clean control.',
  },
  'dumbbell curl': {
    category: 'Accessory',
    muscles: 'Biceps',
    cue: 'Keep elbows close and curl without swinging.',
    caution: 'Lower slowly to protect elbows.',
  },
  squat: {
    category: 'Strength',
    muscles: 'Quads, glutes, core',
    cue: 'Brace, sit between your hips, and push the floor away.',
    caution: 'Stop the set if knee or back pain feels sharp.',
  },
  'leg press': {
    category: 'Strength',
    muscles: 'Quads, glutes',
    cue: 'Place feet solidly and lower until hips stay stable on the pad.',
    caution: 'Do not lock knees hard at the top.',
  },
  'romanian deadlift': {
    category: 'Strength',
    muscles: 'Hamstrings, glutes, back',
    cue: 'Hinge at the hips and keep the weight close to your legs.',
    caution: 'Keep the spine neutral and reduce load if your back rounds.',
  },
  'walking lunge': {
    category: 'Strength',
    muscles: 'Quads, glutes, balance',
    cue: 'Step long enough to keep the front heel grounded.',
    caution: 'Slow down if balance breaks down.',
  },
  'hamstring curl': {
    category: 'Accessory',
    muscles: 'Hamstrings',
    cue: 'Curl smoothly and pause briefly at the squeezed position.',
    caution: 'Keep hips against the pad.',
  },
  'hip thrust': {
    category: 'Strength',
    muscles: 'Glutes, hamstrings',
    cue: 'Tuck ribs down and drive hips until knees, hips, and shoulders align.',
    caution: 'Avoid over-arching the lower back at lockout.',
  },
  'cable kickback': {
    category: 'Accessory',
    muscles: 'Glutes',
    cue: 'Keep the pelvis stable and move from the hip.',
    caution: 'Use a light load to avoid swinging.',
  },
  'goblet squat': {
    category: 'Strength',
    muscles: 'Quads, glutes, core',
    cue: 'Hold the weight close and keep your chest tall.',
    caution: 'Choose a depth you can control without pain.',
  },
  'abductor machine': {
    category: 'Accessory',
    muscles: 'Glutes, hips',
    cue: 'Open knees under control and pause briefly.',
    caution: 'Avoid bouncing against the machine.',
  },
  'incline treadmill walk': {
    category: 'Cardio',
    muscles: 'Heart, calves, glutes',
    cue: 'Walk tall, keep breathing steady, and use the incline for effort.',
    caution: 'Hold rails lightly only if needed for balance.',
  },
  cycling: {
    category: 'Cardio',
    muscles: 'Heart, quads, glutes',
    cue: 'Set seat height so knees stay slightly bent at the bottom.',
    caution: 'Ease off if knees feel irritated.',
  },
  'rowing machine': {
    category: 'Cardio',
    muscles: 'Back, legs, heart',
    cue: 'Drive with legs first, then lean and pull.',
    caution: 'Avoid rounding the back during the catch.',
  },
  elliptical: {
    category: 'Cardio',
    muscles: 'Heart, legs',
    cue: 'Keep pressure even through both feet and breathe rhythmically.',
    caution: 'Keep resistance moderate if form gets choppy.',
  },
  'battle ropes': {
    category: 'Conditioning',
    muscles: 'Shoulders, core, heart',
    cue: 'Stay athletic through the legs and make crisp waves.',
    caution: 'Keep intervals short if shoulders fatigue quickly.',
  },
  plank: {
    category: 'Core',
    muscles: 'Abs, shoulders, glutes',
    cue: 'Squeeze glutes and keep ribs tucked toward hips.',
    caution: 'Stop when your lower back starts sagging.',
  },
  'cable crunch': {
    category: 'Core',
    muscles: 'Abs',
    cue: 'Curl ribs toward pelvis instead of pulling with arms.',
    caution: 'Use a load that lets the abs lead.',
  },
  'hanging knee raise': {
    category: 'Core',
    muscles: 'Abs, hip flexors',
    cue: 'Posteriorly tilt the pelvis and lift knees with control.',
    caution: 'Avoid swinging between reps.',
  },
  'pallof press': {
    category: 'Core',
    muscles: 'Obliques, deep core',
    cue: 'Press straight out and resist cable rotation.',
    caution: 'Use a stance that keeps hips level.',
  },
  'push-ups': {
    category: 'Strength',
    muscles: 'Chest, shoulders, triceps',
    cue: 'Keep a straight line from head to heels and lower with control.',
    caution: 'Use an incline if full reps strain wrists or shoulders.',
  },
  'incline push-ups': {
    category: 'Strength',
    muscles: 'Chest, shoulders, triceps',
    cue: 'Hands on a stable surface, body straight, chest to edge.',
    caution: 'Choose a height that keeps reps smooth.',
  },
  'pike push-ups': {
    category: 'Strength',
    muscles: 'Shoulders, triceps',
    cue: 'Send hips high and lower the head between the hands.',
    caution: 'Skip if shoulder mobility is limited.',
  },
  'chair dips': {
    category: 'Strength',
    muscles: 'Triceps, chest',
    cue: 'Keep shoulders down and bend elbows under control.',
    caution: 'Avoid deep reps if shoulders feel pinched.',
  },
  'shoulder taps': {
    category: 'Core',
    muscles: 'Core, shoulders',
    cue: 'Keep hips quiet while tapping opposite shoulder.',
    caution: 'Widen feet if your torso rocks.',
  },
  'resistance band row': {
    category: 'Strength',
    muscles: 'Back, biceps',
    cue: 'Anchor the band firmly and row elbows toward ribs.',
    caution: 'Inspect the band before pulling hard.',
  },
  'towel row': {
    category: 'Strength',
    muscles: 'Back, biceps',
    cue: 'Grip firmly and pull chest toward the anchor point.',
    caution: 'Use only a secure door or anchor.',
  },
  'reverse snow angel': {
    category: 'Accessory',
    muscles: 'Upper back, rear shoulders',
    cue: 'Lie face down and sweep arms slowly without shrugging.',
    caution: 'Keep the range pain-free.',
  },
  'band pull-apart': {
    category: 'Accessory',
    muscles: 'Rear delts, upper back',
    cue: 'Pull the band apart at chest height and pause wide.',
    caution: 'Use a lighter band if neck tension appears.',
  },
  'superman hold': {
    category: 'Core',
    muscles: 'Back extensors, glutes',
    cue: 'Lift chest and legs slightly while squeezing glutes.',
    caution: 'Keep the lift small if the lower back feels compressed.',
  },
  'bodyweight squat': {
    category: 'Strength',
    muscles: 'Quads, glutes',
    cue: 'Sit hips down and keep knees tracking over toes.',
    caution: 'Use a chair target if depth is hard to control.',
  },
  'reverse lunge': {
    category: 'Strength',
    muscles: 'Quads, glutes, balance',
    cue: 'Step back softly and drive through the front heel.',
    caution: 'Hold support if balance is shaky.',
  },
  'bulgarian split squat': {
    category: 'Strength',
    muscles: 'Quads, glutes',
    cue: 'Keep most pressure on the front leg and descend slowly.',
    caution: 'Start with bodyweight before adding load.',
  },
  'glute bridge': {
    category: 'Strength',
    muscles: 'Glutes, hamstrings',
    cue: 'Drive through heels and squeeze glutes at the top.',
    caution: 'Do not arch the lower back to gain height.',
  },
  'calf raise': {
    category: 'Accessory',
    muscles: 'Calves',
    cue: 'Rise high, pause, then lower slowly.',
    caution: 'Hold support if balance is limited.',
  },
  'single-leg glute bridge': {
    category: 'Strength',
    muscles: 'Glutes, hamstrings',
    cue: 'Keep hips level and drive through the planted heel.',
    caution: 'Switch to two-leg bridges if the lower back takes over.',
  },
  'donkey kick': {
    category: 'Accessory',
    muscles: 'Glutes',
    cue: 'Brace core and lift the heel without rotating hips.',
    caution: 'Keep the range controlled.',
  },
  'fire hydrant': {
    category: 'Accessory',
    muscles: 'Glutes, hips',
    cue: 'Open the knee to the side while keeping hips square.',
    caution: 'Avoid twisting through the lower back.',
  },
  'step-ups': {
    category: 'Strength',
    muscles: 'Quads, glutes',
    cue: 'Use the front leg to stand up, then lower slowly.',
    caution: 'Pick a step height that keeps the knee comfortable.',
  },
  'jumping jacks': {
    category: 'Cardio',
    muscles: 'Heart, calves, shoulders',
    cue: 'Land softly and keep rhythm steady.',
    caution: 'Swap for step jacks if impact bothers joints.',
  },
  'high knees': {
    category: 'Cardio',
    muscles: 'Heart, hip flexors',
    cue: 'Stay tall and drive knees up quickly.',
    caution: 'Keep intervals short if form fades.',
  },
  'mountain climbers': {
    category: 'Conditioning',
    muscles: 'Core, shoulders, heart',
    cue: 'Hold a strong plank and drive knees forward.',
    caution: 'Slow down if hips bounce.',
  },
  burpees: {
    category: 'Conditioning',
    muscles: 'Full body, heart',
    cue: 'Move smoothly from plank to jump with soft landings.',
    caution: 'Step back instead of jumping if impact is too high.',
  },
  'brisk walk': {
    category: 'Cardio',
    muscles: 'Heart, legs',
    cue: 'Walk at a pace where talking is possible but effort is clear.',
    caution: 'Ease pace down if breathing feels uncontrolled.',
  },
  'dead bug': {
    category: 'Core',
    muscles: 'Abs, deep core',
    cue: 'Press low back gently down and move opposite arm and leg.',
    caution: 'Shorten range if the back arches.',
  },
  'leg raise': {
    category: 'Core',
    muscles: 'Abs, hip flexors',
    cue: 'Lower legs slowly while keeping ribs down.',
    caution: 'Bend knees if the lower back lifts.',
  },
  'russian twist': {
    category: 'Core',
    muscles: 'Obliques',
    cue: 'Rotate through the torso with a tall chest.',
    caution: 'Use bodyweight if loaded twists bother the back.',
  },
  'side plank': {
    category: 'Core',
    muscles: 'Obliques, shoulders',
    cue: 'Stack hips and push the floor away.',
    caution: 'Drop the bottom knee if shoulder strain appears.',
  },
}

function getExerciseInfo(exercise: string): ExerciseInfo {
  return EXERCISE_LIBRARY[exercise.toLowerCase()] ?? {
    category: 'Training',
    muscles: 'Full body',
    cue: 'Move with control, keep breathing steady, and stop before form breaks.',
    caution: 'Use a pain-free range and ask a qualified coach if unsure.',
  }
}

function DashboardView({ user, onBack, onBuildPlan, onLogout }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState('')
  const [updatingDay, setUpdatingDay] = useState('')
  const [coachQuestion, setCoachQuestion] = useState('')
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([])
  const [isCoachLoading, setIsCoachLoading] = useState(false)
  const [exerciseFilter, setExerciseFilter] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')

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

  const askCoach = async (questionOverride?: string) => {
    const question = (questionOverride ?? coachQuestion).trim()
    if (!question) {
      setError('Ask the coach a workout, meal, or recovery question.')
      return
    }

    const userMessage: CoachMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      message: question,
    }

    setCoachMessages((currentMessages) => [...currentMessages, userMessage])
    setIsCoachLoading(true)
    setError('')
    setCoachQuestion('')

    try {
      const response = await fetch(`${API_URL}/users/${user.id}/ai_coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!response.ok) throw new Error('Could not load AI coach')
      const coachTip = (await response.json()) as CoachTip
      setCoachMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'coach',
          message: coachTip.message,
          source: coachTip.source,
          completionRate: coachTip.completion_rate,
        },
      ])
    } catch (coachError) {
      console.error(coachError)
      setError('Could not load AI coaching right now.')
    } finally {
      setIsCoachLoading(false)
    }
  }

  const plan = progress?.user.latest_plan
  const workoutEntries = plan
    ? DAY_ORDER.map((day) => [day, plan['Workout Plan'][day]] as const).filter(([, workout]) => workout)
    : []
  const completedPercent = progress ? progress.completion_rate : 0
  const pendingWorkouts = progress ? Math.max(0, progress.total_workouts - progress.completed_workouts) : 0
  const allExerciseNames = Array.from(
    new Set(workoutEntries.flatMap(([, workout]) => workout.exercises)),
  )
  const visibleExerciseNames = allExerciseNames.filter((exercise) =>
    exercise.toLowerCase().includes(exerciseFilter.trim().toLowerCase()),
  )
  const selectedExerciseName =
    visibleExerciseNames.includes(selectedExercise) ? selectedExercise : visibleExerciseNames[0] || ''
  const selectedExerciseInfo = selectedExerciseName ? getExerciseInfo(selectedExerciseName) : null
  const planCalories = plan?.['Daily Calories'] ?? 0
  const planProtein = plan?.Protein ?? 0
  const planWater = plan?.['Water Intake'] ?? 0
  const calorieProgress = Math.min(100, Math.round((planCalories / 3200) * 100))
  const proteinProgress = Math.min(100, Math.round((planProtein / 180) * 100))
  const waterProgress = Math.min(100, Math.round((planWater / 4) * 100))

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
                <strong>{pendingWorkouts}</strong>
                <p>workouts remaining this week</p>
              </article>
            </div>

            <section className="progress-insights">
              <article className="progress-ring-card">
                <div
                  className="progress-ring"
                  style={{ background: `conic-gradient(#00a878 ${completedPercent}%, #e5ecf7 0)` }}
                  aria-label={`${completedPercent}% weekly completion`}
                >
                  <span>{completedPercent}%</span>
                </div>
                <div>
                  <h2>Weekly Completion</h2>
                  <p>{progress.completed_workouts} complete, {pendingWorkouts} still open.</p>
                </div>
              </article>

              <article className="day-chart-card">
                <div className="section-heading compact-heading">
                  <h2>Workout Week</h2>
                  <p>Completion by day from your current saved plan.</p>
                </div>
                <div className="day-bars">
                  {workoutEntries.map(([day]) => {
                    const completed = Boolean(progress.completions[day])
                    return (
                      <div className={completed ? 'complete' : ''} key={day}>
                        <span style={{ height: completed ? '100%' : '28%' }} />
                        <small>{day.slice(0, 3)}</small>
                      </div>
                    )
                  })}
                </div>
              </article>

              <article className="nutrition-chart-card">
                <div className="section-heading compact-heading">
                  <h2>Daily Targets</h2>
                  <p>Saved from your latest plan.</p>
                </div>
                <div className="target-bars">
                  <label>
                    <span>Calories</span>
                    <strong>{planCalories} kcal</strong>
                    <i><b style={{ width: `${calorieProgress}%` }} /></i>
                  </label>
                  <label>
                    <span>Protein</span>
                    <strong>{planProtein} g</strong>
                    <i><b style={{ width: `${proteinProgress}%` }} /></i>
                  </label>
                  <label>
                    <span>Water</span>
                    <strong>{planWater} L</strong>
                    <i><b style={{ width: `${waterProgress}%` }} /></i>
                  </label>
                </div>
              </article>
            </section>

            <section className="ai-coach-panel">
              <div className="section-heading">
                <h2>AI Coach Chat</h2>
                <p>Ask about your saved plan, completed workouts, meals, or recovery.</p>
              </div>
              <div className="coach-prompts">
                {['What should I train today?', 'Adjust my plan for low energy', 'What should I eat after workout?'].map((prompt) => (
                  <button key={prompt} type="button" onClick={() => void askCoach(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="coach-thread" aria-live="polite">
                {coachMessages.length === 0 ? (
                  <p className="coach-empty">No coach messages yet.</p>
                ) : (
                  coachMessages.map((message) => (
                    <article className={message.role === 'coach' ? 'coach-message' : 'user-message'} key={message.id}>
                      <div>
                        <strong>{message.role === 'coach' ? 'Coach' : 'You'}</strong>
                        {message.role === 'coach' ? (
                          <span>
                            {message.source === 'openai' ? 'OpenAI' : 'Local coach'} | {message.completionRate}% complete
                          </span>
                        ) : null}
                      </div>
                      <p>{message.message}</p>
                    </article>
                  ))
                )}
              </div>
              <div className="coach-input-row">
                <input
                  type="text"
                  value={coachQuestion}
                  onChange={(event) => setCoachQuestion(event.target.value)}
                  placeholder="Ask about today's workout, meals, or recovery"
                  maxLength={400}
                />
                <button
                  type="button"
                  className="primary-button"
                  disabled={isCoachLoading}
                  onClick={() => void askCoach()}
                >
                  {isCoachLoading ? 'Thinking...' : 'Ask Coach'}
                </button>
              </div>
            </section>

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

            <section className="exercise-library-panel">
              <div className="library-header">
                <div className="section-heading">
                  <h2>Exercise Demo Library</h2>
                  <p>Quick form cues for movements in your current weekly plan.</p>
                </div>
                <input
                  type="search"
                  value={exerciseFilter}
                  onChange={(event) => setExerciseFilter(event.target.value)}
                  placeholder="Search exercises"
                />
              </div>
              <div className="exercise-library-grid">
                <div className="exercise-picker" aria-label="Exercises in current plan">
                  {visibleExerciseNames.map((exercise) => (
                    <button
                      className={selectedExerciseName === exercise ? 'active' : ''}
                      key={exercise}
                      type="button"
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      <strong>{exercise}</strong>
                      <span>{getExerciseInfo(exercise).category}</span>
                    </button>
                  ))}
                  {visibleExerciseNames.length === 0 ? (
                    <p className="library-empty">No exercises match that search.</p>
                  ) : null}
                </div>

                {selectedExerciseInfo ? (
                  <article className="exercise-detail">
                    <div>
                      <small>{selectedExerciseInfo.category}</small>
                      <h3>{selectedExerciseName}</h3>
                    </div>
                    <dl>
                      <div>
                        <dt>Targets</dt>
                        <dd>{selectedExerciseInfo.muscles}</dd>
                      </div>
                      <div>
                        <dt>Form Cue</dt>
                        <dd>{selectedExerciseInfo.cue}</dd>
                      </div>
                      <div>
                        <dt>Watch For</dt>
                        <dd>{selectedExerciseInfo.caution}</dd>
                      </div>
                    </dl>
                  </article>
                ) : null}
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
