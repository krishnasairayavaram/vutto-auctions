# Vutto Auctions

A web-based bike auction platform for browsing motorcycle auctions and participating in live bidding.

## Project links

- **Live application:** https://vutto-auctions.vercel.app/
- **Source repository:** https://github.com/krishnasairayavaram/vutto-auctions
- **Backend health check:** https://vutto-auctions-api-esmi.onrender.com/api/health

> The backend is hosted on Render's free service tier, so the first request after inactivity may be slower while the service starts.

## Admin Credentials

- ADMIN_EMAIL=admin@example.com
- ADMIN_PASSWORD=adminadmin2005

## Features

- User registration and login with JWT-based authentication.
- Auction listing and auction creation.
- Live bid updates using Socket.IO.
- Auction lifecycle handling for scheduled, live, and ended auctions.
- Winner and winning-bid display after an auction closes.
- MongoDB persistence using Mongoose models.
- Cloudinary dependency available for image handling.
- Backend health endpoint for basic service/database status.

Verify each feature in the current deployment before describing it as available to evaluators.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React 18, Vite, Axios, Socket.IO Client, Lucide React |
| Backend | Node.js, Express 4, Socket.IO |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Image handling | Cloudinary, Multer |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Database hosting | MongoDB Atlas |

## Repository structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/database.js
│   │   ├── middleware/auth.js
│   │   ├── models/{Auction,Bid,User}.js
│   │   ├── routes/{auction.routes,auth.routes}.js
│   │   ├── scripts/seedAdmin.js
│   │   ├── services/auctionLifecycle.js
│   │   ├── app.js
│   │   ├── server.js
│   │   └── socket.js
│   └── package.json
└── frontend/
    ├── src/{api.js,App.jsx,main.jsx,styles.css}
    ├── .env.example
    └── package.json
```

## Prerequisites

- Node.js compatible with the project's Vite and backend dependencies.
- npm.
- MongoDB Atlas or a local MongoDB instance.
- Cloudinary credentials if the image-upload flow is used.

## Run locally

Use two terminal windows from the repository root.

### 1. Backend

```powershell
cd backend
npm install
```

Create `backend/.env` using the exact environment variable names referenced in the backend source. Supply your own database connection string, JWT secret, frontend origin, and Cloudinary configuration if needed. Do not commit this file.

Start the backend:

```powershell
npm run dev
```

The server defaults to port `5000` unless `PORT` overrides it.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
```

The provided `frontend/.env.example` contains local development values:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Copy `.env.example` to `.env` if desired, then run:

```powershell
npm run dev
```

Vite prints the local URL in the terminal.

### 3. Build the frontend

```powershell
cd frontend
npm run build
```

The production build is written to `frontend/dist`.

### 4. Health check

Local: `http://localhost:5000/api/health`

Deployed: `https://vutto-auctions-api-esmi.onrender.com/api/health`

## Admin setup

The backend provides an admin seeding script:

```powershell
cd backend
npm run seed:admin
```

Review `backend/src/scripts/seedAdmin.js` before running it and follow its required inputs and behavior. Use a unique, strong password. Never commit credentials.

## Deployment overview

### Backend — Render

1. Connect the GitHub repository to Render.
2. Configure `backend` as the root directory if deploying from this monorepo.
3. Use `npm install` as the build/install command and `npm start` as the start command.
4. Add backend environment variables in Render settings.
5. Set the allowed frontend origin to `https://vutto-auctions.vercel.app`.
6. Deploy and verify `/api/health`.

### Frontend — Vercel

1. Import the repository into Vercel.
2. Set the project root directory to `frontend`.
3. Use `npm run build` and set the output directory to `dist`.
4. Configure production variables:
   - `VITE_API_URL=https://vutto-auctions-api-esmi.onrender.com/api`
   - `VITE_SOCKET_URL=https://vutto-auctions-api-esmi.onrender.com`
5. Redeploy after changing environment variables.

### Database — MongoDB Atlas

1. Create a database and database user.
2. Configure network access carefully.
3. Add the connection string to the backend environment settings.
4. Never put database credentials in frontend variables or commit them to Git.

## Security notes

- Keep `.env` files, database credentials, JWT secrets, and admin credentials out of Git.
- Variables prefixed with `VITE_` are public in the browser bundle; never put secrets there.
- Use HTTPS in deployed environments.
- Validate and authorize protected actions on the server.
- Client-side validation is a usability aid, not a security boundary.
- Review rate limiting, request-size limits, dependency vulnerabilities, and production logging before claiming the app is production-hardened.

## Testing

The package scripts supplied for this project currently show no dedicated `test` script. Document the exact test command and coverage only after verifying which automated tests exist in the repository.

Recommended checks include registration/login, authorization, bid validation, simultaneous bids, auction closing/winner selection, and Socket.IO updates across connected clients.

## Observability

The backend health endpoint reports basic service/database status, and hosting-provider logs can help diagnose startup and runtime errors. A health endpoint and logs do not by themselves provide metrics, alerting, or distributed tracing.

## Deployment consideration

A free hosting tier may suspend an idle backend, making the first request after inactivity slower.

## License

Add a license if you intend to publish this project under a specific open-source license.
