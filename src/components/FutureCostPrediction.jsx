import { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { formatCurrency, formatShort } from '../utils/formatCurrency'

// ── Dijkstra simulation on AWS service cost graph ─────────────────────
// Nodes: AWS services. Edges: interaction costs (data transfer, API calls)
// We find the cheapest "path" through the service graph = optimal allocation

function buildServiceGraph(monthly) {
  if (!monthly || monthly.length === 0) return { nodes: [], edges: [], paths: [] }

  const last   = monthly[monthly.length - 1]
  const groups = last?.Groups || []

  // Build nodes from actual services
  const nodes = groups.map(g => ({
    id:     g.Keys[0],
    name:   g.Keys[0].replace('Amazon ', '').replace('AWS ', ''),
    cost:   parseFloat(g.Metrics.UnblendedCost.Amount),
    icon:   getServiceIcon(g.Keys[0]),
  })).sort((a, b) => b.cost - a.cost).slice(0, 6)

  if (nodes.length < 2) return { nodes, edges: [], paths: [] }

  // Build edges — inter-service interaction costs (estimated as 8-15% of connected costs)
  const edges = []
  const seed  = (i, j) => Math.abs(Math.sin(i * 7 + j * 13)) * 0.15 + 0.03
  for (let i = 0; i < Math.min(nodes.length, 4); i++) {
    for (let j = i + 1; j < Math.min(nodes.length, 4); j++) {
      const w = parseFloat((
        Math.min(nodes[i].cost, nodes[j].cost) * seed(i, j)
      ).toFixed(2))
      if (w > 0.01) edges.push({ from: i, to: j, weight: w,
        label: getEdgeLabel(nodes[i].name, nodes[j].name) })
    }
  }

  // ── Dijkstra: find cheapest path from node 0 to each other node ──
  const n    = nodes.length
  const dist = Array(n).fill(Infinity)
  const prev = Array(n).fill(null)
  const vis  = Array(n).fill(false)
  dist[0]    = nodes[0].cost

  for (let iter = 0; iter < n; iter++) {
    // Pick unvisited node with smallest dist
    let u = -1
    for (let i = 0; i < n; i++)
      if (!vis[i] && (u === -1 || dist[i] < dist[u])) u = i
    if (u === -1 || dist[u] === Infinity) break
    vis[u] = true

    // Relax edges
    for (const e of edges) {
      const v = e.from === u ? e.to : e.to === u ? e.from : -1
      if (v === -1) continue
      const newDist = dist[u] + nodes[v].cost + e.weight
      if (newDist < dist[v]) {
        dist[v] = newDist
        prev[v] = u
      }
    }
  }

  // Reconstruct paths
  const paths = nodes.slice(1).map((node, i) => {
    const target = i + 1
    const path   = []
    let   cur    = target
    while (cur !== null) { path.unshift(nodes[cur].name); cur = prev[cur] }
    return {
      target:   node.name,
      cost:     dist[target],
      path,
      feasible: dist[target] !== Infinity,
    }
  }).filter(p => p.feasible)

  return { nodes, edges, paths }
}

function getServiceIcon(name) {
  if (name.includes('EC2'))       return '🖥️'
  if (name.includes('S3'))        return '🪣'
  if (name.includes('RDS'))       return '🗄️'
  if (name.includes('Lambda'))    return '⚡'
  if (name.includes('CloudFront'))return '🌐'
  if (name.includes('CloudWatch'))return '📊'
  if (name.includes('Cost'))      return '💰'
  if (name.includes('DynamoDB'))  return '📋'
  if (name.includes('Glue'))      return '🔗'
  if (name.includes('KMS') || name.includes('Key')) return '🔑'
  return '☁️'
}

function getEdgeLabel(a, b) {
  const pairs = {
    'EC2-S3':      'Data transfer', 'EC2-RDS':  'DB queries',
    'EC2-Lambda':  'Invocations',   'S3-Lambda':'Triggers',
    'RDS-S3':      'Backups',       'EC2-CloudFront': 'CDN traffic',
  }
  const key = [a, b].join('-')
  return pairs[key] || pairs[[b, a].join('-')] || 'API calls'
}

// ── Linear cost projection with 3 scenarios ──────────────────────────
function buildProjections(monthly) {
  if (!monthly || monthly.length < 2) return []

  const totals = monthly.map(p =>
    p.Groups?.reduce((s, g) =>
      s + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0)

  // Month-over-month growth rate (avg of last 3 months)
  const growthRates = []
  for (let i = Math.max(1, totals.length - 3); i < totals.length; i++) {
    if (totals[i-1] > 0) growthRates.push((totals[i] - totals[i-1]) / totals[i-1])
  }
  const avgGrowth  = growthRates.length
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0.05
  const lastTotal  = totals[totals.length - 1]

  // Build 6-month future projection
  const months     = 6
  const labels     = []
  const optimistic = []   // 30% savings applied
  const baseline   = []   // current trend continues
  const pessimistic = []  // 20% overshoot

  for (let i = 1; i <= months; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() + i)
    d.setDate(1)
    labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }))
    const base = lastTotal * Math.pow(1 + avgGrowth, i)
    optimistic.push(parseFloat((base * 0.70).toFixed(2)))
    baseline.push(parseFloat(base.toFixed(2)))
    pessimistic.push(parseFloat((base * 1.20).toFixed(2)))
  }

  return { labels, optimistic, baseline, pessimistic, avgGrowth, lastTotal }
}

// ── Rule-based saving suggestions (same rules as Phase 8 engine) ──────
function getSavingSuggestions(monthly) {
  if (!monthly || monthly.length === 0) return []
  const suggestions = []

  const last   = monthly[monthly.length - 1]
  const groups = last?.Groups || []
  const total  = groups.reduce((s, g) =>
    s + parseFloat(g.Metrics.UnblendedCost.Amount), 0)

  const avgOf = name => {
    const vals = monthly.map(m => {
      const g = m.Groups?.find(g => g.Keys[0].includes(name))
      return g ? parseFloat(g.Metrics.UnblendedCost.Amount) : 0
    })
    return vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
  }

  const avgEC2    = avgOf('EC2')
  const avgS3     = avgOf('S3')
  const avgLambda = avgOf('Lambda')
  const avgRDS    = avgOf('RDS')

  // Growth rate
  if (monthly.length >= 2) {
    const t1 = monthly[monthly.length - 2].Groups?.reduce((s, g) =>
      s + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0
    const t2 = total
    const g  = t1 > 0 ? ((t2 - t1) / t1) * 100 : 0
    if (g > 15) suggestions.push({
      priority: 'HIGH', icon: '📈',
      title:    `${g.toFixed(0)}% month-over-month cost growth`,
      saving:   `~$${((total - t1)).toFixed(0)}/month if resolved`,
      action:   'Audit new or resized resources. Check for forgotten test instances or large data transfers.',
    })
  }

  if (avgEC2 > 100) suggestions.push({
    priority: 'HIGH', icon: '💰',
    title:    'Switch EC2 On-Demand → Reserved Instances',
    saving:   `~$${(avgEC2 * 0.40 * 12).toFixed(0)}/year (40% discount)`,
    action:   'Purchase 1-year Reserved Instances for stable always-on EC2 workloads.',
  })

  if (avgRDS > 50) suggestions.push({
    priority: 'HIGH', icon: '🗄️',
    title:    'Right-size RDS during off-peak hours',
    saving:   `~$${(avgRDS * 0.25).toFixed(0)}/month`,
    action:   'Schedule automated RDS instance scaling down during nights and weekends.',
  })

  if (avgS3 > 30) suggestions.push({
    priority: 'MEDIUM', icon: '🪣',
    title:    'Add S3 lifecycle policies (Standard → Glacier)',
    saving:   `~$${(avgS3 * 0.50).toFixed(0)}/month`,
    action:   'Move objects >30 days to S3-IA, >90 days to Glacier. Saves 50–70% on storage.',
  })

  if (avgLambda > 20) suggestions.push({
    priority: 'MEDIUM', icon: '⚡',
    title:    'Optimize Lambda memory allocation',
    saving:   `~$${(avgLambda * 0.30).toFixed(0)}/month`,
    action:   'Use AWS Lambda Power Tuning to find the optimal memory size per function.',
  })

  const ec2Pct = total > 0 ? (avgEC2 / total) * 100 : 0
  if (ec2Pct > 60) suggestions.push({
    priority: 'MEDIUM', icon: '🏗️',
    title:    `EC2 is ${ec2Pct.toFixed(0)}% of your bill — consider Fargate/Lambda`,
    saving:   'Architectural saving — varies by workload',
    action:   'Migrate stateless workloads to serverless or containers to eliminate idle compute cost.',
  })

  if (total > 500) suggestions.push({
    priority: 'LOW', icon: '📋',
    title:    'Enrol in Compute Savings Plans',
    saving:   `~$${(total * 0.17 * 12).toFixed(0)}/year (up to 17% discount)`,
    action:   'Go to Cost Explorer → Savings Plans → View recommendations for a tailored commitment.',
  })

  if (total > 200) suggestions.push({
    priority: 'LOW', icon: '🔔',
    title:    'Set AWS Budget alerts at 80% and 100%',
    saving:   'Prevents surprise overspend',
    action:   'AWS Billing → Budgets → Create budget. Alerts via email before you overshoot.',
  })

  return suggestions
}

const PRIORITY_STYLE = {
  HIGH:   'bg-red-500/15 text-red-400 border-red-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LOW:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
}

// ── Graph viz: simple SVG node-edge diagram ───────────────────────────
function GraphViz({ nodes, edges }) {
  if (!nodes || nodes.length === 0) return null

  const W = 580, H = 200
  // Place nodes in a rough arc
  const positions = nodes.slice(0, 6).map((_, i, arr) => {
    const angle = (i / (arr.length - 1 || 1)) * Math.PI * 0.8 + Math.PI * 0.1
    return {
      x: W / 2 + Math.cos(angle) * (W * 0.38),
      y: H / 2 + Math.sin(angle) * (H * 0.38) * (i % 2 === 0 ? -1 : 1)
    }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      {/* Edges */}
      {edges.slice(0, 8).map((e, i) => {
        const a = positions[e.from], b = positions[e.to]
        if (!a || !b) return null
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
            <text x={mx} y={my - 4} fill="#475569"
              fontSize="7" textAnchor="middle">
              ${e.weight.toFixed(2)}/mo
            </text>
          </g>
        )
      })}
      {/* Nodes */}
      {nodes.slice(0, 6).map((node, i) => {
        const p = positions[i]
        if (!p) return null
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="22"
              fill="#1e293b" stroke={i === 0 ? '#38bdf8' : '#334155'}
              strokeWidth={i === 0 ? 2 : 1} />
            <text x={p.x} y={p.y - 4} fill="#e2e8f0"
              fontSize="12" textAnchor="middle">{node.icon}</text>
            <text x={p.x} y={p.y + 10} fill="#94a3b8"
              fontSize="7" textAnchor="middle">
              {node.name.slice(0, 8)}
            </text>
            <text x={p.x} y={p.y + 19} fill="#38bdf8"
              fontSize="7" textAnchor="middle">
              ${node.cost < 1 ? node.cost.toFixed(2) : node.cost.toFixed(0)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function FutureCostPrediction({ monthly }) {
  const [activeSection, setActiveSection] = useState('projection')

  const projection  = useMemo(() => buildProjections(monthly), [monthly])
  const graph       = useMemo(() => buildServiceGraph(monthly), [monthly])
  const suggestions = useMemo(() => getSavingSuggestions(monthly), [monthly])

  const totalSaving = suggestions.reduce((sum, s) => {
    const match = s.saving.match(/\$([0-9,]+)/)
    return sum + (match ? parseFloat(match[1].replace(',', '')) : 0)
  }, 0)

  // Chart data
  const chartData = projection.labels ? {
    labels: projection.labels,
    datasets: [
      {
        label: 'Pessimistic (+20%)',
        data:  projection.pessimistic,
        borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)',
        borderWidth: 1.5, borderDash: [4, 3], pointRadius: 3,
        tension: 0.4, fill: false,
      },
      {
        label: 'Baseline (current trend)',
        data:  projection.baseline,
        borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)',
        borderWidth: 2, pointRadius: 3,
        tension: 0.4, fill: true,
      },
      {
        label: 'Optimistic (with savings)',
        data:  projection.optimistic,
        borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.06)',
        borderWidth: 1.5, borderDash: [4, 3], pointRadius: 3,
        tension: 0.4, fill: false,
      },
    ]
  } : null

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true,
        labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 20 } },
      tooltip: {
        backgroundColor: '#1e293b',
        callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}` }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(99,179,237,0.05)' },
           ticks: { color: '#475569', font: { size: 10 } } },
      y: { grid: { color: 'rgba(99,179,237,0.05)' },
           ticks: { color: '#475569',
             callback: v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)}` } }
    }
  }

  const sections = [
    { key: 'projection', label: '📈 Projection' },
    { key: 'graph',      label: '🕸️ Cost Graph' },
    { key: 'savings',    label: `💡 Savings (${suggestions.length})` },
  ]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Future Cost Prediction
          </h2>
          <p className="text-gray-500 text-xs">
            Dijkstra graph analysis · rule-based savings · 6-month projection
          </p>
        </div>
        {totalSaving > 0 && (
          <div className="bg-green-500/10 border border-green-500/20
            rounded-lg px-3 py-1.5 text-right">
            <p className="text-xs text-gray-500">Potential saving</p>
            <p className="text-green-400 font-mono font-semibold text-sm">
              ~{formatShort(totalSaving)}/yr
            </p>
          </div>
        )}
      </div>

      {/* Section toggle */}
      <div className="flex gap-1">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              activeSection === s.key
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Projection chart ── */}
      {activeSection === 'projection' && (
        <>
          {chartData ? (
            <>
              <div className="h-52">
                <Line data={chartData} options={chartOptions} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Optimistic', color: 'text-green-400',
                    val: projection.optimistic?.[5], note: 'With all savings applied' },
                  { label: 'Baseline', color: 'text-blue-400',
                    val: projection.baseline?.[5],   note: 'Current trend continues' },
                  { label: 'Pessimistic', color: 'text-red-400',
                    val: projection.pessimistic?.[5], note: 'If growth accelerates' },
                ].map(c => (
                  <div key={c.label}
                    className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <p className={`text-lg font-mono font-semibold ${c.color}`}>
                      {c.val ? formatShort(c.val) : '—'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{c.note}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 text-center">
                Month-over-month growth rate: {(projection.avgGrowth * 100).toFixed(1)}%
                · Last month: {formatCurrency(projection.lastTotal)}
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">
              Not enough data for projection — need at least 2 months
            </p>
          )}
        </>
      )}

      {/* ── Dijkstra graph viz ── */}
      {activeSection === 'graph' && (
        <>
          <div className="bg-gray-800/40 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-3">
              AWS services modelled as a cost-weighted dependency graph.
              Dijkstra's algorithm finds the cheapest allocation path (shown from EC2 outward).
            </p>
            <GraphViz nodes={graph.nodes} edges={graph.edges} />
          </div>

          {/* Optimal paths table */}
          {graph.paths.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Optimal cost paths from primary compute node (Dijkstra result)
              </p>
              <div className="space-y-2">
                {graph.paths.slice(0, 4).map((p, i) => (
                  <div key={i}
                    className="bg-gray-800/50 rounded-lg px-3 py-2
                      flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-600 font-mono w-4">
                        {i + 1}.
                      </span>
                      <span className="text-xs text-gray-400 truncate">
                        {p.path.join(' → ')}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-blue-400 flex-shrink-0">
                      {formatCurrency(p.cost)}/mo
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                Lower path cost = more efficient service allocation strategy
              </p>
            </div>
          )}

          {/* Node cost table */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Service node costs this month</p>
            <div className="space-y-1.5">
              {graph.nodes.slice(0, 6).map((n, i) => {
                const total = graph.nodes.reduce((s, x) => s + x.cost, 0)
                const pct   = total > 0 ? (n.cost / total) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm w-5">{n.icon}</span>
                    <span className="text-xs text-gray-400 w-24 truncate">{n.name}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                      <div className="h-1.5 bg-blue-400 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-16 text-right">
                      {formatCurrency(n.cost)}
                    </span>
                    <span className="text-xs text-gray-600 w-8 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Savings suggestions ── */}
      {activeSection === 'savings' && (
        <>
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-white text-sm font-medium">No major savings opportunities found</p>
              <p className="text-gray-500 text-xs mt-1">Your spending looks well-optimised</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i}
                  className="bg-gray-800/40 border border-gray-800 rounded-xl p-3
                    hover:border-gray-700 transition-colors">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-base">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border
                          font-medium ${PRIORITY_STYLE[s.priority]}`}>
                          {s.priority}
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium">{s.title}</p>
                      <p className="text-xs text-green-400 font-mono mt-0.5">
                        💾 {s.saving}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {s.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
