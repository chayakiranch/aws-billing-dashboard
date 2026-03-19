import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function useBillingData(credentials = null, months = 6) {
  const [monthly, setMonthly] = useState([])
  const [daily, setDaily] = useState([])
  const [forecast, setForecast] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const headers = credentials ? {
    'x-aws-access-key-id': credentials.accessKeyId,
    'x-aws-secret-access-key': credentials.secretAccessKey,
    'x-aws-region': credentials.region || 'us-east-1'
  } : {}

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [monthlyRes, dailyRes, forecastRes, summaryRes] =
          await Promise.all([
            axios.get(`${API_BASE}/api/billing/monthly?months=${months}`,
              { headers }),
            axios.get(`${API_BASE}/api/billing/daily`, { headers }),
            axios.get(`${API_BASE}/api/billing/forecast`, { headers }),
            axios.get(`${API_BASE}/api/billing/summary`, { headers })
          ])
        setMonthly(monthlyRes.data.data)
        setDaily(dailyRes.data.data)
        setForecast(forecastRes.data.data)
        setSummary(summaryRes.data.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [credentials?.accessKeyId, months])

  return { monthly, daily, forecast, summary, loading, error }
}