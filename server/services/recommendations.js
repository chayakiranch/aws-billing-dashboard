// server/services/recommendations.js

// ── Helpers ──────────────────────────────────────────────────────────
function monthlyTotal(groups) {
  return groups.reduce((sum, g) =>
    sum + parseFloat(g.Metrics.UnblendedCost.Amount), 0)
}

function serviceCost(groups, serviceName) {
  const match = groups.find(g =>
    g.Keys[0].toLowerCase().includes(serviceName.toLowerCase())
  )
  return match ? parseFloat(match.Metrics.UnblendedCost.Amount) : 0
}

function avgOverMonths(monthly, serviceName) {
  if (!monthly || monthly.length === 0) return 0
  const totals = monthly.map(m => serviceCost(m.Groups || [], serviceName))
  return totals.reduce((a, b) => a + b, 0) / totals.length
}

function monthOverMonthGrowth(monthly) {
  if (!monthly || monthly.length < 2) return 0
  const last  = monthlyTotal(monthly[monthly.length - 1].Groups || [])
  const prev  = monthlyTotal(monthly[monthly.length - 2].Groups || [])
  if (prev === 0) return 0
  return ((last - prev) / prev) * 100
}

// ── Rule Definitions ─────────────────────────────────────────────────
function checkIdleEC2(performanceData) {
  const findings = []
  if (!performanceData || performanceData.length === 0) return findings

  const idleInstances = performanceData.filter(
    inst => inst.avgCpu < 5 && inst.state === 'running'
  )

  idleInstances.forEach(inst => {
    findings.push({
      id:       `idle-ec2-${inst.id}`,
      priority: 'HIGH',
      category: 'EC2',
      title:    `Idle EC2 instance detected`,
      detail:   `${inst.name} (${inst.type}) has averaged only ${inst.avgCpu}% CPU over the last 7 days. It appears to be running but unused.`,
      action:   `Stop or terminate ${inst.name} if it is not needed. Consider using Auto Scaling to run instances only when required.`,
      saving:   'Potential 100% saving on this instance',
      icon:     '🖥️'
    })
  })

  return findings
}

function checkHighCPUInstances(performanceData) {
  const findings = []
  if (!performanceData || performanceData.length === 0) return findings

  const overloadedInstances = performanceData.filter(
    inst => inst.avgCpu > 80 && inst.state === 'running'
  )

  overloadedInstances.forEach(inst => {
    findings.push({
      id:       `high-cpu-${inst.id}`,
      priority: 'HIGH',
      category: 'EC2',
      title:    `High CPU load on EC2 instance`,
      detail:   `${inst.name} (${inst.type}) is running at ${inst.avgCpu}% average CPU. Sustained high CPU can cause performance issues and failures.`,
      action:   `Upgrade ${inst.name} to a larger instance type, or distribute load across multiple instances using a Load Balancer.`,
      saving:   'Prevents costly downtime',
      icon:     '⚠️'
    })
  })

  return findings
}

function checkReservedInstanceOpportunity(monthly) {
  const findings = []
  if (!monthly || monthly.length < 3) return findings

  const avgEC2 = avgOverMonths(monthly, 'EC2')

  if (avgEC2 > 200) {
    const annualOnDemand = avgEC2 * 12
    const reservedSaving = annualOnDemand * 0.40  // ~40% saving with 1yr reserved
    findings.push({
      id:       'reserved-instance-opportunity',
      priority: 'HIGH',
      category: 'Cost',
      title:    'Switch to Reserved Instances for EC2',
      detail:   `Your average monthly EC2 spend is $${avgEC2.toFixed(0)}. Running On-Demand instances for predictable workloads costs significantly more than Reserved Instances.`,
      action:   `Purchase 1-year Reserved Instances for your always-on EC2 workloads. Estimated annual saving of $${reservedSaving.toFixed(0)} (~40% discount).`,
      saving:   `~$${reservedSaving.toFixed(0)} / year`,
      icon:     '💰'
    })
  }

  return findings
}

function checkCostSpike(monthly) {
  const findings = []
  if (!monthly || monthly.length < 2) return findings

  const growth = monthOverMonthGrowth(monthly)

  if (growth > 20) {
    const last = monthlyTotal(monthly[monthly.length - 1].Groups || [])
    const prev = monthlyTotal(monthly[monthly.length - 2].Groups || [])
    findings.push({
      id:       'cost-spike-detected',
      priority: 'HIGH',
      category: 'Cost',
      title:    `Cost spike: ${growth.toFixed(0)}% increase this month`,
      detail:   `Your total spend jumped from $${prev.toFixed(0)} to $${last.toFixed(0)} — a ${growth.toFixed(0)}% increase month-over-month. This is above the 20% alert threshold.`,
      action:   `Review new or resized resources launched this month. Check for forgotten test instances, large S3 data transfers, or unintended API calls.`,
      saving:   `Up to $${(last - prev).toFixed(0)} if cause is resolved`,
      icon:     '📈'
    })
  }

  return findings
}

function checkS3Optimization(monthly) {
  const findings = []
  if (!monthly || monthly.length < 2) return findings

  const avgS3 = avgOverMonths(monthly, 'S3')

  if (avgS3 > 50) {
    findings.push({
      id:       's3-lifecycle-policy',
      priority: 'MEDIUM',
      category: 'S3',
      title:    'Add S3 lifecycle policies to reduce storage costs',
      detail:   `Your average S3 spend is $${avgS3.toFixed(0)}/month. Without lifecycle policies, old objects stay in expensive Standard storage indefinitely.`,
      action:   `Set up S3 lifecycle rules to move objects older than 30 days to S3-IA (Infrequent Access) and objects older than 90 days to Glacier. This typically saves 50–70% on storage.`,
      saving:   `~$${(avgS3 * 0.5).toFixed(0)} / month`,
      icon:     '🗄️'
    })
  }

  return findings
}

function checkLambdaOptimization(monthly) {
  const findings = []
  if (!monthly || monthly.length < 2) return findings

  const avgLambda = avgOverMonths(monthly, 'Lambda')

  if (avgLambda > 50) {
    findings.push({
      id:       'lambda-memory-optimization',
      priority: 'MEDIUM',
      category: 'Lambda',
      title:    'Optimize Lambda memory allocation',
      detail:   `Your Lambda spend averages $${avgLambda.toFixed(0)}/month. Many Lambda functions are over-provisioned with memory, which increases cost per invocation.`,
      action:   `Use AWS Lambda Power Tuning tool to find the optimal memory setting for each function. Right-sizing memory can reduce cost by 20–40% without affecting performance.`,
      saving:   `~$${(avgLambda * 0.3).toFixed(0)} / month`,
      icon:     '⚡'
    })
  }

  return findings
}

function checkMultiServiceDiversity(monthly) {
  const findings = []
  if (!monthly || monthly.length === 0) return findings

  const lastMonth  = monthly[monthly.length - 1]
  const groups     = lastMonth?.Groups || []
  const total      = monthlyTotal(groups)
  const ec2Cost    = serviceCost(groups, 'EC2')
  const ec2Pct     = total > 0 ? (ec2Cost / total) * 100 : 0

  if (ec2Pct > 70) {
    findings.push({
      id:       'ec2-dominates-spend',
      priority: 'MEDIUM',
      category: 'Architecture',
      title:    'EC2 dominates your spend — consider managed services',
      detail:   `EC2 accounts for ${ec2Pct.toFixed(0)}% of your total AWS bill. Running all workloads on EC2 requires manual scaling, patching, and monitoring.`,
      action:   `Evaluate moving stateless workloads to AWS Lambda (serverless) or containers on ECS/Fargate. Managed services reduce operational overhead and often cost less at scale.`,
      saving:   'Architectural saving — varies by workload',
      icon:     '🏗️'
    })
  }

  return findings
}

function checkBudgetAlert(monthly) {
  const findings = []
  if (!monthly || monthly.length === 0) return findings

  const lastMonth = monthly[monthly.length - 1]
  const total     = monthlyTotal(lastMonth?.Groups || [])

  if (total > 1000) {
    findings.push({
      id:       'set-budget-alerts',
      priority: 'LOW',
      category: 'Governance',
      title:    'Set up AWS Budget alerts',
      detail:   `Your monthly spend is $${total.toFixed(0)}. Without budget alerts, unexpected cost spikes may go unnoticed until the bill arrives.`,
      action:   `Go to AWS Billing → Budgets → Create a budget. Set alerts at 80% and 100% of your expected monthly spend. AWS will email you automatically.`,
      saving:   'Prevents surprise bills',
      icon:     '🔔'
    })
  }

  return findings
}

function checkEnableComputeSavingsPlans(monthly) {
  const findings = []
  if (!monthly || monthly.length < 3) return findings

  const avgTotal = monthly
    .map(m => monthlyTotal(m.Groups || []))
    .reduce((a, b) => a + b, 0) / monthly.length

  if (avgTotal > 500) {
    const annualSaving = avgTotal * 12 * 0.17  // ~17% with Compute Savings Plans
    findings.push({
      id:       'compute-savings-plan',
      priority: 'LOW',
      category: 'Cost',
      title:    'Consider Compute Savings Plans',
      detail:   `Your average monthly AWS spend is $${avgTotal.toFixed(0)}. Compute Savings Plans offer up to 66% discount and automatically apply to EC2, Lambda, and Fargate usage.`,
      action:   `Go to AWS Cost Explorer → Savings Plans → View recommendations. AWS will suggest the right commitment amount based on your usage history.`,
      saving:   `~$${annualSaving.toFixed(0)} / year`,
      icon:     '📋'
    })
  }

  return findings
}

// ── Main Engine: run all rules ────────────────────────────────────────
function runRecommendationEngine(monthly, performanceData) {
  const allFindings = [
    ...checkIdleEC2(performanceData),
    ...checkHighCPUInstances(performanceData),
    ...checkReservedInstanceOpportunity(monthly),
    ...checkCostSpike(monthly),
    ...checkS3Optimization(monthly),
    ...checkLambdaOptimization(monthly),
    ...checkMultiServiceDiversity(monthly),
    ...checkBudgetAlert(monthly),
    ...checkEnableComputeSavingsPlans(monthly),
  ]

  // Sort: HIGH first, then MEDIUM, then LOW
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  allFindings.sort((a, b) => order[a.priority] - order[b.priority])

  const summary = {
    total:  allFindings.length,
    high:   allFindings.filter(f => f.priority === 'HIGH').length,
    medium: allFindings.filter(f => f.priority === 'MEDIUM').length,
    low:    allFindings.filter(f => f.priority === 'LOW').length,
  }

  return { findings: allFindings, summary }
}

module.exports = { runRecommendationEngine }