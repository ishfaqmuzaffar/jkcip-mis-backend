JKCIP MIS - Logframe Phase 1 Backend Upgrade
===========================================

What this upgrade adds
----------------------
1. Logframe hierarchy model
2. Indicator master model
3. Year-wise indicator progress model
4. Basic logframe dashboard APIs
5. APIs for node creation, indicator creation, and annual progress entry

New Prisma models/enums
-----------------------
- LogframeLevel
- IndicatorDirection
- IndicatorFrequency
- LogframeNode
- Indicator
- IndicatorYearProgress

New API endpoints
-----------------
GET    /api/logframe/tree
GET    /api/logframe/nodes
POST   /api/logframe/nodes
PATCH  /api/logframe/nodes/:id
GET    /api/logframe/indicators
GET    /api/logframe/indicators/:id
POST   /api/logframe/indicators
PATCH  /api/logframe/indicators/:id
GET    /api/logframe/indicators/:id/progress
POST   /api/logframe/indicators/:id/progress
GET    /api/logframe/dashboard/summary
GET    /api/logframe/dashboard/outcomes

Important deployment steps
--------------------------
Because prisma/schema.prisma has changed, you MUST regenerate Prisma Client and push the schema.

Run these commands inside the backend project directory:

1. node node_modules/prisma/build/index.js generate
2. node node_modules/prisma/build/index.js db push
3. npm run build
4. restart the backend container/service

Suggested implementation order after this phase
-----------------------------------------------
1. Seed/import the actual JKCIP logframe rows from the Excel sheet
2. Build frontend Logframe screens
3. Add district/block/disaggregation entry tables in frontend
4. Add export/report endpoints for donor reporting

Suggested first hierarchy to seed
---------------------------------
- Outreach
- Goal
- Development Objective
- Outcome 1
- Outcome 2
- Outcome 3
- Outcome 4
- Outcome 5

Then place indicators under the correct node and start entering annual target/result rows for 2024-2029.
