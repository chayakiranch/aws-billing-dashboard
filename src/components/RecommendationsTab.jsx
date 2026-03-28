// src/components/RecommendationsTab.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const PRIORITY_STYLES = {
  HIGH:   { badge: 'bg-red-500/15 text-red-400 border-red-500/30',    bar: 'bg-red-400',   label: 'High'   },
  MEDIUM: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', bar: 'bg-amber-400', label: 'Medium' },
  LOW:    { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',  bar: 'bg-blue-400',  label: 'Low'    },
}

function FindingCard({ finding, index }) {
  const [expanded, setExpanded] = useState(false)
  const p = PRIORITY_STYLES[finding.priority] || PRIORITY_STYLES.LOW

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden
      hover:border-gray-700 transition-colors">

      {/* Priority accent bar */}
      <div className={`h-0.5 w-full ${p.bar}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon + number */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span className="text-xl">{finding.icon}</span>
              <span className="text-xs text-gray-600 font-mono">#{index + 1}</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${p.badge}`}>
                  {p.label} priority
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  {finding.category}
                </span>
              </div>

              {/* Title */}
              <p className="text-white text-sm font-medium leading-snug">
                {finding.title}
              </p>

              {/* Saving estimate */}
              <p className="text-xs text-green-400 mt-1 font-mono">
                💾 {finding.saving}
              </p>
            </div>
          </div>

          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors
              flex-shrink-0 px-2 py-1 rounded border border-gray-800 hover:border-gray-700"
          >
            {expanded ? 'Less ▲' : 'More ▼'}
          </button>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">What we found</p>
              <p className="text-sm text-gray-300 leading-relaxed">{finding.detail}</p>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Recommended action</p>
              <p className="text-sm text-gray-300 leading-relaxed">{finding.action}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryBar({ summary }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
        <p className="text-2xl font-mono font-semibold text-white">{summary.total}</p>
        <p className="text-xs text-gray-500 mt-0.5">Total findings</p>
      </div>
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
        <p className="text-2xl font-mono font-semibold text-red-400">{summary.high}</p>
        <p className="text-xs text-gray-500 mt-0.5">High priority</p>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
        <p className="text-2xl font-mono font-semibold text-amber-400">{summary.medium}</p>
        <p className="text-xs text-gray-500 mt-0.5">Medium priority</p>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
        <p className="text-2xl font-mono font-semibold text-blue-400">{summary.low}</p>
        <p className="text-xs text-gray-500 mt-0.5">Low priority</p>
      </div>
    </div>
  )
}

export default function RecommendationsTab({ credentials }) {
  const [findings,    setFindings]    = useState([])
  const [summary,     setSummary]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [demoMode,    setDemoMode]    = useState(true)
  const [filter,      setFilter]      = useState('ALL')

  useEffect(() => {
    fetchRecommendations()
  }, [demoMode])

  async function fetchRecommendations() {
    setLoading(true)
    setError(null)
    try {
      const endpoint = demoMode ? '/api/recommendations/demo' : '/api/recommendations/live'
      const headers  = (!demoMode && credentials) ? {
        'x-aws-access-key-id':     credentials.accessKeyId,
        'x-aws-secret-access-key': credentials.secretAccessKey,
      } : {}

      const res = await axios.get(`${API}${endpoint}`, { headers })
      setFindings(res.data.findings || [])
      setSummary(res.data.summary   || null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'ALL'
    ? findings
    : findings.filter(f => f.priority === filter)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Cost optimisation recommendations</h2>
          <p className="text-gray-500 text-xs">
            Rule-based analysis of your cost and performance data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              demoMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
            }`}
          >
            {demoMode ? 'Demo mode' : 'Live mode'}
          </button>
          <button
            onClick={fetchRecommendations}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700
              text-gray-400 hover:border-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && !error && summary && <SummaryBar summary={summary} />}

      {/* Priority filter */}
      {!loading && !error && findings.length > 0 && (
        <div className="flex gap-2">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === p
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              {p === 'ALL' ? `All (${findings.length})` : p}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40 gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Analysing your AWS usage...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium mb-1">Error loading recommendations</p>
          <p className="text-red-300/70 text-xs mb-2">{error}</p>
          <button onClick={() => setDemoMode(true)} className="text-xs text-red-400 underline">
            Switch to demo mode
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && findings.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-white font-medium">No issues found</p>
          <p className="text-gray-500 text-sm mt-1">Your AWS usage looks well-optimised</p>
        </div>
      )}

      {/* Finding cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((finding, i) => (
            <FindingCard key={finding.id} finding={finding} index={i} />
          ))}
        </div>
      )}

    </div>
  )
}