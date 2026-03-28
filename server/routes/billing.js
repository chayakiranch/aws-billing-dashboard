const express = require('express')
const router  = express.Router()
const {
  getMonthlyCosts,
  getDailyCosts,
  getCostForecast,
  getBillingSummary
} = require('../services/awsBilling')

// ── Extract AWS credentials from request headers ──────────────────────
function extractCredentials(req) {
  const accessKeyId     = req.headers['x-aws-access-key-id']
  const secretAccessKey = req.headers['x-aws-secret-access-key']
  const region          = req.headers['x-aws-region'] || 'us-east-1'
  if (accessKeyId && secretAccessKey) return { accessKeyId, secretAccessKey, region }
  return null
}

// ── GET /api/billing/monthly ──────────────────────────────────────────
router.get('/monthly', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const months      = parseInt(req.query.months) || 6
    console.log(`Monthly route called with months=${months}`)
    const data = await getMonthlyCosts(credentials, months)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/billing/daily ────────────────────────────────────────────
router.get('/daily', async (req, res) => {
  try {
    const data = await getDailyCosts(extractCredentials(req))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/billing/forecast ─────────────────────────────────────────
// Enhanced: returns rich { endOfMonth, threeMonths, sixMonths, meta }
// DataUnavailableException is handled inside the service — never crashes here
router.get('/forecast', async (req, res) => {
  try {
    const data = await getCostForecast(extractCredentials(req))
    res.json({ success: true, data })
  } catch (err) {
    console.error('Forecast route error:', err.message)
    const now = new Date()
    res.json({
      success: true,
      data: {
        endOfMonth:  null,
        threeMonths: null,
        sixMonths:   null,
        meta: {
          daysInMonth:   new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
          dayOfMonth:    now.getDate(),
          daysRemaining: 0,
          daysElapsed:   0,
          generatedAt:   now.toISOString(),
        }
      }
    })
  }
})

// ── GET /api/billing/summary ──────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const data = await getBillingSummary(extractCredentials(req))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router