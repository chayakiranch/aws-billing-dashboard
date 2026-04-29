import { formatCurrency } from '../utils/formatCurrency'

function periodTotal(period) {
  return period?.Groups?.reduce((sum, g) =>
    sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0
}

// selectedPeriod — the month clicked in TrendChart (null = show all-time summary)
export default function BillingSummary({ summary, selectedPeriod, monthly }) {
  // ── SELECTED MONTH VIEW ────────────────────────────────────────────
  if (selectedPeriod) {
    const monthLabel = new Date(selectedPeriod.TimePeriod.Start)
      .toLocaleString('default', { month: 'long', year: 'numeric' })
    const total      = periodTotal(selectedPeriod)
    const groups     = [...(selectedPeriod.Groups || [])]
      .sort((a, b) =>
        parseFloat(b.Metrics.UnblendedCost.Amount) -
        parseFloat(a.Metrics.UnblendedCost.Amount))

    // Determine if this month is the current month (last in array)
    const isCurrentMonth = monthly &&
      selectedPeriod.TimePeriod.Start ===
      monthly[monthly.length - 1]?.TimePeriod?.Start

    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Billing Summary</h2>
            <span className="text-xs text-blue-400">📅 {monthLabel}</span>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full border font-medium ${
            isCurrentMonth
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-green-500/10 border-green-500/30 text-green-400'
          }`}>
            {isCurrentMonth ? 'Current — due' : 'Paid'}
          </div>
        </div>

        {/* Total for month */}
        <div className={`rounded-xl p-4 mb-4 border ${
          isCurrentMonth
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-green-500/10 border-green-500/20'
        }`}>
          <p className="text-xs text-gray-400 mb-1">Total spend</p>
          <p className="text-3xl font-mono font-semibold text-white">
            {formatCurrency(total)}
          </p>
          <p className={`text-xs mt-1 ${isCurrentMonth ? 'text-amber-400' : 'text-green-400'}`}>
            {isCurrentMonth ? 'Accruing — will be charged at month end' : 'Paid'}
          </p>
        </div>

        {/* Service breakdown for that month */}
        <p className="text-xs text-gray-500 mb-2">Breakdown by service</p>
        <div className="space-y-2">
          {groups.slice(0, 6).map((g, i) => {
            const cost = parseFloat(g.Metrics.UnblendedCost.Amount)
            const pct  = total > 0 ? (cost / total) * 100 : 0
            const name = g.Keys[0]
              .replace('Amazon ', '').replace('AWS ', '')
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-400 truncate mr-2">{name}</span>
                  <span className="text-gray-300 font-mono flex-shrink-0">
                    {formatCurrency(cost)}
                  </span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full">
                  <div className="h-1 bg-blue-400 rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── ALL-TIME SUMMARY VIEW (no month selected) ──────────────────────
  if (!summary) return null

  const totalPaid  = parseFloat(summary.totalPaid   || 0)
  const currentDue = parseFloat(summary.currentMonthDue || 0)
  const grandTotal = totalPaid + currentDue
  const paidPct    = grandTotal > 0
    ? ((totalPaid / grandTotal) * 100).toFixed(1) : 0

  const recentMonths = [...(summary.monthlyTotals || [])]
    .reverse().slice(0, 6)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Billing Summary</h2>
        <span className="text-xs text-gray-400">All time</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-green-400 font-medium">Total Paid</span>
          </div>
          <p className="text-white font-mono font-semibold text-lg">
            {formatCurrency(totalPaid)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{paidPct}% of all time spend</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
            <span className="text-xs text-amber-400 font-medium">Current Month Due</span>
          </div>
          <p className="text-white font-mono font-semibold text-lg">
            {formatCurrency(currentDue)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Accruing this month</p>
        </div>
      </div>

      {/* Paid vs Due bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Paid</span><span>Due</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 rounded-full transition-all"
            style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      <div className="flex justify-between items-center py-2 border-t border-gray-800 mb-4">
        <span className="text-xs text-gray-400">All time total</span>
        <span className="text-sm font-mono font-semibold text-white">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {/* Recent months mini list */}
      {recentMonths.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-1">
            Recent months · click a bar on the chart to see details
          </p>
          {recentMonths.map((m, i) => {
            const max = Math.max(...recentMonths.map(x => x.amount), 1)
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-14 flex-shrink-0">
                  {new Date(m.month).toLocaleString('default',
                    { month: 'short', year: '2-digit' })}
                </span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                  <div className={`h-1.5 rounded-full transition-all ${
                    m.isPaid ? 'bg-green-400' : 'bg-amber-400'
                  }`} style={{ width: `${(m.amount / max) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-gray-400 w-16 text-right">
                  {formatCurrency(m.amount)}
                </span>
                <span className={`text-xs w-8 ${
                  m.isPaid ? 'text-green-500' : 'text-amber-500'
                }`}>{m.isPaid ? 'paid' : 'due'}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}