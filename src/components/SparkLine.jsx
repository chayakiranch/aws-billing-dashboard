import { Line } from 'react-chartjs-2'

export default function SparkLine({ daily }) {
  if (!daily || daily.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5
                       flex items-center justify-center h-32">
        <p className="text-gray-500 text-sm">No daily data</p>
      </div>
    )
  }

  const labels = daily.map(d => {
    const date = new Date(d.TimePeriod.Start)
    return `${date.getMonth() + 1}/${date.getDate()}`
  })

  const values = daily.map(d => {
    const groups = d.Groups || []
    if (groups.length > 0) {
      return groups.reduce((sum, g) =>
        sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0)
    }
    return parseFloat(d.Total?.UnblendedCost?.Amount || 0)
  })

  const maxVal = Math.max(...values)
  const minVal = Math.min(...values)

  const data = {
    labels,
    datasets: [{
      data: values,
      borderColor: '#818cf8',
      backgroundColor: 'rgba(129,140,248,0.08)',
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: '#818cf8',
      fill: true,
      tension: 0.4
    }]
  }

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
      x: { display: false },
      y: {
        display: true,
        grid: { color: 'rgba(99,179,237,0.05)' },
        ticks: {
          color: '#475569',
          font: { size: 9 },
          maxTicksLimit: 3,
          callback: (v) => `$${v.toFixed(0)}`
        },
        border: { display: false }
      }
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-white">Daily Spend</h2>
        <span className="text-xs text-gray-400">Last 30 days</span>
      </div>
      <div className="flex gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Peak</p>
          <p className="text-xs font-mono text-red-400">
            ${maxVal.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Low</p>
          <p className="text-xs font-mono text-green-400">
            ${minVal.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg</p>
          <p className="text-xs font-mono text-blue-400">
            ${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}
          </p>
        </div>
      </div>
      <div className="h-24">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}