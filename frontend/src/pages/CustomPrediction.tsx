import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { Team, PredictionRequest, MatchPrediction } from '../types'
import { Search, RotateCcw, Trophy, Target, Zap, TrendingUp, Award } from 'lucide-react'
import { cn } from '../utils'
import { ProgressBar } from '../components/ProgressBar'

export function CustomPrediction() {
  const { user: _user } = useAuth()
  const [homeTeamQuery, setHomeTeamQuery] = useState('')
  const [awayTeamQuery, setAwayTeamQuery] = useState('')
  const [homeTeamResults, setHomeTeamResults] = useState<Team[]>([])
  const [awayTeamResults, setAwayTeamResults] = useState<Team[]>([])
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<Team | null>(null)
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<Team | null>(null)
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)
  const [prediction, setPrediction] = useState<MatchPrediction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHomeResults, setShowHomeResults] = useState(false)
  const [showAwayResults, setShowAwayResults] = useState(false)

  const searchTeams = async (query: string, isHome: boolean) => {
    if (query.length < 2) {
      if (isHome) setHomeTeamResults([])
      else setAwayTeamResults([])
      return
    }

    try {
      const data = await api.matches.searchTeams(query)
      if (isHome) setHomeTeamResults(data)
      else setAwayTeamResults(data)
    } catch (err) {
      console.error('Team search failed:', err)
    }
  }

  const handlePredict = async () => {
    if (!selectedHomeTeam || !selectedAwayTeam) {
      setError('Please select both teams')
      return
    }

    if (selectedHomeTeam.id === selectedAwayTeam.id) {
      setError('Teams must be different')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const request: PredictionRequest = {
        home_team_id: selectedHomeTeam.id,
        away_team_id: selectedAwayTeam.id,
        match_date: matchDate,
      }

      const data = await api.matches.predictCustom(request)
      setPrediction(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Prediction failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedHomeTeam(null)
    setSelectedAwayTeam(null)
    setHomeTeamQuery('')
    setAwayTeamQuery('')
    setHomeTeamResults([])
    setAwayTeamResults([])
    setPrediction(null)
    setError(null)
    setMatchDate(new Date().toISOString().split('T')[0])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Custom Prediction</h1>
        <p className="text-muted-foreground">Get AI predictions for any matchup</p>
      </div>

      {/* Team Selection */}
      <div className="grid md:grid-cols-2 gap-6">
        <TeamSelector
          label="Home Team"
          query={homeTeamQuery}
          setQuery={setHomeTeamQuery}
          results={homeTeamResults}
          selectedTeam={selectedHomeTeam}
          setSelectedTeam={setSelectedHomeTeam}
          showResults={showHomeResults}
          setShowResults={setShowHomeResults}
          onSearch={searchTeams}
          isHome={true}
        />

        <TeamSelector
          label="Away Team"
          query={awayTeamQuery}
          setQuery={setAwayTeamQuery}
          results={awayTeamResults}
          selectedTeam={selectedAwayTeam}
          setSelectedTeam={setSelectedAwayTeam}
          showResults={showAwayResults}
          setShowResults={setShowAwayResults}
          onSearch={searchTeams}
          isHome={false}
        />
      </div>

      {/* Match Date */}
      <div className="rounded-xl border border-border bg-card p-6">
        <label className="block text-sm font-medium text-foreground mb-2">Match Date</label>
        <input
          type="date"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full max-w-md px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handlePredict}
          disabled={isLoading || !selectedHomeTeam || !selectedAwayTeam}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Zap className="h-5 w-5" />
          {isLoading ? 'Predicting...' : 'Get Prediction'}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
        >
          <RotateCcw className="h-5 w-5" />
          Reset
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {/* Prediction Results */}
      {prediction && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Prediction Results</h2>

          {/* Confidence */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Model Confidence</h3>
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
                prediction.confidence_score >= 75 ? 'bg-green-500/10 border-green-500/20 text-green-600' :
                prediction.confidence_score >= 60 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600' :
                'bg-red-500/10 border-red-500/20 text-red-600'
              )}>
                <Zap className="h-4 w-4" />
                <span>{prediction.confidence_score}%</span>
              </div>
            </div>
            <ProgressBar value={prediction.confidence_score} />
          </div>

          {/* 1X2 */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Match Result (1X2)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <ProbabilityCard label="Home Win" probability={prediction.prob_home_win} color="bg-primary-500" icon={<Trophy className="h-5 w-5" />} />
              <ProbabilityCard label="Draw" probability={prediction.prob_draw} color="bg-yellow-500" icon={<Target className="h-5 w-5" />} />
              <ProbabilityCard label="Away Win" probability={prediction.prob_away_win} color="bg-blue-500" icon={<Trophy className="h-5 w-5" />} />
            </div>
          </div>

          {/* Score Predictions */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Predicted Scores
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              {prediction.predicted_score_1 && (
                <ScoreBadge score={prediction.predicted_score_1} probability={prediction.prob_score_1} rank={1} />
              )}
              {prediction.predicted_score_2 && (
                <ScoreBadge score={prediction.predicted_score_2} probability={prediction.prob_score_2} rank={2} />
              )}
              {prediction.predicted_score_3 && (
                <ScoreBadge score={prediction.predicted_score_3} probability={prediction.prob_score_3} rank={3} />
              )}
            </div>
          </div>

          {/* Over/Under & BTTS */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Over / Under 2.5
              </h3>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{Math.round(prediction.prob_over_25 * 100)}%</p>
                  <p className="text-sm text-muted-foreground">Over 2.5</p>
                </div>
                <div className="flex-1 mx-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${prediction.prob_over_25 * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${prediction.prob_under_25 * 100}%` }} />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{Math.round(prediction.prob_under_25 * 100)}%</p>
                  <p className="text-sm text-muted-foreground">Under 2.5</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Both Teams To Score
              </h3>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{Math.round(prediction.prob_btts_yes * 100)}%</p>
                  <p className="text-sm text-muted-foreground">Yes</p>
                </div>
                <div className="flex-1 mx-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${prediction.prob_btts_yes * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${prediction.prob_btts_no * 100}%` }} />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{Math.round(prediction.prob_btts_no * 100)}%</p>
                  <p className="text-sm text-muted-foreground">No</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!prediction && !isLoading && !selectedHomeTeam && !selectedAwayTeam && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Search for teams and select a matchup to get predictions</p>
        </div>
      )}
    </div>
  )
}

function TeamSelector({
  label,
  query,
  setQuery,
  results,
  selectedTeam,
  setSelectedTeam,
  showResults,
  setShowResults,
  onSearch,
  isHome,
}: {
  label: string
  query: string
  setQuery: (q: string) => void
  results: Team[]
  selectedTeam: Team | null
  setSelectedTeam: (team: Team | null) => void
  showResults: boolean
  setShowResults: (show: boolean) => void
  onSearch: (q: string, isHome: boolean) => void
  isHome: boolean
}) {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>

      {selectedTeam ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          {selectedTeam.logo && <img src={selectedTeam.logo} alt={selectedTeam.name} className="h-12 w-12 rounded-full object-cover" />}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{selectedTeam.name}</p>
            <p className="text-sm text-muted-foreground">{selectedTeam.country || 'Unknown'}</p>
          </div>
          <button
            onClick={() => setSelectedTeam(null)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
            aria-label="Clear selection"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onSearch(e.target.value, isHome)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder="Search teams..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {showResults && results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
              {results.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setSelectedTeam(team)
                    setQuery(team.name)
                    setShowResults(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left transition-colors"
                >
                  {team.logo && <img src={team.logo} alt={team.name} className="h-8 w-8 rounded-full object-cover" />}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{team.country} • {team.league_id}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProbabilityCard({ label, probability, color, icon }: { label: string; probability: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl text-center border border-border bg-card">
      <div className={cn('h-12 w-12 mx-auto mb-3 rounded-full flex items-center justify-center', color + '/10')}>
        <span className={cn(color.replace('500', '600'))}>{icon}</span>
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{Math.round(probability * 100)}%</p>
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${probability * 100}%` }} />
      </div>
    </div>
  )
}

function ScoreBadge({ score, probability, rank }: { score: string; probability: number | null; rank: number }) {
  const rankColors = {
    1: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200',
    2: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300 border border-secondary-200',
    3: 'bg-muted text-muted-foreground border border-border',
  }

  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border">
      <span className="text-xs font-medium text-muted-foreground">#{rank}</span>
      <span className={cn('text-xl font-mono font-bold', rankColors[rank as keyof typeof rankColors])}>
        {score}
      </span>
      {probability && (
        <span className="text-xs text-muted-foreground">({Math.round(probability * 100)}%)</span>
      )}
    </div>
  )
}