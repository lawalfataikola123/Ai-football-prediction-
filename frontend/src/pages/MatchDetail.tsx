import { useEffect, useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { api } from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Calendar, MapPin, Trophy, Target, Zap, TrendingUp, Award, Brain, Lightbulb, AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '../utils'

export function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const [matchData, setMatchData] = useState<any | null>(null)
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadMatch()
    }
  }, [id])

  const loadMatch = async () => {
    try {
      const data = await api.matches.getMatch(parseInt(id!))
      setMatchData(data)

      // Load AI analysis in parallel
      api.matches.getMatchAnalysis(parseInt(id!))
        .then(setAnalysis)
        .catch(() => setAnalysis(null))
        .finally(() => setIsAnalysisLoading(false))
    } catch (err) {
      setError('Failed to load match details')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !matchData) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || 'Match not found'}</p>
        <NavLink to="/" className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </NavLink>
      </div>
    )
  }

  const { match, prediction } = matchData
  const homeTeam = match.home_team!
  const awayTeam = match.away_team!
  const league = match.league!

  const getResultPrediction = () => {
    if (!prediction) return null
    const probs = {
      home: prediction.prob_home_win,
      draw: prediction.prob_draw,
      away: prediction.prob_away_win,
    }
    return Object.entries(probs).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
  }

  const resultPrediction = getResultPrediction()
  const confidence = prediction?.confidence_score || 0

  const getConfidenceColor = (score: number) => {
    if (score >= 75) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBg = (score: number) => {
    if (score >= 75) return 'bg-green-500/10 border-green-500/20'
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          Back
        </NavLink>
      </div>

      {/* League & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {league.logo && <img src={league.logo} alt={league.name} className="h-10 w-10 rounded" />}
          <div>
            <p className="text-lg font-semibold">{league.name}</p>
            <p className="text-sm text-muted-foreground">{league.country} • Season {league.season}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{match.venue || 'TBD'}</span>
          </div>
          {prediction && (
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border', getConfidenceBg(confidence))}>
              <Zap className={cn('h-4 w-4', getConfidenceColor(confidence))} />
              <span className={getConfidenceColor(confidence)}>Confidence: {confidence}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Match Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-6 mb-6">
          {/* Home Team */}
          <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
            <div className="text-right min-w-0">
              <p className="text-2xl font-bold truncate">{homeTeam.name}</p>
              {homeTeam.short_name && <p className="text-sm text-muted-foreground">{homeTeam.short_name}</p>}
            </div>
            {homeTeam.logo && (
              <img src={homeTeam.logo} alt={homeTeam.name} className="h-20 w-20 rounded-full object-cover flex-shrink-0" />
            )}
          </div>

          {/* Center: VS / Score / Prediction */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0 px-4">
            {match.status === 'finished' && match.home_score !== null && match.away_score !== null ? (
              <div className="text-4xl font-bold tabular-nums">
                {match.home_score} - {match.away_score}
              </div>
            ) : (
              <span className="text-lg font-medium text-muted-foreground">VS</span>
            )}

            {prediction && resultPrediction && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30">
                {resultPrediction === 'home' && (
                  <>
                    <Award className="h-5 w-5 text-primary-600" />
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Home Win</span>
                  </>
                )}
                {resultPrediction === 'draw' && (
                  <>
                    <Target className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Draw</span>
                  </>
                )}
                {resultPrediction === 'away' && (
                  <>
                    <Award className="h-5 w-5 text-primary-600" />
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Away Win</span>
                  </>
                )}
              </div>
            )}

            {match.status === 'finished' ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                Finished
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {formatDistanceToNow(new Date(match.match_date), { addSuffix: true })}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex items-center justify-start gap-4 min-w-0">
            {awayTeam.logo && (
              <img src={awayTeam.logo} alt={awayTeam.name} className="h-20 w-20 rounded-full object-cover flex-shrink-0" />
            )}
            <div className="text-left min-w-0">
              <p className="text-2xl font-bold truncate">{awayTeam.name}</p>
              {awayTeam.short_name && <p className="text-sm text-muted-foreground">{awayTeam.short_name}</p>}
            </div>
          </div>
        </div>

        {/* Odds */}
        {match.odd_home && match.odd_draw && match.odd_away && (
          <div className="mb-6 p-4 rounded-lg bg-accent/50 border border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Match Odds</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{match.odd_home}</p>
                <p className="text-xs text-muted-foreground">Home Win</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{match.odd_draw}</p>
                <p className="text-xs text-muted-foreground">Draw</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{match.odd_away}</p>
                <p className="text-xs text-muted-foreground">Away Win</p>
              </div>
            </div>
          </div>
        )}

        {/* Predictions */}
        {prediction && (
          <div className="space-y-6">
            {/* 1X2 Probabilities */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Match Result Prediction (1X2)</h3>
              <div className="grid grid-cols-3 gap-4">
                <ProbabilityCard
                  label="Home Win"
                  probability={prediction.prob_home_win}
                  color="bg-primary-500"
                  icon={<Trophy className="h-5 w-5" />}
                  isPredicted={resultPrediction === 'home'}
                />
                <ProbabilityCard
                  label="Draw"
                  probability={prediction.prob_draw}
                  color="bg-yellow-500"
                  icon={<Target className="h-5 w-5" />}
                  isPredicted={resultPrediction === 'draw'}
                />
                <ProbabilityCard
                  label="Away Win"
                  probability={prediction.prob_away_win}
                  color="bg-blue-500"
                  icon={<Trophy className="h-5 w-5" />}
                  isPredicted={resultPrediction === 'away'}
                />
              </div>
            </div>

            {/* Score Predictions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Predicted Scores</h3>
              <div className="flex flex-wrap items-center gap-3">
                {prediction.predicted_score_1 && (
                  <ScoreBadge
                    score={prediction.predicted_score_1}
                    probability={prediction.prob_score_1}
                    rank={1}
                  />
                )}
                {prediction.predicted_score_2 && (
                  <ScoreBadge
                    score={prediction.predicted_score_2}
                    probability={prediction.prob_score_2}
                    rank={2}
                  />
                )}
                {prediction.predicted_score_3 && (
                  <ScoreBadge
                    score={prediction.predicted_score_3}
                    probability={prediction.prob_score_3}
                    rank={3}
                  />
                )}
              </div>
            </div>

            {/* Over/Under & BTTS */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-accent/50 border border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Over / Under 2.5 Goals</h4>
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

              <div className="p-4 rounded-lg bg-accent/50 border border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Both Teams To Score (BTTS)</h4>
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

        {!prediction && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No prediction available for this match</p>
          </div>
        )}
      </div>

      {/* AI Analysis Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI Match Analysis</h3>
            <p className="text-sm text-muted-foreground">
              {analysis?.is_ai_generated ? 'Powered by AI' : 'Statistical analysis'}
            </p>
          </div>
          {analysis?.is_ai_generated && (
            <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </div>
          )}
        </div>

        {isAnalysisLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="h-3 w-48 bg-muted rounded" />
              <div className="h-3 w-64 bg-muted rounded" />
              <div className="h-3 w-56 bg-muted rounded" />
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-5">
            {/* Key Factors */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Key Factors
              </h4>
              <ul className="space-y-2">
                {analysis.key_factors?.map((factor: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-border">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-xs font-bold flex items-center justify-center text-primary-700 dark:text-primary-300">
                      {i + 1}
                    </span>
                    <span className="text-sm">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Match Insight */}
            {analysis.match_insight && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-accent/80 to-accent/30 border border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Match Insight</h4>
                <p className="text-sm leading-relaxed">{analysis.match_insight}</p>
              </div>
            )}

            {/* Prediction Summary */}
            {analysis.prediction_summary && (
              <div className="p-4 rounded-lg bg-primary-50/50 dark:bg-primary-900/10 border border-primary-200/50 dark:border-primary-800/30">
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium">{analysis.prediction_summary}</p>
                </div>
              </div>
            )}

            {/* Betting Tip */}
            {analysis.betting_tip && (
              <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Betting Insight</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300/80">{analysis.betting_tip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Analysis unavailable for this match</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProbabilityCard({
  label,
  probability,
  color,
  icon,
  isPredicted,
}: {
  label: string
  probability: number
  color: string
  icon: React.ReactNode
  isPredicted: boolean
}) {
  return (
    <div className={cn(
      'relative p-4 rounded-xl text-center border-2 transition-all',
      isPredicted ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-border bg-card'
    )}>
      {isPredicted && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-medium bg-primary-500 text-primary-foreground rounded-full">
          PREDICTED
        </div>
      )}
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