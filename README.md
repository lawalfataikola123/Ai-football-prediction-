# AI Football Predictions

Full-stack machine learning application that predicts football (soccer) match outcomes using historical data, team statistics, and ensemble ML models.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts, Lucide React |
| Backend | Python 3.12, FastAPI (async), SQLAlchemy 2.0, Pydantic v2 |
| ML | scikit-learn, XGBoost, pandas, numpy |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Infra | Docker + Docker Compose |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│                   Port 3000                           │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP /api/*
┌──────────────────▼──────────────────────────────────┐
│                Backend (FastAPI)                      │
│                Port 8000                              │
│  ┌────────────┬────────────┬─────────────────────┐   │
│  │ API Layer  │ Service    │ ML Engine           │   │
│  │ (routers)  │ Layer      │ (XGBoost/Sklearn)   │   │
│  └────────────┴────────────┴─────────────────────┘   │
└──────┬─────────────────────┬─────────────────────────┘
       │                     │
┌──────▼──────┐      ┌──────▼──────┐
│  PostgreSQL │      │    Redis    │
│  (primary)  │      │   (cache)   │
└─────────────┘      └─────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose v2
- Make (optional, for convenience commands)

### Running the full stack

```bash
# Clone and start everything
cd football-predictions
docker compose up --build

# In another terminal, seed the database
docker compose exec backend python -m app.seed
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### Demo credentials

After seeding: `username: demo, password: demo1234`

## Environment Variables

See [.env.example](.env.example) for all configurable variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `SECRET_KEY` | — | JWT signing key (change in production) |
| `ENVIRONMENT` | `development` | `development` or `production` |

## API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login, returns JWT |
| GET | `/api/v1/auth/me` | Current user info |

### Matches & Predictions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/matches/upcoming` | Upcoming matches with predictions (7 day window) |
| GET | `/api/v1/matches/{id}` | Match detail with prediction breakdown |
| POST | `/api/v1/matches/predict/custom` | Custom matchup prediction |
| GET | `/api/v1/matches/performance` | Model accuracy metrics & confusion matrix |

### Teams & Leagues

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/teams/{id}/stats` | Team analytics dashboard |
| GET | `/api/v1/teams/search?q=` | Search teams by name |
| GET | `/api/v1/leagues` | List all leagues |

### User Features

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/favorites/teams/{team_id}` | Add favorite team |
| DELETE | `/api/v1/favorites/teams/{team_id}` | Remove favorite team |
| GET | `/api/v1/favorites/teams` | List favorite teams |
| GET | `/api/v1/predictions/history` | Prediction history vs actual |

## Project Structure

```
football-predictions/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers
│   │   ├── core/            # Config, DB, security
│   │   ├── ml/              # Feature engineering, prediction, evaluation
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic layer
│   │   ├── main.py          # FastAPI application entry
│   │   └── seed.py          # Database seeder
│   ├── alembic/             # Database migrations
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # Auth, Theme providers
│   │   ├── pages/           # Route page components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── Dockerfile
├── ml/training/             # Standalone model training
├── docker-compose.yml       # Full stack orchestration
└── .env.example
```

## ML Model Training

The prediction engine uses an ensemble approach:

1. **XGBoost Classifier** for match result (1X2) prediction
2. **Poisson regression** for score prediction
3. **Probability calibration** via Platt scaling

Features include: Elo ratings, rolling averages (last 10 games), goal difference trends, home/away performance splits, and head-to-head records.

### Retrain the model

```bash
# Run the training container
docker compose run --rm ml-trainer

# Or run standalone
cd ml/training
pip install -r requirements.txt
python train.py
```

## Development

### Without Docker

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Database (ensure PostgreSQL is running)
# Set DATABASE_URL in environment
```

### Running tests

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

## Features

- **Match Predictions**: 1X2 result with probability distribution, top 3 most likely scores, Over/Under goals, BTTS
- **Confidence Scoring**: Every prediction includes a 0-100% confidence score
- **Model Transparency**: Feature importance breakdown showing WHY the model chose a prediction
- **Dark Mode**: Full dark mode support with system preference detection
- **Responsive**: Mobile-first design
- **User Accounts**: JWT auth, favorite teams, prediction history

## Data Sources

The app includes a seed script that generates realistic demo data for 5 leagues (20 teams, 50+ historical matches, 15+ upcoming matches). No external API keys are required to run the app.

To use real data, set `API_FOOTBALL_KEY` or `FOOTBALL_DATA_KEY` in your environment.

## Mobile App (APK)

The app supports both **PWA** (Progressive Web App) and **Capacitor** (native Android) builds.

### PWA (Works Immediately)

Simply open the app in Chrome on Android and tap **"Add to Home Screen"** when prompted, or:
1. Open the app
2. Tap Chrome menu → "Add to Home Screen"
3. Opens as a standalone app with offline support and push notifications

The PWA automatically caches API responses and app assets via service worker.

### Native Android APK (Capacitor)

Prerequisites:
- **Android Studio** with Android SDK (API 34+)
- Java 17+ (`java -version`)
- Node.js 18+ and npm

Build steps:

```bash
# 1. Build the web app
cd frontend
npm install
npm run build

# 2. Sync web assets to Capacitor
npx cap sync

# 3. Open in Android Studio
npx cap open android

# 4. In Android Studio: Build → Build Bundle(s) / APK → Build APK(s)
#    Or use the gradle wrapper directly:
cd android && ./gradlew assembleDebug
```

The APK will be at `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

### API Configuration for APK

When running the APK on a real device, the app needs to reach the backend API. Options:

| Method | Config | How |
|--------|--------|-----|
| **Local dev server** | `10.0.2.2:8000` | Android emulator → host machine |
| **Same network** | `192.168.x.x:8000` | Device + server on same WiFi |
| **Ngrok tunnel** | `*.ngrok-free.app` | Expose local server via ngrok |
| **Deployed server** | `your-domain.com` | Deploy backend to cloud |

Update the API URL in the app by editing `src/services/api.ts` before building, or use the environment variable approach with Vite.

### Quick APK Build (Debug)

```bash
cd frontend
npm run build
npx cap sync
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

