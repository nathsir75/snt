# SNT Education SaaS

Full-stack app: Angular 18 frontend + Express/Prisma backend.

## Project Structure
```
snt/
├── backend/    # Express + Prisma + PostgreSQL
└── fontend/    # Angular 18
```

## Backend Setup (VPS)
```bash
cd backend
cp .env.example .env        # fill in real values
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

## Frontend Build (VPS or CI)
```bash
cd fontend
npm install
npm run build               # outputs to dist/
```
Serve `dist/snt-frontend/browser/` with Nginx.

## Environment Variables
See `backend/.env.example` for required variables.
