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

async function getMonthlyCosts(credentials = null) {
  const client = createClient(credentials)
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: monthsAgo(6), End: today() },
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
    const endOfMonth = new Date(now.getFullYear(),
      now.getMonth() + 1, 1)

    // Need at least 1 day gap between start and end
    if (tomorrow >= endOfMonth) {
      return { Amount: '0', Unit: 'USD', note: 'End of month reached' }
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
    // Return zero forecast instead of crashing
    // when there is not enough billing history
    console.warn('Forecast unavailable:', err.message)
    return { Amount: '0', Unit: 'USD', note: err.message }
  }
}

module.exports = { getMonthlyCosts, getDailyCosts, getCostForecast }