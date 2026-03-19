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

async function getMonthlyCosts(credentials = null, months = 6) {
  const client = createClient(credentials)
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: monthsAgo(months), End: today() },
    Granularity: 'MONTHLY',
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    Metrics: ['UnblendedCost']
  })
  const res = await client.send(command)
  return res.ResultsByTime
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

// Get billing summary — total paid and any open/due amounts
async function getBillingSummary(credentials = null) {
  try {
    const client = createClient(credentials)

    // Get all time total (last 36 months)
    const allTimeCommand = new GetCostAndUsageCommand({
      TimePeriod: { Start: monthsAgo(36), End: today() },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost', 'BlendedCost']
    })
    const allTimeRes = await client.send(allTimeCommand)

    let totalPaid = 0
    let currentMonthAmount = 0
    const monthlyTotals = []

    allTimeRes.ResultsByTime.forEach((period, index) => {
      const amount = parseFloat(
        period.Total?.UnblendedCost?.Amount || 0
      )
      const isCurrentMonth = index === allTimeRes.ResultsByTime.length - 1
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