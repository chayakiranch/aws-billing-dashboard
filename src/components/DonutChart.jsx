import { Doughnut } from 'react-chartjs-2'

const COLORS = [
  '#38bdf8', '#818cf8', '#34d399',
  '#f59e0b', '#fb923c', '#f472b6'
]

export default function DonutChart({ monthly }) {
  const lastPeriod = monthly?.[monthly.length - 1]
  const groups = lastPeriod?.Groups || []

  const sorted = [...groups]
    .sort((a, b) =>
      parseFloat(b.Metrics.UnblendedCost.Amount) -
      parseFloat(a.Metrics.UnblendedCost.Amount)
    )
    .slice(0, 6)

  if (sorted.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5
                       flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    )
  }

  const labels = sorted.map(g => g.Keys[0])
  const values = sorted.map(g =>
    parseFloat(g.Metrics.UnblendedCost.Amount)
  )
  const total = values.reduce((a, b) => a + b, 0)

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: COLORS,
      borderColor: '#111827',
      borderWidth: 2,
      hoverOffset: 4
    }]
  }

  const options = {
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        callbacks: {
          label: (ctx) => ` $${ctx.parsed.toFixed(2)}`
        }
      }
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Cost by Service</h2>
        <span className="text-xs text-gray-400">MTD</span>
      </div>

      <div className="relative h-40">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex items-center
                        justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-white font-mono font-semibold text-sm">
              ${total.toFixed(0)}
            </p>
            <p className="text-gray-500 text-xs">total</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {sorted.map((g, i) => {
          const cost = parseFloat(g.Metrics.UnblendedCost.Amount)
          const pct = total > 0
            ? ((cost / total) * 100).toFixed(1)
            : '0.0'
          const name = g.Keys[0]
          const shortName = name.length > 22
            ? name.slice(0, 22) + '...'
            : name
          return (
            <div key={i}
              className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ background: COLORS[i] }}
                />
                <span className="text-xs text-gray-400 truncate">
                  {shortName}
                </span>
              </div>
              <span className="text-xs font-mono text-gray-300 ml-2
                               flex-shrink-0">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}