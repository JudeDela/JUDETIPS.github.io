from datetime import datetime, timedelta, timezone
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
import httpx
from sqlalchemy import select
from .config import settings
from .database import SessionLocal, Base, engine
from .models import ApiCacheEntry, PredictionRecord, MatchSettlement

# Ensure all cache tables are initialized
Base.metadata.create_all(bind=engine)

logger = logging.getLogger("goalinsight.data_provider")

# Supported Tier 1 Competitions across both providers
SUPPORTED_COMPETITIONS = [
    {"code": "PL", "name": "Premier League", "country": "England", "emblem": "https://crests.football-data.org/PL.png", "provider": "football-data.org"},
    {"code": "CL", "name": "UEFA Champions League", "country": "Europe", "emblem": "https://crests.football-data.org/CL.png", "provider": "football-data.org"},
    {"code": "PD", "name": "La Liga", "country": "Spain", "emblem": "https://crests.football-data.org/PD.png", "provider": "football-data.org"},
    {"code": "BL1", "name": "Bundesliga", "country": "Germany", "emblem": "https://crests.football-data.org/BL1.png", "provider": "football-data.org"},
    {"code": "SA", "name": "Serie A", "country": "Italy", "emblem": "https://crests.football-data.org/SA.png", "provider": "football-data.org"},
    {"code": "FL1", "name": "Ligue 1", "country": "France", "emblem": "https://crests.football-data.org/FL1.png", "provider": "football-data.org"},
    {"code": "BSA", "name": "Campeonato Brasileiro Série A", "country": "Brazil", "emblem": "https://crests.football-data.org/BSA.png", "provider": "football-data.org"},
    {"code": "SCO", "name": "Premiership", "country": "Scotland", "emblem": "https://cdn.sportmonks.com/images/soccer/leagues/501.png", "provider": "Sportmonks v3"},
    {"code": "DNK", "name": "Superliga", "country": "Denmark", "emblem": "https://cdn.sportmonks.com/images/soccer/leagues/271.png", "provider": "Sportmonks v3"},
    {"code": "ELC", "name": "Championship", "country": "England", "emblem": "https://crests.football-data.org/ELC.png", "provider": "football-data.org"},
    {"code": "DED", "name": "Eredivisie", "country": "Netherlands", "emblem": "https://crests.football-data.org/DED.png", "provider": "football-data.org"},
    {"code": "PPL", "name": "Primeira Liga", "country": "Portugal", "emblem": "https://crests.football-data.org/PPL.png", "provider": "football-data.org"},
]

# Comprehensive Club Attack & Defense Strength Ratings
# (Attack benchmark: goals scored index, Defense benchmark: goals conceded index, 1.0 = average)
CLUB_RATINGS: Dict[str, Tuple[float, float]] = {
    # England (Premier League & Championship)
    "Manchester City FC": (2.25, 0.75), "Manchester City": (2.25, 0.75),
    "Arsenal FC": (2.15, 0.70), "Arsenal": (2.15, 0.70),
    "Liverpool FC": (2.20, 0.78), "Liverpool": (2.20, 0.78),
    "Chelsea FC": (1.75, 1.05), "Chelsea": (1.75, 1.05),
    "Aston Villa FC": (1.70, 1.00), "Aston Villa": (1.70, 1.00),
    "Newcastle United FC": (1.65, 1.05), "Newcastle": (1.65, 1.05),
    "Tottenham Hotspur FC": (1.80, 1.15), "Tottenham": (1.80, 1.15),
    "Manchester United FC": (1.50, 1.15), "Manchester United": (1.50, 1.15),
    "Brighton & Hove Albion FC": (1.55, 1.10), "Brighton": (1.55, 1.10),
    "Brentford FC": (1.45, 1.20), "Fulham FC": (1.40, 1.15),
    "West Ham United FC": (1.35, 1.30), "AFC Bournemouth": (1.45, 1.25),
    "Crystal Palace FC": (1.20, 1.15), "Everton FC": (1.15, 1.20),
    "Wolverhampton Wanderers FC": (1.25, 1.40), "Leicester City FC": (1.20, 1.45),
    "Ipswich Town FC": (1.10, 1.55), "Southampton FC": (1.05, 1.60),
    "Leeds United FC": (1.50, 0.95), "Burnley FC": (1.40, 0.90),
    "Sheffield United FC": (1.40, 1.00), "Sunderland AFC": (1.45, 1.00),

    # Spain (La Liga)
    "Real Madrid CF": (2.25, 0.78), "Real Madrid": (2.25, 0.78),
    "FC Barcelona": (2.35, 0.82), "Barcelona": (2.35, 0.82),
    "Club Atlético de Madrid": (1.75, 0.75), "Atletico Madrid": (1.75, 0.75),
    "Athletic Club": (1.55, 0.90), "Real Sociedad de Fútbol": (1.45, 0.92),
    "Villarreal CF": (1.65, 1.20), "Real Betis Balompié": (1.40, 1.05),
    "Girona FC": (1.60, 1.15), "Sevilla FC": (1.35, 1.25),
    "Valencia CF": (1.15, 1.35), "RCD Mallorca": (1.10, 1.05),
    "RC Celta de Vigo": (1.40, 1.35), "CA Osasuna": (1.25, 1.20),

    # Germany (Bundesliga)
    "FC Bayern München": (2.50, 0.75), "Bayern Munich": (2.50, 0.75),
    "Bayer 04 Leverkusen": (2.25, 0.85), "Leverkusen": (2.25, 0.85),
    "Borussia Dortmund": (1.95, 1.10), "Dortmund": (1.95, 1.10),
    "RB Leipzig": (1.80, 0.85), "Eintracht Frankfurt": (1.75, 1.15),
    "VfB Stuttgart": (1.75, 1.10), "SC Freiburg": (1.45, 1.10),
    "1. FC Union Berlin": (1.20, 1.05), "SV Werder Bremen": (1.35, 1.30),
    "Borussia Mönchengladbach": (1.40, 1.35), "1. FC Köln": (1.20, 1.45),
    "VfL Wolfsburg": (1.30, 1.30), "TSG 1899 Hoffenheim": (1.40, 1.45),
    "FC St. Pauli 1910": (1.05, 1.35), "Holstein Kiel": (1.05, 1.55),

    # Italy (Serie A)
    "FC Internazionale Milano": (2.15, 0.75), "Inter": (2.15, 0.75),
    "Atalanta BC": (2.10, 0.95), "Atalanta": (2.10, 0.95),
    "SSC Napoli": (1.80, 0.75), "Napoli": (1.80, 0.75),
    "Juventus FC": (1.65, 0.65), "Juventus": (1.65, 0.65),
    "AC Milan": (1.75, 1.05), "Milan": (1.75, 1.05),
    "SS Lazio": (1.65, 1.10), "Lazio": (1.65, 1.10),
    "AS Roma": (1.45, 1.15), "Roma": (1.45, 1.15),
    "ACF Fiorentina": (1.60, 1.00), "Fiorentina": (1.60, 1.00),
    "Bologna FC 1909": (1.35, 1.00), "Torino FC": (1.20, 1.10),

    # France (Ligue 1)
    "Paris Saint-Germain FC": (2.40, 0.80), "PSG": (2.40, 0.80),
    "AS Monaco FC": (1.85, 0.95), "Monaco": (1.85, 0.95),
    "Olympique de Marseille": (1.80, 1.05), "Marseille": (1.80, 1.05),
    "LOSC Lille": (1.60, 0.90), "Lille": (1.60, 0.90),
    "Olympique Lyonnais": (1.55, 1.15), "Lyon": (1.55, 1.15),
    "OGC Nice": (1.45, 0.95), "RC Lens": (1.35, 0.90),

    # Brazil (Brasileirão Série A) - Balanced Realism
    "SE Palmeiras": (1.95, 0.75), "Palmeiras": (1.95, 0.75),
    "CR Flamengo": (2.00, 0.80), "Flamengo": (2.00, 0.80),
    "Botafogo FR": (1.90, 0.80), "Botafogo": (1.90, 0.80),
    "CA Mineiro": (1.65, 0.95), "Atlético Mineiro": (1.65, 0.95),
    "SC Internacional": (1.60, 0.85), "Internacional": (1.60, 0.85),
    "São Paulo FC": (1.55, 0.90), "Sao Paulo": (1.55, 0.90),
    "Grêmio FBPA": (1.45, 1.10), "Gremio": (1.45, 1.10),
    "Cruzeiro EC": (1.35, 1.00), "Cruzeiro": (1.35, 1.00),
    "SC Corinthians Paulista": (1.45, 1.15), "Corinthians": (1.45, 1.15),
    "CA Paranaense": (1.30, 1.10), "Athletico Paranaense": (1.30, 1.10),
    "Santos FC": (1.45, 1.10), "Santos": (1.45, 1.10),
    "EC Bahia": (1.40, 1.15), "Bahia": (1.40, 1.15),
    "RB Bragantino": (1.35, 1.20), "Bragantino": (1.35, 1.20),
    "CR Vasco da Gama": (1.30, 1.25), "Vasco da Gama": (1.30, 1.25),
    "Fluminense FC": (1.30, 1.20), "Fluminense": (1.30, 1.20),
    "EC Vitória": (1.20, 1.30), "Vitoria": (1.20, 1.30),
    "Coritiba FBC": (1.15, 1.35), "Coritiba": (1.15, 1.35),
    "Chapecoense AF": (1.10, 1.40), "Chapecoense": (1.10, 1.40),
    "Clube do Remo": (1.05, 1.45), "Remo": (1.05, 1.45),

    # Scotland (Premiership - Sportmonks)
    "Celtic": (2.45, 0.70), "Celtic FC": (2.45, 0.70),
    "Rangers": (2.15, 0.85), "Rangers FC": (2.15, 0.85),
    "Aberdeen": (1.65, 0.95), "Aberdeen FC": (1.65, 0.95),
    "Hearts": (1.45, 1.10), "Heart of Midlothian": (1.45, 1.10),
    "Hibernian": (1.35, 1.20), "Dundee United": (1.30, 1.20),
    "Kilmarnock": (1.25, 1.25), "St. Mirren": (1.25, 1.20),
    "Motherwell": (1.30, 1.30), "St. Johnstone": (1.10, 1.40),

    # Denmark (Superliga - Sportmonks)
    "FC København": (2.05, 0.85), "Copenhagen": (2.05, 0.85),
    "FC Midtjylland": (2.00, 0.90), "Midtjylland": (2.00, 0.90),
    "Brøndby IF": (1.85, 0.95), "Brondby": (1.85, 0.95),
    "AGF": (1.55, 0.95), "FC Nordsjælland": (1.65, 1.10),
    "Silkeborg IF": (1.50, 1.15), "Randers FC": (1.40, 1.10),
    "Viborg FF": (1.35, 1.25), "Lyngby Boldklub": (1.10, 1.45),
}

# In-memory fast cache
_MEMORY_CACHE: Dict[str, Tuple[datetime, Any]] = {}


def get_cached(key: str) -> Optional[Any]:
    """Retrieve unexpired data from in-memory or DB cache."""
    now = datetime.now(timezone.utc)
    if key in _MEMORY_CACHE:
        exp, data = _MEMORY_CACHE[key]
        if exp > now:
            return data

    try:
        with SessionLocal() as db:
            row = db.scalar(select(ApiCacheEntry).where(ApiCacheEntry.cache_key == key))
            if row and row.expires_at.replace(tzinfo=timezone.utc) > now:
                data = json.loads(row.data_json)
                _MEMORY_CACHE[key] = (row.expires_at.replace(tzinfo=timezone.utc), data)
                return data
    except Exception as e:
        logger.warning(f"DB cache read error: {e}")

    return None


def set_cached(key: str, data: Any, ttl_seconds: int = 600) -> None:
    """Store data in memory and persistent DB cache."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=ttl_seconds)
    _MEMORY_CACHE[key] = (exp, data)

    try:
        with SessionLocal() as db:
            existing = db.scalar(select(ApiCacheEntry).where(ApiCacheEntry.cache_key == key))
            if existing:
                existing.data_json = json.dumps(data)
                existing.expires_at = exp.replace(tzinfo=None)
            else:
                db.add(ApiCacheEntry(
                    cache_key=key,
                    data_json=json.dumps(data),
                    expires_at=exp.replace(tzinfo=None)
                ))
            db.commit()
    except Exception as e:
        logger.warning(f"DB cache write error: {e}")


from .consensus_engine import compute_accurate_match_xg

def estimate_expected_goals(home_team: str, away_team: str) -> Tuple[float, float]:
    """
    Computes accurate, un-biased expected goals (xG) using global team ratings
    and dynamic heuristic tiers, eliminating 1-1 draw convergence across unrated teams.
    """
    h_xg, a_xg, _, _ = compute_accurate_match_xg(home_team, away_team)
    return h_xg, a_xg


async def fetch_football_data_fixtures(horizon_days: int = 7) -> List[Dict[str, Any]]:
    """Fetches matches from football-data.org v4."""
    if not settings.football_data_token:
        return []

    today = datetime.now(timezone.utc).date()
    days_ahead = min(horizon_days, 9)
    date_from = today.isoformat()
    date_to = (today + timedelta(days=days_ahead)).isoformat()

    headers = {"X-Auth-Token": settings.football_data_token}
    params = {"dateFrom": date_from, "dateTo": date_to}

    fixtures: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{settings.football_data_base_url.rstrip('/')}/matches",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            payload = resp.json()

        for item in payload.get("matches", []):
            home = item.get("homeTeam") or {}
            away = item.get("awayTeam") or {}
            competition = item.get("competition") or {}
            score = item.get("score") or {}
            full_time = score.get("fullTime") or {}

            home_name = home.get("name", "Home Team")
            away_name = away.get("name", "Away Team")
            home_xg, away_xg = estimate_expected_goals(home_name, away_name)

            fixtures.append({
                "id": f"fd-{item.get('id')}",
                "league": competition.get("name", "Unknown League"),
                "competition_code": competition.get("code", ""),
                "country": (competition.get("area") or {}).get("name", ""),
                "emblem": competition.get("emblem", ""),
                "home_team": home_name,
                "home_short": home.get("shortName", home_name),
                "home_crest": home.get("crest", ""),
                "away_team": away_name,
                "away_short": away.get("shortName", away_name),
                "away_crest": away.get("crest", ""),
                "kickoff": item.get("utcDate"),
                "status": item.get("status", "SCHEDULED"),
                "home_xg": home_xg,
                "away_xg": away_xg,
                "home_score": full_time.get("home"),
                "away_score": full_time.get("away"),
                "matchday": item.get("matchday"),
                "provider": "football-data.org"
            })
    except Exception as e:
        logger.error(f"Error fetching football-data.org matches: {e}")

    return fixtures


async def fetch_sportmonks_fixtures(horizon_days: int = 10) -> List[Dict[str, Any]]:
    """
    Fetches matches from Sportmonks v3 API using the secondary provider key.
    Enriches with Scottish Premiership, Danish Superliga, and participant metadata.
    """
    if not settings.sportmonks_api_token:
        return []

    today = datetime.now(timezone.utc).date()
    date_from = today.isoformat()
    date_to = (today + timedelta(days=horizon_days)).isoformat()

    fixtures: List[Dict[str, Any]] = []
    try:
        url = f"{settings.sportmonks_base_url.rstrip('/')}/football/fixtures/between/{date_from}/{date_to}?api_token={settings.sportmonks_api_token}&include=participants;league"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers={"User-Agent": "GoalInsight/1.0"})
            if resp.status_code != 200:
                logger.warning(f"Sportmonks response {resp.status_code}: {resp.text[:100]}")
                return []
            payload = resp.json()

        for item in payload.get("data", []):
            parts = item.get("participants", [])
            home_part = next((p for p in parts if (p.get("meta") or {}).get("location") == "home"), parts[0] if parts else {})
            away_part = next((p for p in parts if (p.get("meta") or {}).get("location") == "away"), parts[1] if len(parts) > 1 else {})

            home_name = home_part.get("name") or "Home"
            away_name = away_part.get("name") or "Away"
            home_short = home_part.get("short_code") or home_name
            away_short = away_part.get("short_code") or away_name
            home_crest = home_part.get("image_path") or ""
            away_crest = away_part.get("image_path") or ""

            league_obj = item.get("league") or {}
            league_name = league_obj.get("name", "League")
            country_name = "Scotland" if "Premiership" in league_name else ("Denmark" if "Superliga" in league_name else "")

            # Form ISO kickoff timestamp
            raw_start = item.get("starting_at")
            kickoff_iso = raw_start.replace(" ", "T") + "Z" if raw_start and "T" not in raw_start else (raw_start or "")

            home_xg, away_xg = estimate_expected_goals(home_name, away_name)

            fixtures.append({
                "id": f"sm-{item.get('id')}",
                "league": league_name,
                "competition_code": "SCO" if "Premiership" in league_name else ("DNK" if "Superliga" in league_name else "SM"),
                "country": country_name,
                "emblem": league_obj.get("image_path") or "",
                "home_team": home_name,
                "home_short": home_short,
                "home_crest": home_crest,
                "away_team": away_name,
                "away_short": away_short,
                "away_crest": away_crest,
                "kickoff": kickoff_iso,
                "status": "TIMED",
                "home_xg": home_xg,
                "away_xg": away_xg,
                "home_score": None,
                "away_score": None,
                "provider": "Sportmonks v3"
            })
    except Exception as e:
        logger.error(f"Error fetching Sportmonks matches: {e}")

    return fixtures


async def fetch_apisports_fixtures(days_ahead: int = 2) -> List[Dict[str, Any]]:
    """
    Fetches real-time fixtures from API-Sports (api-sports.io / API-Football v3).
    Respects rate limits by querying targeted dates with persistent caching.
    """
    if not settings.api_sports_key:
        return []

    fixtures = []
    headers = {"x-apisports-key": settings.api_sports_key}
    today = datetime.now(timezone.utc).date()

    PRIORITY_LEAGUE_KEYWORDS = [
        "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1",
        "Champions League", "Europa League", "Brasileiro", "Eredivisie",
        "Primeira Liga", "Championship", "Superliga", "Premiership", "FA Cup", "Copa"
    ]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for day_offset in range(min(days_ahead, 2)):
                target_date = (today + timedelta(days=day_offset)).strftime("%Y-%m-%d")
                cache_key = f"apisports_fixtures_{target_date}"
                cached = get_cached(cache_key)
                if cached:
                    fixtures.extend(cached)
                    continue

                url = f"{settings.api_sports_base_url}/fixtures?date={target_date}"
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    payload = resp.json()
                    day_fixtures = []
                    for item in payload.get("response", []):
                        league_info = item.get("league") or {}
                        league_name = league_info.get("name", "Unknown League")
                        country = league_info.get("country", "")

                        is_priority = any(k.lower() in league_name.lower() for k in PRIORITY_LEAGUE_KEYWORDS) or country in [
                            "England", "Spain", "Italy", "Germany", "France", "Brazil", "Netherlands", "Portugal", "World", "Europe"
                        ]

                        if not is_priority and len(day_fixtures) > 30:
                            continue

                        teams = item.get("teams") or {}
                        home = teams.get("home") or {}
                        away = teams.get("away") or {}
                        home_name = home.get("name", "Home Team")
                        away_name = away.get("name", "Away Team")
                        home_xg, away_xg = estimate_expected_goals(home_name, away_name)

                        fix_info = item.get("fixture") or {}
                        goals = item.get("goals") or {}

                        day_fixtures.append({
                            "id": f"api-{fix_info.get('id')}",
                            "league": league_name,
                            "competition_code": (country[:3] if country else "INT").upper(),
                            "country": country,
                            "emblem": league_info.get("logo", ""),
                            "home_team": home_name,
                            "home_short": home_name,
                            "home_crest": home.get("logo", ""),
                            "away_team": away_name,
                            "away_short": away_name,
                            "away_crest": away.get("logo", ""),
                            "kickoff": fix_info.get("date"),
                            "status": fix_info.get("status", {}).get("short", "TIMED"),
                            "home_xg": home_xg,
                            "away_xg": away_xg,
                            "home_score": goals.get("home"),
                            "away_score": goals.get("away"),
                            "provider": "api-sports.io"
                        })

                    set_cached(cache_key, day_fixtures, ttl_seconds=1800)
                    fixtures.extend(day_fixtures)
    except Exception as e:
        logger.error(f"Error fetching API-Sports matches: {e}")

    return fixtures


async def fetch_fixtures(force_refresh: bool = False) -> Tuple[List[Dict[str, Any]], str]:
    """
    Combines fixtures from configured football intelligence providers:
    1. API-Sports (api-sports.io v3) - Live official feed
    2. football-data.org v4 (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Brasileirão)
    3. Sportmonks v3 (Scottish Premiership, Danish Superliga, and advanced participant analytics)
    """
    cache_key = f"fixtures_multi_{settings.fixture_horizon_days}"
    if not force_refresh:
        cached = get_cached(cache_key)
        if cached:
            return cached, "Multi-Feed (API-Sports + Football-Data + Sportmonks) [cached]"

    # Fetch from providers concurrently
    api_matches = await fetch_apisports_fixtures(2)
    fd_matches = await fetch_football_data_fixtures(settings.fixture_horizon_days)
    sm_matches = await fetch_sportmonks_fixtures(settings.fixture_horizon_days + 3)

    # Deduplicate matches by fixture pairs (lowercase home and away)
    seen_pairs = set()
    combined = []

    for m in (api_matches + fd_matches + sm_matches):
        h = (m.get("home_team") or "").lower().strip()
        a = (m.get("away_team") or "").lower().strip()
        k = (m.get("kickoff") or "")[:10]
        pair_key = f"{h}_vs_{a}_{k}"
        if pair_key not in seen_pairs and h and a:
            seen_pairs.add(pair_key)
            combined.append(m)

    # Sort combined matches chronologically
    combined.sort(key=lambda m: m.get("kickoff") or "")

    sources = []
    if api_matches:
        sources.append("API-Sports v3")
    if fd_matches:
        sources.append("football-data.org v4")
    if sm_matches:
        sources.append("Sportmonks v3")

    source_label = " + ".join(sources) if sources else "demo"

    if combined:
        set_cached(cache_key, combined, ttl_seconds=settings.cache_ttl_seconds)
        return combined, source_label

    # Fallback to demo if both network endpoints fail
    stale = get_cached(cache_key)
    if stale:
        return stale, f"{source_label} (offline cache)"

    return get_demo_fixtures(), "demo"


def get_demo_fixtures() -> List[Dict[str, Any]]:
    """Curated realistic fixtures for offline mode or network fallback."""
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "demo-101",
            "league": "Premier League",
            "competition_code": "PL",
            "country": "England",
            "emblem": "https://crests.football-data.org/PL.png",
            "home_team": "Arsenal FC",
            "home_short": "Arsenal",
            "home_crest": "https://crests.football-data.org/57.png",
            "away_team": "Chelsea FC",
            "away_short": "Chelsea",
            "away_crest": "https://crests.football-data.org/61.png",
            "kickoff": (now + timedelta(days=1, hours=2)).isoformat(),
            "status": "TIMED",
            "home_xg": 2.05,
            "away_xg": 1.15,
            "home_score": None,
            "away_score": None,
            "provider": "demo"
        },
        {
            "id": "demo-102",
            "league": "La Liga",
            "competition_code": "PD",
            "country": "Spain",
            "emblem": "https://crests.football-data.org/PD.png",
            "home_team": "FC Barcelona",
            "home_short": "Barcelona",
            "home_crest": "https://crests.football-data.org/81.png",
            "away_team": "Real Madrid CF",
            "away_short": "Real Madrid",
            "away_crest": "https://crests.football-data.org/86.png",
            "kickoff": (now + timedelta(days=1, hours=5)).isoformat(),
            "status": "TIMED",
            "home_xg": 1.85,
            "away_xg": 1.80,
            "home_score": None,
            "away_score": None,
            "provider": "demo"
        },
        {
            "id": "demo-103",
            "league": "Premiership",
            "competition_code": "SCO",
            "country": "Scotland",
            "emblem": "https://cdn.sportmonks.com/images/soccer/leagues/501.png",
            "home_team": "Motherwell",
            "home_short": "Motherwell",
            "home_crest": "https://cdn.sportmonks.com/images/soccer/teams/12/300.png",
            "away_team": "Rangers",
            "away_short": "Rangers",
            "away_crest": "https://cdn.sportmonks.com/images/soccer/teams/2/66.png",
            "kickoff": (now + timedelta(days=2)).isoformat(),
            "status": "TIMED",
            "home_xg": 0.95,
            "away_xg": 2.10,
            "home_score": None,
            "away_score": None,
            "provider": "Sportmonks v3"
        }
    ]


async def fetch_standings(competition_code: str = "PL") -> Dict[str, Any]:
    """Fetches real-time league standings with caching."""
    code = competition_code.upper()
    cache_key = f"standings_{code}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    if not settings.football_data_token:
        return {"competition": code, "code": code, "table": []}

    headers = {"X-Auth-Token": settings.football_data_token}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{settings.football_data_base_url.rstrip('/')}/competitions/{code}/standings",
                headers=headers
            )
            resp.raise_for_status()
            payload = resp.json()

        competition = payload.get("competition", {})
        standings_data = payload.get("standings", [])
        table = []
        if standings_data:
            for row in standings_data[0].get("table", []):
                table.append({
                    "position": row.get("position"),
                    "team_name": row.get("team", {}).get("name"),
                    "team_short": row.get("team", {}).get("shortName") or row.get("team", {}).get("name"),
                    "crest": row.get("team", {}).get("crest", ""),
                    "played": row.get("playedGames", 0),
                    "won": row.get("won", 0),
                    "draw": row.get("draw", 0),
                    "lost": row.get("lost", 0),
                    "points": row.get("points", 0),
                    "goals_for": row.get("goalsFor", 0),
                    "goals_against": row.get("goalsAgainst", 0),
                    "goal_diff": row.get("goalDifference", 0),
                    "form": row.get("form") or ""
                })

        result = {
            "competition": competition.get("name", code),
            "code": code,
            "emblem": competition.get("emblem", ""),
            "season": (payload.get("season") or {}).get("currentMatchday", 1),
            "table": table
        }
        set_cached(cache_key, result, ttl_seconds=1800)
        return result
    except Exception as e:
        logger.error(f"Error fetching standings for {code}: {e}")
        return {"competition": code, "code": code, "table": [], "error": str(e)}


async def settle_completed_predictions() -> Dict[str, Any]:
    """Settles completed predictions against final results."""
    if not settings.football_data_token:
        return {"settled_new": 0, "message": "API token required for automated settlement."}

    today = datetime.now(timezone.utc).date()
    date_from = (today - timedelta(days=7)).isoformat()
    date_to = today.isoformat()

    headers = {"X-Auth-Token": settings.football_data_token}
    params = {"dateFrom": date_from, "dateTo": date_to, "status": "FINISHED"}

    settled_count = 0
    correct_count = 0

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.get(
                f"{settings.football_data_base_url.rstrip('/')}/matches",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            matches = resp.json().get("matches", [])

        with SessionLocal() as db:
            for m in matches:
                f_id = f"fd-{m.get('id')}"
                score = (m.get("score") or {}).get("fullTime") or {}
                h_score = score.get("home")
                a_score = score.get("away")

                if h_score is None or a_score is None:
                    continue

                pred = db.scalar(select(PredictionRecord).where(PredictionRecord.fixture_id == f_id))
                if not pred:
                    continue

                already = db.scalar(select(MatchSettlement).where(MatchSettlement.fixture_id == f_id))
                if already:
                    continue

                if h_score > a_score:
                    actual = "HOME"
                elif h_score == a_score:
                    actual = "DRAW"
                else:
                    actual = "AWAY"

                max_p = max(pred.home_win, pred.draw, pred.away_win)
                predicted = "HOME" if pred.home_win == max_p else ("DRAW" if pred.draw == max_p else "AWAY")
                is_correct = (actual == predicted)

                o_home = 1.0 if actual == "HOME" else 0.0
                o_draw = 1.0 if actual == "DRAW" else 0.0
                o_away = 1.0 if actual == "AWAY" else 0.0
                brier = (pred.home_win - o_home)**2 + (pred.draw - o_draw)**2 + (pred.away_win - o_away)**2

                settlement = MatchSettlement(
                    fixture_id=f_id,
                    home_team=pred.home_team,
                    away_team=pred.away_team,
                    actual_home_score=h_score,
                    actual_away_score=a_score,
                    actual_outcome=actual,
                    predicted_outcome=predicted,
                    is_correct=is_correct,
                    brier_score=round(brier, 4)
                )
                db.add(settlement)
                settled_count += 1
                if is_correct:
                    correct_count += 1

            db.commit()

        return {
            "settled_new": settled_count,
            "correct_new": correct_count,
            "message": f"Successfully settled {settled_count} newly finished fixtures."
        }
    except Exception as e:
        logger.error(f"Settlement error: {e}")
        return {"error": str(e), "settled_new": 0}
