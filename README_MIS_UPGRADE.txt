JKCIP MIS BACKEND UPGRADE

What is added:
- dynamic dashboard stats
- dashboard overview endpoint
- dashboard recent activity endpoint
- schemes module
- projects module
- beneficiaries module
- approvals module
- role guard for admin / officer actions
- improved CORS for localhost dynamic ports and production host

Important after uploading this backend:
1) Set DATABASE_URL and JWT_SECRET in your environment.
2) Run: npm run prisma:generate
3) Run: npm run prisma:push
4) Run: npm run build
5) Restart / redeploy container

Main new API endpoints:
GET /api/dashboard/stats
GET /api/dashboard/overview
GET /api/dashboard/recent-activity

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
