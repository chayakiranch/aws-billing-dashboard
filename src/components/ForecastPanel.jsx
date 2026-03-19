import { formatCurrency, formatShort } from '../utils/formatCurrency'

export default function ForecastPanel({ forecast, monthly }) {
  const forecastAmount = parseFloat(forecast?.Amount || 0)
  const lastPeriod = monthly?.[monthly.length - 1]
  const mtd = lastPeriod?.Groups?.reduce((sum, g) =>
    sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0

  const items = [
    { label: 'MTD Actual', value: formatCurrency(mtd), color: 'text-blue-400' },
    { label: 'End of month', value: formatCurrency(forecastAmount), color: 'text-amber-400' },
    { label: 'Annual run rate', value: formatShort(forecastAmount * 12), color: 'text-white' },
  ]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4">Cost Forecast</h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center
                                   py-2 border-b border-gray-800/50 last:border-0">
            <span className="text-xs text-gray-400">{item.label}</span>
            <span className={`font-mono text-sm font-medium ${item.color}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}