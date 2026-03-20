import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const statusColors = {
  idle:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   dot: 'bg-blue-400'   },
  normal:  { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  dot: 'bg-green-400'  },
  high:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-400'    },
  unknown: { bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   text: 'text-gray-400',   dot: 'bg-gray-400'   },
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function MiniLineChart({ data, color }) {
  if (!data || data.length === 0) return <div className="h-16 flex items-center justify-center text-gray-600 text-xs">No data</div>

  const chartData = {
    labels: data.map(d => d.date.slice(5)),
    datasets: [{
      data: data.map(d => d.value),
      borderColor: color,
      backgroundColor: color + '20',
      borderWidth: 1.5,
      pointRadius: 2,
      tension: 0.4,
      fill: true,
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  }

  return (
    <div className="h-16">
      <Line data={chartData} options={options} />
    </div>
  )
}

function InstanceCard({ instance }) {
  const [expanded, setExpanded] = useState(false)
  const s = statusColors[instance.status] || statusColors.unknown

  return (
    <div className={`border rounded-xl p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${s.dot} ${instance.status === 'normal' ? 'animate-pulse' : ''}`} />
          <span className="text-white text-sm font-medium">{instance.name}</span>
          <span className="text-gray-500 text-xs font-mono">{instance.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.text}`}>
            {instance.status}
          </span>
          <span className="text-xs text-gray-500">{instance.type}</span>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-300 text-xs">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Avg CPU</p>
          <p className={`text-lg font-mono font-semibold ${s.text}`}>{instance.avgCpu}%</p>
          <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
            <div className={`h-1 rounded-full transition-all ${instance.avgCpu > 40 ? 'bg-red-400' : instance.avgCpu > 5 ? 'bg-green-400' : 'bg-blue-400'}`}
              style={{ width: `${Math.min(instance.avgCpu, 100)}%` }} />
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Network In</p>
          <p className="text-sm font-mono text-white">
            {instance.metrics?.networkIn?.length
              ? formatBytes(instance.metrics.networkIn.reduce((s, p) => s + p.value, 0) / instance.metrics.networkIn.length)
              : 'N/A'}
            <span className="text-xs text-gray-500">/day avg</span>
          </p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Network Out</p>
          <p className="text-sm font-mono text-white">
            {instance.metrics?.networkOut?.length
              ? formatBytes(instance.metrics.networkOut.reduce((s, p) => s + p.value, 0) / instance.metrics.networkOut.length)
              : 'N/A'}
            <span className="text-xs text-gray-500">/day avg</span>
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-800 pt-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">CPU utilization — last 7 days</p>
            <MiniLineChart data={instance.metrics?.cpu} color="#4ade80" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Network In</p>
              <MiniLineChart data={instance.metrics?.networkIn?.map(d => ({ ...d, value: d.value / 1024 / 1024 }))} color="#60a5fa" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Network Out</p>
              <MiniLineChart data={instance.metrics?.networkOut?.map(d => ({ ...d, value: d.value / 1024 / 1024 }))} color="#f59e0b" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PerformanceTab() {
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    fetchPerformance()
  }, [demoMode])

  async function fetchPerformance() {
    setLoading(true)
    setError(null)
    try {
      const endpoint = demoMode ? '/api/performance/demo' : '/api/performance/ec2'
      const res = await axios.get(`${API}${endpoint}`)
      setInstances(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const idleCount  = instances.filter(i => i.status === 'idle').length
  const normalCount = instances.filter(i => i.status === 'normal').length
  const highCount  = instances.filter(i => i.status === 'high').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Performance monitoring</h2>
          <p className="text-gray-500 text-xs">EC2 CPU &amp; network metrics via CloudWatch — last 7 days</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setDemoMode(!demoMode)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${demoMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
            {demoMode ? 'Demo mode' : 'Live mode'}
          </button>
          <button onClick={fetchPerformance}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-gray-600">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary row */}
      {!loading && !error && instances.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <p className="text-xs text-blue-400 mb-1">Idle instances</p>
            <p className="text-2xl font-mono font-semibold text-white">{idleCount}</p>
            <p className="text-xs text-gray-500">CPU &lt; 5%</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <p className="text-xs text-green-400 mb-1">Normal load</p>
            <p className="text-2xl font-mono font-semibold text-white">{normalCount}</p>
            <p className="text-xs text-gray-500">5% – 40% CPU</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-xs text-red-400 mb-1">High load</p>
            <p className="text-2xl font-mono font-semibold text-white">{highCount}</p>
            <p className="text-xs text-gray-500">CPU &gt; 40%</p>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
          Fetching CloudWatch metrics...
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          <p className="font-medium mb-1">Error fetching metrics</p>
          <p className="text-xs text-red-300/70">{error}</p>
          <button onClick={() => setDemoMode(true)} className="mt-2 text-xs underline">Switch to demo mode</button>
        </div>
      )}
      {!loading && !error && instances.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No running EC2 instances found in {import.meta.env.VITE_AWS_REGION || 'us-east-1'}.
        </div>
      )}

      {/* Instance cards */}
      {!loading && !error && (
        <div className="space-y-3">
          {instances.map(inst => <InstanceCard key={inst.id} instance={inst} />)}
        </div>
      )}
    </div>
  )
}