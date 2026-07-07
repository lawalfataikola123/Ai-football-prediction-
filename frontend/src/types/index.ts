export interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  role: 'user' | 'admin'
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export interface League {
  id: number
  external_id: number
  name: string
  country: string
  logo: string | null
  flag: string | null
  season: number
  created_at: string
  updated_at: string | null
}

export interface Team {
  id: number
  external_id: number
  name: string
  short_name: string | null
  logo: string | null
  country: string | null
  founded: number | null
  venue_name: string | null
  venue_city: string | null
  venue_capacity: number | null
  league_id: number
  created_at: string
  updated_at: string | null
  stats?: TeamStats
}

export interface TeamStats {
  id: number
  team_id: number
  season: number
  league_id: number
  played: number
  won: number
  draw: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
  home_played: number
  home_won: number
  home_draw: number
  home_lost: number
  home_goals_for: number
  home_goals_against: number
  away_played: number
  away_won: number
  away_draw: number
  away_lost: number
  away_goals_for: number
  away_goals_against: number
  form: string | null
  created_at: string
  updated_at: string | null
}

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'in_play'
  | 'paused'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'suspended'

export interface Match {
  id: number
  external_id: number
  league_id: number
  home_team_id: number
  away_team_id: number
  match_date: string
  round: string | null
  venue: string | null
  referee: string | null
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  home_score_ht: number | null
  away_score_ht: number | null
  odd_home: number | null
  odd_draw: number | null
  odd_away: number | null
  created_at: string
  updated_at: string | null
  league?: League
  home_team?: Team
  away_team?: Team
  prediction?: MatchPrediction
}

export interface MatchPrediction {
  id: number
  match_id: number
  model_version: string
  prob_home_win: number
  prob_draw: number
  prob_away_win: number
  predicted_score_1: string | null
  prob_score_1: number | null
  predicted_score_2: string | null
  prob_score_2: number | null
  predicted_score_3: string | null
  prob_score_3: number | null
  prob_over_25: number
  prob_under_25: number
  prob_btts_yes: number
  prob_btts_no: number
  confidence_score: number
  feature_importance: string | null
  created_at: string
  match?: Match
}

export interface UpcomingMatchResponse {
  match: Match
  prediction: MatchPrediction | null
  days_until_match: number
}

export interface ModelPerformance {
  accuracy: number
  log_loss: number
  confusion_matrix: number[][]
  class_precision: number[]
  class_recall: number[]
  class_f1: number[]
  roi_flat_stake: number
  total_predictions: number
  correct_predictions: number
  last_updated: string
  feature_importance?: Record<string, number>
}

export interface PredictionRequest {
  home_team_id: number
  away_team_id: number
  match_date?: string
  home_team_form?: string
  away_team_form?: string
}

export interface MatchAnalysis {
  key_factors: string[]
  match_insight: string
  prediction_summary: string
  betting_tip?: string | null
  is_ai_generated: boolean
}

export interface TeamWithStats {
  team: Team
  stats: TeamStats | null
}