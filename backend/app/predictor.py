"""GoalInsight Prediction Engine
Poisson probability distribution model with Dixon-Coles bivariate correlation adjustment.
Provides aligned outcome forecasts, un-biased goal expectation calculations,
and comprehensive betting market derivations.
"""
import math
from typing import Dict, Any, List, Tuple
from .consensus_engine import (
    calculate_20_site_consensus,
    compute_expanded_markets
)
from .ensemble import (
    calculate_elo_probabilities,
    calculate_form_momentum,
    run_monte_carlo_simulation,
    scan_ultra_banker_markets,
    calculate_kelly_criterion
)

def poisson_pmf(k: int, lam: float) -> float:
    """Calculates Poisson probability mass for k occurrences given mean lambda."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)

def calculate_american_odds(decimal_odds: float) -> str:
    """Converts fair decimal odds to American moneyline string format."""
    if decimal_odds <= 1.0:
        return "+100"
    if decimal_odds >= 2.0:
        val = int(round((decimal_odds - 1.0) * 100))
        return f"+{val}"
    else:
        val = int(round(100 / (decimal_odds - 1.0)))
        return f"-{val}"

def calculate_fractional_odds(decimal_odds: float) -> str:
    """Converts decimal odds to standard fractional odds string representation."""
    if decimal_odds <= 1.0:
        return "1/100"
    net = decimal_odds - 1.0
    common_denominators = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20]
    best_num, best_den, min_diff = 1, 1, 999.0
    for den in common_denominators:
        num = round(net * den)
        if num <= 0:
            num = 1
        diff = abs((num / den) - net)
        if diff < min_diff:
            min_diff = diff
            best_num = num
            best_den = den
    return f"{best_num}/{best_den}"

def forecast(
    home_xg: float,
    away_xg: float,
    max_goals: int = 8,
    rho: float = -0.04,
    home_team: str = "Home Team",
    away_team: str = "Away Team"
) -> Dict[str, Any]:
    """
    Computes comprehensive match probabilities based on home and away expected goals (xG).
    Includes Dixon-Coles bivariate low-score parameter rho to handle 0-0 and 1-1 dependencies,
    integrates dynamic Club Elo, Form Momentum, 5,000-iteration Monte Carlo simulation,
    and scans multi-market spaces for 90%+ Ultra-Safe Banker picks.
    """
    home_xg = max(0.1, min(float(home_xg), 6.0))
    away_xg = max(0.1, min(float(away_xg), 6.0))

    # Base independent Poisson vectors
    p_h = [poisson_pmf(i, home_xg) for i in range(max_goals + 1)]
    p_a = [poisson_pmf(j, away_xg) for j in range(max_goals + 1)]

    # Compute joint probability matrix with Dixon-Coles adjustment
    matrix = [[0.0] * (max_goals + 1) for _ in range(max_goals + 1)]
    scores: List[Dict[str, Any]] = []

    p_home = 0.0
    p_draw = 0.0
    p_away = 0.0
    p_btts = 0.0
    p_over_05 = 0.0
    p_over_15 = 0.0
    p_over_25 = 0.0
    p_over_35 = 0.0
    p_over_45 = 0.0
    p_home_cs = 0.0
    p_away_cs = 0.0

    home_win_scores: List[Dict[str, Any]] = []
    draw_scores: List[Dict[str, Any]] = []
    away_win_scores: List[Dict[str, Any]] = []

    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            prob = p_h[h] * p_a[a]

            # Dixon-Coles correction factor for low-scoring match outcomes
            if h == 0 and a == 0:
                tau = 1.0 - (home_xg * away_xg * rho)
            elif h == 0 and a == 1:
                tau = 1.0 + (home_xg * rho)
            elif h == 1 and a == 0:
                tau = 1.0 + (away_xg * rho)
            elif h == 1 and a == 1:
                tau = 1.0 - rho
            else:
                tau = 1.0

            prob = max(0.0, prob * tau)
            matrix[h][a] = prob
            score_entry = {"score": f"{h}-{a}", "h": h, "a": a, "probability": prob}
            scores.append(score_entry)

            if h > a:
                p_home += prob
                home_win_scores.append(score_entry)
            elif h == a:
                p_draw += prob
                draw_scores.append(score_entry)
            else:
                p_away += prob
                away_win_scores.append(score_entry)

            if h > 0 and a > 0:
                p_btts += prob

            tot_goals = h + a
            if tot_goals >= 1: p_over_05 += prob
            if tot_goals >= 2: p_over_15 += prob
            if tot_goals >= 3: p_over_25 += prob
            if tot_goals >= 4: p_over_35 += prob
            if tot_goals >= 5: p_over_45 += prob

            if a == 0: p_home_cs += prob
            if h == 0: p_away_cs += prob

    # Normalize total probability to 1.0
    total = p_home + p_draw + p_away
    if total <= 0:
        total = 1.0

    p_home = p_home / total
    p_draw = p_draw / total
    p_away = p_away / total
    p_btts = min(1.0, p_btts / total)
    p_over_05 = min(1.0, p_over_05 / total)
    p_over_15 = min(1.0, p_over_15 / total)
    p_over_25 = min(1.0, p_over_25 / total)
    p_over_35 = min(1.0, p_over_35 / total)
    p_over_45 = min(1.0, p_over_45 / total)
    p_under_25 = max(0.0, 1.0 - p_over_25)
    p_under_15 = max(0.0, 1.0 - p_over_15)
    p_under_35 = max(0.0, 1.0 - p_over_35)
    p_btts_no = max(0.0, 1.0 - p_btts)

    # Double chance
    p_dc_1x = min(1.0, p_home + p_draw)
    p_dc_12 = min(1.0, p_home + p_away)
    p_dc_x2 = min(1.0, p_draw + p_away)

    # Half-time forecast estimate (~45% of total goals in 1st half)
    ht_h_xg = home_xg * 0.44
    ht_a_xg = away_xg * 0.44
    ht_home = ht_draw = ht_away = 0.0
    for h in range(5):
        for a in range(5):
            prob = poisson_pmf(h, ht_h_xg) * poisson_pmf(a, ht_a_xg)
            if h > a: ht_home += prob
            elif h == a: ht_draw += prob
            else: ht_away += prob
    ht_tot = ht_home + ht_draw + ht_away or 1.0
    ht_home /= ht_tot
    ht_draw /= ht_tot
    ht_away /= ht_tot

    # Sort scoreline subsets
    scores.sort(key=lambda s: s["probability"], reverse=True)
    home_win_scores.sort(key=lambda s: s["probability"], reverse=True)
    draw_scores.sort(key=lambda s: s["probability"], reverse=True)
    away_win_scores.sort(key=lambda s: s["probability"], reverse=True)

    top_scores = [
        {"score": s["score"], "probability": round(s["probability"] / total, 4)}
        for s in scores[:6]
    ]

    # Best scoreline per category
    best_home_score = home_win_scores[0]["score"] if home_win_scores else "1-0"
    best_draw_score = draw_scores[0]["score"] if draw_scores else "1-1"
    best_away_score = away_win_scores[0]["score"] if away_win_scores else "0-1"

    # 20-Site Global Prediction Consensus & Multi-Market Modeling
    consensus_data = calculate_20_site_consensus(
        home_team=home_team,
        away_team=away_team,
        home_xg=home_xg,
        away_xg=away_xg,
        p_home_poisson=p_home,
        p_draw_poisson=p_draw,
        p_away_poisson=p_away
    )
    expanded_markets = compute_expanded_markets(
        home_team=home_team,
        away_team=away_team,
        home_xg=home_xg,
        away_xg=away_xg,
        p_home=p_home,
        p_draw=p_draw,
        p_away=p_away
    )

    # Informed Meta-Decision (Dixon-Coles + 20-Site Consensus)
    c_home_pct = consensus_data["vote_percentages"]["home"] / 100.0
    c_draw_pct = consensus_data["vote_percentages"]["draw"] / 100.0
    c_away_pct = consensus_data["vote_percentages"]["away"] / 100.0

    meta_home = (p_home * 0.50) + (c_home_pct * 0.50)
    meta_draw = (p_draw * 0.50) + (c_draw_pct * 0.50)
    meta_away = (p_away * 0.50) + (c_away_pct * 0.50)

    # Determine Favored Outcome with unbiased thresholding
    if meta_home > meta_away and meta_home > meta_draw and (meta_home >= 0.44 or meta_home >= meta_away + 0.05):
        favored = "Home Win"
        top_c_score = consensus_data["consensus_top_score"]
        if "-" in top_c_score:
            parts = top_c_score.split("-")
            most_likely_score = top_c_score if int(parts[0]) > int(parts[1]) else best_home_score
        else:
            most_likely_score = best_home_score
        confidence = "High Confidence" if meta_home >= 0.60 else "Moderate Edge"

    elif meta_away > meta_home and meta_away > meta_draw and (meta_away >= 0.42 or meta_away >= meta_home + 0.05):
        favored = "Away Win"
        top_c_score = consensus_data["consensus_top_score"]
        if "-" in top_c_score:
            parts = top_c_score.split("-")
            most_likely_score = top_c_score if int(parts[1]) > int(parts[0]) else best_away_score
        else:
            most_likely_score = best_away_score
        confidence = "High Confidence" if meta_away >= 0.54 else "Moderate Edge"

    else:
        favored = "Balanced / Draw Edge"
        most_likely_score = "0-0" if (home_xg + away_xg) < 1.6 else ("2-2" if (home_xg + away_xg) > 3.2 else "1-1")
        confidence = "Balanced Contest"

    # Generate 5x5 score heatmap matrix (0-0 to 4-4)
    matrix_5x5 = []
    for h in range(5):
        row = []
        for a in range(5):
            row.append(round(matrix[h][a] / total, 4))
        matrix_5x5.append(row)

    # Odds calculations
    odds_home = round(1.0 / max(0.01, p_home), 2)
    odds_draw = round(1.0 / max(0.01, p_draw), 2)
    odds_away = round(1.0 / max(0.01, p_away), 2)
    odds_over25 = round(1.0 / max(0.01, p_over_25), 2)
    odds_under25 = round(1.0 / max(0.01, p_under_25), 2)
    odds_btts = round(1.0 / max(0.01, p_btts), 2)

    # 4-Model Ensemble & 90%+ Ultra-Safe Banker Market Scanning
    elo_data = calculate_elo_probabilities(home_team, away_team)
    form_data = calculate_form_momentum(home_team, away_team, home_xg, away_xg)
    mc_data = run_monte_carlo_simulation(home_xg, away_xg, iterations=5000)

    base_dixon_summary = {
        "home_win": p_home,
        "draw": p_draw,
        "away_win": p_away,
        "over_0_5": p_over_05,
        "over_1_5": p_over_15,
        "under_3_5": p_under_35,
        "over_4_5": p_over_45,
        "clean_sheet": {
            "home": p_home_cs / total,
            "away": p_away_cs / total
        }
    }

    banker_data = scan_ultra_banker_markets(
        home_team=home_team,
        away_team=away_team,
        dixon_probs=base_dixon_summary,
        elo_probs=elo_data,
        monte_carlo=mc_data
    )

    return {
        "home_win": round(p_home, 4),
        "draw": round(p_draw, 4),
        "away_win": round(p_away, 4),
        "expected_home_goals": round(home_xg, 2),
        "expected_away_goals": round(away_xg, 2),
        "over_0_5": round(p_over_05, 4),
        "over_1_5": round(p_over_15, 4),
        "over_2_5": round(p_over_25, 4),
        "under_2_5": round(p_under_25, 4),
        "under_1_5": round(p_under_15, 4),
        "over_3_5": round(p_over_35, 4),
        "under_3_5": round(p_under_35, 4),
        "over_4_5": round(p_over_45, 4),
        "btts_yes": round(p_btts, 4),
        "btts_no": round(p_btts_no, 4),
        "clean_sheet": {
            "home": round(p_home_cs / total, 4),
            "away": round(p_away_cs / total, 4)
        },
        "half_time": {
            "home": round(ht_home, 4),
            "draw": round(ht_draw, 4),
            "away": round(ht_away, 4)
        },
        "double_chance": {
            "1X": round(p_dc_1x, 4),
            "12": round(p_dc_12, 4),
            "X2": round(p_dc_x2, 4)
        },
        "favored_outcome": favored,
        "most_likely_score": most_likely_score,
        "category_scores": {
            "home_win": best_home_score,
            "draw": best_draw_score,
            "away_win": best_away_score
        },
        "top_scorelines": top_scores,
        "score_matrix": matrix_5x5,
        "fair_odds": {
            "home": odds_home,
            "draw": odds_draw,
            "away": odds_away,
            "over_2_5": odds_over25,
            "under_2_5": odds_under25,
            "btts": odds_btts,
            "american": {
                "home": calculate_american_odds(odds_home),
                "draw": calculate_american_odds(odds_draw),
                "away": calculate_american_odds(odds_away),
            },
            "fractional": {
                "home": calculate_fractional_odds(odds_home),
                "draw": calculate_fractional_odds(odds_draw),
                "away": calculate_fractional_odds(odds_away),
            }
        },
        "confidence": confidence,
        "ensemble_consensus": {
            "dixon_coles": {"home": round(p_home, 4), "draw": round(p_draw, 4), "away": round(p_away, 4)},
            "elo_model": elo_data,
            "form_momentum": form_data,
            "monte_carlo_5k": {
                "simulated_home_win": mc_data["simulated_home_win"],
                "simulated_draw": mc_data["simulated_draw"],
                "simulated_away_win": mc_data["simulated_away_win"],
                "average_simulated_goals": mc_data["average_simulated_goals"],
                "iterations": mc_data["iterations"]
            },
            "consensus_1x2": banker_data["ensemble_1x2"]
        },
        "banker_analysis": banker_data,
        "best_banker": banker_data["best_banker"],
        "consensus_20_sites": consensus_data,
        "expanded_markets": expanded_markets,
        "monte_carlo": mc_data,
        "kelly_criterion": banker_data["best_banker"]["kelly_staking"],
        "method": "4-Model Multi-Algorithmic Ensemble (Dixon-Coles + Dynamic Elo + Form EMA + 5,000-Match Monte Carlo)"
    }
