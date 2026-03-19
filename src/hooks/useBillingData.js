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
      console.log(`Fetching billing data for ${months} months`)
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
        } catch (summaryErr) {
          console.warn('Summary not available:', summaryErr.message)
          setSummary(null)
        }

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