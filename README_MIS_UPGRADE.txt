JKCIP MIS BACKEND UPGRADE

What is added in this updated backend zip:
- dynamic dashboard stats with financial and target summaries
- dashboard overview endpoint
- dashboard recent activity endpoint
- district performance endpoint for charts/tables
- quota summary endpoint for youth / women / BPL / general reporting
- richer schemes module with utilized budget and target beneficiary tracking
- richer projects module with district, block, village, budget utilization, targets and GIS-ready latitude/longitude
- richer beneficiaries module with category flags (youth, woman, BPL, general)
- role guard for admin / officer actions
- improved CORS using env-configurable origins
- PORT support from environment variables
- bcrypt replaced with bcryptjs to avoid native module deployment issues on VPS/container
- .env.example added
- node_modules and .git removed from the zip so deployment stays clean

Important after uploading this backend:
1) Copy .env.example to .env and set DATABASE_URL and JWT_SECRET.
2) Run: npm install
3) Run: npm run prisma:generate
4) Run: npm run prisma:push
5) Run: npm run build
6) Restart / redeploy container

Main API endpoints:
GET /api/dashboard/stats
GET /api/dashboard/overview
GET /api/dashboard/recent-activity
GET /api/dashboard/district-performance
GET /api/dashboard/quota-summary

GET /api/schemes
GET /api/schemes/summary
POST /api/schemes
PATCH /api/schemes/:id/status

GET /api/projects
GET /api/projects/summary
POST /api/projects
PATCH /api/projects/:id/status

GET /api/beneficiaries
GET /api/beneficiaries/summary
POST /api/beneficiaries
PATCH /api/beneficiaries/:id/status

GET /api/approvals
GET /api/approvals/summary
POST /api/approvals
PATCH /api/approvals/:id/status

GET /api/users
GET /api/users/summary
PATCH /api/users/:id/status

Important note:
This zip was updated structurally and syntax-checked locally.
Prisma client regeneration could not be executed in this environment because Prisma binary download was blocked offline.
On your VPS/Coolify deployment, run prisma:generate and prisma:push before building.
