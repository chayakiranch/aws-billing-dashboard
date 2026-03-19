import { useState } from 'react'
import { useBillingData } from '../hooks/useBillingData'
import MetricsRow from './MetricsRow'
import TrendChart from './TrendChart'
import DonutChart from './DonutChart'
import ServiceTable from './ServiceTable'
import ForecastPanel from './ForecastPanel'
import SparkLine from './SparkLine'
import HeatMap from './HeatMap'
import ConnectModal from './ConnectModal'

export default function Dashboard() {
  const { monthly, daily, forecast, loading, error } = useBillingData()
  const [showModal, setShowModal] = useState(false)

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent
                        rounded-full animate-spin mx-auto mb-4" />
        <p className="text-blue-400 text-sm animate-pulse">
          Fetching billing data...
        </p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center
                        justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <p className="text-white font-semibold text-lg mb-2">
          Connection Error
        </p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <p className="text-gray-500 text-xs mb-4">
          Make sure your backend server is running on port 3001
          and your AWS credentials are set in server/.env
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg
                     text-white text-sm font-semibold transition"
        >
          Reconnect AWS Account
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">

      {/* ── Header ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4
                         flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center
                          justify-center text-white font-bold text-xs">
            AWS
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">
              Billing & Cost Management
            </h1>
            <p className="text-gray-500 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full
                               inline-block animate-pulse" />
              Live · refreshed just now
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-gray-800 border border-gray-700 rounded-lg
                          px-3 py-1.5 text-xs font-mono text-gray-400 hidden sm:block">
            Account: <span className="text-blue-400">123456789012</span>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg
                          px-3 py-1.5 text-xs font-mono text-gray-400 hidden sm:block">
            Region: <span className="text-blue-400">us-east-1</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white
                       rounded-lg text-xs font-semibold transition"
          >
            Connect Account
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Row 1 — Metrics */}
        <MetricsRow monthly={monthly} forecast={forecast} />

        {/* Row 2 — Trend Chart + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrendChart monthly={monthly} />
          </div>
          <div>
            <DonutChart monthly={monthly} />
          </div>
        </div>

        {/* Row 3 — Service Table + Forecast + Sparkline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ServiceTable monthly={monthly} />
          </div>
          <div className="space-y-6">
            <ForecastPanel forecast={forecast} monthly={monthly} />
            <SparkLine daily={daily} />
          </div>
        </div>

        {/* Row 4 — Heatmap full width */}
        <HeatMap />

      </main>

      {/* ── Connect Modal ── */}
      {showModal && (
        <ConnectModal onClose={() => setShowModal(false)} />
      )}

    </div>
  )
}