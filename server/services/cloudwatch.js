const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch')
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2')

const cw = new CloudWatchClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
})

const ec2 = new EC2Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
})

// Fetch a single CloudWatch metric for a given instance
async function getMetric(instanceId, metricName, namespace, statistic, unit) {
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000) // last 7 days

  const command = new GetMetricStatisticsCommand({
    Namespace: namespace,
    MetricName: metricName,
    Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
    StartTime: start,
    EndTime: end,
    Period: 86400, // 1 day in seconds
    Statistics: [statistic],
    Unit: unit
  })

  const response = await cw.send(command)
  const points = response.Datapoints.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))
  return points.map(p => ({
    date: p.Timestamp.toISOString().split('T')[0],
    value: parseFloat((p[statistic] || 0).toFixed(2))
  }))
}

// Get all EC2 instances
async function getEC2Instances() {
  const command = new DescribeInstancesCommand({ Filters: [{ Name: 'instance-state-name', Values: ['running', 'stopped'] }] })
  const response = await ec2.send(command)
  const instances = []
  for (const reservation of response.Reservations) {
    for (const inst of reservation.Instances) {
      const nameTag = inst.Tags?.find(t => t.Key === 'Name')
      instances.push({
        id: inst.InstanceId,
        name: nameTag?.Value || inst.InstanceId,
        type: inst.InstanceType,
        state: inst.State.Name,
        region: process.env.AWS_REGION || 'us-east-1'
      })
    }
  }
  return instances
}

// Get performance data for all running EC2 instances
async function getEC2Performance() {
  const instances = await getEC2Instances()
  const running = instances.filter(i => i.state === 'running')

  const results = await Promise.all(running.map(async (inst) => {
    try {
      const [cpu, networkIn, networkOut] = await Promise.all([
        getMetric(inst.id, 'CPUUtilization', 'AWS/EC2', 'Average', 'Percent'),
        getMetric(inst.id, 'NetworkIn', 'AWS/EC2', 'Sum', 'Bytes'),
        getMetric(inst.id, 'NetworkOut', 'AWS/EC2', 'Sum', 'Bytes'),
      ])

      const avgCpu = cpu.length ? (cpu.reduce((s, p) => s + p.value, 0) / cpu.length).toFixed(1) : 0

      return {
        ...inst,
        metrics: { cpu, networkIn, networkOut },
        avgCpu: parseFloat(avgCpu),
        status: parseFloat(avgCpu) < 5 ? 'idle' : parseFloat(avgCpu) < 40 ? 'normal' : 'high'
      }
    } catch (err) {
      return { ...inst, metrics: { cpu: [], networkIn: [], networkOut: [] }, avgCpu: 0, status: 'unknown', error: err.message }
    }
  }))

  return results
}

module.exports = { getEC2Performance, getEC2Instances }