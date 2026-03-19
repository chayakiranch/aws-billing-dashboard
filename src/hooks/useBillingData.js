import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── Mock data shown when no account is connected ──
const MOCK_MONTHLY = [
  { TimePeriod: { Start: '2025-10-01' }, Groups: [
    { Keys: ['Amazon EC2'],        Metrics: { UnblendedCost: { Amount: '1820.45' } } },
    { Keys: ['Amazon RDS'],        Metrics: { UnblendedCost: { Amount: '810.20' } } },
    { Keys: ['Amazon S3'],         Metrics: { UnblendedCost: { Amount: '320.10' } } },
    { Keys: ['AWS Lambda'],        Metrics: { UnblendedCost: { Amount: '210.30' } } },
    { Keys: ['Amazon CloudFront'], Metrics: { UnblendedCost: { Amount: '140.50' } } },
  ]},
  { TimePeriod: { Start: '2025-11-01' }, Groups: [
    { Keys: ['Amazon EC2'],        Metrics: { UnblendedCost: { Amount: '1940.00' } } },
    { Keys: ['Amazon RDS'],        Metrics: { UnblendedCost: { Amount: '880.15' } } },
    { Keys: ['Amazon S3'],         Metrics: { UnblendedCost: { Amount: '340.20' } } },
    { Keys: ['AWS Lambda'],        Metrics: { UnblendedCost: { Amount: '230.45' } } },
    { Keys: ['Amazon CloudFront'], Metrics: { UnblendedCost: { Amount: '150.30' } } },
  ]},
  { TimePeriod: { Start: '2025-12-01' }, Groups: [
    { Keys: ['Amazon EC2'],        Metrics: { UnblendedCost: { Amount: '2100.00' } } },
    { Keys: ['Amazon RDS'],        Metrics: { UnblendedCost: { Amount: '920.40' } } },
    { Keys: ['Amazon S3'],         Metrics: { UnblendedCost: { Amount: '360.15' } } },
    { Keys: ['AWS Lambda'],        Metrics: { UnblendedCost: { Amount: '260.20' } } },
    { Keys: ['Amazon CloudFront'], Metrics: { UnblendedCost: { Amount: '160.10' } } },
  ]},
  { TimePeriod: { Start: '2026-01-01' }, Groups: [
    { Keys: ['Amazon EC2'],        Metrics: { UnblendedCost: { Amount: '2340.30' } } },
    { Keys: ['Amazon RDS'],        Metrics: { UnblendedCost: { Amount: '960.00' } } },
    { Keys: ['Amazon S3'],         Metrics: { UnblendedCost: { Amount: '380.45' } } },
    { Keys: ['AWS Lambda'],        Metrics: { UnblendedCost: { Amount: '290.10' } } },
    { Keys: ['Amazon CloudFront'], Metrics: { UnblendedCost: { Amount: '180.25' } } },
  ]},
  { TimePeriod: { Start: '2026-02-01' }, Groups: [
    { Keys: ['Amazon EC2'],        Metrics: { UnblendedCost: { Amount: '2280.15' } } },
    { Keys: ['Amazon RDS'],        Metrics: { UnblendedCost: { Amount: '990.30' } } },
    { Keys: ['Amazon S3'],         Metrics: { UnblendedCost: { Amount: '400.20' } } },
    { Keys: ['AWS Lambda'],        Metrics: { UnblendedCost: { Amount: '310.40' } } },
    { Keys: ['Amazon CloudFront'], Metrics: { UnblendedCost: { Amount: '195.15' } } },
  ]},
  { TimePeriod: { Start: '2026-03-01' }, Groups: [
    { Keys: ['Amazon EC2'],        Metrics: { UnblendedCost: { Amount: '1621.00' } } },
    { Keys: ['Amazon RDS'],        Metrics: { UnblendedCost: { Amount: '720.10' } } },
    { Keys: ['Amazon S3'],         Metrics: { UnblendedCost: { Amount: '290.30' } } },
    { Keys: ['AWS Lambda'],        Metrics: { UnblendedCost: { Amount: '225.20' } } },
    { Keys: ['Amazon CloudFront'], Metrics: { UnblendedCost: { Amount: '142.40' } } },
  ]},
]

const MOCK_DAILY = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  return {
    TimePeriod: { Start: d.toISOString().split('T')[0] },
    Total: {
      UnblendedCost: {
        Amount: (140 + Math.random() * 80).toFixed(2)
      }
    },
    Groups: []
  }
})

const MOCK_FORECAST = { Amount: '6340.00', Unit: 'USD' }

const MOCK_SUMMARY = {
  totalPaid: '52840.50',
  currentMonthDue: '3199.40',
  currency: 'USD',
  monthlyTotals: MOCK_MONTHLY.map((m, i) => ({
    month: m.TimePeriod.Start,
    amount: m.Groups.reduce((sum, g) =>
      sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0),
    isPaid: i < MOCK_MONTHLY.length - 1
  }))
}

export function useBillingData(credentials = null, months = 6) {
  const [monthly, setMonthly] = useState(MOCK_MONTHLY)
  const [daily, setDaily] = useState(MOCK_DAILY)
  const [forecast, setForecast] = useState(MOCK_FORECAST)
  const [summary, setSummary] = useState(MOCK_SUMMARY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDemo, setIsDemo] = useState(true)

  const headers = credentials ? {
    'x-aws-access-key-id': credentials.accessKeyId,
    'x-aws-secret-access-key': credentials.secretAccessKey,
    'x-aws-region': credentials.region || 'us-east-1'
  } : {}

  useEffect(() => {
    // No credentials — show demo data, no API calls
    if (!credentials) {
      setMonthly(MOCK_MONTHLY)
      setDaily(MOCK_DAILY)
      setForecast(MOCK_FORECAST)
      setSummary(MOCK_SUMMARY)
      setIsDemo(true)
      setLoading(false)
      setError(null)
      return
    }

    // Credentials provided — fetch real data
    async function fetchReal() {
      setLoading(true)
      setError(null)
      setIsDemo(false)
      console.log(`Fetching real AWS data for ${months} months`)
      try {
        const [monthlyRes, dailyRes, forecastRes] = await Promise.all([
          axios.get(
            `${API_BASE}/api/billing/monthly?months=${months}`,
            { headers }
          ),
          axios.get(`${API_BASE}/api/billing/daily`, { headers }),
          axios.get(`${API_BASE}/api/billing/forecast`, { headers })
        ])
        setMonthly(monthlyRes.data.data)
        setDaily(dailyRes.data.data)
        setForecast(forecastRes.data.data)

        try {
          const summaryRes = await axios.get(
            `${API_BASE}/api/billing/summary`, { headers }
          )
          setSummary(summaryRes.data.data)
        } catch {
          setSummary(null)
        }

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReal()
  }, [credentials?.accessKeyId, months])

  return { monthly, daily, forecast, summary, loading, error, isDemo }
}