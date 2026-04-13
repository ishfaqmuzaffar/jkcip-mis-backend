LOGFRAME BACKEND + IMPORT

What this package adds:
- logframe database models
- logframe API module
- yearly indicator progress support
- JKCIP logframe seed JSON generated from the uploaded Excel
- seed script to load nodes, indicators, and year-wise progress

Deploy steps on Coolify:
1. Redeploy this backend.
2. Open terminal for the running container.
3. Run:
   npm run prisma:generate
   npm run prisma:push
   npm run build
   npm run seed:logframe

If the container uses only compiled output, use:
   node node_modules/prisma/build/index.js generate
   node node_modules/prisma/build/index.js db push
   node dist/scripts/seed-logframe.js

Main API:
- GET /logframe/tree
- GET /logframe/nodes
- GET /logframe/indicators
- GET /logframe/indicators/:id
- GET /logframe/indicators/:id/progress
- GET /logframe/dashboard/summary
- GET /logframe/dashboard/outcomes
