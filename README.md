# AI Fitness Coach

AI Fitness Coach is a full-stack fitness planning application built with a React + TypeScript frontend and a FastAPI backend. It lets users create accounts, generate personalized workout and nutrition plans, track weekly workout completion, ask an AI coach for plan-aware guidance, and review exercise form cues from their current plan.

The project also includes an admin dashboard for viewing users, reviewing analytics, and customizing a user's workout plan, meal plan, and coach notes.

## Table Of Contents

- [Features](#features)
- [How The App Works](#how-the-app-works)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [User And Admin Flow](#user-and-admin-flow)
- [API Overview](#api-overview)
- [Database](#database)
- [Testing And Build](#testing-and-build)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Features

### User Features

- User signup and login.
- Saved session in browser local storage.
- Fitness plan generation from age, gender, height, weight, goal, diet, and workout location.
- BMI, BMI category, calorie target, protein target, and water-intake target.
- Gym-only and home-only workout plans.
- Vegetarian and non-vegetarian meal suggestions.
- Weekly workout completion tracker.
- Progress dashboard with completion ring, day-by-day bars, and nutrition target bars.
- AI Coach Chat that answers using the user's latest plan and workout completion state.
- Exercise Demo Library with searchable plan exercises, target muscles, form cues, and safety notes.

### Admin Features

- Admin login.
- User list and user detail view.
- Admin analytics for total users, profiles, average BMI, goals, gender, workout preference, and diet preference.
- Custom workout, meal, and notes editor for each user.

### Platform Features

- Responsive frontend design.
- FastAPI backend with CORS enabled for local Vite and common hosted frontend domains.
- SQLAlchemy persistence with MySQL support and local SQLite fallback.
- Vercel-ready full-stack routing.
- Netlify-ready frontend deployment.

## How The App Works

At a high level, the app has three layers:

1. **Frontend**

   The frontend is a Vite React app in `frontend/`. It renders the login screen, home view, plan builder, dashboard, admin dashboard, progress charts, AI coach chat, and exercise library.

2. **Backend**

   The backend is a FastAPI app in `backend/model_api.py`. It handles authentication, plan generation, progress tracking, AI coach responses, admin analytics, and admin plan updates.

3. **Database**

   Database access is handled in `backend/database.py` through SQLAlchemy. The app stores users, password hashes, generated plans, custom admin plans, and workout completion records.

The normal request flow looks like this:

```text
Browser
  -> React component calls fetch()
  -> API URL is resolved in frontend/src/api.ts
  -> FastAPI route receives the request
  -> Pydantic validates the request body
  -> SQLAlchemy loads or saves data
  -> FastAPI returns JSON
  -> React updates the UI
```

## Architecture

### Frontend

```text
frontend/src/
  api.ts                         # Shared API base URL helper
  App.tsx                        # Main view routing and session handling
  main.tsx                       # React entry point
  index.css                      # Global app styling
  components/
    LoginView.tsx                # User/admin login and signup
    HomeView.tsx                 # User landing/home view after login
    FitnessView.tsx              # Plan builder and generated plan result
    DashboardView.tsx            # Progress charts, AI coach, exercise library
    AdminView.tsx                # Admin analytics and user plan editor
```

`App.tsx` keeps the active user session in state and mirrors it to `localStorage` under `ai-fitness-coach-session`. If no session exists, the app shows `LoginView`. If the logged-in role is `admin`, it shows `AdminView`. Normal users can move between home, plan builder, and dashboard.

`frontend/src/api.ts` chooses the backend URL:

- In local development, it uses `http://127.0.0.1:8000`.
- In production, it uses `/api`.
- If `VITE_API_URL` is set, that value is used instead.
- Empty `VITE_API_URL` values are ignored safely.

### Backend

```text
backend/
  model_api.py                   # FastAPI app, routes, plan logic, AI coach logic
  database.py                    # SQLAlchemy engine, models, load/save helpers
  schema.sql                     # Creates local MySQL database
  requirements.txt               # Backend dependencies for local development
  tests/
    test_model_api.py            # Basic API tests
```

Important backend responsibilities:

- Validate requests with Pydantic models.
- Hash and verify passwords.
- Create public user responses without exposing password hashes.
- Generate workout and meal plans using local rules.
- Store the latest user profile and plan.
- Store workout completions separately from user records.
- Return admin analytics from saved profiles.
- Generate AI coach responses using OpenAI when `OPENAI_API_KEY` exists, otherwise use a local fallback response.

### Deployment Adapter

```text
api/
  index.py                       # Imports backend.model_api:app for Vercel
```

Vercel routes `/api/*` requests to this file, which exposes the FastAPI app.

## Project Structure

```text
AI-Fitness-Coach/
  api/
    index.py
  backend/
    database.py
    model_api.py
    requirements.txt
    schema.sql
    tests/
      test_model_api.py
  frontend/
    public/
      favicon.svg
      icons.svg
    src/
      api.ts
      App.tsx
      index.css
      main.tsx
      components/
        AdminView.tsx
        DashboardView.tsx
        FitnessView.tsx
        HomeView.tsx
        LoginView.tsx
    package.json
    package-lock.json
    vite.config.ts
  DEPLOYMENT.md
  netlify.toml
  requirements.txt
  vercel.json
```

## Local Setup

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Install Backend Dependencies

From the repository root:

```bash
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. Optional MySQL Setup

The app can run with local SQLite fallback, so MySQL is optional for development. To use MySQL locally:

```bash
mysql -u root -p < backend/schema.sql
```

Then set:

```bash
set DATABASE_URL=mysql+pymysql://root:your-password@127.0.0.1:3306/ai_fitness_coach
```

### 4. Run The Backend

From `backend/`:

```bash
.venv\Scripts\python.exe -m uvicorn model_api:app --reload --host 127.0.0.1 --port 8000
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

### 5. Run The Frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Environment Variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | No | SQLAlchemy database URL. If missing, the backend uses local SQLite. |
| `ADMIN_EMAIL` | Production yes | Admin login email. |
| `ADMIN_PASSWORD` | Production yes | Admin login password. |
| `OPENAI_API_KEY` | No | Enables OpenAI-powered AI coach responses. |
| `OPENAI_MODEL` | No | Model name for AI coach responses. Defaults to `gpt-5.4-mini`. |
| `ENVIRONMENT` | No | If set to `production`, default admin credentials are rejected. |
| `VERCEL_ENV` | No | Used to detect production on Vercel. |
| `NETLIFY_ENV` | No | Used to detect production on Netlify. |

Development admin credentials:

```text
Email: admin@fitness.local
Password: admin123
```

Do not use these defaults in production.

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | No | Backend base URL. Use this when the frontend is hosted separately from the backend. |

Example for a separate backend:

```text
VITE_API_URL=https://your-backend-domain.com/api
```

## User And Admin Flow

### New User Signup

1. User selects `User`.
2. User switches to signup mode.
3. User enters name, email, and password.
4. Frontend posts to `/signup`.
5. Backend hashes the password and stores the user.
6. Backend returns the public user session.
7. Frontend stores the session and opens the dashboard.

### Returning User Login

1. User enters email and password.
2. Frontend posts to `/login` with role `user`.
3. Backend finds the user by email.
4. Backend verifies the password hash.
5. Backend updates `last_login`.
6. Frontend restores the user dashboard.

### Plan Generation

1. User enters physical metrics and preferences.
2. Frontend posts to `/fitness_plan`.
3. Backend calculates BMI, BMR, daily calories, protein, and water.
4. Backend builds a workout plan based on goal, gender, age, BMI, and workout place.
5. Backend builds a meal plan based on diet and goal.
6. Backend stores the latest profile and plan on the user record.
7. Frontend displays the plan and progress tracker.

### Progress Tracking

1. User toggles a workout day as complete or incomplete.
2. Frontend sends `PUT /users/{user_id}/progress`.
3. Backend validates that the day exists in the user's current plan.
4. Backend stores the completion in `workout_completions`.
5. Frontend refreshes completion counts and charts.

### AI Coach Chat

1. User enters a question or clicks a quick prompt.
2. Frontend posts to `/users/{user_id}/ai_coach`.
3. Backend loads the user's latest plan and workout completions.
4. If `OPENAI_API_KEY` exists, backend asks OpenAI for a concise coaching note.
5. If no API key exists, backend returns a local fallback coaching response.
6. Frontend appends the response to the chat history.

### Admin Flow

1. Admin selects `Admin` on the login screen.
2. Frontend posts to `/login` with role `admin`.
3. Backend verifies admin credentials from environment variables or development defaults.
4. Admin dashboard loads users and analytics.
5. Admin can select a user and save a custom plan.

Admin-only routes use this request header:

```text
X-Session-Role: admin
```

## API Overview

All main routes are available both with and without the `/api` prefix. For example, `/signup` and `/api/signup` both work.

### Public Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Basic backend message. |
| `GET` | `/health` | Health check. |
| `POST` | `/signup` | Create a normal user account. |
| `POST` | `/login` | Login user or admin. |
| `POST` | `/fitness_plan` | Generate and save a user's latest plan. |

### User Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/users/{user_id}/progress` | Load latest plan, completions, and completion rate. |
| `PUT` | `/users/{user_id}/progress` | Mark a workout day complete or incomplete. |
| `POST` | `/users/{user_id}/ai_coach` | Get a plan-aware coaching response. |

### Admin Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/admin/users` | List users. |
| `GET` | `/admin/users/{user_id}` | Get one user. |
| `PUT` | `/admin/users/{user_id}/plan` | Save a custom workout and meal plan. |
| `GET` | `/admin/analytics` | Load aggregate analytics. |

## Database

The database layer lives in `backend/database.py`.

### Tables

`users`

- `id`
- `name`
- `email`
- `password_hash`
- `created_at`
- `last_login`
- `profile_json`
- `latest_plan_json`
- `custom_plan_json`

`workout_completions`

- `id`
- `user_id`
- `day`
- `completed`
- `updated_at`

### Database Selection

The backend chooses the database in this order:

1. If `DATABASE_URL` is set, use it.
2. If `DATABASE_URL` is missing or fails, use local SQLite at `backend/ai_fitness.db`.
3. If that path is not writable, use a temp SQLite file.

The backend also checks whether the local SQLite file is valid. If an invalid SQLite file is found, it is moved aside and a fresh database is created.

## Testing And Build

### Backend Tests

From the repository root:

```bash
python -m pytest backend\tests
```

The tests cover:

- Admin login.
- Admin route protection.
- User signup and login.

### Frontend Build

From `frontend/`:

```bash
npm run build
```

### Frontend Lint

From `frontend/`:

```bash
npm run lint
```

## Deployment

For more detail, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Vercel

Vercel can deploy the frontend and backend together from the repository root.

`vercel.json`:

- Builds the frontend from `frontend/`.
- Publishes `frontend/dist`.
- Routes `/api/*` to `api/index.py`.
- Routes frontend paths back to `index.html`.

In Vercel, set:

```text
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-strong-password
DATABASE_URL=mysql+pymysql://user:password@host:3306/ai_fitness_coach
```

Optional:

```text
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=your-model-name
```

### Netlify

Netlify deploys only the frontend using `netlify.toml`.

For Netlify:

1. Deploy the backend separately.
2. Set `VITE_API_URL` to the deployed backend URL.

Example:

```text
VITE_API_URL=https://your-vercel-app.vercel.app/api
```

## Troubleshooting

### "Could not reach the backend. Start FastAPI on port 8000 and try again."

Start the backend:

```bash
cd backend
.venv\Scripts\python.exe -m uvicorn model_api:app --reload --host 127.0.0.1 --port 8000
```

Then open:

```text
http://127.0.0.1:8000/health
```

### Signup returns "An account with this email already exists"

Use a different email or log in with the existing account.

### Admin login fails

In development, use:

```text
admin@fitness.local / admin123
```

If environment variables are set, use the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### Frontend calls the wrong backend

Check `frontend/.env` or hosting environment variables. If `VITE_API_URL` is set, the frontend uses it. For local development, you can leave it unset.

### Database problems

If no `DATABASE_URL` is set, the app uses local SQLite. If using MySQL, confirm:

- MySQL is running.
- The database exists.
- `DATABASE_URL` uses the correct user, password, host, port, and database name.

### AI coach returns local responses

This is expected when `OPENAI_API_KEY` is not set. Add an API key to enable OpenAI-powered responses.

## Notes

- This app gives general fitness guidance and is not medical advice.
- Users should consult a qualified professional for injury, pain, pregnancy, medical conditions, or specialized nutrition needs.
- Passwords are hashed before storage, but the project is still a learning/demo app and should be reviewed before serious production use.
