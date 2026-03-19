import { useState } from 'react'
import { useBillingData } from '../hooks/useBillingData'
import MetricsRow from './MetricsRow'
import TrendChart from './TrendChart'
import DonutChart from './DonutChart'
import ServiceTable from './ServiceTable'
import ForecastPanel from './ForecastPanel'
import SparkLine from './SparkLine'
import HeatMap from './HeatMap'
import BillingSummary from './BillingSummary'
import ConnectModal from './ConnectModal'

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [accountId, setAccountId] = useState('123456789012')
  const [months, setMonths] = useState(6)

  const { monthly, daily, forecast, summary, loading, error } =
    useBillingData(credentials, months)

  const handleConnect = (creds) => {
    setCredentials({
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      region: creds.region || 'us-east-1'
    })
    setAccountId(creds.accountId || creds.accessKeyId.slice(0, 12))
    setShowModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center
                      h-screen bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400
                          border-t-transparent rounded-full
                          animate-spin mx-auto mb-4" />
          <p className="text-blue-400 text-sm animate-pulse">
            Fetching billing data...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center
                      h-screen bg-gray-950">
        <div className="text-center max-w-md px-6">
          <div className="w-12 h-12 bg-red-500/10 rounded-full
                          flex items-center justify-center
                          mx-auto mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-white font-semibold text-lg mb-2">
            Connection Error
          </p>
          <p className="text-gray-400 text-sm mb-3">{error}</p>
          <div className="bg-gray-900 border border-gray-700
                          rounded-lg p-4 mb-4 text-left">
            <p className="text-xs text-gray-400 font-medium mb-2">
              Common causes:
            </p>
            <ul className="text-xs text-gray-500 space-y-1.5">
              <li>• Wrong Access Key ID or Secret Key</li>
              <li>• IAM user missing ce:GetCostAndUsage permission</li>
              <li>• Cost Explorer not enabled in AWS Billing console</li>
              <li>• Backend server not running</li>
            </ul>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500
                       rounded-lg text-white text-sm
                       font-semibold transition"
          >
            Try Different Credentials
          </button>
        </div>
        {showModal && (
          <ConnectModal
            onClose={() => setShowModal(false)}
            onConnect={handleConnect}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800
                         px-6 py-4 flex items-center
                         justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-lg
                          flex items-center justify-center
                          text-white font-bold text-xs">
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
          <div className="bg-gray-800 border border-gray-700
                          rounded-lg px-3 py-1.5 text-xs
                          font-mono text-gray-400 hidden sm:block">
            Account: <span className="text-blue-400">{accountId}</span>
          </div>
          <div className="bg-gray-800 border border-gray-700
                          rounded-lg px-3 py-1.5 text-xs
                          font-mono text-gray-400 hidden sm:block">
            Region: <span className="text-blue-400">us-east-1</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400
                       text-white rounded-lg text-xs
                       font-semibold transition"
          >
            {credentials ? 'Switch Account' : 'Connect Account'}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Row 1 — KPI cards */}
        <MetricsRow monthly={monthly} forecast={forecast} />

        {/* Row 2 — Trend chart + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrendChart
              monthly={monthly}
              onRangeChange={(newMonths) => {
                console.log('Range changed to', newMonths, 'months')
                setMonths(newMonths)
              }}
            />
          </div>
          <div>
            <DonutChart monthly={monthly} />
          </div>
        </div>

        {/* Row 3 — Service table + Forecast + Sparkline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ServiceTable monthly={monthly} />
          </div>
          <div className="space-y-6">
            <ForecastPanel forecast={forecast} monthly={monthly} />
            <SparkLine daily={daily} />
          </div>
        </div>

        {/* Row 4 — Billing Summary full width */}
        <BillingSummary summary={summary} />

        {/* Row 5 — Heatmap full width */}
        <HeatMap />

      </main>

      {showModal && (
        <ConnectModal
          onClose={() => setShowModal(false)}
          onConnect={handleConnect}
        />
      )}

    </div>
  )
}