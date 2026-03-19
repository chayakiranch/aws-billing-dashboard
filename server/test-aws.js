require('dotenv').config();
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');

const client = new CostExplorerClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function getMonthlyCosts() {
  const command = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: '2025-02-01',
      End: '2025-04-01'
    },
    Granularity: 'MONTHLY',
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    Metrics: ['UnblendedCost']
  });

  const response = await client.send(command);
  return response.ResultsByTime;
}

getMonthlyCosts()
  .then(data => console.log('Connection successful:', JSON.stringify(data, null, 2)))
  .catch(err => console.error('Connection failed:', err.message));