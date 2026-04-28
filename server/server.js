require('dotenv').config()
const express = require('express')
const cors = require('cors')
const billingRoutes        = require('./routes/billing')
const performanceRoutes    = require('./routes/performance')
const recommendationRoutes = require('./routes/recommendations')
const resourceRoutes       = require('./routes/resources')         // ← NEW

const app = express()

app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['http://localhost:5173', 'http://localhost:4173']
    const isVercel = origin && origin.endsWith('.vercel.app')
    const isCustom = origin && origin === process.env.FRONTEND_URL
    if (!origin || allowed.includes(origin) || isVercel || isCustom) {
      callback(null, true)
    } else {
      console.error('CORS blocked:', origin)
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true
}))

app.use(express.json())

app.use('/api/billing',         billingRoutes)
app.use('/api/performance',     performanceRoutes)
app.use('/api/recommendations', recommendationRoutes)
app.use('/api/resources',       resourceRoutes)                    // ← NEW

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))