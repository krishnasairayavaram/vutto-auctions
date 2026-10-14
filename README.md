# Vutto Auctions — Milestone 1

A fresh MERN-style bike auction platform starter for the Vutto Software Engineering Intern assignment.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Authentication: JWT + bcrypt
- Live events: Socket.IO (basic auction room/event wiring included)

## Prerequisites
- Node.js 20+
- MongoDB Atlas connection string
- Git

## 1. Configure the backend
```bash
cd backend
cp .env.example .env
```
Set `MONGODB_URI`, `JWT_SECRET`, and optionally `CLIENT_ORIGIN`.
Install and run:
```bash
npm install
npm run dev
```
Health check: `http://localhost:5000/api/health`

Create an admin user:
```bash
npm run seed:admin
```
Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env` before running the seed command. Do not use a weak password.

## 2. Configure the frontend
In a second terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Open the Vite URL printed in the terminal (normally `http://localhost:5173`).

## Implemented in this starter
- Register and login with hashed passwords and JWT
- Authenticated `/api/auth/me`
- Public auction list and detail endpoints
- Admin-only auction creation
- Bid endpoint with server-side checks and atomic current-price update
- Socket.IO event wiring for auction updates
- Health endpoint and basic frontend

## Important next steps before submission
This is a foundation, not the finished assignment. Before deploying, implement and test:
1. Transaction-safe bid history and current-price consistency (use a MongoDB replica set transaction or a single-document bid design).
2. Scheduled auction closing and deterministic winner selection.
3. Rate limiting, stricter schemas, request validation, CORS allow-list, and security headers.
4. Automated tests for concurrent bids, authorization, and auction lifecycle.
5. Better UI, pagination, logging, and API documentation.
6. Deployment and verification on Render/Vercel.

## Deployment outline
### Render backend
- Create a Web Service connected to this repository's `backend` directory.
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables from `.env.example`; set `CLIENT_ORIGIN` to your deployed Vercel URL.

### Vercel frontend
- Import the repository and set Root Directory to `frontend`.
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to `https://YOUR-RENDER-SERVICE.onrender.com/api`
- Set `VITE_SOCKET_URL` to `https://YOUR-RENDER-SERVICE.onrender.com`

Never commit `.env` files or real credentials.
