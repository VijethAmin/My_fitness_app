# Deployment

This project has two deploy targets:

- Frontend: `frontend/` Vite React app.
- Backend: `backend/model_api.py` FastAPI app, exposed to Vercel through `api/index.py`.

## Vercel

Deploy from the repository root.

Vercel uses `vercel.json` to:

- install and build the React app from `frontend/`
- publish `frontend/dist`
- expose the FastAPI backend through `/api`

The frontend automatically uses `/api` in production, so no environment variable is required for an all-in-one Vercel deploy.

Set admin credentials in Vercel environment variables:

```text
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-strong-password
DATABASE_URL=mysql+pymysql://user:password@host:3306/ai_fitness_coach
```

Use a hosted MySQL database for `DATABASE_URL`. SQLAlchemy creates the app tables automatically on the first API request.

## Netlify

Deploy from the repository root.

Netlify uses `netlify.toml` to:

- use `frontend/` as the build base
- run `npm ci && npm run build`
- publish `frontend/dist`
- route all frontend paths back to `index.html`

Netlify does not run this FastAPI backend directly. Deploy the backend somewhere else, such as Vercel, Render, or Railway, then set this Netlify environment variable:

```text
VITE_API_URL=https://your-backend-domain.com/api
```

For a Vercel backend, the value usually looks like:

```text
VITE_API_URL=https://your-vercel-app.vercel.app/api
```

## Local Development

Backend:

```bash
mysql -u root -p < backend/schema.sql
set DATABASE_URL=mysql+pymysql://root:your-password@127.0.0.1:3306/ai_fitness_coach
cd backend
.venv\Scripts\python.exe -m uvicorn model_api:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm run dev
```
