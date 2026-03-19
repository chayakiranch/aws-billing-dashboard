const express = require('express')
const router = express.Router()
const {
  getMonthlyCosts,
  getDailyCosts,
  getCostForecast,
  getBillingSummary
} = require('../services/awsBilling')

function extractCredentials(req) {
  const accessKeyId = req.headers['x-aws-access-key-id']
  const secretAccessKey = req.headers['x-aws-secret-access-key']
  const region = req.headers['x-aws-region'] || 'us-east-1'
  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey, region }
  }
  return null
}

router.get('/monthly', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const months = parseInt(req.query.months) || 6
    console.log(`Monthly route called with months=${months}`)
    const data = await getMonthlyCosts(credentials, months)
    res.json({ success: true, data })
  } catch (err) {
    console.error('Monthly error:', err.name, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/daily', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const data = await getDailyCosts(credentials)
    res.json({ success: true, data })
  } catch (err) {
    console.error('Daily error:', err.name, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/forecast', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const data = await getCostForecast(credentials)
    res.json({ success: true, data })
  } catch (err) {
    console.error('Forecast error:', err.name, err.message)
    res.json({ success: true, data: { Amount: '0', Unit: 'USD' } })
  }
})

router.get('/summary', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const data = await getBillingSummary(credentials)
    res.json({ success: true, data })
  } catch (err) {
    console.error('Summary error:', err.name, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
