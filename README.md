# GoalInsight — Football Intelligence Platform & Match Forecast Engine

GoalInsight is a full-stack football match analytics and probability forecasting platform. It ingests live fixtures from **football-data.org v4**, models expected goals ($xG$) using offensive and defensive priors, computes joint probability distributions with **Dixon-Coles bivariate adjustments**, derives fair betting odds, and tracks performance through verifiable pre-kickoff prediction snapshots and automated settlement.

---

## Key Features

- **Dual Live Feed Ingestion**: Merges **football-data.org v4** and **Sportmonks v3** across 12 elite competitions (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Brasileirão, Scottish Premiership, Danish Superliga, Championship, Eredivisie, Primeira Liga).
- **4-Model Algorithmic Ensemble**:
  1. *Dixon-Coles Bivariate Poisson Distribution* (with low-score covariance parameter $\rho = -0.04$).
  2. *Dynamic Global Club Elo Rating* (calibrated continental ratings with 65-point home advantage).
  3. *Form & Momentum Decaying Exponential Moving Average (EMA)*.
  4. *5,000-Match Monte Carlo Stochastic Simulator* (with lognormal matchday variance perturbation).
- **💎 90%+ Ultra-Safe Banker Scanner**: Evaluates full multi-market spaces (Double Chance, Over 1.5, Under 3.5, Team Over 0.5 Goals, Draw No Bet) to isolate selections that exceed **88% to 96%+ statistical win probability**.
- **Daily 90%+ Super Banker Treble Slip**: Automated 1-click builder that pairs the safest independent selections of the day into an ultra-high-probability parlay.
- **Kelly Criterion Capital Management**: Calculates exact fractional Quarter-Kelly bankroll staking percentages to protect capital while maximizing long-term geometric capital growth.
- **5,000-Run Monte Carlo Simulation Breakdown**: Deep-dive modal displays empirical simulation statistics, goal percentiles, clean sheet rates, and top scoreline distributions.
- **Fair Betting Odds**: Converts calculated probabilities into fair decimal, American, percentage, and fractional odds with +EV indicators.
- **Custom Match Simulator**: Interactive simulator allowing users to enter custom club matchups or tweak expected goal ratings ($xG$) with instant probability recalculation.
- **Snapshot Immutability**: Saves pre-kickoff prediction snapshots to prevent post-hoc overfitting or retroactive alterations.
- **Automated Settlement & Calibration**: Ingests full-time results from football-data.org, verifies outcomes, computes Brier scores, and measures model hit rates.
- **Smart Rate-Limit Protection**: Multi-tier in-memory and SQLite caching with TTL expiration to prevent 429 Too Many Requests errors on the football-data free plan.
- **Modern Responsive Dashboard**: Built with Next.js 14, React 18, Tailwind CSS, Lucide icons, dark mode sports-analytics aesthetics, and zero external widget dependencies.

---

## Quick Start (Windows 10/11)

### 1-Click Launch (Recommended)
Double-click **`RUN_GOALINSIGHT.bat`** on your Desktop.

This automatically:
1. Verifies Python 3.10+ and Node.js 18+.
2. Configures the backend virtual environment and dependencies.
3. Installs frontend dependencies.
4. Starts the FastAPI backend (`http://localhost:8000`) and Next.js frontend (`http://localhost:3000`).
5. Opens your default browser directly to the dashboard!

---

## Manual Execution (Terminal)

### 1. Start Backend (Terminal 1)
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be available at: **http://localhost:8000/docs**

### 2. Start Frontend (Terminal 2)
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
Open **http://localhost:3000** in your browser.

---

## Production Deployment

GoalInsight is packaged and ready to deploy:
- **Vercel + Render** (Free tier setup): See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
- **Docker Compose**: `docker compose -f docker-compose.prod.yml up -d --build`
- **Railway**: 1-click deploy via `railway.json`.

---

## Project Structure

```text
GoalInsight/
├── backend/
│   ├── app/
│   │   ├── config.py          # Settings & environment configuration
│   │   ├── database.py        # SQLAlchemy engine (SQLite & PostgreSQL)
│   │   ├── models.py          # ORM models (snapshots, settlements, cache)
│   │   ├── predictor.py       # Poisson & Dixon-Coles prediction engine
│   │   ├── data_provider.py   # football-data.org connector & caching
│   │   └── main.py            # FastAPI REST endpoints
│   ├── .env                   # Configured with football-data.org API key
│   ├── .env.example           # Deployment example template
│   ├── Dockerfile             # Container definition
│   ├── Procfile               # Cloud process runner
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── app/
│   │   ├── globals.css        # Tailwind styles & theme variables
│   │   ├── layout.tsx         # Root layout & page metadata
│   │   └── page.tsx           # Full-featured sports analytics dashboard
│   ├── .env.local             # Local environment pointer
│   ├── Dockerfile             # Multi-stage production container
│   ├── package.json           # Next.js & React dependencies
│   ├── tailwind.config.ts     # Tailwind theme configuration
│   └── vercel.json            # Vercel deployment configuration
│
├── docker-compose.yml         # Local development orchestration
├── docker-compose.prod.yml    # Production container orchestration
├── RUN_GOALINSIGHT.bat        # Windows 1-click launcher
├── INSTALL_AND_START.ps1      # PowerShell launcher
├── DEPLOYMENT_GUIDE.md        # Step-by-step production hosting guide
└── README.md                  # Documentation
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and provider connection state |
| `GET` | `/api/competitions` | Supported Tier 1 competitions |
| `GET` | `/api/fixtures` | Upcoming fixtures (`?league=`, `?status=`) |
| `GET` | `/api/predictions` | Matches enriched with Poisson probabilities |
| `POST` | `/api/predictions/simulate` | Interactive custom match simulator |
| `POST` | `/api/predictions/publish` | Lock pre-kickoff prediction snapshots |
| `GET` | `/api/predictions/history` | Stored historical snapshots |
| `POST` | `/api/predictions/settle` | Auto-grade past predictions against final scores |
| `GET` | `/api/stats/overview` | Overall accuracy, hit rates, and Brier scores |
| `POST` | `/api/sync` | Clear cache and sync fresh fixtures |

---

## Disclaimer
GoalInsight is for informational, analytical, and entertainment purposes only. Forecasts are probabilistic mathematical estimates, not guarantees. Responsible wagering is advised where sports betting is legally permitted.
