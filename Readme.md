# Rateify — Store Rating Platform

A full-stack web app where users rate stores from 1 to 5. One login for everyone, with different features for **Administrators**, **Store owners** and **Normal users**.

- **Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis
- **Frontend:** React 19, TanStack Start/Router, Tailwind CSS v4, shadcn/ui
- **Runtime / package manager:** [Bun](https://bun.sh) (Node 20+ also works for the backend)

---

## Features

### Everyone
- Single login; the user lands on a page that matches their role
- Sign up with name, email and password, then verify through an **email link**. The account is only created after the link is clicked.
- Google sign-up and login (normal users)
- Forgot / reset password by email; change password after login
- Profile with a **completion percentage** and reminders to finish it
- Multiple addresses, saved as flat no., street, landmark, area, city, state, PIN code and country, and also combined into one full address
- Profile and store images (Cloudflare R2)
- Email notifications: verification, welcome, login alerts, password changed, ratings

### Normal user
- Browse and search stores by name and address, with sorting and filters
- Rate a store (1–5, optional comment) and edit the rating later
- See the store's overall rating next to their own rating
- "My ratings" page

### Store owner
- Dashboard with average rating, total ratings, a breakdown by stars and recent ratings
- List of users who rated their store, with filters and sorting
- Chooses a store name, owner photo and store logo at signup

### Administrator
- Dashboard: total users, stores and ratings, plus users by role
- **Users:** create, view, **edit** (details, role, status, addresses) and delete, with filters on name, email, address, role and status, plus sorting
- **Stores:** create (owner name, store name, email, password), edit, edit address, change logo and delete, with filters and sorting
- Owner users show their **rating** on the user page

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Bun (backend can also run on Node 20+) |
| Backend framework | Express 4, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache / pending signups | Redis |
| Validation | Zod |
| Auth | JWT access token (15 min) + rotating refresh token (hashed in DB), bcrypt, Passport (Google OAuth 2.0) |
| Email | Nodemailer (Gmail SMTP) |
| File storage | Cloudflare R2 (S3-compatible, `@aws-sdk/client-s3`) |
| Uploads | Multer (memory storage, magic-byte image check) |
| Security | Helmet, CORS allowlist, rate limiting, account lockout, request IDs |
| Logging | Pino |
| Frontend framework | React 19, TanStack Start + Router (file-based routing), TanStack Query |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide-react, Recharts, Framer Motion |
| Forms | react-hook-form + Zod |
| HTTP | axios (single-flight token refresh) |

---

## Project structure

```
store-rating-platform/
├── README.md
├── server/                      # backend
│   ├── prisma/                  # schema.prisma, seed.ts
│   └── src/
│       ├── config/              # env, cors, passport
│       ├── lib/                 # prisma, redis, logger, mailer, storage (R2)
│       ├── utils/               # ApiError, jwt, password, address, pagination, ...
│       ├── middlewares/         # authenticate, authorize, validate, rateLimiter, upload, errors
│       ├── validators/          # Zod schemas
│       ├── services/            # business logic
│       ├── controllers/         # HTTP handlers
│       └── routes/              # route definitions
└── ratify/                      # frontend
    └── src/
        ├── api/                 # axios client + endpoint functions
        ├── components/          # common, layout, stores, address, profile, ui (shadcn)
        ├── context/             # Auth, Theme
        ├── hooks/ lib/ types/
        └── routes/              # file-based routes
```

---

## Prerequisites

- [Bun](https://bun.sh) 1.1+
- PostgreSQL 14+
- Redis 6+ (`docker run -d --name redis -p 6379:6379 redis:7`)
- Optional: a Gmail app password (email), a Google OAuth client (Google login), a Cloudflare R2 bucket (images)

---

## Quick start

### 1. Database
Create an empty PostgreSQL database, for example `store_rating`.

### 2. Backend
```bash
cd server
bun install
cp .env.example .env        # then edit it (see below)
bunx prisma migrate dev --name init --create-only
```
Open the generated `prisma/migrations/<timestamp>_init/migration.sql` and add this line at the end (Prisma can't express it):
```sql
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_value_range" CHECK ("value" BETWEEN 1 AND 5);
```
Then:
```bash
bunx prisma migrate dev
bunx prisma generate
bun run seed                # creates the admin account from ADMIN_* in .env
bun run dev                 # http://localhost:3000  (health: /health)
```

### 3. Frontend
```bash
cd client
bun install
cp .env.example .env
bun run dev                 # prints the URL, usually http://localhost:5173
```

**Important:** `FRONTEND_URL` and `CORS_ORIGINS` in `server/.env` must exactly match the URL the frontend prints (`localhost` and `127.0.0.1` are different). Restart the backend after changing `.env`.

### 4. First login
Log in with the seeded admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), choosing **Admin** on the login page.

---

## Environment variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | no | `development` or `production` |
| `PORT` | no | API port (default `3000`) |
| `BASE_URL` | yes | Public URL of the API; used in email verification links |
| `FRONTEND_URL` | yes | Exact URL of the frontend; used for email redirects and reset links |
| `CORS_ORIGINS` | yes | Comma-separated allowed origins (`regex:` prefix supported) |
| `APP_NAME` | no | Name used in emails (default `StoreRate`; use `Rateify`) |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis connection string |
| `JWT_SECRET` | yes | At least 32 random characters |
| `JWT_ACCESS_TTL` | no | Access token lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | no | Refresh token lifetime (default `30`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Enables Google login/signup |
| `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | no | Gmail address, app password and sender name. Without them, emails are skipped and dev links are printed in the console. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | no | Cloudflare R2 for images. Without them, image uploads return an error. |
| `ADMIN_SIGNUP_CODE` | no | Secret code needed to self-register as Admin. **Leave empty to disable admin signup.** |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed | Credentials of the seeded admin |
| `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_MAX`, `TRUST_PROXY`, `LOG_LEVEL` | no | Rate limiting and logging tuning |

Minimal working example:
```env
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS="http://localhost:5173"
APP_NAME=Rateify
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/store_rating?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="<run: bun -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\">"
ADMIN_NAME="System Administrator Account"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin@12345"
```

### `ratify/.env`
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Roles and permissions

| Capability | User | Owner | Admin |
|---|:--:|:--:|:--:|
| Sign up / log in / change password | ✅ | ✅ | ✅ |
| Browse and search stores, rate, edit own rating | ✅ | — | — |
| Dashboard with own store ratings | — | ✅ | — |
| See who rated their store | — | ✅ | — |
| Manage users and stores, platform dashboard | — | — | ✅ |

At signup and login, the user picks **User**, **Store owner** or **Admin**. Login checks that the account really has the selected role.

---

## API overview (all under `/api`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup` (multipart) · `GET /auth/verify-email` · `POST /auth/resend-verification` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/logout-all` · `GET /auth/me` · `POST /auth/change-password` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `GET /auth/google/{login,signup}` |
| Profile | `GET/PATCH /profile` · `POST /profile/addresses` · `PATCH /profile/addresses/:id` · `PATCH /profile/addresses/:id/primary` · `DELETE /profile/addresses/:id` · `POST/DELETE /profile/picture` |
| Stores (user) | `GET /stores` · `GET /stores/:id` · `POST/PUT /stores/:storeId/ratings` · `GET /ratings/me` |
| Owner | `GET /owner/dashboard` · `GET /owner/stores` · `GET /owner/ratings` |
| Admin: dashboard | `GET /admin/dashboard` |
| Admin: users | `POST/GET /admin/users` · `GET/PATCH/DELETE /admin/users/:id` · `POST /admin/users/:id/addresses` · `PATCH/DELETE /admin/users/:id/addresses/:addressId` · `PATCH /admin/users/:id/addresses/:addressId/primary` |
| Admin: stores | `POST/GET /admin/stores` · `GET/PATCH/DELETE /admin/stores/:id` · `PUT /admin/stores/:id/address` · `POST /admin/stores/:id/logo` |

All list endpoints support `page`, `limit`, `sortBy`, `order` and filters (admin users: `name`, `email`, `address`, `role`, `status`; stores: `search`, `name`, `address`, `minRating`, plus `email` and `status` for admins).

Responses: `{ success, message, data, meta? }`. Errors: `{ success: false, message, code, details?, requestId }`.

---

## Validation rules

| Field | Rule |
|---|---|
| Name | 20–60 characters |
| Email | Standard email format |
| Password | 8–16 characters, at least one uppercase letter and one special character |
| Address (combined) | Max 400 characters |
| Rating | Whole number 1–5 |
| Images | JPEG, PNG or WebP, max 5 MB |

---

## Authentication notes

- Access tokens (15 min) are kept in memory. Refresh tokens are single-use and rotating; reusing an old one logs the user out everywhere.
- Passwords are hashed with bcrypt. After 5 failed logins the account locks for 15 minutes.
- Signup stores the pending account in Redis for 30 minutes. Nothing is written to PostgreSQL until the email link is clicked.
- Self-registration as Admin needs `ADMIN_SIGNUP_CODE`.
- Changing a password signs out every other device.

---

## Try it

1. Log in as the seeded admin.
2. **Admin → Stores → Add store**: enter owner name, store name, email and password. This creates the store and its owner account.
3. Log out and sign up as a normal user. In development the verification link is printed in the backend console. Log in, add an address, and rate the store.
4. Log in as the owner to see the dashboard and ratings.
5. As admin, open **Users → a user** to edit their details and addresses.

---

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Backend exits with "Invalid environment configuration" | A required `.env` value is missing (for example `JWT_SECRET` under 32 characters) |
| `ECONNREFUSED 6379` | Redis isn't running |
| CORS error in the browser | `CORS_ORIGINS` doesn't exactly match the frontend URL |
| Email links go to the wrong page | `FRONTEND_URL` is wrong |
| "Can't reach the server" | Backend isn't running, or `VITE_API_BASE_URL` has the wrong port |
| `bun install` fails with `EPERM` on Windows | Antivirus or OneDrive is locking files. Exclude the project and the Bun cache, or move the project out of `Downloads` |
| Both servers want port 3000 | Set `PORT=4000` and `BASE_URL=http://localhost:4000` in the backend, and `VITE_API_BASE_URL=http://localhost:4000/api` in the frontend |

---

## Deployment notes

- Set `NODE_ENV=production`, strong secrets, a real `CORS_ORIGINS` and HTTPS URLs for `BASE_URL` / `FRONTEND_URL`.
- Run `bunx prisma migrate deploy` instead of `migrate dev`.
- Set `TRUST_PROXY` to the number of proxies in front of the API.
- Register the Google redirect URIs `<BASE_URL>/api/auth/google/login/callback` and `<BASE_URL>/api/auth/google/signup/callback`.
- Disable admin self-signup (empty `ADMIN_SIGNUP_CODE`) unless you need it.