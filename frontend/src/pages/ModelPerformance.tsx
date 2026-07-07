import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { ModelPerformance } from '../types'
import { BarChart2, Target, TrendingUp, Award, RefreshCw } from 'lucide-react'
import { cn } from '../utils'

export function ModelPerformance() {
  const [performance, setPerformance] = useState<ModelPerformance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<'1x2' | 'score' | 'over_under' | 'btts'>('1x2')

  useEffect(() => {
    loadPerformance()
  }, [])

  const loadPerformance = async () => {
    try {
      const data = await api.matches.getModelPerformance()
      setPerformance(data)
    } catch (err) {
      setError('Failed to load model performance')
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

  if (error || !performance) {
    return (
      <div className="text-center py-12">
        <BarChart2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-destructive">{error || 'No performance data available'}</p>
        <button onClick={loadPerformance} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Model Performance</h1>
          <p className="text-muted-foreground">Track prediction accuracy and model metrics</p>
        </div>
        <button onClick={loadPerformance} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Model Selector */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: '1x2', label: '1X2 (Match Result)', icon: <Award className="h-4 w-4" /> },
          { key: 'score', label: 'Exact Score', icon: <Target className="h-4 w-4" /> },
          { key: 'over_under', label: 'Over/Under 2.5', icon: <TrendingUp className="h-4 w-4" /> },
          { key: 'btts', label: 'BTTS', icon: <Award className="h-4 w-4" /> },
        ].map((model) => (
          <button
            key={model.key}
            onClick={() => setSelectedModel(model.key as typeof selectedModel)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
              selectedModel === model.key
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-card text-foreground border-border hover:bg-accent'
            )}
          >
            {model.icon}
            {model.label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Accuracy"
          value={`${(performance.accuracy * 100).toFixed(1)}%`}
          icon={<Target className="h-5 w-5" />}
          color="bg-blue-500/10 text-blue-600"
          trend={performance.accuracy > 0.5 ? 'up' : 'down'}
        />
        <MetricCard
          label="Log Loss"
          value={performance.log_loss.toFixed(4)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="bg-purple-500/10 text-purple-600"
          trend={performance.log_loss < 1 ? 'up' : 'down'}
        />
        <MetricCard
          label="Total Predictions"
          value={performance.total_predictions.toLocaleString()}
          icon={<BarChart2 className="h-5 w-5" />}
          color="bg-green-500/10 text-green-600"
        />
        <MetricCard
          label="Correct Predictions"
          value={performance.correct_predictions.toLocaleString()}
          icon={<Award className="h-5 w-5" />}
          color="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      {/* Confusion Matrix */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Confusion Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Actual \ Predicted</th>
                <th className="text-center p-3 font-medium">Home Win</th>
                <th className="text-center p-3 font-medium">Draw</th>
                <th className="text-center p-3 font-medium">Away Win</th>
              </tr>
            </thead>
            <tbody>
              {performance.confusion_matrix.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-medium">{
                    i === 0 ? 'Home Win' : i === 1 ? 'Draw' : 'Away Win'
                  }</td>
                  {row.map((val, j) => (
                    <td key={j} className="text-center p-3 font-mono tabular-nums">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Class Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { label: 'Home Win', precision: performance.class_precision[0], recall: performance.class_recall[0], f1: performance.class_f1[0] },
          { label: 'Draw', precision: performance.class_precision[1], recall: performance.class_recall[1], f1: performance.class_f1[1] },
          { label: 'Away Win', precision: performance.class_precision[2], recall: performance.class_recall[2], f1: performance.class_f1[2] },
        ].map((cls, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-6">
            <h4 className="text-lg font-semibold mb-4 text-center">{cls.label}</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-blue-500/10">
                <p className="text-2xl font-bold text-blue-600">{(cls.precision * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Precision</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-600">{(cls.recall * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Recall</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10">
                <p className="text-2xl font-bold text-purple-600">{(cls.f1 * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">F1 Score</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ROI & Additional Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Betting ROI (Flat Stake)
          </h3>
          <div className="text-center">
            <p className={cn('text-4xl font-bold', performance.roi_flat_stake >= 0 ? 'text-green-600' : 'text-red-600')}>
              {performance.roi_flat_stake >= 0 ? '+' : ''}{(performance.roi_flat_stake * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Return on Investment</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Last Updated</h3>
          <p className="text-2xl font-medium">{new Date(performance.last_updated).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(performance.last_updated).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Feature Importance */}
      {performance.feature_importance && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Top Feature Importance</h3>
          <div className="space-y-3">
            {Object.entries(performance.feature_importance ?? {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([feature, importance]) => (
                <div key={feature} className="flex items-center gap-4">
                  <span className="w-48 text-sm text-muted-foreground truncate">{feature}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${(importance * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm font-mono text-right tabular-nums">{(importance * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  color,
  trend,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down'
}) {
  return (
    <div className={cn('p-4 rounded-xl border border-border bg-card', color)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {trend && (
          <span className={cn('text-lg', trend === 'up' ? 'text-green-500' : 'text-red-500')}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xl">{icon}</span>
      </div>
    </div>
  )
}