// server/routes/resources.js
const express = require('express')
const router  = express.Router()
const { getAllResources } = require('../services/awsResources')

function extractCredentials(req) {
  const accessKeyId     = req.headers['x-aws-access-key-id']
  const secretAccessKey = req.headers['x-aws-secret-access-key']
  const region          = req.headers['x-aws-region'] || 'us-east-1'
  if (accessKeyId && secretAccessKey)
    return { accessKeyId, secretAccessKey, region }
  return null
}

// ── GET /api/resources/live ───────────────────────────────────────────
router.get('/live', async (req, res) => {
  try {
    const data = await getAllResources(extractCredentials(req))
    res.json({ success: true, ...data })
  } catch (err) {
    console.error('Resources error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/resources/demo ───────────────────────────────────────────
router.get('/demo', (req, res) => {
  const resources = [
    // EC2
    { id: 'i-0abc123demo', name: 'web-server-01',   service: 'EC2',    type: 't3.medium',    state: 'running',   region: 'us-east-1', az: 'us-east-1a', launchTime: '2026-01-15T08:00:00Z', platform: 'Linux',   publicIp: '54.234.12.1',  privateIp: '10.0.1.10', icon: '🖥️' },
    { id: 'i-0def456demo', name: 'api-server-02',   service: 'EC2',    type: 't3.small',     state: 'running',   region: 'us-east-1', az: 'us-east-1b', launchTime: '2026-01-15T08:00:00Z', platform: 'Linux',   publicIp: '54.234.12.2',  privateIp: '10.0.1.11', icon: '🖥️' },
    { id: 'i-0ghi789demo', name: 'dev-instance-03', service: 'EC2',    type: 't3.micro',     state: 'stopped',   region: 'us-east-1', az: 'us-east-1a', launchTime: '2026-02-10T12:00:00Z', platform: 'Linux',   publicIp: '—',            privateIp: '10.0.1.12', icon: '🖥️' },
    // RDS
    { id: 'myapp-db-prod', name: 'myapp-db-prod',   service: 'RDS',    type: 'db.t3.medium', state: 'available', region: 'us-east-1', az: 'us-east-1a', launchTime: '2025-11-20T09:00:00Z', engine: 'MySQL 8.0', storage: '100 GB',       multiAz: 'No',  endpoint: 'myapp-db.cluster.us-east-1.rds.amazonaws.com', icon: '🗄️' },
    { id: 'analytics-db',  name: 'analytics-db',    service: 'RDS',    type: 'db.t3.small',  state: 'available', region: 'us-east-1', az: 'us-east-1b', launchTime: '2025-12-05T10:00:00Z', engine: 'PostgreSQL 15.2', storage: '50 GB', multiAz: 'No',  endpoint: 'analytics-db.us-east-1.rds.amazonaws.com', icon: '🗄️' },
    // S3
    { id: 'myapp-assets-prod',   name: 'myapp-assets-prod',   service: 'S3', type: 'Bucket', state: 'active', region: 'global', az: 'global', launchTime: '2025-10-01T00:00:00Z', icon: '🪣' },
    { id: 'myapp-logs-archive',  name: 'myapp-logs-archive',  service: 'S3', type: 'Bucket', state: 'active', region: 'global', az: 'global', launchTime: '2025-10-01T00:00:00Z', icon: '🪣' },
    { id: 'myapp-backups-2026',  name: 'myapp-backups-2026',  service: 'S3', type: 'Bucket', state: 'active', region: 'global', az: 'global', launchTime: '2026-01-01T00:00:00Z', icon: '🪣' },
    // Lambda
    { id: 'arn:aws:lambda:us-east-1:123:function:processPayment', name: 'processPayment',  service: 'Lambda', type: 'Node.js 18 · 256MB', state: 'active', region: 'us-east-1', az: 'serverless', launchTime: '2026-01-20T00:00:00Z', handler: 'index.handler', timeout: '30s', codeSize: '48.2 KB', icon: '⚡' },
    { id: 'arn:aws:lambda:us-east-1:123:function:sendEmail',       name: 'sendEmail',       service: 'Lambda', type: 'Node.js 18 · 128MB', state: 'active', region: 'us-east-1', az: 'serverless', launchTime: '2026-01-20T00:00:00Z', handler: 'index.handler', timeout: '10s', codeSize: '12.6 KB', icon: '⚡' },
    { id: 'arn:aws:lambda:us-east-1:123:function:resizeImage',     name: 'resizeImage',     service: 'Lambda', type: 'Python 3.11 · 512MB', state: 'active', region: 'us-east-1', az: 'serverless', launchTime: '2026-02-01T00:00:00Z', handler: 'main.handler', timeout: '60s', codeSize: '234.1 KB', icon: '⚡' },
  ]

  const summary = {
    total:   resources.length,
    ec2:     resources.filter(r => r.service === 'EC2').length,
    rds:     resources.filter(r => r.service === 'RDS').length,
    s3:      resources.filter(r => r.service === 'S3').length,
    lambda:  resources.filter(r => r.service === 'Lambda').length,
    running: resources.filter(r => ['running','active','available'].includes(r.state)).length,
  }

  res.json({ success: true, resources, summary })
})

module.exports = router