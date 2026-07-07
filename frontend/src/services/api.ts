import type {
  League,
  Team,
  TeamWithStats,
  Match,
  MatchPrediction,
  UpcomingMatchResponse,
  ModelPerformance,
  PredictionRequest,
  MatchAnalysis,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP error ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      fetchApi<{ access_token: string; token_type: string }>('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      }),

    register: (data: { email: string; username: string; password: string; full_name?: string }) =>
      fetchApi<any>('/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => fetchApi<any>('/v1/auth/me'),
  },

  matches: {
    getUpcoming: (days = 7, leagueId?: number) => {
      const params = new URLSearchParams({ days: days.toString() })
      if (leagueId) params.append('league_id', leagueId.toString())
      return fetchApi<UpcomingMatchResponse[]>(`/v1/matches/upcoming?${params}`)
    },

    getMatch: (id: number) =>
      fetchApi<Match>(`/v1/matches/${id}`),

    predictCustom: (data: PredictionRequest) =>
      fetchApi<MatchPrediction>('/v1/matches/predict/custom', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getModelPerformance: () =>
      fetchApi<ModelPerformance>('/v1/matches/model/performance'),

    getLeagues: () =>
      fetchApi<League[]>('/v1/matches/leagues/'),

    searchTeams: (query: string) =>
      fetchApi<Team[]>(`/v1/matches/teams/search?q=${encodeURIComponent(query)}`),

    getTeamStats: (teamId: number, season?: number) => {
      const params = season ? `?season=${season}` : ''
      return fetchApi<TeamWithStats>(`/v1/matches/teams/${teamId}/stats${params}`)
    },

    getMatchAnalysis: (matchId: number) =>
      fetchApi<MatchAnalysis>(`/v1/matches/${matchId}/analysis`),
  },
}

export type {
  Team,
  TeamStats,
  TeamWithStats,
  MatchStatus,
  Match,
  MatchPrediction,
  UpcomingMatchResponse,
  ModelPerformance,
  PredictionRequest,
  MatchAnalysis,
} from '../types'