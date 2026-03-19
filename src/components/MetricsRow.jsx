import { formatShort } from '../utils/formatCurrency'

function MetricCard({ label, value, change, changeType, accent }) {
  const accentColors = {
    blue: 'border-t-blue-400',
    purple: 'border-t-purple-400',
    green: 'border-t-green-400',
    amber: 'border-t-amber-400',
  }
  const changeColors = {
    up: 'text-red-400',
    down: 'text-green-400',
    neutral: 'text-gray-400'
  }

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4
                     border-t-2 ${accentColors[accent]}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-2xl font-mono font-semibold text-white mb-1">
        {value}
      </p>
      <p className={`text-xs font-mono ${changeColors[changeType]}`}>
        {change}
      </p>
    </div>
  )
}

export default function MetricsRow({ monthly, forecast }) {
  // Calculate MTD total from last period
  const lastPeriod = monthly?.[monthly.length - 1]
  const mtd = lastPeriod?.Groups?.reduce((sum, g) =>
    sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0

  const forecastAmount = parseFloat(forecast?.Amount || 0)
  const serviceCount = lastPeriod?.Groups?.length || 0

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="MTD Cost"
        value={formatShort(mtd)}
        change="Current month to date"
        changeType="neutral"
        accent="blue"
      />
      <MetricCard
        label="Forecasted"
        value={formatShort(forecastAmount)}
        change="End of month estimate"
        changeType="neutral"
        accent="purple"
      />
      <MetricCard
        label="Active Services"
        value={serviceCount}
        change="Services with usage"
        changeType="neutral"
        accent="green"
      />
      <MetricCard
        label="Forecast vs MTD"
        value={forecastAmount > mtd
          ? `+${formatShort(forecastAmount - mtd)}`
          : formatShort(0)}
        change="Projected increase"
        changeType={forecastAmount > mtd ? "up" : "down"}
        accent="amber"
      />
    </div>
  )
}