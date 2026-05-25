# AI Fitness Coach

AI Fitness Coach is a full-stack fitness planning app with a React frontend and FastAPI backend. Users can log in, enter their body metrics and preferences, then generate a practical workout, nutrition, BMI, protein, calorie, and water-intake plan. Admins can review users and customize an individual user's workout plan, meal plan, and coach notes.

## Features

- Admin and normal user login
- Backend-saved user accounts with login timestamps and latest plan details
- Admin dashboard for selecting users and editing user-specific plans
- BMI calculation and BMI category
- Gender-aware calorie, protein, and water targets
- Goal-based workout plans for muscle gain, fat loss, and maintenance
- Strict gym-only and home-only workout plans
- BMI, age, gender, goal, diet, and workout-place based plan adjustments
- Exercise names for each workout day, such as Push-ups, Chest Press, Bench Press, Squat, Lat Pulldown, and Burpees
- Vegetarian and non-vegetarian meal suggestions
- Responsive frontend design
- Vercel-ready full-stack deployment
- Netlify-ready frontend deployment

## Tech Stack

- Frontend: React, TypeScript, Vite, CSS
- Backend: FastAPI, Pydantic, Uvicorn
- Deployment: Vercel, Netlify

## Project Structure

```text
AI-Fitness-Coach/
  api/
    index.py              # Vercel serverless FastAPI adapter
  backend/
    data/                 # Local JSON datastore, created at runtime and ignored by git
    model_api.py          # FastAPI app and fitness plan logic
    requirements.txt      # Backend local dependencies
  frontend/
    src/
      components/         # Login, home, and planner views
      App.tsx
      index.css
      main.tsx
    package.json
  DEPLOYMENT.md           # Detailed deployment guide
  netlify.toml            # Netlify frontend config
  requirements.txt        # Vercel Python dependencies
  vercel.json             # Vercel build and route config
```

## Local Setup

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies:

```bash
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Run the backend:

```bash
cd backend
.venv\Scripts\python.exe -m uvicorn model_api:app --reload --host 127.0.0.1 --port 8000
```

Run the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Login And Roles

Normal users log in with name, email, and password. If the email is new, the backend creates a user record in `backend/data/store.json`. Returning users must use the same password.

Admins log in from the same screen by choosing `Admin`.

Default admin credentials:

```text
Email: admin@fitness.local
Password: admin123
```

For deployment, set stronger admin credentials with environment variables:

```text
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-strong-password
```

This project uses a lightweight JSON datastore for demo and coursework use. Locally it writes to `backend/data/store.json`; on Vercel it writes to `/tmp/ai-fitness-store.json` so serverless functions can create users during a demo. Vercel `/tmp` storage is temporary, so replace it with a real database for permanent production data.

## API

Health check:

```text
GET /health
```

Generate fitness plan:

```text
POST /fitness_plan
```

Example request:

```json
{
  "age": 28,
  "gender": "Male",
  "weight": 72,
  "height": 176,
  "goal": "Muscle Gain",
  "diet": "Vegetarian",
  "workout_place": "Gym"
}
```

Login:

```text
POST /login
```

Admin users:

```text
GET /admin/users
GET /admin/users/{user_id}
PUT /admin/users/{user_id}/plan
```

Admin routes expect the `X-Session-Role: admin` header from the frontend.

## Deployment

For full details, see [DEPLOYMENT.md](DEPLOYMENT.md).

Vercel can deploy the frontend and FastAPI backend together from the repository root. The production frontend uses `/api` automatically.

Netlify can deploy the frontend from the repository root using `netlify.toml`. For Netlify, deploy the backend separately and set:

```text
VITE_API_URL=https://your-backend-domain.com/api
```

## Scripts

Frontend:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Backend:

```bash
python -m uvicorn model_api:app --reload
```
