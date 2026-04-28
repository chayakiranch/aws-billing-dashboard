// server/services/awsResources.js
const { EC2Client, DescribeInstancesCommand }         = require('@aws-sdk/client-ec2')
const { RDSClient, DescribeDBInstancesCommand }       = require('@aws-sdk/client-rds')
const { S3Client, ListBucketsCommand }                = require('@aws-sdk/client-s3')
const { LambdaClient, ListFunctionsCommand }          = require('@aws-sdk/client-lambda')

function makeClients(credentials) {
  const config = credentials
    ? { region: credentials.region || 'us-east-1',
        credentials: { accessKeyId: credentials.accessKeyId,
                       secretAccessKey: credentials.secretAccessKey } }
    : { region: process.env.AWS_REGION || 'us-east-1',
        credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }
  return {
    ec2:    new EC2Client(config),
    rds:    new RDSClient(config),
    s3:     new S3Client({ ...config, region: 'us-east-1' }),
    lambda: new LambdaClient(config),
  }
}

// ── EC2 instances ─────────────────────────────────────────────────────
async function getEC2Resources(clients) {
  try {
    const res = await clients.ec2.send(new DescribeInstancesCommand({
      Filters: [{ Name: 'instance-state-name', Values: ['running','stopped','stopping'] }]
    }))
    const instances = []
    for (const reservation of res.Reservations || []) {
      for (const inst of reservation.Instances || []) {
        const nameTag = inst.Tags?.find(t => t.Key === 'Name')
        instances.push({
          id:           inst.InstanceId,
          name:         nameTag?.Value || inst.InstanceId,
          service:      'EC2',
          type:         inst.InstanceType,
          state:        inst.State?.Name || 'unknown',
          region:       inst.Placement?.AvailabilityZone?.slice(0, -1) || 'us-east-1',
          az:           inst.Placement?.AvailabilityZone || '—',
          launchTime:   inst.LaunchTime || null,
          platform:     inst.Platform || 'Linux',
          publicIp:     inst.PublicIpAddress || '—',
          privateIp:    inst.PrivateIpAddress || '—',
          icon:         '🖥️',
        })
      }
    }
    return instances
  } catch (err) {
    console.warn('EC2 fetch error:', err.message)
    return []
  }
}

// ── RDS instances ─────────────────────────────────────────────────────
async function getRDSResources(clients) {
  try {
    const res = await clients.rds.send(new DescribeDBInstancesCommand({}))
    return (res.DBInstances || []).map(db => ({
      id:          db.DBInstanceIdentifier,
      name:        db.DBInstanceIdentifier,
      service:     'RDS',
      type:        db.DBInstanceClass,
      state:       db.DBInstanceStatus,
      region:      db.AvailabilityZone?.slice(0, -1) || 'us-east-1',
      az:          db.AvailabilityZone || '—',
      launchTime:  db.InstanceCreateTime || null,
      engine:      `${db.Engine} ${db.EngineVersion}`,
      storage:     `${db.AllocatedStorage} GB`,
      multiAz:     db.MultiAZ ? 'Yes' : 'No',
      endpoint:    db.Endpoint?.Address || '—',
      icon:        '🗄️',
    }))
  } catch (err) {
    console.warn('RDS fetch error:', err.message)
    return []
  }
}

// ── S3 buckets ────────────────────────────────────────────────────────
async function getS3Resources(clients) {
  try {
    const res = await clients.s3.send(new ListBucketsCommand({}))
    return (res.Buckets || []).map(b => ({
      id:         b.Name,
      name:       b.Name,
      service:    'S3',
      type:       'Bucket',
      state:      'active',
      region:     'global',
      az:         'global',
      launchTime: b.CreationDate || null,
      icon:       '🪣',
    }))
  } catch (err) {
    console.warn('S3 fetch error:', err.message)
    return []
  }
}

// ── Lambda functions ──────────────────────────────────────────────────
async function getLambdaResources(clients) {
  try {
    const res = await clients.lambda.send(new ListFunctionsCommand({ MaxItems: 50 }))
    return (res.Functions || []).map(fn => ({
      id:          fn.FunctionArn,
      name:        fn.FunctionName,
      service:     'Lambda',
      type:        `${fn.Runtime} · ${fn.MemorySize}MB`,
      state:       'active',
      region:      fn.FunctionArn?.split(':')[3] || 'us-east-1',
      az:          'serverless',
      launchTime:  fn.LastModified ? new Date(fn.LastModified) : null,
      handler:     fn.Handler,
      timeout:     `${fn.Timeout}s`,
      codeSize:    fn.CodeSize
        ? `${(fn.CodeSize / 1024).toFixed(1)} KB`
        : '—',
      icon:        '⚡',
    }))
  } catch (err) {
    console.warn('Lambda fetch error:', err.message)
    return []
  }
}

// ── Main: fetch all resources in parallel ─────────────────────────────
async function getAllResources(credentials = null) {
  const clients = makeClients(credentials)
  const [ec2, rds, s3, lambda] = await Promise.allSettled([
    getEC2Resources(clients),
    getRDSResources(clients),
    getS3Resources(clients),
    getLambdaResources(clients),
  ])

  const all = [
    ...(ec2.status    === 'fulfilled' ? ec2.value    : []),
    ...(rds.status    === 'fulfilled' ? rds.value    : []),
    ...(s3.status     === 'fulfilled' ? s3.value     : []),
    ...(lambda.status === 'fulfilled' ? lambda.value : []),
  ]

  const summary = {
    total:  all.length,
    ec2:    all.filter(r => r.service === 'EC2').length,
    rds:    all.filter(r => r.service === 'RDS').length,
    s3:     all.filter(r => r.service === 'S3').length,
    lambda: all.filter(r => r.service === 'Lambda').length,
    running: all.filter(r =>
      ['running', 'active', 'available'].includes(r.state)).length,
  }

  return { resources: all, summary }
}

module.exports = { getAllResources }