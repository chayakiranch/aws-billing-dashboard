import { useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'

function getMonthLabel(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString('default', { month: 'short' })
}

function getServiceTotals(monthly) {
  const serviceMap = {}
  monthly.forEach(period => {
    period.Groups?.forEach(g => {
      const name = g.Keys[0]
      const cost = parseFloat(g.Metrics.UnblendedCost.Amount)
      if (!serviceMap[name]) serviceMap[name] = []
      serviceMap[name].push(cost)
    })
  })
  return serviceMap
}

const COLORS = [
  '#38bdf8', '#818cf8', '#34d399',
  '#f59e0b', '#fb923c', '#f472b6', '#a78bfa'
]

export default function TrendChart({ monthly }) {
  const [chartType, setChartType] = useState('bar')

  if (!monthly || monthly.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5
                       flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    )
  }

  const labels = monthly.map(p => getMonthLabel(p.TimePeriod.Start))

  const totals = monthly.map(p =>
    p.Groups?.reduce((sum, g) =>
      sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0
  )

  const serviceMap = getServiceTotals(monthly)
  const topServices = Object.entries(serviceMap)
    .sort((a, b) =>
      b[1].reduce((s, v) => s + v, 0) -
      a[1].reduce((s, v) => s + v, 0)
    )
    .slice(0, 5)

  const stackedDatasets = topServices.map(([name, values], i) => ({
    label: name.length > 25 ? name.slice(0, 25) + '...' : name,
    data: values,
    backgroundColor: COLORS[i] + '99',
    borderColor: COLORS[i],
    borderWidth: 1,
    stack: 'stack0'
  }))

  const simpleDataset = {
    label: 'Total Cost',
    data: totals,
    backgroundColor: chartType === 'line'
      ? 'rgba(56,189,248,0.08)'
      : totals.map((_, i) =>
          i === totals.length - 1 ? '#38bdf8' : '#38bdf844'
        ),
    borderColor: '#38bdf8',
    borderWidth: 2,
    pointBackgroundColor: '#38bdf8',
    pointRadius: chartType === 'line' ? 4 : 0,
    fill: chartType === 'line',
    tension: 0.4
  }

  const isStacked = chartType === 'stacked'
  const ChartComponent = chartType === 'line' ? Line : Bar

  const data = {
    labels,
    datasets: isStacked ? stackedDatasets : [simpleDataset]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: isStacked,
        labels: {
          color: '#94a3b8',
          font: { size: 10 },
          boxWidth: 10,
          padding: 12
        }
      },
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
        stacked: isStacked,
        grid: { color: 'rgba(99,179,237,0.05)' },
        ticks: { color: '#475569', font: { size: 11 } },
        border: { color: 'rgba(99,179,237,0.08)' }
      },
      y: {
        stacked: isStacked,
        grid: { color: 'rgba(99,179,237,0.05)' },
        ticks: {
          color: '#475569',
          font: { size: 11 },
          callback: (v) => `$${v.toFixed(0)}`
        },
        border: { color: 'rgba(99,179,237,0.08)' }
      }
    }
  }

  const tabs = ['bar', 'line', 'stacked']

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Monthly Cost Trend
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
        </div>
        <div className="flex gap-1">
          {tabs.map(t => (
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
      <div className="h-56">
        <ChartComponent
          key={chartType}
          data={data}
          options={options}
        />
      </div>
    </div>
  )
}