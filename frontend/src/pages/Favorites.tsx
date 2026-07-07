import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { League, Team, UpcomingMatchResponse } from '../types'
import { Heart, Trash2, Calendar, MapPin, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils'

export function Favorites() {
  const { user: _user } = useAuth()
  const [favoriteTeams, setFavoriteTeams] = useState<Team[]>([])
  const [favoriteLeagues, setFavoriteLeagues] = useState<League[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatchResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'teams' | 'leagues' | 'matches'>('teams')

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      // Mock data - in real app would call API
      // const [teams, leagues] = await Promise.all([
      //   api.favorites.getTeams(),
      //   api.favorites.getLeagues(),
      // ])
      setFavoriteTeams([])
      setFavoriteLeagues([])

      // Load upcoming matches for favorite teams/leagues
      if (favoriteLeagues.length > 0) {
        const leagueIds = favoriteLeagues.map(l => l.id)
        for (const leagueId of leagueIds) {
          const matches = await api.matches.getUpcoming(7, leagueId)
          setUpcomingMatches(prev => [...prev, ...matches])
        }
      } else {
        const matches = await api.matches.getUpcoming(7)
        setUpcomingMatches(matches)
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const removeFavoriteTeam = async (teamId: number) => {
    try {
      // await api.favorites.removeTeam(teamId)
      setFavoriteTeams(prev => prev.filter(t => t.id !== teamId))
    } catch (err) {
      console.error('Failed to remove favorite team:', err)
    }
  }

  const removeFavoriteLeague = async (leagueId: number) => {
    try {
      // await api.favorites.removeLeague(leagueId)
      setFavoriteLeagues(prev => prev.filter(l => l.id !== leagueId))
    } catch (err) {
      console.error('Failed to remove favorite league:', err)
    }
  }

  const tabs = [
    { key: 'teams', label: 'Teams', icon: Heart, count: favoriteTeams.length },
    { key: 'leagues', label: 'Leagues', icon: Trophy, count: favoriteLeagues.length },
    { key: 'matches', label: 'Upcoming Matches', icon: Trophy, count: upcomingMatches.length },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Favorites</h1>
        <p className="text-muted-foreground">Track your favorite teams, leagues, and upcoming matches</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Favorite Teams */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {favoriteTeams.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No favorite teams yet</h3>
              <p className="text-muted-foreground mb-6">Add teams to track their matches and get notifications</p>
              <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Browse Teams
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {favoriteTeams.map((team) => (
                <div key={team.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    {team.logo && <img src={team.logo} alt={team.name} className="h-14 w-14 rounded-full object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold truncate">{team.name}</h4>
                        <button
                          onClick={() => removeFavoriteTeam(team.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove favorite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {team.short_name && <p className="text-sm text-muted-foreground">{team.short_name}</p>}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        {team.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {team.country}
                          </span>
                        )}
                        {team.venue_name && (
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="h-3 w-3" />
                            {team.venue_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorite Leagues */}
      {activeTab === 'leagues' && (
        <div className="space-y-4">
          {favoriteLeagues.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No favorite leagues yet</h3>
              <p className="text-muted-foreground mb-6">Add leagues to see their upcoming matches in one place</p>
              <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Browse Leagues
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {favoriteLeagues.map((league) => (
                <div key={league.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    {league.logo && <img src={league.logo} alt={league.name} className="h-14 w-14 rounded object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold truncate">{league.name}</h4>
                        <button
                          onClick={() => removeFavoriteLeague(league.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove favorite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">{league.country} • Season {league.season}</p>
                      {league.flag && (
                        <img src={league.flag} alt="" className="h-5 w-8 rounded mt-2" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Matches for Favorites */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {upcomingMatches.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No upcoming matches</h3>
              <p className="text-muted-foreground">Matches for your favorite teams/leagues will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.slice(0, 20).map((matchData) => (
                <div
                  key={matchData.match.id}
                  className="rounded-xl border border-border bg-card p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    {/* Date & League */}
                    <div className="flex flex-col items-center gap-1 w-20 flex-shrink-0">
                      <span className="text-lg font-bold text-primary-600">
                        {format(new Date(matchData.match.match_date), 'MMM d')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(matchData.match.match_date), 'HH:mm')}
                      </span>
                      {matchData.match.league?.logo && (
                        <img
                          src={matchData.match.league.logo}
                          alt={matchData.match.league.name}
                          className="h-6 w-6 rounded mt-1"
                        />
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {matchData.match.home_team?.logo && (
                          <img
                            src={matchData.match.home_team.logo}
                            alt={matchData.match.home_team.name}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="text-right min-w-0">
                          <p className="font-medium truncate">{matchData.match.home_team?.name}</p>
                          <p className="text-xs text-muted-foreground">Home</p>
                        </div>
                      </div>

                      {/* VS / Prediction */}
                      <div className="flex flex-col items-center gap-1 px-3">
                        {matchData.prediction && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-medium">
                              {Math.round(matchData.prediction.prob_home_win * 100)}%
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span className="font-medium">
                              {Math.round(matchData.prediction.prob_away_win * 100)}%
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground font-medium">VS</span>
                        {matchData.match.odd_home && matchData.match.odd_draw && matchData.match.odd_away && (
                          <span className="text-xs text-muted-foreground">
                            {matchData.match.odd_home} | {matchData.match.odd_draw} | {matchData.match.odd_away}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-left min-w-0">
                          <p className="font-medium truncate">{matchData.match.away_team?.name}</p>
                          <p className="text-xs text-muted-foreground">Away</p>
                        </div>
                        {matchData.match.away_team?.logo && (
                          <img
                            src={matchData.match.away_team.logo}
                            alt={matchData.match.away_team.name}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    {/* Status & Confidence */}
                    <div className="flex flex-col items-end gap-1">
                      {matchData.prediction && (
                        <div className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          matchData.prediction.confidence_score >= 75 ? 'bg-green-100 text-green-700' :
                          matchData.prediction.confidence_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {matchData.prediction.confidence_score}%
                        </div>
                      )}
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        matchData.match.status === 'finished' ? 'bg-green-100 text-green-700' :
                        matchData.match.status === 'live' ? 'bg-red-100 text-red-700 animate-pulse' :
                        'bg-blue-100 text-blue-700'
                      )}>
                        {matchData.match.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}