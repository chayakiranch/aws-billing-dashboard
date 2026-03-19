const { CostExplorerClient, GetCostAndUsageCommand,
        GetCostForecastCommand } = require('@aws-sdk/client-cost-explorer')

function createClient(credentials) {
  if (credentials) {
    return new CostExplorerClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      }
    })
  }
  return new CostExplorerClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function monthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function dateFromMonthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return d
}

// AWS Cost Explorer limits grouped queries to ~12 months per call
// For longer ranges we split into 12-month chunks and combine
async function getMonthlyCosts(credentials = null, months = 6) {
  const client = createClient(credentials)
  const endDate = today()
  const startDate = monthsAgo(months)
  console.log(`Fetching costs from ${startDate} to ${endDate} (${months} months)`)

  // If 12 months or less, single call is fine
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

  // For 13+ months, split into chunks of 12 months each
  const chunks = []
  let chunkEnd = new Date()
  let remaining = months

  while (remaining > 0) {
    const chunkMonths = Math.min(remaining, 12)
    const chunkStart = new Date(chunkEnd)
    chunkStart.setMonth(chunkStart.getMonth() - chunkMonths)
    chunkStart.setDate(1)

    chunks.push({
      start: chunkStart.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0]
    })

    chunkEnd = new Date(chunkStart)
    remaining -= chunkMonths
  }

  // Fetch all chunks in parallel
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

  // Combine and sort all results by date ascending
  const combined = results.flat()
  combined.sort((a, b) =>
    new Date(a.TimePeriod.Start) - new Date(b.TimePeriod.Start)
  )

  // Remove duplicate months if any overlap occurred
  const seen = new Set()
  const deduplicated = combined.filter(period => {
    const key = period.TimePeriod.Start
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduplicated
}

async function getDailyCosts(credentials = null) {
  const client = createClient(credentials)
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: monthsAgo(1), End: today() },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost']
  })
  const res = await client.send(command)
  return res.ResultsByTime
}

async function getCostForecast(credentials = null) {
  try {
    const client = createClient(credentials)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    if (tomorrow >= endOfMonth) {
      return { Amount: '0', Unit: 'USD' }
    }

    const command = new GetCostForecastCommand({
      TimePeriod: {
        Start: tomorrow.toISOString().split('T')[0],
        End: endOfMonth.toISOString().split('T')[0]
      },
      Granularity: 'MONTHLY',
      Metric: 'UNBLENDED_COST'
    })
    const res = await client.send(command)
    return res.Total
  } catch (err) {
    console.warn('Forecast unavailable:', err.message)
    return { Amount: '0', Unit: 'USD' }
  }
}

async function getBillingSummary(credentials = null) {
  try {
    const client = createClient(credentials)

    // Get last 36 months in two 18-month chunks
    const now = today()
    const mid = monthsAgo(18)
    const start = monthsAgo(36)

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

    const allPeriods = [
      ...res1.ResultsByTime,
      ...res2.ResultsByTime
    ].sort((a, b) =>
      new Date(a.TimePeriod.Start) - new Date(b.TimePeriod.Start)
    )

    let totalPaid = 0
    let currentMonthAmount = 0
    const monthlyTotals = []

    allPeriods.forEach((period, index) => {
      const amount = parseFloat(period.Total?.UnblendedCost?.Amount || 0)
      const isCurrentMonth = index === allPeriods.length - 1
      if (isCurrentMonth) {
        currentMonthAmount = amount
      } else {
        totalPaid += amount
      }
      monthlyTotals.push({
        month: period.TimePeriod.Start,
        amount,
        isPaid: !isCurrentMonth
      })
    })

    return {
      totalPaid: totalPaid.toFixed(2),
      currentMonthDue: currentMonthAmount.toFixed(2),
      currency: 'USD',
      monthlyTotals
    }
  } catch (err) {
    console.error('Billing summary error:', err.message)
    return {
      totalPaid: '0.00',
      currentMonthDue: '0.00',
      currency: 'USD',
      monthlyTotals: []
    }
  }
}

module.exports = {
  getMonthlyCosts,
  getDailyCosts,
  getCostForecast,
  getBillingSummary
}