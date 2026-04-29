import { Doughnut } from 'react-chartjs-2'
import { formatCurrency } from '../utils/formatCurrency'

const COLORS = [
  '#38bdf8','#818cf8','#34d399','#fb923c',
  '#f472b6','#a78bfa','#fbbf24','#60a5fa',
]

// selectedPeriod — the month clicked in TrendChart (null = use last month)
export default function DonutChart({ monthly, selectedPeriod }) {
  // Use selected period if provided, otherwise fall back to last month
  const activePeriod = selectedPeriod || monthly?.[monthly.length - 1]
  const groups       = activePeriod?.Groups || []

  const sorted = [...groups]
    .sort((a, b) =>
      parseFloat(b.Metrics.UnblendedCost.Amount) -
      parseFloat(a.Metrics.UnblendedCost.Amount))
    .slice(0, 6)

  if (sorted.length === 0) return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5
      flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">No data available</p>
    </div>
  )

  const values = sorted.map(g => parseFloat(g.Metrics.UnblendedCost.Amount))
  const total  = values.reduce((a, b) => a + b, 0)

  const data = {
    labels: sorted.map(g => g.Keys[0]),
    datasets: [{
      data: values,
      backgroundColor: COLORS,
      borderColor: '#111827',
      borderWidth: 2,
      hoverOffset: 4,
    }]
  }

  const options = {
    cutout: '70%', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        callbacks: { label: ctx => ` $${ctx.parsed.toFixed(2)}` }
      }
    }
  }

  // Label for the header
  const periodLabel = activePeriod?.TimePeriod?.Start
    ? new Date(activePeriod.TimePeriod.Start)
        .toLocaleString('default', { month: 'short', year: 'numeric' })
    : 'MTD'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Cost by Service</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          selectedPeriod
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            : 'text-gray-400 border-transparent'
        }`}>
          {selectedPeriod ? periodLabel : 'MTD'}
        </span>
      </div>

      {/* Donut */}
      <div className="relative h-40">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-white font-mono font-semibold text-sm">
              {formatCurrency(total)}
            </p>
            <p className="text-gray-500 text-xs">total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {sorted.map((g, i) => {
          const cost = parseFloat(g.Metrics.UnblendedCost.Amount)
          const pct  = total > 0 ? ((cost / total) * 100).toFixed(1) : '0.0'
          const name = g.Keys[0]
            .replace('Amazon ', '').replace('AWS ', '')
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-gray-400 truncate">{name}</span>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0 font-mono">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}