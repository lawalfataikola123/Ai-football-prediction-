import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { TrendingUp, Trophy, BarChart2 } from 'lucide-react'
import { api } from '../services/api'
import { UpcomingMatchResponse, League } from '../types'
import { MatchCard } from '../components/MatchCard'
import { LeagueFilter } from '../components/LeagueFilter'
import { cn } from '../utils'

export function Dashboard() {
  const { user: _user } = useAuth()
  const [matches, setMatches] = useState<UpcomingMatchResponse[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<number | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadMatches()
  }, [selectedLeague])

  const loadData = async () => {
    try {
      const [leaguesData] = await Promise.all([
        api.matches.getLeagues(),
      ])
      setLeagues(leaguesData)
    } catch (err) {
      console.error('Failed to load leagues:', err)
    }
  }

  const loadMatches = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.matches.getUpcoming(7, selectedLeague === 'all' ? undefined : selectedLeague)
      setMatches(data)
    } catch (err) {
      setError('Failed to load matches')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getHighConfidenceMatches = () => {
    return matches.filter(m => m.prediction && m.prediction.confidence_score >= 75).length
  }

  const getTotalMatches = () => matches.length

  const getAvgConfidence = () => {
    const withPred = matches.filter(m => m.prediction)
    if (withPred.length === 0) return 0
    return Math.round(withPred.reduce((sum, m) => sum + (m.prediction?.confidence_score || 0), 0) / withPred.length)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Upcoming matches with AI predictions</p>
        </div>
        <LeagueFilter
          leagues={leagues}
          selectedLeague={selectedLeague}
          onChange={setSelectedLeague}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Matches"
          value={getTotalMatches()}
          icon={Trophy}
          color="blue"
        />
        <StatCard
          title="High Confidence"
          value={getHighConfidenceMatches()}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Avg Confidence"
          value={`${getAvgConfidence()}%`}
          icon={BarChart2}
          color="purple"
        />
        <StatCard
          title="Leagues"
          value={leagues.length}
          icon={Trophy}
          color="orange"
        />
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="text-center py-12">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No upcoming matches</h3>
            <p className="text-muted-foreground">Check back later or adjust your filters</p>
          </div>
        ) : (
          matches.map((matchData) => (
            <MatchCard key={matchData.match.id} matchData={matchData} />
          ))
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={cn('p-3 rounded-full', colorClasses[color as keyof typeof colorClasses])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}