const express = require('express')
const router = express.Router()
const { getEC2Performance } = require('../services/cloudwatch')

router.get('/ec2', async (req, res) => {
  try {
    const data = await getEC2Performance()
    res.json({ success: true, data })
  } catch (err) {
    console.error('CloudWatch error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Health check / demo fallback
router.get('/demo', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'i-0abc123demo',
        name: 'web-server-01',
        type: 't3.medium',
        state: 'running',
        avgCpu: 12.4,
        status: 'normal',
        metrics: {
          cpu: [
            { date: '2026-03-14', value: 8.2 },
            { date: '2026-03-15', value: 14.1 },
            { date: '2026-03-16', value: 11.3 },
            { date: '2026-03-17', value: 18.7 },
            { date: '2026-03-18', value: 9.4 },
            { date: '2026-03-19', value: 12.8 },
            { date: '2026-03-20', value: 14.5 },
          ],
          networkIn: [
            { date: '2026-03-14', value: 524288 },
            { date: '2026-03-15', value: 1048576 },
            { date: '2026-03-16', value: 786432 },
            { date: '2026-03-17', value: 2097152 },
            { date: '2026-03-18', value: 655360 },
            { date: '2026-03-19', value: 917504 },
            { date: '2026-03-20', value: 1310720 },
          ],
          networkOut: [
            { date: '2026-03-14', value: 262144 },
            { date: '2026-03-15', value: 524288 },
            { date: '2026-03-16', value: 393216 },
            { date: '2026-03-17', value: 1048576 },
            { date: '2026-03-18', value: 327680 },
            { date: '2026-03-19', value: 458752 },
            { date: '2026-03-20', value: 655360 },
          ]
        }
      },
      {
        id: 'i-0def456demo',
        name: 'api-server-02',
        type: 't3.small',
        state: 'running',
        avgCpu: 3.1,
        status: 'idle',
        metrics: {
          cpu: [
            { date: '2026-03-14', value: 2.1 },
            { date: '2026-03-15', value: 3.8 },
            { date: '2026-03-16', value: 2.9 },
            { date: '2026-03-17', value: 4.2 },
            { date: '2026-03-18', value: 2.7 },
            { date: '2026-03-19', value: 3.5 },
            { date: '2026-03-20', value: 3.0 },
          ],
          networkIn: [
            { date: '2026-03-14', value: 131072 },
            { date: '2026-03-15', value: 262144 },
            { date: '2026-03-16', value: 196608 },
            { date: '2026-03-17', value: 524288 },
            { date: '2026-03-18', value: 163840 },
            { date: '2026-03-19', value: 229376 },
            { date: '2026-03-20', value: 327680 },
          ],
          networkOut: []
        }
      }
    ]
  })
})

module.exports = router