import { useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'

const COLORS = [
  '#38bdf8', '#818cf8', '#34d399',
  '#f59e0b', '#fb923c', '#f472b6', '#a78bfa'
]

const RANGE_OPTIONS = [
  { label: '6 months', months: 6 },
  { label: '1 year',   months: 12 },
  { label: '2 years',  months: 24 },
  { label: '3 years',  months: 36 },
]

export default function TrendChart({ monthly, onRangeChange }) {
  const [chartType, setChartType] = useState('bar')
  const [activeRange, setActiveRange] = useState(6)

  const handleRangeChange = (months) => {
    setActiveRange(months)
    onRangeChange(months)
  }

  if (!monthly || monthly.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5
                       flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    )
  }

  const labels = monthly.map(p => {
    const date = new Date(p.TimePeriod.Start)
    return date.toLocaleString('default', {
      month: 'short',
      year: activeRange > 6 ? '2-digit' : undefined
    })
  })

  const totals = monthly.map(p =>
    p.Groups?.reduce((sum, g) =>
      sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0
  )

  const isStacked = chartType === 'stacked'
  const ChartComponent = chartType === 'line' ? Line : Bar

  const simpleDataset = {
    label: 'Total Cost',
    data: totals,
    backgroundColor: chartType === 'line'
      ? 'rgba(56,189,248,0.08)'
      : totals.map((_, i) =>
          i === totals.length - 1 ? '#38bdf8' : '#38bdf844'),
    borderColor: '#38bdf8',
    borderWidth: 2,
    pointRadius: chartType === 'line' ? 3 : 0,
    fill: chartType === 'line',
    tension: 0.4
  }

  const data = { labels, datasets: [simpleDataset] }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        callbacks: {
          label: (ctx) => ` $${ctx.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(99,179,237,0.05)' },
        ticks: {
          color: '#475569',
          font: { size: 10 },
          maxRotation: activeRange > 12 ? 45 : 0
        }
      },
      y: {
        grid: { color: 'rgba(99,179,237,0.05)' },
        ticks: {
          color: '#475569',
          font: { size: 11 },
          callback: (v) => `$${v.toFixed(0)}`
        }
      }
    }
  }

  const chartTabs = ['bar', 'line', 'stacked']

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Monthly Cost Trend
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Last {RANGE_OPTIONS.find(r => r.months === activeRange)?.label}
          </p>
        </div>
        <div className="flex gap-1">
          {chartTabs.map(t => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`px-3 py-1 rounded text-xs font-medium
                capitalize transition ${chartType === t
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Range selector */}
      <div className="flex gap-1 mb-4">
        {RANGE_OPTIONS.map(({ label, months }) => (
          <button
            key={months}
            onClick={() => handleRangeChange(months)}
            className={`px-3 py-1 rounded-full text-xs font-medium
              transition border ${activeRange === months
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'text-gray-500 border-gray-700 hover:text-white hover:border-gray-500'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-56">
        <ChartComponent
          key={`${chartType}-${activeRange}`}
          data={data}
          options={options}
        />
      </div>
    </div>
  )
}