import { cn } from '@/utils'
import { UpcomingMatchResponse } from '@/types'
import { NavLink } from 'react-router-dom'
import { Calendar, Award, Target, BarChart2, Zap } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface MatchCardProps {
  matchData: UpcomingMatchResponse
}

export function MatchCard({ matchData }: MatchCardProps) {
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
    const maxKey = Object.entries(probs).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
    return maxKey
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
    <NavLink
      to={`/match/${match.id}`}
      className={cn(
        'group relative block rounded-lg border border-border bg-card p-4 transition-all',
        'hover:border-primary-500/50 hover:shadow-lg'
      )}
    >
      {/* Top row: League, Date, Confidence */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {league.logo && (
            <img
              src={league.logo}
              alt={league.name}
              className="h-6 w-6 rounded"
            />
          )}
          <span className="text-sm font-medium text-muted-foreground">{league.name}</span>
          {match.round && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
              {match.round}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(match.match_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{formatDistanceToNow(new Date(match.match_date), { addSuffix: true })}</span>
          </div>

          {prediction && (
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                getConfidenceBg(confidence)
              )}
            >
              <Zap className={cn('h-3 w-3', getConfidenceColor(confidence))} />
              <span className={getConfidenceColor(confidence)}>{confidence}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Home Team */}
        <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
          <div className="text-right min-w-0">
            <p className="font-medium truncate">{homeTeam.name}</p>
            {homeTeam.short_name && (
              <p className="text-xs text-muted-foreground">{homeTeam.short_name}</p>
            )}
          </div>
          {homeTeam.logo && (
            <img
              src={homeTeam.logo}
              alt={homeTeam.name}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
          )}
        </div>

        {/* VS / Prediction */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
          {prediction && resultPrediction && (
            <div className="flex items-center gap-1">
              {resultPrediction === 'home' && (
                <>
                  <Award className="h-4 w-4 text-primary-500" />
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                    Home Win
                  </span>
                </>
              )}
              {resultPrediction === 'draw' && (
                <>
                  <Target className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    Draw
                  </span>
                </>
              )}
              {resultPrediction === 'away' && (
                <>
                  <Award className="h-4 w-4 text-primary-500" />
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                    Away Win
                  </span>
                </>
              )}
            </div>
          )}
          <span className="text-xs text-muted-foreground">VS</span>
          {prediction && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart2 className="h-3 w-3" />
              <span>{Math.round(prediction.prob_home_win * 100)}%</span>
              <span>-</span>
              <span>{Math.round(prediction.prob_draw * 100)}%</span>
              <span>-</span>
              <span>{Math.round(prediction.prob_away_win * 100)}%</span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 flex items-center justify-start gap-3 min-w-0">
          {awayTeam.logo && (
            <img
              src={awayTeam.logo}
              alt={awayTeam.name}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div className="text-left min-w-0">
            <p className="font-medium truncate">{awayTeam.name}</p>
            {awayTeam.short_name && (
              <p className="text-xs text-muted-foreground">{awayTeam.short_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Prediction Details */}
      {prediction && (
        <div className="rounded-lg bg-accent/50 p-3 space-y-3 border border-border/50">
          {/* 1X2 Probabilities */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Home</span>
              <span className="font-medium">{Math.round(prediction.prob_home_win * 100)}%</span>
              <span className="text-muted-foreground">Draw</span>
              <span className="font-medium">{Math.round(prediction.prob_draw * 100)}%</span>
              <span className="text-muted-foreground">Away</span>
              <span className="font-medium">{Math.round(prediction.prob_away_win * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500"
                style={{ width: `${prediction.prob_home_win * 100}%` }}
              />
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${prediction.prob_draw * 100}%` }}
              />
              <div
                className="h-full bg-blue-500"
                style={{ width: `${prediction.prob_away_win * 100}%` }}
              />
            </div>
          </div>

          {/* Score Predictions */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Top Scores:</span>
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

          {/* Over/Under & BTTS */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Over/Under 2.5</p>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  Over {Math.round(prediction.prob_over_25 * 100)}%
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium">
                  Under {Math.round(prediction.prob_under_25 * 100)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">BTTS</p>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  Yes {Math.round(prediction.prob_btts_yes * 100)}%
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium">
                  No {Math.round(prediction.prob_btts_no * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Odds */}
      {match.odd_home && match.odd_draw && match.odd_away && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>1: {match.odd_home}</span>
            <span>X: {match.odd_draw}</span>
            <span>2: {match.odd_away}</span>
          </div>
          <span className="text-xs text-muted-foreground">Odds</span>
        </div>
      )}
    </NavLink>
  )
}

function ScoreBadge({ score, probability, rank }: { score: string; probability: number | null; rank: number }) {
  const rankColors = {
    1: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    2: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300',
    3: 'bg-muted text-muted-foreground',
  }

  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-xs font-mono font-medium',
      rankColors[rank as keyof typeof rankColors]
    )}>
      {score}
      {probability && (
        <span className="ml-1 text-[10px] opacity-70">
          ({Math.round(probability * 100)}%)
        </span>
      )}
    </span>
  )
}