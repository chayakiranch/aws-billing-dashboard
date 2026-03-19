router.get('/forecast', async (req, res) => {
  try {
    const credentials = extractCredentials(req)
    const data = await getCostForecast(credentials)
    // Always return 200 — forecast failure is non-critical
    res.json({ success: true, data })
  } catch (err) {
    console.error('Forecast error:', err.name, err.message)
    // Return zero instead of error so dashboard still loads
    res.json({
      success: true,
      data: { Amount: '0', Unit: 'USD' }
    })
  }
})