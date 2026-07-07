import { cn } from '../utils'

interface ProgressBarProps {
  value: number // 0-100
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function ProgressBar({ value, color = 'primary', size = 'md', showLabel = false, className }: ProgressBarProps) {
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  }

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('w-full rounded-full bg-muted overflow-hidden', sizeClasses[size], className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500 ease-out',
          colorClasses[color]
        )}
        style={{ width: `${clampedValue}%` }}
      />
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
          {clampedValue}%
        </div>
      )}
    </div>
  )
}