# AWS Billing Dashboard

A cost management and monitoring dashboard for AWS accounts — visualize billing trends, forecast upcoming spend, review EC2/RDS/S3/Lambda inventory, monitor EC2 performance via CloudWatch, and get rule-based cost-saving recommendations.

Built as a full-stack React + Express project. Works entirely in **Demo mode** with realistic mock data (no AWS account needed), and switches to **Live mode** to pull real data from your own AWS account once you connect it.

## Features

- **Cost & Billing** — monthly/daily spend trends, service-by-service breakdown, month-over-month comparison, all-time summary
- **Forecast** — 3-window (end-of-month / 3-month / 6-month) cost forecast via AWS Cost Explorer, with confidence range
- **Resources** — inventory of EC2, RDS, S3, and Lambda resources with search, filter, and sort
- **Performance** — EC2 CPU and network utilization (last 7 days) via CloudWatch, per-instance drill-down
- **Recommendations** — rule-based engine surfacing idle instances, oversized resources, and other cost-saving opportunities
- **Future Cost Prediction** — 6-month linear cost projection plus a service-dependency graph (Dijkstra's algorithm) exploring cost-optimal paths between your highest-spend services. Node costs are real (pulled from actual monthly spend); edge weights between services are illustrative/simulated, since AWS doesn't expose a per-service-pair interaction cost.

Every tab has a **Demo mode ↔ Live mode** toggle. Demo mode is the default so the dashboard is fully explorable with no setup.

## Tech Stack

**Frontend:** React 18, Vite 7, Tailwind CSS 4, Chart.js / react-chartjs-2, axios
**Backend:** Node.js, Express 4, AWS SDK v3 (`@aws-sdk/client-cost-explorer`, `client-cloudwatch`, `client-ec2`, `client-rds`, `client-s3`, `client-lambda`)

No database — this is a live-query dashboard against your AWS account, not a data warehouse. No user authentication — it's a single-operator tool; anyone with the running app and a valid AWS key can view that account's data.

## Project Structure

```
aws-billing-dashboard/
├── src/
│   ├── components/       # Dashboard, tabs, charts, cards
│   ├── hooks/             # useBillingData — data fetching + demo/live state
│   └── utils/              # formatCurrency, Chart.js setup
├── server/
│   ├── routes/            # billing, performance, recommendations, resources
│   ├── services/           # AWS SDK integration per domain
│   └── server.js            # Express app entry point
└── .env.production          # frontend build-time API URL (no secrets)
```

## Getting Started

### 1. Backend

```bash
cd server
npm install
```

Create `server/.env`:

```
PORT=3001
AWS_ACCESS_KEY_ID=your_access_key       # optional — only needed as a fallback
AWS_SECRET_ACCESS_KEY=your_secret_key   # for Live mode without connecting via the UI
AWS_REGION=us-east-1
FRONTEND_URL=http://localhost:5173      # for CORS in non-local deployments
```

You generally **don't need** to set AWS credentials in `.env` — the app is designed to take credentials through the **Connect Account** button in the UI instead (see Live Mode below). The `.env` values are only used as a fallback if no account is connected through the UI.

```bash
npm run dev      # starts on http://localhost:3001 with auto-reload
```

### 2. Frontend

```bash
npm install
npm run dev       # starts on http://localhost:5173
```

Open `http://localhost:5173` — the dashboard loads in Demo mode immediately.

### 3. Production build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## Live Mode — Connecting Your AWS Account

Click **Connect Account** in the app and enter an AWS access key + secret key. Credentials are kept only in browser memory for the session (never written to disk or `localStorage`) and are sent to the backend as request headers on each API call, which the backend uses to build a per-request AWS SDK client.

**Required IAM permissions** (read-only), attach a policy granting:

```
ce:GetCostAndUsage
ce:GetCostForecast
ec2:DescribeInstances
rds:DescribeDBInstances
s3:ListBuckets
lambda:ListFunctions
cloudwatch:GetMetricStatistics
```

No write/create/delete permissions are needed or used anywhere in this app.

**Security note:** long-term IAM access keys pasted into a browser form are inherently more exposed than short-lived credentials or a server-side-only key. This is an accepted simplification for a personal/single-operator tool — don't reuse a key with broader permissions than the list above, and don't deploy this publicly with a key that has more access than you're comfortable exposing.

## API Overview

All endpoints are mounted under `/api`. Each domain has a `/demo` variant (no credentials needed, static mock data) and a `/live` or main variant (reads AWS credentials from `x-aws-access-key-id` / `x-aws-secret-access-key` / `x-aws-region` request headers, falling back to `server/.env` if none are sent).

| Route | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/billing/monthly`, `/daily`, `/forecast`, `/summary` | Cost Explorer data |
| `GET /api/performance/demo`, `/ec2` | CloudWatch EC2 metrics |
| `GET /api/resources/demo`, `/live` | EC2/RDS/S3/Lambda inventory |
| `GET /api/recommendations/demo`, `/live` | Rule-based cost recommendations |

## Known Limitations

- No database — nothing persists between sessions; each page load starts fresh (Demo mode) or requires reconnecting an account (Live mode)
- No user authentication/multi-tenancy — single AWS account per session
- The Future Cost Prediction service-dependency graph uses simulated edge weights between services (see Features above) — the node costs and 6-month linear projection are real, calculated from actual billing data
