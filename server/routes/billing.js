const express = require('express')
const router = express.Router()
const { getMonthlyCosts, getDailyCosts, getCostForecast } = require('../services/awsBilling')

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
    const data = await getMonthlyCosts(credentials)
    res.json({ success: true, data })
  } catch (err) {
    console.error('Monthly error:', err.name, err.message)
    res.status(500).json({
      success: false,
      error: err.message,
      errorType: err.name
    })
  }
})

router.get('/daily', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const data = await getDailyCosts(credentials)
    res.json({ success: true, data })
  } catch (err) {
    console.error('Daily error:', err.name, err.message)
    res.status(500).json({
      success: false,
      error: err.message,
      errorType: err.name
    })
  }
})

router.get('/forecast', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const data = await getCostForecast(credentials)
    res.json({ success: true, data })
  } catch (err) {
    console.error('Forecast error:', err.name, err.message)
    res.status(500).json({
      success: false,
      error: err.message,
      errorType: err.name
    })
  }
})

module.exports = router