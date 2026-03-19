import { formatCurrency } from '../utils/formatCurrency'

export default function BillingSummary({ summary }) {
  if (!summary) return null

  const totalPaid = parseFloat(summary.totalPaid || 0)
  const currentDue = parseFloat(summary.currentMonthDue || 0)
  const grandTotal = totalPaid + currentDue

  const paidPct = grandTotal > 0
    ? ((totalPaid / grandTotal) * 100).toFixed(1)
    : 0

  const recentMonths = [...(summary.monthlyTotals || [])]
    .reverse()
    .slice(0, 6)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">
          Billing Summary
        </h2>
        <span className="text-xs text-gray-400">All time</span>
      </div>

      {/* Paid vs Due cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-500/10 border border-green-500/20
                        rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-400
                             inline-block" />
            <span className="text-xs text-green-400 font-medium">
              Total Paid
            </span>
          </div>
          <p className="text-white font-mono font-semibold text-lg">
            {formatCurrency(totalPaid)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {paidPct}% of all time spend
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20
                        rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400
                             inline-block animate-pulse" />
            <span className="text-xs text-amber-400 font-medium">
              Current Month Due
            </span>
          </div>
          <p className="text-white font-mono font-semibold text-lg">
            {formatCurrency(currentDue)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Accruing this month
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Paid</span>
          <span>Due</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      {/* Grand total */}
      <div className="flex justify-between items-center py-2
                      border-t border-gray-800 mb-4">
        <span className="text-xs text-gray-400">
          All time total
        </span>
        <span className="font-mono text-sm font-semibold text-white">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {/* Recent months breakdown */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">
          Recent months
        </p>
        <div className="space-y-1.5">
          {recentMonths.map((m, i) => {
            const date = new Date(m.month)
            const label = date.toLocaleString('default', {
              month: 'short', year: '2-digit'
            })
            const amt = parseFloat(m.amount)
            const maxAmt = Math.max(
              ...recentMonths.map(x => parseFloat(x.amount)), 1
            )
            const barPct = (amt / maxAmt) * 100

            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500
                                 w-12 flex-shrink-0">
                  {label}
                </span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${barPct}%`,
                      background: m.isPaid ? '#34d399' : '#f59e0b'
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-400
                                 w-20 text-right flex-shrink-0">
                  {formatCurrency(amt)}
                </span>
                <span className={`text-xs w-10 flex-shrink-0 ${
                  m.isPaid
                    ? 'text-green-500'
                    : 'text-amber-400'
                }`}>
                  {m.isPaid ? 'Paid' : 'Due'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
