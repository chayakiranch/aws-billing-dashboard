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
import PerformanceTab from './PerformanceTab'

export default function Dashboard() {
  const [showModal,   setShowModal]   = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [accountId,   setAccountId]   = useState(null)
  const [months,      setMonths]      = useState(6)
  const [activeTab,   setActiveTab]   = useState('cost')

  const { monthly, daily, forecast, summary,
    loading, error, isDemo } =
    useBillingData(credentials, months)

  const handleConnect = (creds) => {
    setCredentials({
      accessKeyId:     creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      region:          creds.region || 'us-east-1'
    })
    setAccountId(creds.accountId || creds.accessKeyId.slice(0, 12))
    setShowModal(false)
  }

  const handleDisconnect = () => {
    setCredentials(null)
    setAccountId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent
          rounded-full animate-spin mx-auto mb-4" />
        <p className="text-blue-400 text-sm animate-pulse">Fetching billing data...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center max-w-md px-6">
        <p className="text-white font-semibold text-lg mb-2">Connection Error</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleDisconnect}
            className="px-4 py-2 bg-gray-700 rounded-lg text-white text-sm">
            Back to Demo
          </button>
          <button onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-blue-600 rounded-lg text-white text-sm font-semibold">
            Try Different Credentials
          </button>
        </div>
      </div>
      {showModal && <ConnectModal onClose={() => setShowModal(false)} onConnect={handleConnect} />}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4
        flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center
            justify-center text-white font-bold text-xs">AWS</div>
          <div>
            <h1 className="text-white font-semibold text-sm">Billing & Cost Management</h1>
            <p className="text-gray-500 text-xs flex items-center gap-1.5">
              {isDemo ? (
                <><span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />
                  Demo mode · connect your account for real data</>
              ) : (
                <><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                  Live · refreshed just now</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isDemo && accountId && (
            <>
              <div className="bg-gray-800 border border-gray-700 rounded-lg
                px-3 py-1.5 text-xs font-mono text-gray-400 hidden sm:block">
                Account: <span className="text-blue-400">{accountId}</span>
              </div>
              <button onClick={handleDisconnect}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600
                text-gray-300 rounded-lg text-xs font-medium transition">
                Disconnect
              </button>
            </>
          )}
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white
            rounded-lg text-xs font-semibold transition">
            {isDemo ? 'Connect Account' : 'Switch Account'}
          </button>
        </div>
      </header>

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/20
          px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-xs font-medium">Demo Mode</span>
            <span className="text-amber-500/70 text-xs">
              — Showing sample data. Connect your AWS account for real billing.
            </span>
          </div>
          <button onClick={() => setShowModal(true)}
            className="text-xs text-amber-400 hover:text-amber-300 underline">
            Connect now
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-gray-900 border-b border-gray-800 px-6">
        <div className="flex gap-1 max-w-screen-2xl mx-auto">
          <button
            onClick={() => setActiveTab('cost')}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'cost'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Cost & Billing
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'performance'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Performance
            {!isDemo && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse align-middle" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {activeTab === 'cost' && (
          <>
            <MetricsRow monthly={monthly} forecast={forecast} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {/* FIX: removed !isDemo check — range now works in demo mode too */}
                <TrendChart monthly={monthly}
                  onRangeChange={(n) => setMonths(n)} />
              </div>
              <div><DonutChart monthly={monthly} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><ServiceTable monthly={monthly} /></div>
              <div className="space-y-6">
                <ForecastPanel forecast={forecast} monthly={monthly} />
                <SparkLine daily={daily} />
              </div>
            </div>

            <BillingSummary summary={summary} />
            <HeatMap />
          </>
        )}

        {activeTab === 'performance' && (
          <PerformanceTab />
        )}

      </main>

      {showModal && (
        <ConnectModal onClose={() => setShowModal(false)} onConnect={handleConnect} />
      )}
    </div>
  )
}