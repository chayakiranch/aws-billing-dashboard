// server/routes/recommendations.js
const express = require('express')
const router  = express.Router()
const { runRecommendationEngine } = require('../services/recommendations')
const { getEC2Performance }       = require('../services/cloudwatch')
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer')

// Helper: fetch last 6 months of billing data
async function fetchMonthlyBilling(credentials) {
  const client = new CostExplorerClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId:     credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    }
  })

  const end   = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 6)

  const command = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: start.toISOString().split('T')[0],
      End:   end.toISOString().split('T')[0],
    },
    Granularity: 'MONTHLY',
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    Metrics: ['UnblendedCost'],
  })

  const response = await client.send(command)
  return response.ResultsByTime || []
}

// ── GET /api/recommendations/live ─────────────────────────────────────
// Uses real AWS data — requires credentials in headers
router.get('/live', async (req, res) => {
  const credentials = {
    accessKeyId:     req.headers['x-aws-access-key-id'],
    secretAccessKey: req.headers['x-aws-secret-access-key'],
  }

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    return res.status(401).json({ success: false, error: 'AWS credentials required' })
  }

  try {
    // Fetch both data sources in parallel
    const [monthly, performanceData] = await Promise.allSettled([
      fetchMonthlyBilling(credentials),
      getEC2Performance()
    ])

    const monthlyData      = monthly.status      === 'fulfilled' ? monthly.value      : []
    const performanceArray = performanceData.status === 'fulfilled' ? performanceData.value : []

    const result = runRecommendationEngine(monthlyData, performanceArray)
    res.json({ success: true, ...result })

  } catch (err) {
    console.error('Recommendations error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/recommendations/demo ─────────────────────────────────────
// Uses hardcoded mock data — no AWS credentials needed
router.get('/demo', (req, res) => {
  const mockMonthly = [
    { Groups: [
      { Keys: ['Amazon EC2'],  Metrics: { UnblendedCost: { Amount: '1820.45' } } },
      { Keys: ['Amazon RDS'],  Metrics: { UnblendedCost: { Amount: '810.20'  } } },
      { Keys: ['Amazon S3'],   Metrics: { UnblendedCost: { Amount: '320.10'  } } },
      { Keys: ['AWS Lambda'],  Metrics: { UnblendedCost: { Amount: '210.30'  } } },
    ]},
    { Groups: [
      { Keys: ['Amazon EC2'],  Metrics: { UnblendedCost: { Amount: '1940.00' } } },
      { Keys: ['Amazon RDS'],  Metrics: { UnblendedCost: { Amount: '880.15'  } } },
      { Keys: ['Amazon S3'],   Metrics: { UnblendedCost: { Amount: '340.20'  } } },
      { Keys: ['AWS Lambda'],  Metrics: { UnblendedCost: { Amount: '230.45'  } } },
    ]},
    { Groups: [
      { Keys: ['Amazon EC2'],  Metrics: { UnblendedCost: { Amount: '2100.00' } } },
      { Keys: ['Amazon RDS'],  Metrics: { UnblendedCost: { Amount: '920.40'  } } },
      { Keys: ['Amazon S3'],   Metrics: { UnblendedCost: { Amount: '360.15'  } } },
      { Keys: ['AWS Lambda'],  Metrics: { UnblendedCost: { Amount: '260.20'  } } },
    ]},
    { Groups: [
      { Keys: ['Amazon EC2'],  Metrics: { UnblendedCost: { Amount: '2340.30' } } },
      { Keys: ['Amazon RDS'],  Metrics: { UnblendedCost: { Amount: '960.00'  } } },
      { Keys: ['Amazon S3'],   Metrics: { UnblendedCost: { Amount: '380.45'  } } },
      { Keys: ['AWS Lambda'],  Metrics: { UnblendedCost: { Amount: '290.10'  } } },
    ]},
    { Groups: [
      { Keys: ['Amazon EC2'],  Metrics: { UnblendedCost: { Amount: '2280.15' } } },
      { Keys: ['Amazon RDS'],  Metrics: { UnblendedCost: { Amount: '990.30'  } } },
      { Keys: ['Amazon S3'],   Metrics: { UnblendedCost: { Amount: '400.20'  } } },
      { Keys: ['AWS Lambda'],  Metrics: { UnblendedCost: { Amount: '310.40'  } } },
    ]},
    { Groups: [
      { Keys: ['Amazon EC2'],  Metrics: { UnblendedCost: { Amount: '2900.00' } } },
      { Keys: ['Amazon RDS'],  Metrics: { UnblendedCost: { Amount: '1050.00' } } },
      { Keys: ['Amazon S3'],   Metrics: { UnblendedCost: { Amount: '420.30'  } } },
      { Keys: ['AWS Lambda'],  Metrics: { UnblendedCost: { Amount: '330.20'  } } },
    ]},
  ]

  const mockPerformance = [
    { id: 'i-0abc123', name: 'web-server-01', type: 't3.medium', state: 'running', avgCpu: 3.2,  status: 'idle'   },
    { id: 'i-0def456', name: 'api-server-02', type: 't3.small',  state: 'running', avgCpu: 87.4, status: 'high'   },
    { id: 'i-0ghi789', name: 'db-proxy-03',   type: 't3.micro',  state: 'running', avgCpu: 18.5, status: 'normal' },
  ]

  const result = runRecommendationEngine(mockMonthly, mockPerformance)
  res.json({ success: true, ...result })
})

module.exports = router