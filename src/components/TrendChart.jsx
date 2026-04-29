import { useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { formatCurrency } from '../utils/formatCurrency'

const RANGE_OPTIONS = [
  { label: '6 months', months: 6  },
  { label: '1 year',   months: 12 },
  { label: '2 years',  months: 24 },
  { label: '3 years',  months: 36 },
]

const COLORS = [
  '#38bdf8','#818cf8','#34d399','#fb923c',
  '#f472b6','#a78bfa','#fbbf24','#60a5fa',
]

// ── Helper: total for a period ────────────────────────────────────────
function periodTotal(period) {
  return period?.Groups?.reduce((sum, g) =>
    sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0
}

export default function TrendChart({ monthly, onRangeChange, onMonthSelect }) {
  const [chartType,    setChartType]    = useState('bar')
  const [activeRange,  setActiveRange]  = useState(6)
  const [selectedIdx,  setSelectedIdx]  = useState(null)

  const handleRangeChange = (n) => {
    setActiveRange(n)
    setSelectedIdx(null)           // reset selection when range changes
    if (onRangeChange) onRangeChange(n)
    if (onMonthSelect) onMonthSelect(null)
  }

  if (!monthly || monthly.length === 0) return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5
      flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">No data available</p>
    </div>
  )

  const labels = monthly.map(p => {
    const d = new Date(p.TimePeriod.Start)
    return d.toLocaleString('default', {
      month: 'short',
      year:  activeRange > 6 ? '2-digit' : undefined
    })
  })

  const totals = monthly.map(periodTotal)

  // Bar colours — highlight selected bar in bright blue, rest dimmer
  const barColors = totals.map((_, i) => {
    if (selectedIdx === null)
      return i === totals.length - 1 ? '#38bdf8' : '#38bdf844'
    return i === selectedIdx ? '#38bdf8' : '#38bdf822'
  })

  const dataset = chartType === 'stacked'
    ? (() => {
        // Collect all service names
        const serviceNames = [...new Set(
          monthly.flatMap(p => p.Groups?.map(g => g.Keys[0]) || [])
        )]
        return serviceNames.map((svc, si) => ({
          label: svc.replace('Amazon ', '').replace('AWS ', ''),
          data: monthly.map(p => {
            const g = p.Groups?.find(g => g.Keys[0] === svc)
            return g ? parseFloat(g.Metrics.UnblendedCost.Amount) : 0
          }),
          backgroundColor: COLORS[si % COLORS.length],
          borderWidth: 0,
          stack: 'stack',
        }))
      })()
    : [{
        label: 'Total Cost',
        data:  totals,
        backgroundColor: chartType === 'line'
          ? 'rgba(56,189,248,0.08)'
          : barColors,
        borderColor:  '#38bdf8',
        borderWidth:  2,
        pointRadius:  chartType === 'line' ? 3 : 0,
        fill:         chartType === 'line',
        tension:      0.4,
      }]

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // ── Click handler ──────────────────────────────────────────────────
    onClick: (evt, elements) => {
      if (!elements || elements.length === 0) {
        // Click on empty space → deselect
        setSelectedIdx(null)
        if (onMonthSelect) onMonthSelect(null)
        return
      }
      const idx = elements[0].index
      if (idx === selectedIdx) {
        // Click same bar → deselect
        setSelectedIdx(null)
        if (onMonthSelect) onMonthSelect(null)
      } else {
        setSelectedIdx(idx)
        if (onMonthSelect) onMonthSelect(monthly[idx], idx)
      }
    },
    plugins: {
      legend: { display: chartType === 'stacked',
        labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } },
      tooltip: {
        backgroundColor: '#1e293b',
        callbacks: {
          title: ctx => labels[ctx[0].dataIndex],
          label: ctx => ` $${ctx.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        stacked: chartType === 'stacked',
        grid:    { color: 'rgba(99,179,237,0.05)' },
        ticks:   {
          color: ctx => ctx.index === selectedIdx ? '#38bdf8' : '#475569',
          font:  { size: 10 },
          maxRotation: activeRange > 12 ? 45 : 0
        }
      },
      y: {
        stacked: chartType === 'stacked',
        grid:    { color: 'rgba(99,179,237,0.05)' },
        ticks:   { color: '#475569',
          callback: v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)}` }
      }
    },
    // Hand cursor on bars
    onHover: (evt, elements) => {
      evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'
    }
  }

  const selectedPeriod = selectedIdx !== null ? monthly[selectedIdx] : null
  const selectedLabel  = selectedIdx !== null ? labels[selectedIdx]  : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Monthly Cost Trend</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Last {RANGE_OPTIONS.find(r => r.months === activeRange)?.label}
            {selectedLabel && (
              <span className="ml-2 text-blue-400 font-medium">
                · {selectedLabel} selected
              </span>
            )}
          </p>
        </div>
        {/* Chart type toggle */}
        <div className="flex gap-1">
          {['Bar','Line','Stacked'].map(t => (
            <button key={t}
              onClick={() => setChartType(t.toLowerCase())}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                chartType === t.toLowerCase()
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Range buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {RANGE_OPTIONS.map(r => (
          <button key={r.months}
            onClick={() => handleRangeChange(r.months)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              activeRange === r.months
                ? 'bg-blue-500 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>{r.label}</button>
        ))}
      </div>

      {/* Selected month info strip */}
      {selectedPeriod && (
        <div className="mb-3 bg-blue-500/10 border border-blue-500/20 rounded-lg
          px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-blue-400 font-medium">
            📅 {selectedLabel} — click again to deselect
          </span>
          <span className="text-xs font-mono text-white">
            {formatCurrency(periodTotal(selectedPeriod))} total
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-52">
        {chartType === 'line'
          ? <Line data={{ labels, datasets: dataset }} options={options} />
          : <Bar  data={{ labels, datasets: dataset }} options={options} />
        }
      </div>

      {/* Hint text */}
      {selectedIdx === null && (
        <p className="text-xs text-gray-700 text-center mt-2">
          Click any bar to filter Cost by Service and Billing Summary to that month
        </p>
      )}
    </div>
  )
}