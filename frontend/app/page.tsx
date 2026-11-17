'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Info,
  Layers,
  Percent,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Table,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
  XCircle,
  Zap
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type OddsFormat = 'decimal' | 'american' | 'percent' | 'fractional';

interface TopScoreline {
  score: string;
  probability: number;
}

interface FairOdds {
  home: number;
  draw: number;
  away: number;
  over_2_5?: number;
  under_2_5?: number;
  btts?: number;
  american?: {
    home: string;
    draw: string;
    away: string;
  };
  fractional?: {
    home: string;
    draw: string;
    away: string;
  };
}

interface PredictionData {
  home_win: number;
  draw: number;
  away_win: number;
  expected_home_goals: number;
  expected_away_goals: number;
  over_0_5?: number;
  over_1_5?: number;
  over_2_5?: number;
  under_2_5?: number;
  under_1_5?: number;
  over_3_5?: number;
  under_3_5?: number;
  over_4_5?: number;
  btts_yes?: number;
  btts_no?: number;
  clean_sheet?: {
    home: number;
    away: number;
  };
  half_time?: {
    home: number;
    draw: number;
    away: number;
  };
  double_chance?: {
    '1X': number;
    '12': number;
    'X2': number;
  };
  favored_outcome: string;
  most_likely_score: string;
  category_scores?: {
    home_win: string;
    draw: string;
    away_win: string;
  };
  top_scorelines?: TopScoreline[];
  score_matrix?: number[][];
  fair_odds: FairOdds;
  confidence: string;
  method: string;
  best_banker?: BestBanker;
  banker_analysis?: BankerAnalysis;
  monte_carlo?: MonteCarloData;
  ensemble_consensus?: EnsembleConsensus;
  kelly_criterion?: KellyStaking;
}

interface BankerOption {
  market: string;
  market_code: string;
  selection: string;
  probability: number;
  fair_odds: number;
  rationale: string;
  probability_percent: number;
  is_90_plus?: boolean;
  is_85_plus?: boolean;
}

interface KellyStaking {
  full_kelly_percent: number;
  recommended_stake_percent: number;
  edge_percent: number;
  is_positive_ev: boolean;
}

interface BestBanker {
  market: string;
  market_code: string;
  selection: string;
  probability: number;
  probability_percent: number;
  fair_odds: number;
  confidence_tier: string;
  star_rating: number;
  is_ultra_banker: boolean;
  rationale: string;
  kelly_staking?: KellyStaking;
}

interface BankerAnalysis {
  best_banker: BestBanker;
  all_banker_options: BankerOption[];
  ensemble_1x2: { home_win: number; draw: number; away_win: number };
}

interface MonteCarloData {
  iterations: number;
  simulated_home_win: number;
  simulated_draw: number;
  simulated_away_win: number;
  simulated_over_0_5: number;
  simulated_over_1_5: number;
  simulated_over_2_5: number;
  simulated_under_3_5: number;
  simulated_under_4_5: number;
  simulated_btts: number;
  clean_sheets: { home: number; away: number };
  average_simulated_goals: number;
  top_simulated_scorelines: Array<{ score: string; frequency: number }>;
}

interface EnsembleConsensus {
  dixon_coles: { home: number; draw: number; away: number };
  elo_model: {
    home_win: number;
    draw: number;
    away_win: number;
    home_elo: number;
    away_elo: number;
    elo_diff: number;
  };
  form_momentum: {
    home_momentum: number;
    away_momentum: number;
    tendency: string;
    form_probabilities: { home_win: number; draw: number; away_win: number };
  };
  monte_carlo_5k: {
    simulated_home_win: number;
    simulated_draw: number;
    simulated_away_win: number;
    average_simulated_goals: number;
    iterations: number;
  };
  consensus_1x2: { home_win: number; draw: number; away_win: number };
}

interface MatchItem {
  id: string;
  league: string;
  competition_code?: string;
  country: string;
  emblem?: string;
  home_team: string;
  home_short?: string;
  home_crest?: string;
  away_team: string;
  away_short?: string;
  away_crest?: string;
  kickoff: string;
  status: string;
  home_xg: number;
  away_xg: number;
  home_score?: number | null;
  away_score?: number | null;
  matchday?: number;
  provider?: string;
  prediction: PredictionData;
  best_banker?: BestBanker;
  banker_analysis?: BankerAnalysis;
  ensemble_consensus?: EnsembleConsensus;
}

interface SettlementItem {
  fixture_id: string;
  home_team: string;
  away_team: string;
  actual_score: string;
  actual_outcome: string;
  predicted_outcome: string;
  is_correct: boolean;
  brier_score: number;
}

interface StatsOverview {
  published_predictions: number;
  settled_predictions: number;
  correct_predictions: number;
  accuracy_percent: number | null;
  mean_brier_score: number | null;
  recent_settlements: SettlementItem[];
}

interface StandingsRow {
  position: number;
  team_name: string;
  team_short: string;
  crest: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  form: string;
}

interface StandingsData {
  competition: string;
  code: string;
  emblem?: string;
  season?: number;
  table: StandingsRow[];
}

interface BetLeg {
  id: string;
  matchId: string;
  matchTitle: string;
  pickName: string;
  market: string;
  prob: number;
  odds: number;
}

function formatPercent(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  return `${Math.round(val * 100)}%`;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function getDayHeader(dateKey: string): string {
  try {
    const [year, month, day] = dateKey.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return `Today, ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateKey;
  }
}

function getRelativeTime(isoStr: string): string {
  try {
    const diff = new Date(isoStr).getTime() - Date.now();
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (hours < 0) return 'Kickoff passed';
    if (hours < 24) return `in ${hours}h`;
    const days = Math.round(hours / 24);
    return `in ${days}d`;
  } catch {
    return '';
  }
}

export default function Home() {
  // Navigation & Odds format
  const [activeTab, setActiveTab] = useState<'matches' | 'simulator' | 'standings' | 'settlement' | 'methodology'>('matches');
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('decimal');

  // Match Centre State
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [source, setSource] = useState<string>('loading');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishMessage, setPublishMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Filters
  const [selectedLeague, setSelectedLeague] = useState<string>('All');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'kickoff' | 'homeProb' | 'awayProb' | 'totalGoals' | 'bankerProb'>('kickoff');
  const [showExhibitionsForEmpty, setShowExhibitionsForEmpty] = useState<boolean>(false);

  // 90%+ Banker & Ensemble State
  const [bankerModeOnly, setBankerModeOnly] = useState<boolean>(false);
  const [dailyBankerSlip, setDailyBankerSlip] = useState<any | null>(null);
  const [loadingBankerSlip, setLoadingBankerSlip] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'overview' | 'banker' | 'ensemble' | 'monte_carlo' | 'heatmap'>('overview');
  const [modalBankroll, setModalBankroll] = useState<number>(1000);

  // Deep-Dive Modal State
  const [selectedMatchModal, setSelectedMatchModal] = useState<MatchItem | null>(null);

  // Accumulator / Bet Slip State
  const [slipLegs, setSlipLegs] = useState<BetLeg[]>([]);
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);
  const [stakeAmount, setStakeAmount] = useState<number>(20);
  const [slipCopied, setSlipCopied] = useState<boolean>(false);

  // Simulator State
  const [simHome, setSimHome] = useState<string>('Arsenal FC');
  const [simAway, setSimAway] = useState<string>('Chelsea FC');
  const [simHomeXg, setSimHomeXg] = useState<number>(1.95);
  const [simAwayXg, setSimAwayXg] = useState<number>(1.15);
  const [simResult, setSimResult] = useState<PredictionData | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // Standings State
  const [selectedStandingsCode, setSelectedStandingsCode] = useState<string>('PL');
  const [standingsData, setStandingsData] = useState<StandingsData | null>(null);
  const [standingsLoading, setStandingsLoading] = useState<boolean>(false);

  // Settlement & Stats State
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [settling, setSettling] = useState<boolean>(false);
  const [settleMessage, setSettleMessage] = useState<string>('');

  // Fetch initial predictions
  const fetchPredictionsData = async (force: boolean = false) => {
    try {
      if (force) setSyncing(true);
      else setLoading(true);

      const url = `${API_BASE}/api/predictions${force ? '?force_refresh=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load predictions`);
      const data = await res.json();
      setMatches(data.predictions || []);
      setSource(data.source || 'unknown');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not connect to GoalInsight backend API.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Fetch standings for a competition
  const fetchStandingsData = async (code: string) => {
    try {
      setStandingsLoading(true);
      const res = await fetch(`${API_BASE}/api/standings/${code}`);
      if (res.ok) {
        const data = await res.json();
        setStandingsData(data);
      }
    } catch (err) {
      console.warn('Standings fetch error:', err);
    } finally {
      setStandingsLoading(false);
    }
  };

  // Fetch stats overview
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats/overview`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Stats fetch error:', err);
    }
  };

  // Run custom simulation
  const runSimulator = async () => {
    try {
      setSimLoading(true);
      const res = await fetch(`${API_BASE}/api/predictions/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: simHome,
          away_team: simAway,
          home_xg: simHomeXg,
          away_xg: simAwayXg,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data.prediction);
      }
    } catch (e) {
      console.error('Simulator error:', e);
    } finally {
      setSimLoading(false);
    }
  };

  // Publish / Snapshot predictions
  const handlePublishSnapshots = async () => {
    try {
      setPublishing(true);
      setPublishMessage('');
      const res = await fetch(`${API_BASE}/api/predictions/publish`, { method: 'POST' });
      const data = await res.json();
      setPublishMessage(data.message || 'Snapshots locked successfully.');
      fetchStats();
      setTimeout(() => setPublishMessage(''), 6000);
    } catch (err: any) {
      setPublishMessage(`Error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  // Trigger result settlement
  const handleSettleMatches = async () => {
    try {
      setSettling(true);
      setSettleMessage('');
      const res = await fetch(`${API_BASE}/api/predictions/settle`, { method: 'POST' });
      const data = await res.json();
      setSettleMessage(data.message || 'Settlement completed.');
      fetchStats();
      setTimeout(() => setSettleMessage(''), 6000);
    } catch (err: any) {
      setSettleMessage(`Settlement error: ${err.message}`);
    } finally {
      setSettling(false);
    }
  };

  // Fetch daily 90%+ Super Banker Treble Slip
  const fetchDailyBankerSlip = async () => {
    try {
      setLoadingBankerSlip(true);
      const res = await fetch(`${API_BASE}/api/predictions/banker-slip?legs=3`);
      if (res.ok) {
        const data = await res.json();
        setDailyBankerSlip(data);
      }
    } catch (err) {
      console.warn('Banker slip fetch error:', err);
    } finally {
      setLoadingBankerSlip(false);
    }
  };

  // Add individual Banker pick to accumulator slip
  const addBankerToSlip = (match: MatchItem, customOption?: BankerOption) => {
    const banker = customOption || match.best_banker || match.prediction?.best_banker;
    if (!banker) return;
    const legId = `${match.id}-${banker.market_code || 'banker'}`;
    const exists = slipLegs.some((l) => l.id === legId);
    if (exists) {
      setSlipLegs((prev) => prev.filter((l) => l.id !== legId));
    } else {
      const leg: BetLeg = {
        id: legId,
        matchId: match.id,
        matchTitle: `${match.home_team} vs ${match.away_team}`,
        pickName: banker.selection,
        market: banker.market,
        prob: banker.probability,
        odds: banker.fair_odds,
      };
      setSlipLegs((prev) => [...prev, leg]);
      setIsSlipOpen(true);
    }
  };

  // 1-Click load entire daily 90%+ Treble into Bet Slip
  const loadDailyBankerSlipToBetSlip = () => {
    if (!dailyBankerSlip || !dailyBankerSlip.legs) return;
    const newLegs: BetLeg[] = dailyBankerSlip.legs.map((leg: any) => ({
      id: `${leg.match_id}-${leg.market_code}`,
      matchId: String(leg.match_id),
      matchTitle: leg.fixture,
      pickName: leg.selection,
      market: leg.market,
      prob: (leg.win_probability || 90.0) / 100.0,
      odds: leg.fair_odds,
    }));
    setSlipLegs(newLegs);
    setIsSlipOpen(true);
  };

  useEffect(() => {
    fetchPredictionsData();
    fetchStats();
    fetchDailyBankerSlip();
    runSimulator();
    fetchStandingsData('PL');
  }, []);

  // Compute Dates and Counts dynamically from matches
  const { dateCounts, uniqueDates, todayKey, tomorrowKey } = useMemo(() => {
    const counts: Record<string, number> = {};
    matches.forEach((m) => {
      const key = m.kickoff ? m.kickoff.substring(0, 10) : '';
      if (key) counts[key] = (counts[key] || 0) + 1;
    });

    const dates = Object.keys(counts).sort();

    const t = new Date();
    const tKey = t.toISOString().substring(0, 10);
    const tm = new Date();
    tm.setDate(t.getDate() + 1);
    const tmKey = tm.toISOString().substring(0, 10);

    return {
      dateCounts: counts,
      uniqueDates: dates,
      todayKey: tKey,
      tomorrowKey: tmKey,
    };
  }, [matches]);

  // Unique leagues list
  const uniqueLeagues = useMemo(() => {
    const list = Array.from(new Set(matches.map((m) => m.league))).filter(Boolean);
    return ['All', ...list.sort()];
  }, [matches]);

  // Curated Exhibition / Derby preview matches for tomorrow / empty days
  const exhibitionDerbies: MatchItem[] = useMemo(() => {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    tm.setHours(19, 45, 0, 0);

    return [
      {
        id: 'exhibit-1',
        league: 'Premier League',
        competition_code: 'PL',
        country: 'England',
        emblem: 'https://crests.football-data.org/PL.png',
        home_team: 'Arsenal FC',
        home_short: 'Arsenal',
        home_crest: 'https://crests.football-data.org/57.png',
        away_team: 'Chelsea FC',
        away_short: 'Chelsea',
        away_crest: 'https://crests.football-data.org/61.png',
        kickoff: tm.toISOString(),
        status: 'SCHEDULED',
        home_xg: 1.95,
        away_xg: 1.15,
        prediction: {
          home_win: 0.584,
          draw: 0.228,
          away_win: 0.188,
          expected_home_goals: 1.95,
          expected_away_goals: 1.15,
          over_1_5: 0.812,
          over_2_5: 0.592,
          under_2_5: 0.408,
          over_3_5: 0.354,
          btts_yes: 0.564,
          btts_no: 0.436,
          double_chance: { '1X': 0.812, '12': 0.772, 'X2': 0.416 },
          favored_outcome: 'Home Win',
          most_likely_score: '2-1',
          top_scorelines: [
            { score: '2-1', probability: 0.108 },
            { score: '2-0', probability: 0.098 },
            { score: '1-0', probability: 0.089 },
            { score: '1-1', probability: 0.102 },
            { score: '3-1', probability: 0.076 },
          ],
          fair_odds: {
            home: 1.71,
            draw: 4.39,
            away: 5.32,
            american: { home: '-141', draw: '+339', away: '+432' },
            fractional: { home: '7/10', draw: '17/5', away: '17/4' },
          },
          confidence: 'Moderate Edge',
          method: 'Poisson & Dixon-Coles Bivariate Model',
        },
      },
      {
        id: 'exhibit-2',
        league: 'La Liga',
        competition_code: 'PD',
        country: 'Spain',
        emblem: 'https://crests.football-data.org/PD.png',
        home_team: 'FC Barcelona',
        home_short: 'Barcelona',
        home_crest: 'https://crests.football-data.org/81.png',
        away_team: 'Real Madrid CF',
        away_short: 'Real Madrid',
        away_crest: 'https://crests.football-data.org/86.png',
        kickoff: tm.toISOString(),
        status: 'SCHEDULED',
        home_xg: 1.85,
        away_xg: 1.75,
        prediction: {
          home_win: 0.432,
          draw: 0.231,
          away_win: 0.337,
          expected_home_goals: 1.85,
          expected_away_goals: 1.75,
          over_1_5: 0.865,
          over_2_5: 0.678,
          under_2_5: 0.322,
          over_3_5: 0.452,
          btts_yes: 0.684,
          btts_no: 0.316,
          double_chance: { '1X': 0.663, '12': 0.769, 'X2': 0.568 },
          favored_outcome: 'Home Win',
          most_likely_score: '2-1',
          top_scorelines: [
            { score: '2-1', probability: 0.089 },
            { score: '2-2', probability: 0.095 },
            { score: '1-2', probability: 0.082 },
            { score: '1-1', probability: 0.078 },
            { score: '3-2', probability: 0.065 },
          ],
          fair_odds: {
            home: 2.31,
            draw: 4.33,
            away: 2.97,
            american: { home: '+131', draw: '+333', away: '+197' },
            fractional: { home: '13/10', draw: '10/3', away: '2/1' },
          },
          confidence: 'Balanced Contest',
          method: 'Poisson & Dixon-Coles Bivariate Model',
        },
      },
    ];
  }, []);

  // Filter matches based on user selections
  const filteredMatches = useMemo(() => {
    let pool = matches;

    // If tomorrow or empty day is selected and user toggled exhibition derbies
    if (
      showExhibitionsForEmpty &&
      (selectedDateFilter === 'tomorrow' || selectedDateFilter === tomorrowKey) &&
      (dateCounts[tomorrowKey] || 0) === 0
    ) {
      pool = exhibitionDerbies;
    }

    let result = pool.filter((m) => {
      // League filter
      if (selectedLeague !== 'All' && m.league !== selectedLeague) return false;

      // Provider filter
      if (selectedProvider !== 'All') {
        if (selectedProvider === 'football-data.org' && m.provider !== 'football-data.org') return false;
        if (selectedProvider === 'Sportmonks v3' && m.provider !== 'Sportmonks v3') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const homeMatch = m.home_team.toLowerCase().includes(q);
        const awayMatch = m.away_team.toLowerCase().includes(q);
        const leagueMatch = m.league.toLowerCase().includes(q);
        if (!homeMatch && !awayMatch && !leagueMatch) return false;
      }

      // Date filter
      if (selectedDateFilter !== 'all') {
        const matchDayKey = m.kickoff ? m.kickoff.substring(0, 10) : '';
        if (selectedDateFilter === 'today') {
          if (matchDayKey !== todayKey) return false;
        } else if (selectedDateFilter === 'tomorrow') {
          if (matchDayKey !== tomorrowKey) return false;
        } else if (selectedDateFilter === 'weekend') {
          const d = new Date(m.kickoff);
          const day = d.getDay(); // 6=Sat, 0=Sun
          if (day !== 6 && day !== 0) return false;
        } else {
          if (matchDayKey !== selectedDateFilter) return false;
        }
      }

      // 90%+ Banker Mode Filter
      if (bankerModeOnly) {
        const bb = m.best_banker || m.prediction?.best_banker;
        const p = bb?.probability ?? 0;
        if (p < 0.86) return false;
      }

      // Market radar filter
      if (marketFilter === 'banker_90') {
        const bb = m.best_banker || m.prediction?.best_banker;
        if ((bb?.probability || 0) < 0.88) return false;
      } else if (marketFilter === 'high_home') {
        if ((m.prediction?.home_win || 0) < 0.55) return false;
      } else if (marketFilter === 'high_away') {
        if ((m.prediction?.away_win || 0) < 0.45) return false;
      } else if (marketFilter === 'over_25') {
        if ((m.prediction?.over_2_5 || 0) < 0.58) return false;
      } else if (marketFilter === 'under_25') {
        if ((m.prediction?.under_2_5 || 0) < 0.52) return false;
      } else if (marketFilter === 'btts') {
        if ((m.prediction?.btts_yes || 0) < 0.55) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'bankerProb' || (bankerModeOnly && sortBy === 'kickoff')) {
        const pA = a.best_banker?.probability || a.prediction?.best_banker?.probability || 0;
        const pB = b.best_banker?.probability || b.prediction?.best_banker?.probability || 0;
        if (pB !== pA) return pB - pA;
      }
      if (sortBy === 'homeProb') {
        return (b.prediction?.home_win || 0) - (a.prediction?.home_win || 0);
      }
      if (sortBy === 'awayProb') {
        return (b.prediction?.away_win || 0) - (a.prediction?.away_win || 0);
      }
      if (sortBy === 'totalGoals') {
        const totA = (a.home_xg || 0) + (a.away_xg || 0);
        const totB = (b.home_xg || 0) + (b.away_xg || 0);
        return totB - totA;
      }
      return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
    });

    return result;
  }, [
    matches,
    selectedLeague,
    selectedProvider,
    searchQuery,
    selectedDateFilter,
    marketFilter,
    sortBy,
    bankerModeOnly,
    showExhibitionsForEmpty,
    todayKey,
    tomorrowKey,
    dateCounts,
    exhibitionDerbies,
  ]);

  // Group filtered matches by Date for structured headers
  const groupedMatches = useMemo(() => {
    const groups: Record<string, MatchItem[]> = {};
    filteredMatches.forEach((m) => {
      const key = m.kickoff ? m.kickoff.substring(0, 10) : 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [filteredMatches]);

  // Display Odds formatter helper
  const renderOdds = (decimalOdds?: number, prob?: number, americanOdds?: string, fractionalOdds?: string) => {
    if (!decimalOdds || isNaN(decimalOdds)) return '-';
    if (oddsFormat === 'percent') return formatPercent(prob);
    if (oddsFormat === 'american') return americanOdds || (decimalOdds >= 2 ? `+${Math.round((decimalOdds - 1) * 100)}` : `-${Math.round(100 / (decimalOdds - 1))}`);
    if (oddsFormat === 'fractional') return fractionalOdds || `${decimalOdds.toFixed(2)}`;
    return decimalOdds.toFixed(2);
  };

  // Add Leg to Accumulator
  const addToSlip = (match: MatchItem, pickType: 'home' | 'draw' | 'away' | 'over_25' | 'btts') => {
    const p = match.prediction;
    let pickName = '';
    let prob = 0;
    let odds = 0;
    let market = '1X2';

    if (pickType === 'home') {
      pickName = `${match.home_short || match.home_team} to Win`;
      prob = p.home_win;
      odds = p.fair_odds.home;
    } else if (pickType === 'draw') {
      pickName = 'Draw';
      prob = p.draw;
      odds = p.fair_odds.draw;
    } else if (pickType === 'away') {
      pickName = `${match.away_short || match.away_team} to Win`;
      prob = p.away_win;
      odds = p.fair_odds.away;
    } else if (pickType === 'over_25') {
      pickName = 'Over 2.5 Goals';
      market = 'Totals';
      prob = p.over_2_5 || 0.5;
      odds = p.fair_odds.over_2_5 || 1.85;
    } else if (pickType === 'btts') {
      pickName = 'Both Teams To Score';
      market = 'BTTS';
      prob = p.btts_yes || 0.5;
      odds = p.fair_odds.btts || 1.85;
    }

    const legId = `${match.id}-${pickType}`;
    if (slipLegs.some((l) => l.id === legId)) {
      setSlipLegs(slipLegs.filter((l) => l.id !== legId));
    } else {
      setSlipLegs([
        ...slipLegs,
        {
          id: legId,
          matchId: match.id,
          matchTitle: `${match.home_short || match.home_team} vs ${match.away_short || match.away_team}`,
          pickName,
          market,
          prob,
          odds,
        },
      ]);
      setIsSlipOpen(true);
    }
  };

  // Combined Accumulator calculations
  const accumulatorSummary = useMemo(() => {
    if (slipLegs.length === 0) return { combinedOdds: 1.0, jointProb: 1.0, payout: 0 };
    const combinedOdds = slipLegs.reduce((acc, leg) => acc * leg.odds, 1.0);
    const jointProb = slipLegs.reduce((acc, leg) => acc * leg.prob, 1.0);
    const payout = stakeAmount * combinedOdds;
    return {
      combinedOdds: round2(combinedOdds),
      jointProb,
      payout: round2(payout),
    };
  }, [slipLegs, stakeAmount]);

  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  // Copy bet slip to clipboard
  const handleCopySlip = () => {
    const text = slipLegs
      .map((l) => `• ${l.matchTitle}: ${l.pickName} @ ${l.odds}`)
      .join('\n');
    const full = `GoalInsight Accumulator Slip (${slipLegs.length} Legs):\n${text}\nTotal Odds: ${accumulatorSummary.combinedOdds} | Est. Return: $${accumulatorSummary.payout} on $${stakeAmount} stake.`;
    navigator.clipboard.writeText(full);
    setSlipCopied(true);
    setTimeout(() => setSlipCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#edf5ef]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#1c2e24] bg-[#0b1410]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#16a34a] to-[#b7f36b] text-[#0b1410] shadow-lg shadow-[#b7f36b]/15">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight">
                GOAL<span className="text-[#b7f36b]">INSIGHT</span>
              </div>
              <div className="text-[10px] font-semibold tracking-widest text-[#728f80]">
                DUAL-ENGINE FOOTBALL INTELLIGENCE PLATFORM
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { id: 'matches', label: 'Match Centre', icon: Compass },
              { id: 'standings', label: 'League Tables', icon: Table },
              { id: 'simulator', label: 'Custom Simulator', icon: Sliders },
              { id: 'settlement', label: 'Track Record', icon: Trophy },
              { id: 'methodology', label: 'Methodology', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#182a20] text-[#b7f36b] shadow-sm'
                      : 'text-[#8ea397] hover:bg-[#121f18] hover:text-[#edf5ef]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Odds Format Switcher & Dual API Status */}
          <div className="flex items-center gap-2.5">
            {/* Odds Format Selector */}
            <div className="hidden items-center rounded-lg border border-[#1e3427] bg-[#0e1913] p-0.5 sm:flex">
              {(['decimal', 'american', 'percent', 'fractional'] as OddsFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOddsFormat(fmt)}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase transition-all ${
                    oddsFormat === fmt
                      ? 'bg-[#b7f36b] text-[#0b1410]'
                      : 'text-[#728f80] hover:text-[#edf5ef]'
                  }`}
                >
                  {fmt === 'fractional' ? 'FRAC' : fmt.substring(0, 3)}
                </button>
              ))}
            </div>

            {/* Dual Provider Status Badges */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="pill text-[10px] font-bold border-[#22c55e]/40 bg-[#14291c] text-[#86efac]">
                <span className="h-2 w-2 rounded-full animate-pulse bg-[#22c55e]" />
                football-data.org
              </span>
              <span className="pill text-[10px] font-bold border-[#3b82f6]/40 bg-[#102030] text-[#93c5fd]">
                <span className="h-2 w-2 rounded-full animate-pulse bg-[#3b82f6]" />
                Sportmonks v3
              </span>
            </div>

            <button
              onClick={() => fetchPredictionsData(true)}
              disabled={syncing}
              title="Force sync live fixtures from API"
              className="btn-secondary text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-[#b7f36b]' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex border-t border-[#1c2e24] px-2 py-1.5 lg:hidden overflow-x-auto">
          {[
            { id: 'matches', label: 'Matches', icon: Compass },
            { id: 'standings', label: 'Tables', icon: Table },
            { id: 'simulator', label: 'Simulator', icon: Sliders },
            { id: 'settlement', label: 'Record', icon: Trophy },
            { id: 'methodology', label: 'Methods', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold ${
                  isActive ? 'text-[#b7f36b]' : 'text-[#728f80]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* TAB 1: MATCH CENTRE */}
        {activeTab === 'matches' && (
          <div>
            {/* Hero Analytics Ribbon */}
            <section className="card-panel relative mb-6 overflow-hidden p-6 sm:p-7">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-[#b7f36b]/10 to-transparent blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="max-w-2xl">
                  <div className="pill mb-3 border-[#2b4737] bg-[#122119] text-[#b7f36b]">
                    <Zap className="h-3.5 w-3.5 fill-[#b7f36b]" />
                    UNBIASED BIVARIATE POISSON &amp; DIXON-COLES ENGINE
                  </div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                    Probabilistic Match Forecasts &amp; Intelligence
                  </h1>
                  <p className="mt-2 text-xs leading-relaxed text-[#94a89d] sm:text-sm">
                    Powered by dual enterprise feeds (<span className="font-semibold text-[#86efac]">football-data.org v4</span> &amp; <span className="font-semibold text-[#93c5fd]">Sportmonks v3</span>).
                    Unbiased home &amp; away offensive ratings, aligned outcome consensus, and transparent scoreline distributions.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handlePublishSnapshots}
                      disabled={publishing}
                      className="btn-primary text-xs"
                    >
                      <CheckCircle2 className={`h-4 w-4 ${publishing ? 'animate-spin' : ''}`} />
                      {publishing ? 'Locking Snapshots…' : 'Lock All Pre-Kickoff Forecasts'}
                    </button>
                    {publishMessage && (
                      <span className="text-xs font-semibold text-[#b7f36b]">
                        {publishMessage}
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Stats Ribbon */}
                <div className="grid grid-cols-2 gap-3 sm:w-80">
                  <div className="metric-box">
                    <div className="flex items-center gap-1.5 text-xs text-[#7d9688]">
                      <Calendar className="h-3.5 w-3.5 text-[#b7f36b]" />
                      Total Fixtures
                    </div>
                    <div className="mt-1 text-2xl font-black text-[#edf5ef]">
                      {loading ? '…' : matches.length}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">Dual-provider feed</div>
                  </div>

                  <div className="metric-box">
                    <div className="flex items-center gap-1.5 text-xs text-[#7d9688]">
                      <Globe className="h-3.5 w-3.5 text-[#b7f36b]" />
                      Leagues
                    </div>
                    <div className="mt-1 text-2xl font-black text-[#edf5ef]">
                      {loading ? '…' : Math.max(1, uniqueLeagues.length - 1)}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">Tier 1 monitored</div>
                  </div>

                  <div className="metric-box">
                    <div className="flex items-center gap-1.5 text-xs text-[#7d9688]">
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                      Away Favs
                    </div>
                    <div className="mt-1 text-2xl font-black text-amber-400">
                      {loading ? '…' : matches.filter((m) => m.prediction.favored_outcome === 'Away Win').length}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">Unbiased road edges</div>
                  </div>

                  <div className="metric-box">
                    <div className="flex items-center gap-1.5 text-xs text-[#7d9688]">
                      <Trophy className="h-3.5 w-3.5 text-[#b7f36b]" />
                      Hit Rate
                    </div>
                    <div className="mt-1 text-2xl font-black text-[#b7f36b]">
                      {stats?.accuracy_percent !== null && stats?.accuracy_percent !== undefined
                        ? `${stats.accuracy_percent}%`
                        : 'Calibrating'}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">{stats?.settled_predictions || 0} graded</div>
                  </div>
                </div>
              </div>
            </section>

            {/* DAILY 90%+ SUPER BANKER TREBLE SLIP BANNER */}
            {dailyBankerSlip && dailyBankerSlip.legs && dailyBankerSlip.legs.length > 0 && (
              <div className="card-panel relative mb-6 overflow-hidden border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-[#0e2218] to-[#12281d] p-5 shadow-xl shadow-emerald-950/20">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                        💎
                      </span>
                      <span className="text-xs font-black tracking-wider text-emerald-400">
                        {dailyBankerSlip.title || 'DAILY 90%+ SUPER BANKER TREBLE'}
                      </span>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-300">
                        {dailyBankerSlip.joint_probability_percent}% ESTIMATED WIN RATE
                      </span>
                      <span className="hidden sm:inline-block text-xs text-[#719280]">
                        &middot; {dailyBankerSlip.expected_hit_rate} &middot; Safe Kelly Unit: {dailyBankerSlip.recommended_unit}
                      </span>
                    </div>

                    {/* Legs preview cards */}
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {dailyBankerSlip.legs.map((leg: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-[#0c1812]/90 px-3 py-1.5 text-xs"
                        >
                          <span className="font-bold text-[#b7f36b]">{idx + 1}.</span>
                          <span className="text-[#edf5ef] font-semibold">{leg.fixture}:</span>
                          <span className="font-bold text-emerald-300">{leg.selection}</span>
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-400">
                            {leg.win_probability}%
                          </span>
                          <span className="text-[10px] text-[#719280]">@{renderOdds(leg.fair_odds)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-[#719280]">COMBINED FAIR ODDS</div>
                      <div className="text-lg font-black text-emerald-300">{renderOdds(dailyBankerSlip.combined_odds)}</div>
                    </div>
                    <button
                      onClick={loadDailyBankerSlipToBetSlip}
                      className="rounded-xl border border-emerald-400 bg-emerald-500 px-4 py-2.5 text-xs font-black text-black hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>Load Treble to Bet Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC DATE SELECTOR RIBBON */}
            <div className="card-panel mb-5 p-3.5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#8ea397]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#b7f36b]" />
                  <span>SELECT MATCHDAY DATE</span>
                </div>

                {/* 90%+ Banker Mode Switch */}
                <button
                  onClick={() => setBankerModeOnly(!bankerModeOnly)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition-all ${
                    bankerModeOnly
                      ? 'border border-emerald-400 bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                  }`}
                >
                  <span>💎</span>
                  <span>{bankerModeOnly ? '✓ 90%+ BANKER MODE ACTIVE' : '💎 90%+ BANKER MODE (SAFE PICKS ONLY)'}</span>
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {/* All Pill */}
                <button
                  onClick={() => setSelectedDateFilter('all')}
                  className={`pill pill-clickable whitespace-nowrap text-xs ${
                    selectedDateFilter === 'all' ? 'pill-active' : ''
                  }`}
                >
                  All Fixtures ({matches.length})
                </button>

                {/* Today Pill */}
                <button
                  onClick={() => setSelectedDateFilter('today')}
                  className={`pill pill-clickable whitespace-nowrap text-xs ${
                    selectedDateFilter === 'today' ? 'pill-active' : ''
                  }`}
                >
                  Today ({dateCounts[todayKey] || 0})
                </button>

                {/* Tomorrow Pill */}
                <button
                  onClick={() => setSelectedDateFilter('tomorrow')}
                  className={`pill pill-clickable whitespace-nowrap text-xs ${
                    selectedDateFilter === 'tomorrow' ? 'pill-active' : ''
                  }`}
                >
                  Tomorrow ({dateCounts[tomorrowKey] || 0})
                </button>

                {/* Weekend Pill */}
                <button
                  onClick={() => setSelectedDateFilter('weekend')}
                  className={`pill pill-clickable whitespace-nowrap text-xs ${
                    selectedDateFilter === 'weekend' ? 'pill-active' : ''
                  }`}
                >
                  Weekend Matchdays ({matches.filter((m) => {
                    const day = new Date(m.kickoff).getDay();
                    return day === 6 || day === 0;
                  }).length})
                </button>

                {/* Specific Dates that have matches */}
                {uniqueDates.map((dateStr) => {
                  const count = dateCounts[dateStr] || 0;
                  const [y, m, d] = dateStr.split('-');
                  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                  const label = dateObj.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                  const isSelected = selectedDateFilter === dateStr;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDateFilter(dateStr)}
                      className={`pill pill-clickable whitespace-nowrap text-xs ${
                        isSelected ? 'pill-active' : ''
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EMPTY STATE HELPFUL NOTICE (Triggered when user clicks a date with 0 matches like Tomorrow) */}
            {filteredMatches.length === 0 && !loading && (
              <div className="card-panel mb-6 border-amber-900/50 bg-amber-950/20 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-900/40 text-amber-300">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-lg font-black text-amber-200">
                  {selectedDateFilter === 'tomorrow' || selectedDateFilter === tomorrowKey
                    ? 'No Tier-1 Matches Scheduled for Tomorrow'
                    : selectedDateFilter === 'today' || selectedDateFilter === todayKey
                    ? 'No Live Matches Scheduled for Today'
                    : 'No Matches Scheduled for this Date'}
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-[#94a89d]">
                  Football leagues schedule the majority of fixtures over weekends and mid-week cup days.
                  Our feeds show the next matches kicking off on Wednesday (Brasileirão Série A) and Friday (Danish Superliga &amp; Bundesliga).
                </p>

                {/* Quick Action Navigation Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {uniqueDates.length > 0 && (
                    <button
                      onClick={() => setSelectedDateFilter(uniqueDates[0])}
                      className="btn-primary text-xs"
                    >
                      <ChevronRight className="h-4 w-4" />
                      View Next Matches ({getDayHeader(uniqueDates[0])} &middot; {dateCounts[uniqueDates[0]]} Matches)
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDateFilter('weekend')}
                    className="btn-secondary text-xs"
                  >
                    View Weekend Matchdays
                  </button>
                  <button
                    onClick={() => setSelectedDateFilter('all')}
                    className="btn-secondary text-xs"
                  >
                    View All Upcoming Matches ({matches.length})
                  </button>
                </div>

                {/* Optional Exhibition Preview Toggle */}
                {(selectedDateFilter === 'tomorrow' || selectedDateFilter === tomorrowKey) && (
                  <div className="mt-6 border-t border-amber-900/40 pt-4">
                    <button
                      onClick={() => setShowExhibitionsForEmpty(!showExhibitionsForEmpty)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#2d4b3b] bg-[#122119] px-4 py-2 text-xs font-bold text-[#b7f36b] hover:bg-[#182f22]"
                    >
                      <Sparkles className="h-4 w-4 text-[#b7f36b]" />
                      {showExhibitionsForEmpty
                        ? 'Hide Exhibition Derbies'
                        : 'Preview Simulated Derbies for Tomorrow (Arsenal vs Chelsea & El Clásico)'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="card-panel mb-6 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647c6f]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by club name (e.g. Palmeiras, Celtic, Bayern, Arsenal)..."
                    className="w-full rounded-xl border border-[#223a2d] bg-[#0c1611] py-2.5 pl-9 pr-4 text-xs text-[#edf5ef] placeholder-[#5c7366] focus:border-[#b7f36b] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#728f80] hover:text-[#edf5ef]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Provider Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#6e887a]">Feed:</span>
                  {[
                    { id: 'All', label: 'All Feeds' },
                    { id: 'football-data.org', label: 'football-data' },
                    { id: 'Sportmonks v3', label: 'Sportmonks' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      className={`pill pill-clickable text-xs ${selectedProvider === p.id ? 'pill-active' : ''}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Market Radar Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#6e887a]">Radar:</span>
                  {[
                    { id: 'All', label: 'All' },
                    { id: 'banker_90', label: '💎 90%+ Bankers' },
                    { id: 'high_home', label: 'Home Favs' },
                    { id: 'high_away', label: 'Away Favs' },
                    { id: 'over_25', label: 'Over 2.5' },
                    { id: 'btts', label: 'BTTS' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMarketFilter(m.id)}
                      className={`pill pill-clickable text-xs ${
                        marketFilter === m.id
                          ? m.id === 'banker_90'
                            ? 'border-emerald-400 bg-emerald-500 text-black font-black'
                            : 'pill-active'
                          : m.id === 'banker_90'
                          ? 'border-emerald-500/40 text-emerald-300'
                          : ''
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#6e887a]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-lg border border-[#223a2d] bg-[#0c1611] px-2.5 py-1.5 text-xs text-[#edf5ef] focus:border-[#b7f36b] focus:outline-none"
                  >
                    <option value="bankerProb">Highest Banker Probability (90%+)</option>
                    <option value="kickoff">Kickoff Time</option>
                    <option value="homeProb">Highest Home Win %</option>
                    <option value="awayProb">Highest Away Win %</option>
                    <option value="totalGoals">Highest Total Goals (xG)</option>
                  </select>
                </div>
              </div>

              {/* League Tabs */}
              <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
                {uniqueLeagues.map((league) => {
                  const isActive = selectedLeague === league;
                  const count =
                    league === 'All'
                      ? matches.length
                      : matches.filter((m) => m.league === league).length;
                  return (
                    <button
                      key={league}
                      onClick={() => setSelectedLeague(league)}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#b7f36b] text-[#0b1410] shadow-sm'
                          : 'bg-[#14231c] text-[#8ea397] hover:bg-[#1a2e24] hover:text-[#edf5ef]'
                      }`}
                    >
                      {league} <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matches Grouped By Date */}
            {loading ? (
              <div className="card-panel flex flex-col items-center justify-center p-16 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-[#b7f36b]" />
                <div className="mt-4 text-base font-bold text-[#edf5ef]">
                  Loading live matches from football-data.org &amp; Sportmonks...
                </div>
                <div className="mt-1 text-xs text-[#728f80]">
                  Computing balanced Poisson &amp; Dixon-Coles distributions
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.keys(groupedMatches).map((dateKey) => {
                  const dayMatches = groupedMatches[dateKey];
                  return (
                    <div key={dateKey}>
                      {/* Date Section Header */}
                      <div className="mb-3.5 flex items-center justify-between border-b border-[#1c2e24] pb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#b7f36b]" />
                          <h3 className="text-base font-black tracking-tight text-[#edf5ef]">
                            {getDayHeader(dateKey)}
                          </h3>
                          <span className="rounded-full bg-[#18291f] px-2.5 py-0.5 text-[11px] font-bold text-[#86efac]">
                            {dayMatches.length} {dayMatches.length === 1 ? 'Match' : 'Matches'}
                          </span>
                        </div>
                        <span className="text-xs text-[#6e887a]">
                          {getRelativeTime(dayMatches[0]?.kickoff)}
                        </span>
                      </div>

                      {/* Cards Grid */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {dayMatches.map((m) => {
                          const p = m.prediction;
                          const homeP = p.home_win;
                          const drawP = p.draw;
                          const awayP = p.away_win;

                          // Check if any pick from this match is in the accumulator slip
                          const isHomeInSlip = slipLegs.some((l) => l.id === `${m.id}-home`);
                          const isDrawInSlip = slipLegs.some((l) => l.id === `${m.id}-draw`);
                          const isAwayInSlip = slipLegs.some((l) => l.id === `${m.id}-away`);

                          const isAwayFav = p.favored_outcome === 'Away Win';
                          const isHomeFav = p.favored_outcome === 'Home Win';

                          return (
                            <article
                              key={m.id}
                              className="card-panel group flex flex-col justify-between p-5 hover:border-[#2d4b3b]"
                            >
                              <div>
                                {/* Card Header: League & Consensus */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 truncate text-xs text-[#7a9687]">
                                    <span className="font-semibold text-[#b7f36b]">{m.league}</span>
                                    {m.country && <span>&middot; {m.country}</span>}
                                  </div>

                                  {/* Consensus Outcome Tag */}
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider ${
                                      isAwayFav
                                        ? 'border border-amber-400/40 bg-amber-400/10 text-amber-400'
                                        : isHomeFav
                                        ? 'border border-[#b7f36b]/40 bg-[#b7f36b]/10 text-[#b7f36b]'
                                        : 'border border-slate-500/40 bg-slate-800/40 text-slate-300'
                                    }`}
                                  >
                                    PICK: {p.favored_outcome.toUpperCase()}
                                  </span>
                                </div>

                                {/* Kickoff date & Provider tag */}
                                <div className="mt-1 flex items-center justify-between text-[11px] text-[#5e776a]">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-[#5e776a]" />
                                    <span>{formatDate(m.kickoff)}</span>
                                  </div>
                                  <span className="text-[10px] text-[#4e6a5b]">
                                    Feed: {m.provider}
                                  </span>
                                </div>

                                {/* Teams Head-to-Head Grid */}
                                <div className="my-5 grid grid-cols-5 items-center gap-2">
                                  {/* Home Club */}
                                  <div className="col-span-2 text-left">
                                    <div className="flex items-center gap-2">
                                      {m.home_crest ? (
                                        <img
                                          src={m.home_crest}
                                          alt={m.home_team}
                                          className="h-7 w-7 object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b2f24] text-[10px] font-black text-[#b7f36b]">
                                          {m.home_team.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span className={`truncate text-sm font-bold ${isHomeFav ? 'text-[#b7f36b]' : 'text-[#edf5ef]'}`}>
                                        {m.home_short || m.home_team}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-[#6d887a]">
                                      xG: <b className="text-[#edf5ef]">{p.expected_home_goals}</b>
                                    </div>
                                  </div>

                                  {/* VS Badge */}
                                  <div className="col-span-1 text-center">
                                    <span className="rounded bg-[#16271e] px-2 py-1 text-[10px] font-black tracking-widest text-[#5e776a]">
                                      VS
                                    </span>
                                  </div>

                                  {/* Away Club */}
                                  <div className="col-span-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className={`truncate text-sm font-bold ${isAwayFav ? 'text-amber-400' : 'text-[#edf5ef]'}`}>
                                        {m.away_short || m.away_team}
                                      </span>
                                      {m.away_crest ? (
                                        <img
                                          src={m.away_crest}
                                          alt={m.away_team}
                                          className="h-7 w-7 object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b2f24] text-[10px] font-black text-[#b7f36b]">
                                          {m.away_team.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-1 text-[11px] text-[#6d887a]">
                                      xG: <b className="text-[#edf5ef]">{p.expected_away_goals}</b>
                                    </div>
                                  </div>
                                </div>

                                {/* 1X2 Probabilities & Interactive Slip Buttons */}
                                <div className="rounded-xl border border-[#1d3025] bg-[#0c1611] p-3">
                                  <div className="mb-2 flex justify-between text-[11px] font-semibold text-[#8ea397]">
                                    <span className={isHomeFav ? 'font-bold text-[#b7f36b]' : ''}>Home ({formatPercent(homeP)})</span>
                                    <span>Draw ({formatPercent(drawP)})</span>
                                    <span className={isAwayFav ? 'font-bold text-amber-400' : ''}>Away ({formatPercent(awayP)})</span>
                                  </div>

                                  {/* Multi-color Probability Bar */}
                                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#16271e]">
                                    <div
                                      style={{ width: `${Math.round(homeP * 100)}%` }}
                                      className="bg-gradient-to-r from-[#10b981] to-[#b7f36b]"
                                      title={`Home: ${formatPercent(homeP)}`}
                                    />
                                    <div
                                      style={{ width: `${Math.round(drawP * 100)}%` }}
                                      className="bg-[#64748b]"
                                      title={`Draw: ${formatPercent(drawP)}`}
                                    />
                                    <div
                                      style={{ width: `${Math.round(awayP * 100)}%` }}
                                      className="bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]"
                                      title={`Away: ${formatPercent(awayP)}`}
                                    />
                                  </div>

                                  {/* Interactive Odds / Acca Add Buttons */}
                                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
                                    <button
                                      onClick={() => addToSlip(m, 'home')}
                                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition-all ${
                                        isHomeInSlip
                                          ? 'border-[#b7f36b] bg-[#b7f36b] text-[#0b1410]'
                                          : 'border-[#20362a] bg-[#122119] text-[#b7f36b] hover:border-[#b7f36b]'
                                      }`}
                                      title="Click to add Home Win to Accumulator"
                                    >
                                      1: {renderOdds(p.fair_odds.home, homeP, p.fair_odds.american?.home, p.fair_odds.fractional?.home)}
                                    </button>

                                    <button
                                      onClick={() => addToSlip(m, 'draw')}
                                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition-all ${
                                        isDrawInSlip
                                          ? 'border-slate-300 bg-slate-300 text-[#0b1410]'
                                          : 'border-[#20362a] bg-[#122119] text-[#edf5ef] hover:border-slate-400'
                                      }`}
                                      title="Click to add Draw to Accumulator"
                                    >
                                      X: {renderOdds(p.fair_odds.draw, drawP, p.fair_odds.american?.draw, p.fair_odds.fractional?.draw)}
                                    </button>

                                    <button
                                      onClick={() => addToSlip(m, 'away')}
                                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition-all ${
                                        isAwayInSlip
                                          ? 'border-amber-400 bg-amber-400 text-[#0b1410]'
                                          : 'border-[#20362a] bg-[#122119] text-amber-400 hover:border-amber-400'
                                      }`}
                                      title="Click to add Away Win to Accumulator"
                                    >
                                      2: {renderOdds(p.fair_odds.away, awayP, p.fair_odds.american?.away, p.fair_odds.fractional?.away)}
                                    </button>
                                  </div>
                                </div>

                                {/* Secondary Markets: Aligned Score, Over 2.5, BTTS */}
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                  <div className="rounded-lg border border-[#192b21] bg-[#111f18] p-2">
                                    <div className="text-[10px] font-semibold text-[#6d887a]">
                                      ALIGNED SCORE
                                    </div>
                                    <div className="mt-0.5 text-sm font-black text-[#b7f36b]">
                                      {p.most_likely_score}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-[#192b21] bg-[#111f18] p-2">
                                    <div className="text-[10px] font-semibold text-[#6d887a]">
                                      OVER 2.5
                                    </div>
                                    <div className="mt-0.5 text-sm font-black text-[#edf5ef]">
                                      {formatPercent(p.over_2_5)}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-[#192b21] bg-[#111f18] p-2">
                                    <div className="text-[10px] font-semibold text-[#6d887a]">
                                      BTTS YES
                                    </div>
                                    <div className="mt-0.5 text-sm font-black text-[#edf5ef]">
                                      {formatPercent(p.btts_yes)}
                                    </div>
                                  </div>
                                </div>

                                {/* 90%+ ULTRA-SAFE BANKER PICK BANNER */}
                                {(() => {
                                  const banker = m.best_banker || p.best_banker;
                                  if (!banker) return null;
                                  const isBankerInSlip = slipLegs.some(
                                    (l) => l.id === `${m.id}-${banker.market_code || 'banker'}`
                                  );
                                  return (
                                    <div
                                      className={`mt-3.5 rounded-xl border p-2.5 transition-all ${
                                        banker.is_ultra_banker
                                          ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-[#0e2118]'
                                          : 'border-[#1e3b2b] bg-[#0d1c14]'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                                            💎
                                          </span>
                                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                            {banker.confidence_tier || '90%+ ULTRA BANKER'}
                                          </span>
                                        </div>
                                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-black text-emerald-300">
                                          {banker.probability_percent}% WIN PROB
                                        </span>
                                      </div>

                                      <div className="mt-1.5 flex items-center justify-between gap-2">
                                        <div className="truncate">
                                          <div className="truncate text-xs font-bold text-[#edf5ef]">
                                            {banker.selection}
                                          </div>
                                          <div className="text-[10px] text-[#719280]">
                                            Odds:{' '}
                                            <b className="text-[#86efac]">
                                              {renderOdds(banker.fair_odds)}
                                            </b>{' '}
                                            &middot; Safe Kelly:{' '}
                                            <b>
                                              {banker.kelly_staking?.recommended_stake_percent || 3}%
                                            </b>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => addBankerToSlip(m)}
                                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                            isBankerInSlip
                                              ? 'border border-emerald-400 bg-emerald-400 text-[#0b1410]'
                                              : 'border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-500 hover:text-black'
                                          }`}
                                          title="Add 90%+ Banker Pick to Accumulator Bet Slip"
                                        >
                                          {isBankerInSlip ? '✓ Added' : '+ Banker'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Footer Action: Open In-Depth Match Modal */}
                              <div className="mt-4 flex items-center justify-between border-t border-[#1a2c22] pt-3">
                                <span className="text-[11px] text-[#5e776a]">
                                  Confidence: {p.confidence}
                                </span>
                                <button
                                  onClick={() => setSelectedMatchModal(m)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#b7f36b] hover:underline"
                                >
                                  Deep-Dive Analysis <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEAGUE STANDINGS & FORM TRACKER */}
        {activeTab === 'standings' && (
          <div className="space-y-6">
            <div className="card-panel p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="pill mb-2">
                    <Table className="h-3.5 w-3.5" />
                    LIVE LEAGUE TABLES &amp; FORM
                  </div>
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Official Tier 1 Standings &amp; Goal Form
                  </h2>
                  <p className="mt-2 text-sm text-[#8ea397]">
                    Live league standings from football-data.org. Track position, goal differentials, points, and recent 5-match form guides.
                  </p>
                </div>

                {/* League Switcher Pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'PL', name: 'Premier League' },
                    { code: 'PD', name: 'La Liga' },
                    { code: 'BL1', name: 'Bundesliga' },
                    { code: 'SA', name: 'Serie A' },
                    { code: 'FL1', name: 'Ligue 1' },
                    { code: 'BSA', name: 'Brasileirão' },
                  ].map((lg) => (
                    <button
                      key={lg.code}
                      onClick={() => {
                        setSelectedStandingsCode(lg.code);
                        fetchStandingsData(lg.code);
                      }}
                      className={`pill pill-clickable text-xs ${
                        selectedStandingsCode === lg.code ? 'pill-active' : ''
                      }`}
                    >
                      {lg.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Standings Table Card */}
            <div className="card-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#1c2e24] p-4">
                <div className="font-bold text-sm">
                  {standingsData?.competition || selectedStandingsCode} Standings Table
                </div>
                {standingsLoading && (
                  <RefreshCw className="h-4 w-4 animate-spin text-[#b7f36b]" />
                )}
              </div>

              {standingsData && standingsData.table.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e1813] text-[#728f80]">
                      <tr>
                        <th className="p-3">Pos</th>
                        <th className="p-3">Club</th>
                        <th className="p-3 text-center">P</th>
                        <th className="p-3 text-center">W</th>
                        <th className="p-3 text-center">D</th>
                        <th className="p-3 text-center">L</th>
                        <th className="p-3 text-center">GF:GA</th>
                        <th className="p-3 text-center">GD</th>
                        <th className="p-3 text-center font-bold text-[#edf5ef]">Pts</th>
                        <th className="p-3 text-center">Form</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#17261e]">
                      {standingsData.table.map((row) => (
                        <tr key={row.position} className="hover:bg-[#111e18]">
                          <td className="p-3 font-bold text-[#728f80]">
                            {row.position <= 4 ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981]/20 font-bold text-[#86efac]">
                                {row.position}
                              </span>
                            ) : row.position >= 18 ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-950/60 font-bold text-red-400">
                                {row.position}
                              </span>
                            ) : (
                              row.position
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {row.crest ? (
                                <img
                                  src={row.crest}
                                  alt={row.team_name}
                                  className="h-5 w-5 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span className="font-bold text-[#edf5ef]">
                                {row.team_short || row.team_name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-[#94a89d]">{row.played}</td>
                          <td className="p-3 text-center text-[#94a89d]">{row.won}</td>
                          <td className="p-3 text-center text-[#94a89d]">{row.draw}</td>
                          <td className="p-3 text-center text-[#94a89d]">{row.lost}</td>
                          <td className="p-3 text-center font-mono text-[#728f80]">
                            {row.goals_for}:{row.goals_against}
                          </td>
                          <td className="p-3 text-center font-bold text-[#edf5ef]">
                            {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                          </td>
                          <td className="p-3 text-center font-black text-sm text-[#b7f36b]">
                            {row.points}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {row.form
                                ? row.form.split(',').map((f, idx) => (
                                    <span
                                      key={idx}
                                      className={`flex h-4 w-4 items-center justify-center rounded-[3px] text-[9px] font-black ${
                                        f === 'W'
                                          ? 'bg-[#10b981] text-[#0b1410]'
                                          : f === 'D'
                                          ? 'bg-slate-500 text-white'
                                          : 'bg-red-500 text-white'
                                      }`}
                                    >
                                      {f}
                                    </span>
                                  ))
                                : '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-[#728f80]">
                  Loading official league standings...
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM MATCH SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="card-panel p-6 sm:p-8">
            <div className="mb-6 max-w-2xl">
              <div className="pill mb-2">
                <Sliders className="h-3.5 w-3.5" />
                POISSON MATCH SIMULATOR
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                Simulate Any Custom Match
              </h2>
              <p className="mt-2 text-sm text-[#8ea397]">
                Input any custom teams or adjust expected goal rates (xG) to simulate 10,000 Poisson
                iterations and evaluate 1X2 odds, over/under totals, and exact score probabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Controls Column */}
              <div className="space-y-6 lg:col-span-5">
                {/* Preset Matches */}
                <div>
                  <label className="text-xs font-bold text-[#8ea397]">QUICK PRESETS</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { h: 'Arsenal FC', a: 'Chelsea FC', hXg: 1.95, aXg: 1.15 },
                      { h: 'Real Madrid CF', a: 'FC Barcelona', hXg: 1.85, aXg: 1.75 },
                      { h: 'FC Bayern München', a: 'Borussia Dortmund', hXg: 2.30, aXg: 1.35 },
                      { h: 'Cruzeiro EC', a: 'SE Palmeiras', hXg: 0.95, aXg: 1.65 },
                      { h: 'Motherwell', a: 'Rangers', hXg: 0.95, aXg: 2.10 },
                    ].map((pre) => (
                      <button
                        key={pre.h + pre.a}
                        onClick={() => {
                          setSimHome(pre.h);
                          setSimAway(pre.a);
                          setSimHomeXg(pre.hXg);
                          setSimAwayXg(pre.aXg);
                        }}
                        className="rounded-lg border border-[#223a2d] bg-[#122119] px-2.5 py-1 text-[11px] font-semibold text-[#8ea397] hover:border-[#b7f36b] hover:text-[#edf5ef]"
                      >
                        {pre.h.split(' ')[0]} vs {pre.a.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Names Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#b7f36b]">Home Club</label>
                    <input
                      type="text"
                      value={simHome}
                      onChange={(e) => setSimHome(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#223a2d] bg-[#0c1611] p-2.5 text-xs text-[#edf5ef] focus:border-[#b7f36b] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-400">Away Club</label>
                    <input
                      type="text"
                      value={simAway}
                      onChange={(e) => setSimAway(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#223a2d] bg-[#0c1611] p-2.5 text-xs text-[#edf5ef] focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Expected Goals Sliders */}
                <div className="space-y-4 rounded-xl border border-[#1e3328] bg-[#0e1813] p-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#8ea397]">{simHome} Expected Goals (xG)</span>
                      <span className="font-bold text-[#b7f36b]">{simHomeXg.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="4.5"
                      step="0.05"
                      value={simHomeXg}
                      onChange={(e) => setSimHomeXg(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-[#b7f36b]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#8ea397]">{simAway} Expected Goals (xG)</span>
                      <span className="font-bold text-amber-400">{simAwayXg.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="4.5"
                      step="0.05"
                      value={simAwayXg}
                      onChange={(e) => setSimAwayXg(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-amber-400"
                    />
                  </div>
                </div>

                <button
                  onClick={runSimulator}
                  disabled={simLoading}
                  className="btn-primary w-full justify-center"
                >
                  <Play className="h-4 w-4 fill-[#0b1410]" />
                  {simLoading ? 'Simulating…' : 'Run Poisson Simulation'}
                </button>
              </div>

              {/* Simulation Results Display Column */}
              <div className="lg:col-span-7">
                {simResult ? (
                  <div className="rounded-2xl border border-[#223a2d] bg-[#0d1712] p-6">
                    <div className="flex items-center justify-between border-b border-[#1b2d22] pb-4">
                      <div>
                        <div className="text-xs font-semibold text-[#6e887a]">SIMULATION RESULTS</div>
                        <h3 className="text-xl font-black">
                          {simHome} <span className="text-[#6e887a]">vs</span> {simAway}
                        </h3>
                      </div>
                      <span className="pill text-xs">{simResult.confidence}</span>
                    </div>

                    {/* Consensus Banner */}
                    <div className="my-4 rounded-xl border border-[#1e3427] bg-[#122119] p-3 text-center">
                      <span className="text-xs text-[#8ea397]">Model Pick: </span>
                      <b className="text-sm text-[#b7f36b]">{simResult.favored_outcome}</b>
                      <span className="text-xs text-[#728f80]"> &middot; Aligned Scoreline: <b className="text-[#edf5ef]">{simResult.most_likely_score}</b></span>
                    </div>

                    {/* 1X2 Probabilities & Odds */}
                    <div className="my-5 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl border border-[#1e3427] bg-[#122119] p-3">
                        <div className="text-xs text-[#728f80]">HOME WIN</div>
                        <div className="my-1 text-2xl font-black text-[#b7f36b]">
                          {formatPercent(simResult.home_win)}
                        </div>
                        <div className="text-xs text-[#728f80]">
                          Odds: <b className="text-[#edf5ef]">{renderOdds(simResult.fair_odds.home, simResult.home_win, simResult.fair_odds.american?.home, simResult.fair_odds.fractional?.home)}</b>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#1e3427] bg-[#122119] p-3">
                        <div className="text-xs text-[#728f80]">DRAW</div>
                        <div className="my-1 text-2xl font-black text-[#94a3b8]">
                          {formatPercent(simResult.draw)}
                        </div>
                        <div className="text-xs text-[#728f80]">
                          Odds: <b className="text-[#edf5ef]">{renderOdds(simResult.fair_odds.draw, simResult.draw, simResult.fair_odds.american?.draw, simResult.fair_odds.fractional?.draw)}</b>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#1e3427] bg-[#122119] p-3">
                        <div className="text-xs text-[#728f80]">AWAY WIN</div>
                        <div className="my-1 text-2xl font-black text-amber-400">
                          {formatPercent(simResult.away_win)}
                        </div>
                        <div className="text-xs text-[#728f80]">
                          Odds: <b className="text-[#edf5ef]">{renderOdds(simResult.fair_odds.away, simResult.away_win, simResult.fair_odds.american?.away, simResult.fair_odds.fractional?.away)}</b>
                        </div>
                      </div>
                    </div>

                    {/* Top 5 Most Likely Exact Scorelines */}
                    <div className="mb-6">
                      <div className="mb-2 text-xs font-bold text-[#8ea397]">
                        TOP PROBABLE EXACT SCORELINES
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {simResult.top_scorelines?.map((sc) => (
                          <div
                            key={sc.score}
                            className="rounded-lg border border-[#1a2d22] bg-[#111e18] p-2 text-center"
                          >
                            <div className="text-xs font-black text-[#b7f36b]">{sc.score}</div>
                            <div className="text-[11px] text-[#728f80]">
                              {formatPercent(sc.probability)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Secondary Markets Table */}
                    <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                      <div className="rounded-lg border border-[#1a2d22] bg-[#111e18] p-2.5">
                        <div className="text-[10px] text-[#6e887a]">OVER 1.5 GOALS</div>
                        <div className="text-sm font-bold text-[#edf5ef]">
                          {formatPercent(simResult.over_1_5)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#1a2d22] bg-[#111e18] p-2.5">
                        <div className="text-[10px] text-[#6e887a]">OVER 2.5 GOALS</div>
                        <div className="text-sm font-bold text-[#edf5ef]">
                          {formatPercent(simResult.over_2_5)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#1a2d22] bg-[#111e18] p-2.5">
                        <div className="text-[10px] text-[#6e887a]">UNDER 2.5 GOALS</div>
                        <div className="text-sm font-bold text-[#edf5ef]">
                          {formatPercent(simResult.under_2_5)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#1a2d22] bg-[#111e18] p-2.5">
                        <div className="text-[10px] text-[#6e887a]">BTTS YES</div>
                        <div className="text-sm font-bold text-[#edf5ef]">
                          {formatPercent(simResult.btts_yes)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center p-12 text-sm text-[#728f80]">
                    Click &quot;Run Poisson Simulation&quot; to see match probability models.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MODEL PERFORMANCE & SETTLEMENT */}
        {activeTab === 'settlement' && (
          <div className="space-y-6">
            <div className="card-panel p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="pill mb-2">
                    <Trophy className="h-3.5 w-3.5" />
                    AUDITED PERFORMANCE TRACKING
                  </div>
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Prediction History &amp; Settlement Engine
                  </h2>
                  <p className="mt-2 text-sm text-[#8ea397]">
                    Forecasts are snapshotted before kickoff and graded against verified full-time results
                    from football-data.org and Sportmonks. No retroactive adjustments.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSettleMatches}
                    disabled={settling}
                    className="btn-primary text-xs"
                  >
                    <CheckCircle2 className={`h-4 w-4 ${settling ? 'animate-spin' : ''}`} />
                    {settling ? 'Grading Matches…' : 'Run Result Settlement'}
                  </button>
                </div>
              </div>

              {settleMessage && (
                <div className="mt-4 rounded-xl border border-[#b7f36b]/30 bg-[#122119] p-3 text-xs text-[#b7f36b]">
                  {settleMessage}
                </div>
              )}

              {/* Stats Ribbon */}
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="metric-box">
                  <div className="text-xs text-[#728f80]">Snapshotted Predictions</div>
                  <div className="mt-1 text-2xl font-black text-[#edf5ef]">
                    {stats?.published_predictions || 0}
                  </div>
                </div>

                <div className="metric-box">
                  <div className="text-xs text-[#728f80]">Settled Outcomes</div>
                  <div className="mt-1 text-2xl font-black text-[#edf5ef]">
                    {stats?.settled_predictions || 0}
                  </div>
                </div>

                <div className="metric-box">
                  <div className="text-xs text-[#728f80]">1X2 Hit Rate</div>
                  <div className="mt-1 text-2xl font-black text-[#b7f36b]">
                    {stats?.accuracy_percent !== null && stats?.accuracy_percent !== undefined
                      ? `${stats.accuracy_percent}%`
                      : 'N/A'}
                  </div>
                </div>

                <div className="metric-box">
                  <div className="text-xs text-[#728f80]">Mean Brier Score</div>
                  <div className="mt-1 text-2xl font-black text-[#edf5ef]">
                    {stats?.mean_brier_score !== null && stats?.mean_brier_score !== undefined
                      ? stats.mean_brier_score
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Settlements Table */}
            <div className="card-panel overflow-hidden">
              <div className="border-b border-[#1c2e24] p-4 text-sm font-bold">
                Recently Settled Matches &amp; Verifications
              </div>
              {stats?.recent_settlements && stats.recent_settlements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e1813] text-[#728f80]">
                      <tr>
                        <th className="p-3">Match</th>
                        <th className="p-3">Final Score</th>
                        <th className="p-3">Actual Result</th>
                        <th className="p-3">Model Pick</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Brier Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#17261e]">
                      {stats.recent_settlements.map((s) => (
                        <tr key={s.fixture_id} className="hover:bg-[#111e18]">
                          <td className="p-3 font-semibold">
                            {s.home_team} vs {s.away_team}
                          </td>
                          <td className="p-3 font-bold text-[#b7f36b]">{s.actual_score}</td>
                          <td className="p-3">{s.actual_outcome}</td>
                          <td className="p-3">{s.predicted_outcome}</td>
                          <td className="p-3">
                            <span
                              className={`rounded px-2 py-0.5 font-bold ${
                                s.is_correct
                                  ? 'bg-[#10b981]/20 text-[#86efac]'
                                  : 'bg-red-950/40 text-red-300'
                              }`}
                            >
                              {s.is_correct ? 'WON' : 'LOST'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[#8ea397]">{s.brier_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#728f80]">
                  No settled match outcomes yet. Click &quot;Lock All Pre-Kickoff Forecasts&quot; on upcoming matches and
                  run &quot;Run Result Settlement&quot; once matches conclude to verify performance.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: METHODOLOGY & REST API */}
        {activeTab === 'methodology' && (
          <div className="space-y-6">
            <div className="card-panel p-6 sm:p-8">
              <div className="pill mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[#b7f36b]" />
                MATHEMATICAL FOUNDATION
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                Unbiased Modeling &amp; Dixon-Coles Bivariate Adjustment
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#94a89d]">
                <p>
                  GoalInsight utilizes an independent Poisson goal expectation model augmented with a
                  Dixon-Coles bivariate low-score correlation adjustment (&tau;). In football, scores of
                  0-0, 1-0, 0-1, and 1-1 exhibit statistical dependency that standard Poisson distributions
                  slightly underestimate.
                </p>
                <div className="rounded-xl border border-[#1e3427] bg-[#0c1611] p-4 font-mono text-xs text-[#edf5ef]">
                  P(X = k) = (&lambda;^k &middot; e^(-&lambda;)) / k!
                </div>
                <p>
                  <strong>Unbiased Goal Expectation:</strong> Rather than forcing arbitrary home multipliers, Expected Goals ($xG$) are computed via interactive offensive ratings and opponent defensive vulnerability. Elite traveling teams (e.g. Palmeiras, Celtic, Real Madrid, Bayern) correctly project higher $xG$ and are forecasted to win away from home.
                </p>
                <p>
                  <strong>Aligned Scoreline Consensus:</strong> To eliminate conflicting signals, the projected headline scoreline is directly conditioned on the favored 1X2 market pick, so a favored team is never accompanied by a contradictory draw scoreline.
                </p>
              </div>
            </div>

            {/* Dual Data Feed Architecture */}
            <div className="card-panel p-6 sm:p-8">
              <h3 className="text-lg font-black text-[#edf5ef]">Dual-Feed Data Architecture</h3>
              <p className="mt-1 text-xs text-[#728f80]">
                GoalInsight combines two enterprise sports intelligence providers:
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#1e3427] bg-[#0c1611] p-4">
                  <div className="font-bold text-sm text-[#86efac]">football-data.org v4</div>
                  <div className="mt-1 text-xs text-[#94a89d]">
                    Monitors Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions League, and Brasileirão Série A.
                  </div>
                </div>
                <div className="rounded-xl border border-[#1e3427] bg-[#0c1611] p-4">
                  <div className="font-bold text-sm text-[#93c5fd]">Sportmonks v3</div>
                  <div className="mt-1 text-xs text-[#94a89d]">
                    Monitors Scottish Premiership, Danish Superliga, high-resolution participant crests, and venue analytics.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MATCH DEEP-DIVE ANALYSIS MODAL */}
      {selectedMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="card-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto border-[#294535] bg-[#0c1611] p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1c2e24] pb-4">
              <div className="flex items-center gap-2">
                <span className="pill text-xs font-semibold text-[#b7f36b]">
                  {selectedMatchModal.league} &middot; {selectedMatchModal.country}
                </span>
                <span className="text-xs text-[#728f80]">
                  {formatDate(selectedMatchModal.kickoff)}
                </span>
                <span className="text-[10px] text-[#5e776a]">
                  Feed: {selectedMatchModal.provider}
                </span>
              </div>
              <button
                onClick={() => setSelectedMatchModal(null)}
                className="rounded-lg p-1 text-[#728f80] hover:bg-[#18291f] hover:text-[#edf5ef]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Teams Matchup Header */}
            <div className="my-6 grid grid-cols-5 items-center gap-3 text-center">
              <div className="col-span-2 text-left">
                <div className="flex items-center gap-3">
                  {selectedMatchModal.home_crest ? (
                    <img
                      src={selectedMatchModal.home_crest}
                      alt={selectedMatchModal.home_team}
                      className="h-10 w-10 object-contain"
                    />
                  ) : null}
                  <div>
                    <h3 className="text-base font-black text-[#edf5ef]">
                      {selectedMatchModal.home_team}
                    </h3>
                    <div className="text-xs text-[#b7f36b]">
                      Exp. Goals: <b>{selectedMatchModal.prediction.expected_home_goals}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Consensus Block */}
              <div className="col-span-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#b7f36b]">
                  CONSENSUS PICK
                </div>
                <div className="text-sm font-black text-[#edf5ef]">
                  {selectedMatchModal.prediction.favored_outcome}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-[#16271e] px-2 py-0.5 font-mono text-sm font-black text-[#b7f36b]">
                  {selectedMatchModal.prediction.most_likely_score}
                </div>
              </div>

              <div className="col-span-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#edf5ef]">
                      {selectedMatchModal.away_team}
                    </h3>
                    <div className="text-xs text-amber-400">
                      Exp. Goals: <b>{selectedMatchModal.prediction.expected_away_goals}</b>
                    </div>
                  </div>
                  {selectedMatchModal.away_crest ? (
                    <img
                      src={selectedMatchModal.away_crest}
                      alt={selectedMatchModal.away_team}
                      className="h-10 w-10 object-contain"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Aligned Recommendation Banner */}
            <div className="mb-4 rounded-xl border border-[#1e3427] bg-[#122119] p-3 text-center">
              <span className="text-xs text-[#8ea397]">Model Recommendation: </span>
              <b className="text-xs text-[#b7f36b]">
                {selectedMatchModal.prediction.favored_outcome}
              </b>
              <span className="text-xs text-[#728f80]">
                {' '}&middot; Projected Final Score: <b className="text-[#edf5ef]">{selectedMatchModal.prediction.most_likely_score}</b>
                {' '}&middot; Confidence: <b className="text-[#86efac]">{selectedMatchModal.prediction.confidence}</b>
              </span>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="mb-5 flex gap-1.5 overflow-x-auto border-b border-[#1c2e24] pb-2">
              {[
                { id: 'overview', label: 'Overview & 1X2', icon: '⚡' },
                { id: 'banker', label: '💎 90%+ Banker Markets', icon: '💎' },
                { id: 'ensemble', label: '4-Model Ensemble', icon: '🧠' },
                { id: 'monte_carlo', label: 'Monte Carlo (5,000 Runs)', icon: '🎲' },
                { id: 'heatmap', label: 'Score Heatmap', icon: '📊' },
              ].map((t) => {
                const isActive = modalTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setModalTab(t.id as any)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? t.id === 'banker'
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                          : 'bg-[#b7f36b] text-[#0b1410] shadow-sm'
                        : 'bg-[#14231c] text-[#8ea397] hover:bg-[#1a2e24] hover:text-[#edf5ef]'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* MODAL TAB 1: OVERVIEW & 1X2 */}
            {modalTab === 'overview' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* 1X2 Probabilities & Odds */}
                <div className="rounded-xl border border-[#1e3427] bg-[#111f18] p-4">
                  <div className="mb-2 text-xs font-bold text-[#8ea397]">
                    1X2 FULL-TIME OUTCOME PROBABILITIES
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className={`rounded-lg border p-3 ${
                      selectedMatchModal.prediction.favored_outcome === 'Home Win'
                        ? 'border-[#b7f36b]/60 bg-[#14261c]'
                        : 'border-[#223d2e] bg-[#0c1611]'
                    }`}>
                      <div className="text-xs text-[#728f80]">Home Win</div>
                      <div className="my-1 text-2xl font-black text-[#b7f36b]">
                        {formatPercent(selectedMatchModal.prediction.home_win)}
                      </div>
                      <div className="text-xs text-[#8ea397]">
                        Fair Odds: <b>{renderOdds(selectedMatchModal.prediction.fair_odds.home, selectedMatchModal.prediction.home_win, selectedMatchModal.prediction.fair_odds.american?.home, selectedMatchModal.prediction.fair_odds.fractional?.home)}</b>
                      </div>
                      {selectedMatchModal.prediction.category_scores?.home_win && (
                        <div className="mt-1 text-[10px] text-[#6e887a]">
                          Top Home Score: <b>{selectedMatchModal.prediction.category_scores.home_win}</b>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-lg border p-3 ${
                      selectedMatchModal.prediction.favored_outcome.includes('Draw')
                        ? 'border-slate-400/60 bg-slate-900/40'
                        : 'border-[#223d2e] bg-[#0c1611]'
                    }`}>
                      <div className="text-xs text-[#728f80]">Draw</div>
                      <div className="my-1 text-2xl font-black text-slate-300">
                        {formatPercent(selectedMatchModal.prediction.draw)}
                      </div>
                      <div className="text-xs text-[#8ea397]">
                        Fair Odds: <b>{renderOdds(selectedMatchModal.prediction.fair_odds.draw, selectedMatchModal.prediction.draw, selectedMatchModal.prediction.fair_odds.american?.draw, selectedMatchModal.prediction.fair_odds.fractional?.draw)}</b>
                      </div>
                      {selectedMatchModal.prediction.category_scores?.draw && (
                        <div className="mt-1 text-[10px] text-[#6e887a]">
                          Top Draw Score: <b>{selectedMatchModal.prediction.category_scores.draw}</b>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-lg border p-3 ${
                      selectedMatchModal.prediction.favored_outcome === 'Away Win'
                        ? 'border-amber-400/60 bg-amber-950/30'
                        : 'border-[#223d2e] bg-[#0c1611]'
                    }`}>
                      <div className="text-xs text-[#728f80]">Away Win</div>
                      <div className="my-1 text-2xl font-black text-amber-400">
                        {formatPercent(selectedMatchModal.prediction.away_win)}
                      </div>
                      <div className="text-xs text-[#8ea397]">
                        Fair Odds: <b>{renderOdds(selectedMatchModal.prediction.fair_odds.away, selectedMatchModal.prediction.away_win, selectedMatchModal.prediction.fair_odds.american?.away, selectedMatchModal.prediction.fair_odds.fractional?.away)}</b>
                      </div>
                      {selectedMatchModal.prediction.category_scores?.away_win && (
                        <div className="mt-1 text-[10px] text-[#6e887a]">
                          Top Away Score: <b>{selectedMatchModal.prediction.category_scores.away_win}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Secondary Markets Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3">
                    <div className="text-[10px] text-[#6e887a]">OVER 1.5 GOALS</div>
                    <div className="mt-1 text-base font-bold text-[#edf5ef]">
                      {formatPercent(selectedMatchModal.prediction.over_1_5)}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">
                      Under: {formatPercent(selectedMatchModal.prediction.under_1_5)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3">
                    <div className="text-[10px] text-[#6e887a]">OVER 2.5 GOALS</div>
                    <div className="mt-1 text-base font-bold text-[#b7f36b]">
                      {formatPercent(selectedMatchModal.prediction.over_2_5)}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">
                      Under: {formatPercent(selectedMatchModal.prediction.under_2_5)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3">
                    <div className="text-[10px] text-[#6e887a]">BOTH TEAMS TO SCORE</div>
                    <div className="mt-1 text-base font-bold text-[#edf5ef]">
                      {formatPercent(selectedMatchModal.prediction.btts_yes)}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">
                      No: {formatPercent(selectedMatchModal.prediction.btts_no)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3">
                    <div className="text-[10px] text-[#6e887a]">DOUBLE CHANCE 1X</div>
                    <div className="mt-1 text-base font-bold text-[#edf5ef]">
                      {formatPercent(selectedMatchModal.prediction.double_chance?.['1X'])}
                    </div>
                    <div className="text-[10px] text-[#5e776a]">
                      X2: {formatPercent(selectedMatchModal.prediction.double_chance?.['X2'])}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL TAB 2: 90%+ BANKER SAFE MARKETS */}
            {modalTab === 'banker' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Banker Spotlight Hero */}
                {(() => {
                  const banker = selectedMatchModal.best_banker || selectedMatchModal.prediction?.best_banker;
                  if (!banker) {
                    return (
                      <div className="rounded-xl border border-[#1e3427] bg-[#111f18] p-6 text-center text-xs text-[#728f80]">
                        No qualifying 88%+ ultra banker identified for this fixture.
                      </div>
                    );
                  }
                  const isBankerInSlip = slipLegs.some(
                    (l) => l.id === `${selectedMatchModal.id}-${banker.market_code || 'banker'}`
                  );
                  return (
                    <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-[#0d2117] to-[#12281d] p-5 shadow-xl shadow-emerald-950/30">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                              💎
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                              {banker.confidence_tier}
                            </span>
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-300">
                              {banker.probability_percent}% WIN PROBABILITY
                            </span>
                          </div>
                          <h4 className="mt-2 text-xl font-black text-[#edf5ef]">
                            {banker.selection}
                          </h4>
                          <p className="mt-1 text-xs leading-relaxed text-[#93b3a2]">
                            {banker.rationale}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="rounded-xl border border-emerald-500/30 bg-[#0c1812] px-4 py-2 text-center">
                            <div className="text-[10px] text-[#719280]">FAIR ODDS</div>
                            <div className="text-xl font-black text-emerald-300">
                              {renderOdds(banker.fair_odds)}
                            </div>
                          </div>
                          <button
                            onClick={() => addBankerToSlip(selectedMatchModal)}
                            className={`rounded-xl px-4 py-3 text-xs font-black transition-all ${
                              isBankerInSlip
                                ? 'border border-emerald-400 bg-emerald-400 text-[#0b1410]'
                                : 'border border-emerald-500/40 bg-emerald-500 text-black hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20'
                            }`}
                          >
                            {isBankerInSlip ? '✓ In Slip' : '+ Add to Slip'}
                          </button>
                        </div>
                      </div>

                      {/* Kelly Staking Recommendation Card */}
                      {banker.kelly_staking && (
                        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-[#0b1611]/80 p-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">🎯 Kelly Capital Management:</span>
                              <span className="text-[#edf5ef]">
                                Recommended Stake: <b>{banker.kelly_staking.recommended_stake_percent}% of Bankroll</b> (Quarter-Kelly)
                              </span>
                            </div>
                            <span className="text-xs text-emerald-300 font-semibold">
                              Edge: +{banker.kelly_staking.edge_percent}% Expected Value (+EV)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* All High-Probability Markets Menu */}
                {selectedMatchModal.prediction?.banker_analysis?.all_banker_options && (
                  <div className="rounded-xl border border-[#1e3427] bg-[#111f18] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#8ea397]">
                        ALL HIGH-PROBABILITY MARKETS FOR THIS FIXTURE (&ge; 70% HIT RATE)
                      </span>
                      <span className="text-[11px] text-[#5e776a]">
                        Sorted by probability
                      </span>
                    </div>

                    <div className="space-y-2">
                      {selectedMatchModal.prediction.banker_analysis.all_banker_options.map((opt, idx) => {
                        const isLegInSlip = slipLegs.some(
                          (l) => l.id === `${selectedMatchModal.id}-${opt.market_code}`
                        );
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border border-[#192c21] bg-[#0c1611] p-3 text-xs hover:border-[#2b4c39] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                opt.is_90_plus
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : opt.is_85_plus
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {opt.is_90_plus ? '💎' : opt.is_85_plus ? '🎯' : '⚡'}
                              </span>
                              <div>
                                <div className="font-bold text-[#edf5ef]">{opt.selection}</div>
                                <div className="text-[10px] text-[#719280]">
                                  Market: {opt.market} &middot; {opt.rationale}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="rounded bg-[#172b20] px-2 py-0.5 text-xs font-black text-[#86efac]">
                                {opt.probability_percent}%
                              </span>
                              <span className="font-mono text-xs text-[#edf5ef]">
                                @{renderOdds(opt.fair_odds)}
                              </span>
                              <button
                                onClick={() => addBankerToSlip(selectedMatchModal, opt)}
                                className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                                  isLegInSlip
                                    ? 'bg-emerald-500 text-black'
                                    : 'border border-[#223d2e] bg-[#122219] text-[#86efac] hover:bg-[#1a3325]'
                                }`}
                              >
                                {isLegInSlip ? '✓' : '+ Slip'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Kelly Bankroll Calculator */}
                <div className="rounded-xl border border-[#1e3427] bg-[#111f18] p-4">
                  <div className="mb-2 text-xs font-bold text-[#8ea397]">
                    INTERACTIVE KELLY CRITERION BANKROLL CALCULATOR
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs text-[#719280]">Your Total Betting Bankroll ($):</div>
                      <input
                        type="number"
                        min="100"
                        max="100000"
                        step="50"
                        value={modalBankroll}
                        onChange={(e) => setModalBankroll(Math.max(10, parseFloat(e.target.value) || 100))}
                        className="mt-1 rounded-lg border border-[#233d2f] bg-[#0c1611] px-3 py-1.5 text-sm font-bold text-[#edf5ef] focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center sm:w-72">
                      <div className="rounded-lg border border-[#1b3124] bg-[#0c1611] p-2.5">
                        <div className="text-[10px] text-[#719280]">RECOMMENDED STAKE</div>
                        <div className="mt-0.5 text-lg font-black text-emerald-400">
                          ${((modalBankroll * ((selectedMatchModal.best_banker?.kelly_staking?.recommended_stake_percent || 3.0) / 100.0))).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#5e776a]">
                          {selectedMatchModal.best_banker?.kelly_staking?.recommended_stake_percent || 3.0}% units
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#1b3124] bg-[#0c1611] p-2.5">
                        <div className="text-[10px] text-[#719280]">EST. PROFIT PER BET</div>
                        <div className="mt-0.5 text-lg font-black text-[#b7f36b]">
                          +${((modalBankroll * ((selectedMatchModal.best_banker?.kelly_staking?.recommended_stake_percent || 3.0) / 100.0)) * ((selectedMatchModal.best_banker?.fair_odds || 1.15) - 1.0)).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#5e776a]">Low volatility</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL TAB 3: 4-MODEL ENSEMBLE */}
            {modalTab === 'ensemble' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="rounded-xl border border-[#1e3427] bg-[#111f18] p-4">
                  <div className="mb-3 text-xs font-bold text-[#8ea397]">
                    4-MODEL MULTI-ALGORITHMIC CONSENSUS ARCHITECTURE
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Model 1: Dixon-Coles */}
                    <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#b7f36b]">
                        <span>Model 1: Dixon-Coles Bivariate</span>
                        <span className="text-[10px] text-[#719280]">Weight: 40%</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#719280]">
                        Independent Poisson with low-score covariance parameter (&rho; = -0.04)
                      </p>
                      <div className="mt-2.5 flex justify-between font-mono text-[11px]">
                        <span>Home: {formatPercent(selectedMatchModal.prediction.home_win)}</span>
                        <span>Draw: {formatPercent(selectedMatchModal.prediction.draw)}</span>
                        <span>Away: {formatPercent(selectedMatchModal.prediction.away_win)}</span>
                      </div>
                    </div>

                    {/* Model 2: Dynamic Elo */}
                    <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#93c5fd]">
                        <span>Model 2: Global Club Elo</span>
                        <span className="text-[10px] text-[#719280]">Weight: 25%</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#719280]">
                        Calibrated continental rating with 65-point home advantage
                      </p>
                      {selectedMatchModal.prediction?.ensemble_consensus?.elo_model ? (
                        <div className="mt-2.5 flex justify-between font-mono text-[11px]">
                          <span>Home ({selectedMatchModal.prediction.ensemble_consensus.elo_model.home_elo}): {formatPercent(selectedMatchModal.prediction.ensemble_consensus.elo_model.home_win)}</span>
                          <span>Away ({selectedMatchModal.prediction.ensemble_consensus.elo_model.away_elo}): {formatPercent(selectedMatchModal.prediction.ensemble_consensus.elo_model.away_win)}</span>
                        </div>
                      ) : (
                        <div className="mt-2.5 text-[11px] text-[#5e776a]">Elo calibrated</div>
                      )}
                    </div>

                    {/* Model 3: Form Momentum EMA */}
                    <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-400">
                        <span>Model 3: Form Momentum EMA</span>
                        <span className="text-[10px] text-[#719280]">Weight: 15%</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#719280]">
                        Decaying exponential weighting of recent goal differentials &amp; rhythm
                      </p>
                      {selectedMatchModal.prediction?.ensemble_consensus?.form_momentum ? (
                        <div className="mt-2 text-[11px]">
                          <span className="font-semibold text-[#edf5ef]">{selectedMatchModal.prediction.ensemble_consensus.form_momentum.tendency}</span>
                          <div className="mt-1 flex justify-between font-mono text-[10px] text-[#8ea397]">
                            <span>Home Index: {selectedMatchModal.prediction.ensemble_consensus.form_momentum.home_momentum}</span>
                            <span>Away Index: {selectedMatchModal.prediction.ensemble_consensus.form_momentum.away_momentum}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-[#5e776a]">Momentum balanced</div>
                      )}
                    </div>

                    {/* Model 4: Monte Carlo */}
                    <div className="rounded-lg border border-[#1c3024] bg-[#0c1611] p-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-emerald-400">
                        <span>Model 4: 5,000-Match Monte Carlo</span>
                        <span className="text-[10px] text-[#719280]">Weight: 20%</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#719280]">
                        Stochastic simulation with lognormal tactical disturbance
                      </p>
                      {selectedMatchModal.prediction?.monte_carlo ? (
                        <div className="mt-2.5 flex justify-between font-mono text-[11px]">
                          <span>Sim Home: {formatPercent(selectedMatchModal.prediction.monte_carlo.simulated_home_win)}</span>
                          <span>Sim Draw: {formatPercent(selectedMatchModal.prediction.monte_carlo.simulated_draw)}</span>
                          <span>Sim Away: {formatPercent(selectedMatchModal.prediction.monte_carlo.simulated_away_win)}</span>
                        </div>
                      ) : (
                        <div className="mt-2.5 text-[11px] text-[#5e776a]">Simulated</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL TAB 4: MONTE CARLO SIMULATION */}
            {modalTab === 'monte_carlo' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {selectedMatchModal.prediction?.monte_carlo ? (
                  <div className="rounded-xl border border-[#1e3427] bg-[#111f18] p-4 text-xs">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-bold text-[#8ea397]">
                        5,000 INDEPENDENT STOCHASTIC MATCH SIMULATIONS
                      </span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                        5,000 RUNS COMPLETED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center my-3">
                      <div className="rounded-lg border border-[#192b21] bg-[#0c1611] p-2.5">
                        <div className="text-[10px] text-[#719280]">SIM. HOME WIN</div>
                        <div className="mt-0.5 text-base font-black text-[#b7f36b]">
                          {formatPercent(selectedMatchModal.prediction.monte_carlo.simulated_home_win)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#192b21] bg-[#0c1611] p-2.5">
                        <div className="text-[10px] text-[#719280]">SIM. DRAW</div>
                        <div className="mt-0.5 text-base font-black text-slate-300">
                          {formatPercent(selectedMatchModal.prediction.monte_carlo.simulated_draw)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#192b21] bg-[#0c1611] p-2.5">
                        <div className="text-[10px] text-[#719280]">SIM. AWAY WIN</div>
                        <div className="mt-0.5 text-base font-black text-amber-400">
                          {formatPercent(selectedMatchModal.prediction.monte_carlo.simulated_away_win)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#192b21] bg-[#0c1611] p-2.5">
                        <div className="text-[10px] text-[#719280]">AVG. MATCH GOALS</div>
                        <div className="mt-0.5 text-base font-black text-[#edf5ef]">
                          {selectedMatchModal.prediction.monte_carlo.average_simulated_goals}
                        </div>
                      </div>
                    </div>

                    {/* Top Simulated Scorelines */}
                    {selectedMatchModal.prediction.monte_carlo.top_simulated_scorelines && (
                      <div className="mt-4">
                        <div className="mb-2 text-xs font-bold text-[#8ea397]">
                          TOP FREQUENT SIMULATED EXACT SCORELINES
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-center">
                          {selectedMatchModal.prediction.monte_carlo.top_simulated_scorelines.map((sc, i) => (
                            <div key={i} className="rounded-lg border border-[#1a2d22] bg-[#0c1611] p-2">
                              <div className="font-mono text-sm font-black text-emerald-400">{sc.score}</div>
                              <div className="text-[10px] text-[#719280]">{formatPercent(sc.frequency)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-[#719280]">
                    Simulation data loading...
                  </div>
                )}
              </div>
            )}

            {/* MODAL TAB 5: EXACT SCORE HEATMAP */}
            {modalTab === 'heatmap' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {selectedMatchModal.prediction.score_matrix && (
                  <div className="rounded-xl border border-[#1e3427] bg-[#111f18] p-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#8ea397]">
                      <span>EXACT SCORELINE PROBABILITY HEATMAP (Home Goals &times; Away Goals)</span>
                      <span className="text-[10px] text-[#5e776a]">Color intensity = higher probability</span>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[340px]">
                        <div className="grid grid-cols-6 gap-1 text-center font-mono text-xs">
                          <div className="p-1 font-bold text-[#5e776a]">H \ A</div>
                          {[0, 1, 2, 3, 4].map((a) => (
                            <div key={a} className="p-1 font-bold text-amber-400">
                              {a} (Away)
                            </div>
                          ))}
                          {selectedMatchModal.prediction.score_matrix.map((row, h) => (
                            <React.Fragment key={h}>
                              <div className="p-1 font-bold text-[#b7f36b]">{h} (Home)</div>
                              {row.map((val, a) => {
                                const pct = Math.round(val * 100);
                                const isProjected = selectedMatchModal.prediction.most_likely_score === `${h}-${a}`;
                                return (
                                  <div
                                    key={a}
                                    className={`rounded p-2 text-xs font-semibold transition-all ${
                                      isProjected
                                        ? 'border-2 border-[#b7f36b] bg-[#b7f36b] text-[#0b1410] font-black shadow-lg shadow-[#b7f36b]/20'
                                        : pct > 8
                                        ? 'bg-[#1b432e] text-[#86efac]'
                                        : pct > 4
                                        ? 'bg-[#152e21] text-[#edf5ef]'
                                        : 'bg-[#0f1d16] text-[#6d887a]'
                                    }`}
                                    title={`${h}-${a}: ${formatPercent(val)}`}
                                  >
                                    {pct}%
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#1c2e24] pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => addToSlip(selectedMatchModal, 'home')}
                  className="btn-secondary text-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-[#b7f36b]" />
                  Add Home Win to Slip
                </button>
                <button
                  onClick={() => addToSlip(selectedMatchModal, 'away')}
                  className="btn-secondary text-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-400" />
                  Add Away Win to Slip
                </button>
                <button
                  onClick={() => addBankerToSlip(selectedMatchModal)}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-1"
                >
                  <span>💎</span>
                  <span>Add 90%+ Banker to Slip</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedMatchModal(null)}
                className="btn-primary text-xs"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACCUMULATOR (BET SLIP) DRAWER */}
      {slipLegs.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full animate-in slide-in-from-bottom duration-200">
          <div className="card-panel overflow-hidden border-[#2c4c3b] bg-[#0c1611] shadow-2xl">
            {/* Header / Toggle */}
            <div
              onClick={() => setIsSlipOpen(!isSlipOpen)}
              className="flex cursor-pointer items-center justify-between border-b border-[#1c2e24] bg-[#112018] px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b7f36b] text-[10px] font-black text-[#0b1410]">
                  {slipLegs.length}
                </div>
                <span className="text-xs font-black tracking-wide text-[#edf5ef]">
                  ACCUMULATOR SLIP
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#b7f36b]">
                  {accumulatorSummary.combinedOdds}x
                </span>
                {isSlipOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </div>
            </div>

            {/* Drawer Body */}
            {isSlipOpen && (
              <div className="p-4 space-y-4">
                {/* Legs list */}
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {slipLegs.map((leg) => (
                    <div
                      key={leg.id}
                      className="flex items-center justify-between rounded-lg border border-[#1b2f24] bg-[#122219] p-2.5 text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-semibold text-[#edf5ef]">
                          {leg.matchTitle}
                        </div>
                        <div className="text-[11px] text-[#b7f36b]">
                          {leg.pickName}{' '}
                          <span className="text-[#728f80]">({formatPercent(leg.prob)})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#edf5ef]">
                          {renderOdds(leg.odds, leg.prob)}
                        </span>
                        <button
                          onClick={() => setSlipLegs(slipLegs.filter((l) => l.id !== leg.id))}
                          className="text-[#647c6f] hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Combined Calculation Details */}
                <div className="rounded-xl border border-[#1d3226] bg-[#0f1b15] p-3 text-xs space-y-2">
                  <div className="flex justify-between text-[#8ea397]">
                    <span>Accumulator Joint Probability:</span>
                    <b className="text-[#edf5ef]">{formatPercent(accumulatorSummary.jointProb)}</b>
                  </div>
                  <div className="flex justify-between text-[#8ea397]">
                    <span>Cumulative Fair Odds:</span>
                    <b className="text-[#b7f36b]">{accumulatorSummary.combinedOdds}x</b>
                  </div>

                  {/* Stake Selector */}
                  <div className="flex items-center justify-between border-t border-[#1a2c22] pt-2">
                    <span className="text-[#8ea397]">Simulated Stake ($):</span>
                    <div className="flex items-center gap-1.5">
                      {[10, 25, 50].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setStakeAmount(amt)}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            stakeAmount === amt
                              ? 'bg-[#b7f36b] text-[#0b1410]'
                              : 'bg-[#17271f] text-[#8ea397]'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between text-sm font-black text-[#edf5ef] border-t border-[#1a2c22] pt-2">
                    <span>Potential Return:</span>
                    <span className="text-[#b7f36b]">${accumulatorSummary.payout}</span>
                  </div>
                </div>

                {/* Slip Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopySlip}
                    className="btn-secondary flex-1 justify-center text-xs"
                  >
                    {slipCopied ? <Check className="h-3.5 w-3.5 text-[#b7f36b]" /> : <Copy className="h-3.5 w-3.5" />}
                    {slipCopied ? 'Copied!' : 'Copy Slip'}
                  </button>
                  <button
                    onClick={() => setSlipLegs([])}
                    className="btn-secondary text-xs text-red-400 hover:text-red-300"
                    title="Clear All"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-[#18291f] bg-[#09100d] py-10 text-xs text-[#5e776a]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div>
            <span className="font-bold text-[#b7f36b]">GoalInsight</span> &copy;{' '}
            {new Date().getFullYear()} &mdash; Dual-Engine Football Intelligence Platform.
          </div>
          <div className="max-w-md text-center sm:text-right text-[11px] leading-relaxed text-[#50665b]">
            For informational, educational, and statistical analysis purposes only. Probabilities are mathematical estimates, not guaranteed outcomes. Please gamble responsibly where wagering is legal.
          </div>
        </div>
      </footer>
    </div>
  );
}
