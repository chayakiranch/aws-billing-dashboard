const {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand
} = require('@aws-sdk/client-cost-explorer')

// ── Client factory ────────────────────────────────────────────────────
function createClient(credentials) {
  if (credentials) {
    return new CostExplorerClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId:     credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      }
    })
  }
  return new CostExplorerClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  })
}

// ── Date helpers ──────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0]
}

function monthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

// ── getMonthlyCosts ───────────────────────────────────────────────────
// Splits long date ranges into 12-month chunks to avoid AWS API limits
async function getMonthlyCosts(credentials = null, months = 6) {
  const client    = createClient(credentials)
  const endDate   = today()
  const startDate = monthsAgo(months)

  console.log(`Fetching ${startDate} to ${endDate} (${months} months)`)

  if (months <= 12) {
    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: 'MONTHLY',
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      Metrics: ['UnblendedCost']
    })
    const res = await client.send(command)
    return res.ResultsByTime
  }

  // For 13+ months split into 12-month chunks
  const chunks  = []
  let chunkEnd  = new Date()
  let remaining = months

  while (remaining > 0) {
    const chunkMonths = Math.min(remaining, 12)
    const chunkStart  = new Date(chunkEnd)
    chunkStart.setMonth(chunkStart.getMonth() - chunkMonths)
    chunkStart.setDate(1)
    chunks.push({
      start: chunkStart.toISOString().split('T')[0],
      end:   chunkEnd.toISOString().split('T')[0]
    })
    chunkEnd   = new Date(chunkStart)
    remaining -= chunkMonths
  }

  const results = await Promise.all(
    chunks.map(chunk => {
      const command = new GetCostAndUsageCommand({
        TimePeriod: { Start: chunk.start, End: chunk.end },
        Granularity: 'MONTHLY',
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
        Metrics: ['UnblendedCost']
      })
      return client.send(command).then(r => r.ResultsByTime)
    })
  )

  const combined = results.flat()
  combined.sort((a, b) =>
    new Date(a.TimePeriod.Start) - new Date(b.TimePeriod.Start)
  )

  const seen = new Set()
  return combined.filter(period => {
    const key = period.TimePeriod.Start
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── getDailyCosts ─────────────────────────────────────────────────────
async function getDailyCosts(credentials = null) {
  const client  = createClient(credentials)
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: monthsAgo(1), End: today() },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost']
  })
  const res = await client.send(command)
  return res.ResultsByTime
}

// ── getCostForecast ───────────────────────────────────────────────────
// Returns 3 projection windows + confidence bounds + meta.
// Handles DataUnavailableException gracefully (new/low-activity accounts).
async function getCostForecast(credentials = null) {
  const client = createClient(credentials)
  const now    = new Date()

  // Date windows
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const endOfMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

  const threeMonths    = new Date(now)
  threeMonths.setMonth(threeMonths.getMonth() + 3)
  threeMonths.setDate(1)
  const threeMonthsStr = threeMonths.toISOString().split('T')[0]

  const sixMonths    = new Date(now)
  sixMonths.setMonth(sixMonths.getMonth() + 6)
  sixMonths.setDate(1)
  const sixMonthsStr = sixMonths.toISOString().split('T')[0]

  // Days meta
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth    = now.getDate()
  const daysRemaining = daysInMonth - dayOfMonth
  const daysElapsed   = dayOfMonth - 1

  // Safely call AWS — returns null instead of throwing
  async function safeForecast(start, end) {
    if (start >= end) return null
    try {
      const command = new GetCostForecastCommand({
        TimePeriod: { Start: start, End: end },
        Granularity: 'MONTHLY',
        Metric: 'UNBLENDED_COST',
        PredictionIntervalLevel: 80
      })
      return await client.send(command)
    } catch (err) {
      console.warn(`Forecast unavailable (${start} -> ${end}):`, err.message)
      return null
    }
  }

  // Extract mean + low + high from an AWS response
  function extractForecast(response) {
    if (!response) return null
    const mean = parseFloat(response.Total?.Amount || 0)
    const low  = parseFloat(response.LowerBoundAmount || (mean * 0.85).toFixed(2))
    const high = parseFloat(response.UpperBoundAmount || (mean * 1.15).toFixed(2))
    return { mean, low, high }
  }

  // Run all three windows in parallel
  const [eomRes, threeRes, sixRes] = await Promise.all([
    tomorrow >= endOfMonth ? Promise.resolve(null) : safeForecast(tomorrowStr, endOfMonthStr),
    safeForecast(tomorrowStr, threeMonthsStr),
    safeForecast(tomorrowStr, sixMonthsStr),
  ])

  return {
    endOfMonth:  extractForecast(eomRes),
    threeMonths: extractForecast(threeRes),
    sixMonths:   extractForecast(sixRes),
    meta: {
      daysInMonth,
      dayOfMonth,
      daysRemaining,
      daysElapsed,
      generatedAt: new Date().toISOString(),
    }
  }
}

// ── getBillingSummary ─────────────────────────────────────────────────
async function getBillingSummary(credentials = null) {
  try {
    const client = createClient(credentials)
    const now    = today()
    const mid    = monthsAgo(18)
    const start  = monthsAgo(36)

    const [res1, res2] = await Promise.all([
      client.send(new GetCostAndUsageCommand({
        TimePeriod: { Start: start, End: mid },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost']
      })),
      client.send(new GetCostAndUsageCommand({
        TimePeriod: { Start: mid, End: now },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost']
      }))
    ])

    const allPeriods = [...res1.ResultsByTime, ...res2.ResultsByTime]
      .sort((a, b) => new Date(a.TimePeriod.Start) - new Date(b.TimePeriod.Start))

    let totalPaid = 0, currentMonthAmount = 0
    const monthlyTotals = []

    allPeriods.forEach((period, index) => {
      const amount         = parseFloat(period.Total?.UnblendedCost?.Amount || 0)
      const isCurrentMonth = index === allPeriods.length - 1
      if (isCurrentMonth) currentMonthAmount = amount
      else totalPaid += amount
      monthlyTotals.push({
        month:  period.TimePeriod.Start,
        amount,
        isPaid: !isCurrentMonth
      })
    })

    return {
      totalPaid:       totalPaid.toFixed(2),
      currentMonthDue: currentMonthAmount.toFixed(2),
      currency:        'USD',
      monthlyTotals
    }
  } catch (err) {
    console.error('Summary error:', err.message)
    return { totalPaid: '0.00', currentMonthDue: '0.00', currency: 'USD', monthlyTotals: [] }
  }
}

module.exports = { getMonthlyCosts, getDailyCosts, getCostForecast, getBillingSummary }