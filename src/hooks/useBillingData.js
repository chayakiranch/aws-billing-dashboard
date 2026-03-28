import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── Generate mock monthly data dynamically for any number of months ───
function generateMockMonthly(months) {
  const services = [
    { name: 'Amazon EC2',        base: 1800, variance: 600 },
    { name: 'Amazon RDS',        base: 800,  variance: 200 },
    { name: 'Amazon S3',         base: 300,  variance: 120 },
    { name: 'AWS Lambda',        base: 200,  variance: 100 },
    { name: 'Amazon CloudFront', base: 140,  variance: 60  },
    { name: 'Amazon DynamoDB',   base: 90,   variance: 40  },
    { name: 'AWS CloudWatch',    base: 50,   variance: 20  },
  ]

  function seededRand(seed) {
    const x = Math.sin(seed + 1) * 10000
    return x - Math.floor(x)
  }

  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const monthKey = d.toISOString().split('T')[0]
    const seed     = d.getMonth() + d.getFullYear() * 12

    result.push({
      TimePeriod: { Start: monthKey },
      Groups: services.map((svc, si) => {
        const rand   = seededRand(seed + si * 7)
        const amount = (svc.base + rand * svc.variance).toFixed(2)
        return {
          Keys:    [svc.name],
          Metrics: { UnblendedCost: { Amount: amount } }
        }
      })
    })
  }
  return result
}

// ── Generate mock daily data (always last 30 days) ────────────────────
function generateMockDaily() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return {
      TimePeriod: { Start: d.toISOString().split('T')[0] },
      Total: { UnblendedCost: { Amount: (140 + Math.random() * 80).toFixed(2) } },
      Groups: []
    }
  })
}

// ── Generate mock summary from monthly data ───────────────────────────
function generateMockSummary(monthly) {
  return {
    totalPaid: '52840.50',
    currentMonthDue: monthly[monthly.length - 1]?.Groups
      .reduce((sum, g) => sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0)
      .toFixed(2) || '3199.40',
    currency: 'USD',
    monthlyTotals: monthly.map((m, i) => ({
      month:  m.TimePeriod.Start,
      amount: m.Groups.reduce((sum, g) =>
        sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0),
      isPaid: i < monthly.length - 1
    }))
  }
}

// ── Mock forecast — matches the NEW rich shape from the backend ────────
const now = new Date()
const MOCK_FORECAST = {
  endOfMonth: {
    mean: 4180.00,
    low:  3553.00,
    high: 4807.00,
  },
  threeMonths: {
    mean: 11400.00,
    low:  9690.00,
    high: 13110.00,
  },
  sixMonths: {
    mean: 22800.00,
    low:  19380.00,
    high: 26220.00,
  },
  meta: {
    daysInMonth:   new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    dayOfMonth:    now.getDate(),
    daysRemaining: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(),
    daysElapsed:   now.getDate() - 1,
    generatedAt:   now.toISOString(),
  }
}

const MOCK_DAILY = generateMockDaily()

// ── Main hook ─────────────────────────────────────────────────────────
export function useBillingData(credentials = null, months = 6) {
  const [monthly,  setMonthly]  = useState(() => generateMockMonthly(6))
  const [daily,    setDaily]    = useState(MOCK_DAILY)
  const [forecast, setForecast] = useState(MOCK_FORECAST)
  const [summary,  setSummary]  = useState(() => generateMockSummary(generateMockMonthly(6)))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [isDemo,   setIsDemo]   = useState(true)

  const headers = credentials ? {
    'x-aws-access-key-id':     credentials.accessKeyId,
    'x-aws-secret-access-key': credentials.secretAccessKey,
    'x-aws-region':            credentials.region || 'us-east-1'
  } : {}

  useEffect(() => {
    // ── DEMO MODE: generate data for selected month range ─────────────
    if (!credentials) {
      const mockMonthly = generateMockMonthly(months)
      setMonthly(mockMonthly)
      setDaily(MOCK_DAILY)
      setForecast(MOCK_FORECAST)
      setSummary(generateMockSummary(mockMonthly))
      setIsDemo(true)
      setLoading(false)
      setError(null)
      return
    }

    // ── LIVE MODE: fetch real AWS data ────────────────────────────────
    async function fetchReal() {
      setLoading(true)
      setError(null)
      setIsDemo(false)
      console.log(`Fetching real AWS data for ${months} months`)
      try {
        const [monthlyRes, dailyRes, forecastRes] = await Promise.all([
          axios.get(`${API_BASE}/api/billing/monthly?months=${months}`, { headers }),
          axios.get(`${API_BASE}/api/billing/daily`,    { headers }),
          axios.get(`${API_BASE}/api/billing/forecast`, { headers })
        ])
        setMonthly(monthlyRes.data.data)
        setDaily(dailyRes.data.data)
        setForecast(forecastRes.data.data)   // now receives rich forecast object

        try {
          const summaryRes = await axios.get(`${API_BASE}/api/billing/summary`, { headers })
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