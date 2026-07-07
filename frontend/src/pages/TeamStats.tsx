import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'
import type { TeamStats, TeamWithStats } from '../types'
import { ArrowLeft, Trophy, Target, Calendar, MapPin, TrendingUp, Award } from 'lucide-react'
import { cn } from '../utils'

export function TeamStats() {
  const { id } = useParams<{ id: string }>()
  const [teamData, setTeamData] = useState<TeamWithStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season, setSeason] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    if (id) {
      loadTeamStats()
    }
  }, [id, season])

  const loadTeamStats = async () => {
    try {
      const data = await api.matches.getTeamStats(parseInt(id!), season)
      setTeamData(data)
    } catch (err) {
      setError('Failed to load team stats')
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

  if (error || !teamData) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || 'Team not found'}</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const { team, stats } = teamData

  if (!stats) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No statistics available for this season</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const winRate = stats.played > 0 ? (stats.won / stats.played * 100).toFixed(1) : '0.0'
  const homeWinRate = stats.home_played > 0 ? (stats.home_won / stats.home_played * 100).toFixed(1) : '0.0'
  const awayWinRate = stats.away_played > 0 ? (stats.away_won / stats.away_played * 100).toFixed(1) : '0.0'
  const avgGoalsFor = stats.played > 0 ? (stats.goals_for / stats.played).toFixed(2) : '0.00'
  const avgGoalsAgainst = stats.played > 0 ? (stats.goals_against / stats.played).toFixed(2) : '0.00'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          Back
        </Link>
      </div>

      {/* Team Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-6">
          {team.logo && <img src={team.logo} alt={team.name} className="h-20 w-20 rounded-full object-cover" />}
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            {team.short_name && <p className="text-lg text-muted-foreground">{team.short_name}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              {team.country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {team.country}
                </span>
              )}
              {team.founded && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Founded: {team.founded}
                </span>
              )}
              {team.venue_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {team.venue_name} {team.venue_capacity && `(${team.venue_capacity.toLocaleString()})`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="season" className="text-sm font-medium text-muted-foreground">Season:</label>
          <select
            id="season"
            value={season}
            onChange={(e) => setSeason(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Played" value={stats.played} icon={<Calendar className="h-5 w-5" />} color="bg-blue-500/10 text-blue-600" />
        <StatCard label="Wins" value={stats.won} icon={<Trophy className="h-5 w-5" />} color="bg-green-500/10 text-green-600" />
        <StatCard label="Draws" value={stats.draw} icon={<Target className="h-5 w-5" />} color="bg-yellow-500/10 text-yellow-600" />
        <StatCard label="Losses" value={stats.lost} icon={<Award className="h-5 w-5" />} color="bg-red-500/10 text-red-600" />
        <StatCard label="Points" value={stats.points} icon={<TrendingUp className="h-5 w-5" />} color="bg-purple-500/10 text-purple-600" />
        <StatCard label="Win Rate" value={`${winRate}%`} icon={<TrendingUp className="h-5 w-5" />} color="bg-emerald-500/10 text-emerald-600" />
        <StatCard label="Goals For" value={stats.goals_for} icon={<Target className="h-5 w-5" />} color="bg-orange-500/10 text-orange-600" />
        <StatCard label="Goals Against" value={stats.goals_against} icon={<Award className="h-5 w-5" />} color="bg-rose-500/10 text-rose-600" />
      </div>

      {/* Home / Away / Overall Breakdown */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatSection title="Overall" stats={[
          { label: 'Played', value: stats.played },
          { label: 'Won', value: stats.won },
          { label: 'Draw', value: stats.draw },
          { label: 'Lost', value: stats.lost },
          { label: 'Goals For', value: stats.goals_for },
          { label: 'Goals Against', value: stats.goals_against },
          { label: 'Goal Diff', value: stats.goals_for - stats.goals_against },
          { label: 'Points', value: stats.points },
          { label: 'Avg Goals For', value: avgGoalsFor },
          { label: 'Avg Goals Against', value: avgGoalsAgainst },
        ]} />

        <StatSection title="Home" stats={[
          { label: 'Played', value: stats.home_played },
          { label: 'Won', value: stats.home_won },
          { label: 'Draw', value: stats.home_draw },
          { label: 'Lost', value: stats.home_lost },
          { label: 'Goals For', value: stats.home_goals_for },
          { label: 'Goals Against', value: stats.home_goals_against },
          { label: 'Win Rate', value: `${homeWinRate}%` },
        ]} />

        <StatSection title="Away" stats={[
          { label: 'Played', value: stats.away_played },
          { label: 'Won', value: stats.away_won },
          { label: 'Draw', value: stats.away_draw },
          { label: 'Lost', value: stats.away_lost },
          { label: 'Goals For', value: stats.away_goals_for },
          { label: 'Goals Against', value: stats.away_goals_against },
          { label: 'Win Rate', value: `${awayWinRate}%` },
        ]} />
      </div>

      {/* Form */}
      {stats.form && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Form (Last 5)
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.form.split('').map((char, idx) => (
              <div
                key={idx}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg',
                  char === 'W' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  char === 'D' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                )}
              >
                {char}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn('p-4 rounded-xl border border-border bg-card', color)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-lg font-bold">{value}</span>
      </div>
      <div className="mt-2 text-2xl">{icon}</div>
    </div>
  )
}

function StatSection({ title, stats }: { title: string; stats: { label: string; value: string | number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">{title}</h3>
      <div className="space-y-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex justify-between py-2 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <span className="font-medium tabular-nums">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}