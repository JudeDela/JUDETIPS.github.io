from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, func

from .config import settings
from .database import Base, engine, SessionLocal
from .models import PredictionRecord, MatchSettlement
from .data_provider import (
    fetch_fixtures,
    fetch_standings,
    settle_completed_predictions,
    SUPPORTED_COMPETITIONS,
    _MEMORY_CACHE
)
from .predictor import forecast
from .ensemble import generate_daily_banker_slip, run_monte_carlo_simulation

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GoalInsight API",
    version="1.0.0",
    description="Professional Football Intelligence & Probabilistic Match Forecast Engine"
)

# CORS configuration
origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulationRequest(BaseModel):
    home_team: str = Field(default="Home Team", description="Name of the home club")
    away_team: str = Field(default="Away Team", description="Name of the away club")
    home_xg: float = Field(default=1.65, ge=0.05, le=6.0, description="Home expected goals")
    away_xg: float = Field(default=1.15, ge=0.05, le=6.0, description="Away expected goals")


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GoalInsight Football Intelligence Engine",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.app_env,
        "football_data_connected": bool(settings.football_data_token),
        "sportmonks_connected": bool(settings.sportmonks_api_token),
        "providers_active": [
            *(["football-data.org v4"] if settings.football_data_token else []),
            *(["Sportmonks v3"] if settings.sportmonks_api_token else [])
        ],
        "database": settings.database_url.split("///")[-1] if "///" in settings.database_url else "configured"
    }


@app.get("/api/competitions")
def get_competitions():
    """Returns Tier 1 competitions monitored by GoalInsight."""
    return {"competitions": SUPPORTED_COMPETITIONS}


@app.get("/api/standings/{competition_code}")
async def get_league_standings(competition_code: str):
    """Returns league table standings with form and goal statistics."""
    try:
        return await fetch_standings(competition_code)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Standings error: {str(exc)}")


@app.get("/api/fixtures")
async def get_fixtures_route(
    league: Optional[str] = None,
    status: Optional[str] = None,
    force_refresh: bool = False
):
    try:
        force_ref = bool(force_refresh) if isinstance(force_refresh, bool) else False
        fixtures, source = await fetch_fixtures(force_refresh=force_ref)
        
        filtered = fixtures
        if league and isinstance(league, str) and league != "All":
            filtered = [
                f for f in filtered 
                if f.get("league", "").lower() == league.lower() 
                or f.get("competition_code", "").lower() == league.lower()
            ]
        if status and isinstance(status, str):
            filtered = [f for f in filtered if f.get("status", "").upper() == status.upper()]

        return {
            "source": source,
            "total": len(filtered),
            "fixtures": filtered
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Data provider error: {str(exc)}")


@app.get("/api/predictions")
async def get_predictions(
    league: Optional[str] = None,
    force_refresh: bool = False
):
    """
    Returns upcoming fixtures enriched with Poisson & Dixon-Coles probability distributions.
    """
    try:
        force_ref = bool(force_refresh) if isinstance(force_refresh, bool) else False
        fixtures, source = await fetch_fixtures(force_refresh=force_ref)
        
        output = []
        for match in fixtures:
            if league and isinstance(league, str) and league != "All":
                if match.get("league", "").lower() != league.lower() and match.get("competition_code", "").lower() != league.lower():
                    continue

            h_xg = match.get("home_xg", 1.45)
            a_xg = match.get("away_xg", 1.15)
            h_team = match.get("home_team", "Home Team")
            a_team = match.get("away_team", "Away Team")
            prediction = forecast(
                home_xg=h_xg,
                away_xg=a_xg,
                home_team=h_team,
                away_team=a_team
            )
            output.append({
                **match,
                "prediction": prediction,
                "banker_analysis": prediction.get("banker_analysis"),
                "best_banker": prediction.get("best_banker"),
                "ensemble_consensus": prediction.get("ensemble_consensus"),
                "consensus_20_sites": prediction.get("consensus_20_sites"),
                "expanded_markets": prediction.get("expanded_markets")
            })

        return {
            "source": source,
            "count": len(output),
            "predictions": output
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Prediction calculation error: {str(exc)}")


@app.get("/api/predictions/bankers")
async def get_ultra_bankers(
    min_prob: float = 0.85,
    league: Optional[str] = None
):
    """
    Dedicated endpoint returning only 85% to 95%+ Ultra-Safe Banker picks.
    Filters multi-market selections (Double Chance, Over/Under, Team Goals)
    to maximize winning strike rate.
    """
    try:
        min_p = float(min_prob) if isinstance(min_prob, (int, float)) else 0.85
        fixtures, source = await fetch_fixtures()
        bankers = []
        for match in fixtures:
            if league and isinstance(league, str) and league != "All":
                if match.get("league", "").lower() != league.lower() and match.get("competition_code", "").lower() != league.lower():
                    continue

            h_xg = match.get("home_xg", 1.45)
            a_xg = match.get("away_xg", 1.15)
            h_team = match.get("home_team", "Home Team")
            a_team = match.get("away_team", "Away Team")
            p = forecast(h_xg, a_xg, home_team=h_team, away_team=a_team)
            
            bb = p.get("best_banker", {})
            prob = bb.get("probability", 0.0)
            if prob >= min_p:
                bankers.append({
                    "id": match.get("id"),
                    "home_team": h_team,
                    "away_team": a_team,
                    "league": match.get("league"),
                    "competition_code": match.get("competition_code"),
                    "league_emblem": match.get("league_emblem"),
                    "home_crest": match.get("home_crest"),
                    "away_crest": match.get("away_crest"),
                    "kickoff": match.get("kickoff"),
                    "utc_date": match.get("utc_date"),
                    "best_banker": bb,
                    "favored_outcome": p.get("favored_outcome"),
                    "most_likely_score": p.get("most_likely_score"),
                    "kelly_criterion": p.get("kelly_criterion")
                })

        bankers.sort(key=lambda x: x["best_banker"]["probability"], reverse=True)
        return {
            "source": source,
            "min_probability": min_p,
            "total_bankers": len(bankers),
            "bankers": bankers
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Banker scanner error: {str(exc)}")


@app.get("/api/predictions/banker-slip")
async def get_daily_banker_slip(legs: int = 3):
    """
    Builds the mathematically optimized 90%+ Super Banker Slip (Treble or Quad)
    combining the highest-probability, lowest-variance selections across all leagues.
    """
    try:
        fixtures, _ = await fetch_fixtures()
        preds = []
        for match in fixtures:
            h_xg = match.get("home_xg", 1.45)
            a_xg = match.get("away_xg", 1.15)
            h_team = match.get("home_team", "Home Team")
            a_team = match.get("away_team", "Away Team")
            p = forecast(h_xg, a_xg, home_team=h_team, away_team=a_team)
            preds.append({
                **match,
                "prediction": p,
                "banker_analysis": p.get("banker_analysis")
            })
            
        slip = generate_daily_banker_slip(preds, leg_count=legs)
        return slip
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Slip generation error: {str(exc)}")


@app.post("/api/predictions/simulate")
def simulate_custom_match(req: SimulationRequest):
    """
    Real-time interactive predictor: simulates match outcome based on custom team attack/defense ratings
    and runs the 4-model ensemble.
    """
    prediction = forecast(
        home_xg=req.home_xg,
        away_xg=req.away_xg,
        home_team=req.home_team,
        away_team=req.away_team
    )
    return {
        "home_team": req.home_team,
        "away_team": req.away_team,
        "home_xg": req.home_xg,
        "away_xg": req.away_xg,
        "prediction": prediction
    }


class MonteCarloRequest(BaseModel):
    home_xg: float = Field(default=1.75, ge=0.05, le=6.0)
    away_xg: float = Field(default=1.15, ge=0.05, le=6.0)
    iterations: int = Field(default=5000, ge=1000, le=20000)


@app.post("/api/simulate/monte-carlo")
def run_custom_monte_carlo(req: MonteCarloRequest):
    """
    Executes a high-performance Monte Carlo match simulation (up to 20,000 runs)
    with stochastic disturbance to generate empirical outcome distributions.
    """
    sim_result = run_monte_carlo_simulation(
        home_xg=req.home_xg,
        away_xg=req.away_xg,
        iterations=req.iterations
    )
    return sim_result


@app.post("/api/predictions/publish")
async def publish_prediction_snapshots():
    """
    Persist immutable snapshots of current upcoming fixtures before kickoff.
    Ensures predictions are locked and auditable.
    """
    fixtures, source = await fetch_fixtures()
    saved = 0
    skipped = 0

    with SessionLocal() as db:
        for match in fixtures:
            try:
                kickoff_str = match.get("kickoff", "")
                kickoff = datetime.fromisoformat(kickoff_str.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                continue

            # Don't publish past matches
            if kickoff <= datetime.utcnow():
                continue

            # Don't duplicate existing fixture forecasts
            exists = db.scalar(select(PredictionRecord).where(PredictionRecord.fixture_id == str(match["id"])))
            if exists:
                skipped += 1
                continue

            p = forecast(match.get("home_xg", 1.45), match.get("away_xg", 1.15))

            record = PredictionRecord(
                fixture_id=str(match["id"]),
                league=match.get("league", ""),
                country=match.get("country", ""),
                home_team=match.get("home_team", ""),
                away_team=match.get("away_team", ""),
                kickoff=kickoff,
                home_win=p["home_win"],
                draw=p["draw"],
                away_win=p["away_win"],
                expected_home_goals=p["expected_home_goals"],
                expected_away_goals=p["expected_away_goals"],
                over_2_5=p["over_2_5"],
                btts_yes=p["btts_yes"],
                most_likely_score=p["most_likely_score"],
                confidence=p["confidence"],
                published=True
            )
            db.add(record)
            saved += 1

        db.commit()

    return {
        "saved": saved,
        "already_recorded": skipped,
        "source": source,
        "message": f"Successfully locked and published {saved} new forecast snapshots."
    }


@app.get("/api/predictions/history")
def get_prediction_history(limit: int = 100):
    """Retrieves published prediction snapshots from database."""
    with SessionLocal() as db:
        records = db.scalars(
            select(PredictionRecord)
            .order_by(PredictionRecord.created_at.desc())
            .limit(min(limit, 500))
        ).all()

        return [
            {
                "id": r.id,
                "fixture_id": r.fixture_id,
                "league": r.league,
                "country": r.country,
                "home_team": r.home_team,
                "away_team": r.away_team,
                "kickoff": r.kickoff.isoformat(),
                "home_win": r.home_win,
                "draw": r.draw,
                "away_win": r.away_win,
                "over_2_5": r.over_2_5,
                "btts_yes": r.btts_yes,
                "most_likely_score": r.most_likely_score,
                "confidence": r.confidence,
                "created_at": r.created_at.isoformat()
            }
            for r in records
        ]


@app.post("/api/predictions/settle")
async def trigger_settlement():
    """
    Queries recently finished matches from football-data.org,
    compares them with recorded predictions, and updates settlement accuracy.
    """
    result = await settle_completed_predictions()
    return result


@app.get("/api/stats/overview")
def get_stats_overview():
    """
    Calculates overall system metrics: published forecasts, settled matches, accuracy rate, and Brier score.
    """
    with SessionLocal() as db:
        total_published = db.query(PredictionRecord).count()
        total_settled = db.query(MatchSettlement).count()
        correct_count = db.query(MatchSettlement).filter(MatchSettlement.is_correct == True).count()
        
        accuracy = round((correct_count / total_settled) * 100, 1) if total_settled > 0 else None
        
        avg_brier = db.query(func.avg(MatchSettlement.brier_score)).scalar()
        brier_formatted = round(avg_brier, 4) if avg_brier is not None else None

        recent_settled = db.scalars(
            select(MatchSettlement).order_by(MatchSettlement.settled_at.desc()).limit(10)
        ).all()

        settlements_list = [
            {
                "fixture_id": s.fixture_id,
                "home_team": s.home_team,
                "away_team": s.away_team,
                "actual_score": f"{s.actual_home_score}-{s.actual_away_score}",
                "actual_outcome": s.actual_outcome,
                "predicted_outcome": s.predicted_outcome,
                "is_correct": s.is_correct,
                "brier_score": s.brier_score
            }
            for s in recent_settled
        ]

    return {
        "published_predictions": total_published,
        "settled_predictions": total_settled,
        "correct_predictions": correct_count,
        "accuracy_percent": accuracy,
        "mean_brier_score": brier_formatted,
        "recent_settlements": settlements_list,
        "benchmarking_note": "A Brier score closer to 0 indicates higher probabilistic accuracy (reference benchmark: ~0.20 for top European tier models)."
    }


@app.post("/api/sync")
async def force_sync():
    """Clears cache and forces immediate refresh from football-data.org."""
    _MEMORY_CACHE.clear()
    fixtures, source = await fetch_fixtures(force_refresh=True)
    return {
        "message": "Cache cleared and live fixtures synced.",
        "fixtures_count": len(fixtures),
        "source": source
    }
