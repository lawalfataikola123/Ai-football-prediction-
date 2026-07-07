import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UpcomingMatchResponse, League, Team } from '../types'
import { User as UserIcon, Heart, LogOut, Settings, Trophy, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils'

export function Profile() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'predictions' | 'settings'>('overview')
  const [favorites, setFavorites] = useState<{ teams: Team[]; leagues: League[] }>({ teams: [], leagues: [] })
  const [predictions, setPredictions] = useState<UpcomingMatchResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    username: user?.username || '',
    notifications: true,
    dark_mode: false,
  })

  useEffect(() => {
    if (activeTab === 'favorites') loadFavorites()
    if (activeTab === 'predictions') loadPredictions()
  }, [activeTab])

  const loadFavorites = async () => {
    // Mock for now - would call API
    setFavorites({ teams: [], leagues: [] })
  }

  const loadPredictions = async () => {
    // Mock for now - would call API
    setPredictions([])
  }

  const handleSettingsChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      // Would call API to update profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      // In real app: await api.auth.updateProfile(settings)
      // setUser(updatedUser)
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: UserIcon },
    { key: 'favorites', label: 'Favorites', icon: Heart },
    { key: 'predictions', label: 'My Predictions', icon: Trophy },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
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
            </button>
          )
        })}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* User Info Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <UserIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user?.username}</h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {user?.role}
                    </span>
                    {user?.is_verified && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4 text-center md:justify-start">
                <div className="p-4 rounded-lg bg-accent/50">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Favorites</p>
                </div>
                <div className="p-4 rounded-lg bg-accent/50">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Predictions</p>
                </div>
                <div className="p-4 rounded-lg bg-accent/50">
                  <p className="text-2xl font-bold">{user?.created_at ? new Date(user.created_at).getFullYear() : '2024'}</p>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Prediction Accuracy
              </h3>
              <div className="text-center">
                <div className="relative w-40 h-40 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted-foreground/20"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={439.8}
                      strokeDashoffset={439.8 * 0.3}
                      fill="none"
                      className="text-primary-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">65%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Overall accuracy</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Betting ROI
              </h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">+12.5%</p>
                <p className="text-sm text-muted-foreground">Flat stake return</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Favorite Teams</h3>
            {favorites.teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No favorite teams yet</p>
                <p className="text-sm">Add teams from the dashboard or team pages</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {favorites.teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50">
                    {team.logo && <img src={team.logo} alt={team.name} className="h-10 w-10 rounded-full object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.name}</p>
                      <p className="text-sm text-muted-foreground">{team.country}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Favorite Leagues</h3>
            {favorites.leagues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No favorite leagues yet</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {favorites.leagues.map((league) => (
                  <div key={league.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50">
                    {league.logo && <img src={league.logo} alt={league.name} className="h-10 w-10 rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{league.name}</p>
                      <p className="text-sm text-muted-foreground">{league.country} • Season {league.season}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Your Prediction History</h3>
            {predictions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No predictions yet</p>
                <p className="text-sm">Start making predictions on the dashboard</p>
              </div>
            ) : (
              <div className="space-y-3">
                {predictions.map((matchData) => (
                  <div key={matchData.match.id} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {matchData.match.home_team?.name} vs {matchData.match.away_team?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(matchData.match.match_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {matchData.prediction && (
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-700">
                          {matchData.prediction.confidence_score}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-6">Account Settings</h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">Username</label>
                <input
                  id="username"
                  type="text"
                  value={settings.username}
                  onChange={(e) => handleSettingsChange('username', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleSettingsChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  value={settings.full_name}
                  onChange={(e) => handleSettingsChange('full_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">New Password (leave blank to keep current)</label>
                <input
                  id="password"
                  type="password"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter new password"
                />
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-6">Preferences</h3>
            <div className="space-y-4 max-w-md">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive prediction alerts and updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingsChange('notifications', e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dark_mode}
                  onChange={(e) => handleSettingsChange('dark_mode', e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h3>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}