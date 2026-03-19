import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function useBillingData() {
  const [monthly, setMonthly] = useState([])
  const [daily, setDaily] = useState([])
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [monthlyRes, dailyRes, forecastRes] = await Promise.all([
          axios.get(`${API_BASE}/api/billing/monthly`),
          axios.get(`${API_BASE}/api/billing/daily`),
          axios.get(`${API_BASE}/api/billing/forecast`)
        ])
        setMonthly(monthlyRes.data.data)
        setDaily(dailyRes.data.data)
        setForecast(forecastRes.data.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return { monthly, daily, forecast, loading, error }
}