import { cn } from '@/utils'

interface LeagueFilterProps {
  leagues: Array<{ id: number; name: string; country: string }>
  selectedLeague: number | 'all'
  onChange: (leagueId: number | 'all') => void
}

export function LeagueFilter({ leagues, selectedLeague, onChange }: LeagueFilterProps) {
  return (
    <select
      value={selectedLeague}
      onChange={(e) => onChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
      className={cn(
        'flex h-10 w-full items-center px-3 rounded-lg border border-input bg-background',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'sm:w-auto sm:text-sm'
      )}
    >
      <option value="all">All Leagues</option>
      {leagues.map((league) => (
        <option key={league.id} value={league.id}>
          {league.name} ({league.country})
        </option>
      ))}
    </select>
  )
}