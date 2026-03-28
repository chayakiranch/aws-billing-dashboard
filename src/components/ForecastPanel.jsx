import { useState } from 'react'
import { formatCurrency, formatShort } from '../utils/formatCurrency'

// ── Helpers ───────────────────────────────────────────────────────────
function getMTD(monthly) {
  const last = monthly?.[monthly.length - 1]
  return last?.Groups?.reduce((sum, g) =>
    sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0
}

function getDailyBurnRate(mtd, daysElapsed) {
  if (!daysElapsed || daysElapsed === 0) return 0
  return mtd / daysElapsed
}

// ── Confidence range bar ──────────────────────────────────────────────
function ConfidenceBar({ low, mean, high, dotColor }) {
  if (!low || !mean || !high || high === low) return null
  const range   = high - low
  const meanPct = ((mean - low) / range) * 100

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{formatShort(low)}</span>
        <span className="text-gray-500">80% confidence range</span>
        <span>{formatShort(high)}</span>
      </div>
      <div className="relative h-1.5 bg-gray-800 rounded-full">
        <div className="absolute inset-0 bg-gray-700 rounded-full" />
        <div
          className={`absolute w-3 h-3 rounded-full -top-[3px] -translate-x-1/2 border-2 border-gray-900 ${dotColor}`}
          style={{ left: `${Math.min(Math.max(meanPct, 5), 95)}%` }}
        />
      </div>
    </div>
  )
}

// ── Projection selector card ──────────────────────────────────────────
function ProjectionCard({ label, data, textColor, borderColor, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all w-full ${
        isSelected
          ? `${borderColor} bg-gray-800/60`
          : 'border-gray-800 hover:border-gray-700'
      }`}
    >
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      {data ? (
        <>
          <p className={`text-base font-mono font-semibold ${textColor}`}>
            {formatShort(data.mean)}
          </p>
          <p className="text-xs text-gray-600 mt-0.5 truncate">
            {formatShort(data.low)} – {formatShort(data.high)}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 font-mono">N/A</p>
          <p className="text-xs text-gray-700 mt-0.5">No history yet</p>
        </>
      )}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function ForecastPanel({ forecast, monthly }) {
  const [selected, setSelected] = useState('endOfMonth')

  const mtd           = getMTD(monthly)
  const meta          = forecast?.meta
  const daysElapsed   = meta?.daysElapsed   || 0
  const daysRemaining = meta?.daysRemaining || 0
  const daysInMonth   = meta?.daysInMonth   || 30
  const dailyBurn     = getDailyBurnRate(mtd, daysElapsed)
  const projectedEOM  = dailyBurn * daysInMonth
  const progressPct   = daysInMonth > 0 ? (daysElapsed / daysInMonth) * 100 : 0

  const projections = [
    {
      key:         'endOfMonth',
      label:       'End of month',
      textColor:   'text-blue-400',
      borderColor: 'border-blue-500/40',
      dotColor:    'bg-blue-400',
    },
    {
      key:         'threeMonths',
      label:       '3-month total',
      textColor:   'text-amber-400',
      borderColor: 'border-amber-500/40',
      dotColor:    'bg-amber-400',
    },
    {
      key:         'sixMonths',
      label:       '6-month total',
      textColor:   'text-purple-400',
      borderColor: 'border-purple-500/40',
      dotColor:    'bg-purple-400',
    },
  ]

  const activeProjection = projections.find(p => p.key === selected)
  const activeData       = forecast?.[selected]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Cost forecast</h2>
        {meta?.generatedAt && (
          <span className="text-xs text-gray-600">
            Updated {new Date(meta.generatedAt).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit'
            })}
          </span>
        )}
      </div>

      {/* MTD + month progress bar */}
      <div className="bg-gray-800/50 rounded-xl p-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">Month to date</span>
          <span className="text-xs text-gray-500">
            Day {daysElapsed} of {daysInMonth} · {daysRemaining}d left
          </span>
        </div>
        <p className="text-2xl font-mono font-semibold text-white mb-2">
          {formatCurrency(mtd)}
        </p>
        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
          <div
            className="h-1.5 bg-blue-400 rounded-full transition-all"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>{progressPct.toFixed(0)}% of month elapsed</span>
          {dailyBurn > 0 && (
            <span>{formatCurrency(dailyBurn)}/day</span>
          )}
        </div>
      </div>

      {/* Projection selector cards */}
      <div className="grid grid-cols-3 gap-2">
        {projections.map(p => (
          <ProjectionCard
            key={p.key}
            label={p.label}
            data={forecast?.[p.key]}
            textColor={p.textColor}
            borderColor={p.borderColor}
            isSelected={selected === p.key}
            onClick={() => setSelected(p.key)}
          />
        ))}
      </div>

      {/* Active projection detail */}
      {activeData ? (
        <div className={`border rounded-xl p-4 ${activeProjection.borderColor} bg-gray-800/30`}>
          <p className="text-xs text-gray-500 mb-1">
            {activeProjection.label} — AWS forecast
          </p>
          <p className={`text-3xl font-mono font-semibold ${activeProjection.textColor}`}>
            {formatShort(activeData.mean)}
          </p>
          <ConfidenceBar
            low={activeData.low}
            mean={activeData.mean}
            high={activeData.high}
            dotColor={activeProjection.dotColor}
          />
          <p className="text-xs text-gray-600 mt-2">
            Range: {formatCurrency(activeData.low)} – {formatCurrency(activeData.high)}
          </p>
        </div>
      ) : (
        <div className="border border-gray-800 rounded-xl p-4 text-center space-y-2">
          <p className="text-gray-500 text-sm">AWS forecast unavailable</p>
          <p className="text-gray-600 text-xs">
            Requires a few days of billing history to generate predictions.
          </p>
          {dailyBurn > 0 && (
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-1">
                Linear estimate · {formatCurrency(dailyBurn)}/day burn rate
              </p>
              <p className="text-white font-mono font-semibold text-lg">
                ~{formatCurrency(projectedEOM)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Annual run rate footer */}
      <div className="flex justify-between items-center pt-1 border-t border-gray-800">
        <span className="text-xs text-gray-500">Annual run rate</span>
        <span className="text-xs font-mono text-white font-medium">
          {forecast?.endOfMonth?.mean
            ? formatShort(forecast.endOfMonth.mean * 12)
            : formatShort(projectedEOM * 12)}
        </span>
      </div>

    </div>
  )
}