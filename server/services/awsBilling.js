const { CostExplorerClient, GetCostAndUsageCommand,
        GetCostForecastCommand } = require('@aws-sdk/client-cost-explorer');

const client = new CostExplorerClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Helper — returns today's date as YYYY-MM-DD
function today() {
  return new Date().toISOString().split('T')[0];
}

// Helper — returns date N months ago
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

// Get monthly costs grouped by service
async function getMonthlyCosts() {
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: monthsAgo(6), End: today() },
    Granularity: 'MONTHLY',
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    Metrics: ['UnblendedCost']
  });
  const res = await client.send(command);
  return res.ResultsByTime;
}

// Get daily costs for the current month
async function getDailyCosts() {
  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: monthsAgo(1), End: today() },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost']
  });
  const res = await client.send(command);
  return res.ResultsByTime;
}

// Get end-of-month cost forecast
async function getCostForecast() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString().split('T')[0];

  const command = new GetCostForecastCommand({
    TimePeriod: { Start: today(), End: endOfMonth },
    Granularity: 'MONTHLY',
    Metric: 'UNBLENDED_COST'
  });
  const res = await client.send(command);
  return res.Total;
}

module.exports = { getMonthlyCosts, getDailyCosts, getCostForecast };