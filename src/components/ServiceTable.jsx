import { formatCurrency } from '../utils/formatCurrency'

export default function ServiceTable({ monthly }) {
  const lastPeriod = monthly?.[monthly.length - 1]
  const services = lastPeriod?.Groups || []

  const sorted = [...services].sort((a, b) =>
    parseFloat(b.Metrics.UnblendedCost.Amount) -
    parseFloat(a.Metrics.UnblendedCost.Amount)
  )

  const total = sorted.reduce((sum, s) =>
    sum + parseFloat(s.Metrics.UnblendedCost.Amount), 0)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Active Services</h2>
        <span className="text-xs text-gray-400">{sorted.length} services</span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left text-xs text-gray-500 uppercase
                           tracking-wide pb-3">Service</th>
            <th className="text-left text-xs text-gray-500 uppercase
                           tracking-wide pb-3">Usage %</th>
            <th className="text-right text-xs text-gray-500 uppercase
                           tracking-wide pb-3">MTD Cost</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((service, i) => {
            const cost = parseFloat(service.Metrics.UnblendedCost.Amount)
            const pct = total > 0 ? (cost / total) * 100 : 0
            const name = service.Keys[0]

            return (
              <tr key={i} className="border-b border-gray-800/50
                                     hover:bg-gray-800/30 transition">
                <td className="py-3 text-sm text-white">{name}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-800 rounded-full">
                      <div
                        className="h-1.5 bg-blue-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right font-mono text-sm text-white">
                  {formatCurrency(cost)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}