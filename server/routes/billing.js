const express = require('express');
const router = express.Router();
const {
  getMonthlyCosts,
  getDailyCosts,
  getCostForecast
} = require('../services/awsBilling');

// GET /api/billing/monthly
router.get('/monthly', async (req, res) => {
  try {
    const data = await getMonthlyCosts();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Monthly costs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/billing/daily
router.get('/daily', async (req, res) => {
  try {
    const data = await getDailyCosts();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Daily costs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/billing/forecast
router.get('/forecast', async (req, res) => {
  try {
    const data = await getCostForecast();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Forecast error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;