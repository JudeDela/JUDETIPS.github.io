from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class PredictionRecord(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fixture_id: Mapped[str] = mapped_column(String(80), index=True)
    league: Mapped[str] = mapped_column(String(120), default="")
    country: Mapped[str] = mapped_column(String(80), default="")
    home_team: Mapped[str] = mapped_column(String(120))
    away_team: Mapped[str] = mapped_column(String(120))
    kickoff: Mapped[datetime] = mapped_column(DateTime)
    
    # 1X2 Probabilities
    home_win: Mapped[float] = mapped_column(Float)
    draw: Mapped[float] = mapped_column(Float)
    away_win: Mapped[float] = mapped_column(Float)
    
    # Goal expectations
    expected_home_goals: Mapped[float] = mapped_column(Float)
    expected_away_goals: Mapped[float] = mapped_column(Float)
    
    # Secondary markets
    over_2_5: Mapped[float] = mapped_column(Float, default=0.0)
    btts_yes: Mapped[float] = mapped_column(Float, default=0.0)
    most_likely_score: Mapped[str] = mapped_column(String(20), default="1-1")
    confidence: Mapped[str] = mapped_column(String(30), default="Medium")
    
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MatchSettlement(Base):
    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fixture_id: Mapped[str] = mapped_column(String(80), index=True, unique=True)
    home_team: Mapped[str] = mapped_column(String(120))
    away_team: Mapped[str] = mapped_column(String(120))
    actual_home_score: Mapped[int] = mapped_column(Integer)
    actual_away_score: Mapped[int] = mapped_column(Integer)
    actual_outcome: Mapped[str] = mapped_column(String(20)) # "HOME", "DRAW", "AWAY"
    predicted_outcome: Mapped[str] = mapped_column(String(20)) # Highest prob outcome
    is_correct: Mapped[bool] = mapped_column(Boolean)
    brier_score: Mapped[float] = mapped_column(Float)
    settled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApiCacheEntry(Base):
    __tablename__ = "api_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cache_key: Mapped[str] = mapped_column(String(200), index=True, unique=True)
    data_json: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
