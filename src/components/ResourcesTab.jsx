// src/components/ResourcesTab.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const SERVICE_STYLES = {
  EC2:    { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
  RDS:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   dot: 'bg-blue-400'   },
  S3:     { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  dot: 'bg-green-400'  },
  Lambda: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
}

const STATE_STYLES = {
  running:   'bg-green-500/15 text-green-400 border-green-500/30',
  available: 'bg-green-500/15 text-green-400 border-green-500/30',
  active:    'bg-green-500/15 text-green-400 border-green-500/30',
  stopped:   'bg-gray-500/15  text-gray-400  border-gray-500/30',
  stopping:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  unknown:   'bg-gray-500/15  text-gray-400  border-gray-500/30',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

function SummaryBar({ summary }) {
  const cards = [
    { label: 'Total resources', value: summary.total,   color: 'text-white'         },
    { label: 'Running / active', value: summary.running, color: 'text-green-400'    },
    { label: 'EC2 instances',   value: summary.ec2,     color: 'text-orange-400'   },
    { label: 'RDS databases',   value: summary.rds,     color: 'text-blue-400'     },
    { label: 'S3 buckets',      value: summary.s3,      color: 'text-green-400'    },
    { label: 'Lambda functions', value: summary.lambda, color: 'text-purple-400'   },
  ]

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label}
          className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className={`text-2xl font-mono font-semibold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

function ResourceRow({ resource }) {
  const [expanded, setExpanded] = useState(false)
  const svc   = SERVICE_STYLES[resource.service] || SERVICE_STYLES.EC2
  const state = STATE_STYLES[resource.state]     || STATE_STYLES.unknown

  // Extra detail fields per service type
  const extras = []
  if (resource.engine)   extras.push({ label: 'Engine',   value: resource.engine   })
  if (resource.storage)  extras.push({ label: 'Storage',  value: resource.storage  })
  if (resource.multiAz)  extras.push({ label: 'Multi-AZ', value: resource.multiAz  })
  if (resource.endpoint) extras.push({ label: 'Endpoint', value: resource.endpoint })
  if (resource.publicIp && resource.publicIp !== '—')
                         extras.push({ label: 'Public IP', value: resource.publicIp })
  if (resource.privateIp) extras.push({ label: 'Private IP', value: resource.privateIp })
  if (resource.platform) extras.push({ label: 'Platform', value: resource.platform })
  if (resource.handler)  extras.push({ label: 'Handler',  value: resource.handler  })
  if (resource.timeout)  extras.push({ label: 'Timeout',  value: resource.timeout  })
  if (resource.codeSize) extras.push({ label: 'Code size', value: resource.codeSize })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden
      hover:border-gray-700 transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        {/* Service badge */}
        <div className={`flex-shrink-0 px-2 py-1 rounded-lg border text-xs font-medium
          ${svc.bg} ${svc.border} ${svc.text}`}>
          {resource.icon} {resource.service}
        </div>

        {/* Name + ID */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{resource.name}</p>
          <p className="text-gray-600 text-xs font-mono truncate">{resource.id}</p>
        </div>

        {/* Type */}
        <div className="hidden md:block text-xs text-gray-400 min-w-[120px] text-right">
          {resource.type}
        </div>

        {/* Region */}
        <div className="hidden lg:block text-xs text-gray-500 min-w-[80px] text-right">
          {resource.region}
        </div>

        {/* State badge */}
        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium
          ${state}`}>
          {resource.state}
        </span>

        {/* Launch date */}
        <div className="hidden xl:block text-xs text-gray-600 min-w-[90px] text-right">
          {formatDate(resource.launchTime)}
        </div>

        {/* Expand button */}
        {extras.length > 0 && (
          <button onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 text-xs text-gray-600 hover:text-gray-300
              px-2 py-1 rounded border border-gray-800 hover:border-gray-700 transition-colors">
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && extras.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-3
          grid grid-cols-2 md:grid-cols-3 gap-3">
          {extras.map(e => (
            <div key={e.label}>
              <p className="text-xs text-gray-600 mb-0.5">{e.label}</p>
              <p className="text-xs text-gray-300 font-mono truncate">{e.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterBar({ filter, setFilter, search, setSearch, counts }) {
  const filters = [
    { key: 'ALL',    label: `All (${counts.total})` },
    { key: 'EC2',    label: `EC2 (${counts.ec2})`    },
    { key: 'RDS',    label: `RDS (${counts.rds})`    },
    { key: 'S3',     label: `S3 (${counts.s3})`      },
    { key: 'Lambda', label: `Lambda (${counts.lambda})` },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map(f => (
        <button key={f.key} onClick={() => setFilter(f.key)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            filter === f.key
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
          }`}>
          {f.label}
        </button>
      ))}
      {/* Search box */}
      <input
        type="text"
        placeholder="Search by name or ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="ml-auto text-xs bg-gray-900 border border-gray-800 rounded-lg
          px-3 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none
          focus:border-gray-600 w-48"
      />
    </div>
  )
}

export default function ResourcesTab({ credentials }) {
  const [resources, setResources] = useState([])
  const [summary,   setSummary]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [demoMode,  setDemoMode]  = useState(true)
  const [filter,    setFilter]    = useState('ALL')
  const [search,    setSearch]    = useState('')
  const [sortBy,    setSortBy]    = useState('service')

  useEffect(() => { fetchResources() }, [demoMode])

  async function fetchResources() {
    setLoading(true)
    setError(null)
    try {
      const endpoint = demoMode ? '/api/resources/demo' : '/api/resources/live'
      const headers  = (!demoMode && credentials) ? {
        'x-aws-access-key-id':     credentials.accessKeyId,
        'x-aws-secret-access-key': credentials.secretAccessKey,
        'x-aws-region':            credentials.region || 'us-east-1',
      } : {}
      const res = await axios.get(`${API}${endpoint}`, { headers })
      setResources(res.data.resources || [])
      setSummary(res.data.summary     || null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter + search + sort
  const filtered = resources
    .filter(r => filter === 'ALL' || r.service === filter)
    .filter(r => {
      if (!search) return true
      const q = search.toLowerCase()
      return r.name.toLowerCase().includes(q) ||
             r.id.toLowerCase().includes(q)   ||
             r.type?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'service') return a.service.localeCompare(b.service)
      if (sortBy === 'name')    return a.name.localeCompare(b.name)
      if (sortBy === 'state')   return a.state.localeCompare(b.state)
      return 0
    })

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Resource inventory</h2>
          <p className="text-gray-500 text-xs">
            All running AWS services — EC2, RDS, S3, Lambda
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-xs bg-gray-900 border border-gray-800 rounded-lg
              px-3 py-1.5 text-gray-400 focus:outline-none focus:border-gray-600"
          >
            <option value="service">Sort: Service</option>
            <option value="name">Sort: Name</option>
            <option value="state">Sort: State</option>
          </select>
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              demoMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-teal-500/10  border-teal-500/30  text-teal-400'
            }`}
          >
            {demoMode ? 'Demo mode' : 'Live mode'}
          </button>
          <button onClick={fetchResources}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700
              text-gray-400 hover:border-gray-600 transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && !error && summary && <SummaryBar summary={summary} />}

      {/* Filter + search */}
      {!loading && !error && resources.length > 0 && summary && (
        <FilterBar
          filter={filter}   setFilter={setFilter}
          search={search}   setSearch={setSearch}
          counts={summary}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40 gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent
            rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">
            Fetching AWS resource inventory...
          </span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium mb-1">
            Error fetching resources
          </p>
          <p className="text-red-300/70 text-xs mb-2">{error}</p>
          <button onClick={() => setDemoMode(true)}
            className="text-xs text-red-400 underline">
            Switch to demo mode
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && resources.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-white font-medium">No resources found</p>
          <p className="text-gray-500 text-sm mt-1">
            No EC2, RDS, S3, or Lambda resources in this account
          </p>
        </div>
      )}

      {/* No search results */}
      {!loading && !error && filtered.length === 0 && resources.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            No resources match "{search}" in {filter === 'ALL' ? 'any service' : filter}
          </p>
          <button onClick={() => { setSearch(''); setFilter('ALL') }}
            className="text-xs text-blue-400 underline mt-2">
            Clear filters
          </button>
        </div>
      )}

      {/* Resource list */}
      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 text-xs text-gray-600">
            <div className="w-[80px]">Service</div>
            <div className="flex-1">Name / ID</div>
            <div className="hidden md:block w-[120px] text-right">Type</div>
            <div className="hidden lg:block w-[80px] text-right">Region</div>
            <div className="w-[70px] text-right">State</div>
            <div className="hidden xl:block w-[90px] text-right">Created</div>
            <div className="w-[28px]"></div>
          </div>

          <div className="space-y-2">
            {filtered.map(r => (
              <ResourceRow key={r.id} resource={r} />
            ))}
          </div>

          <p className="text-xs text-gray-600 text-center pt-2">
            Showing {filtered.length} of {resources.length} resources
          </p>
        </>
      )}

    </div>
  )
}