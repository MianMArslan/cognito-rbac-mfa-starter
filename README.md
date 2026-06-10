# cognito-rbac-mfa-starter

A production-ready, full-stack authentication starter kit built on **AWS Cognito** with **Role-Based Access Control (RBAC)** and **Multi-Factor Authentication (MFA)**. Clone it, plug in your Cognito credentials, and you have a working auth system in minutes.

**Stack:** Next.js 14 · NestJS · AWS Cognito · TypeScript · Turborepo · pnpm

---

## Table of Contents

- [For Everyone — What This Project Does](#for-everyone--what-this-project-does)
- [For Developers — Technical Reference](#for-developers--technical-reference)
  - [Architecture](#architecture)
  - [Repository Structure](#repository-structure)
  - [Prerequisites](#prerequisites)
  - [Local Development Setup](#local-development-setup)
  - [AWS Cognito Setup](#aws-cognito-setup)
  - [Environment Variables](#environment-variables)
  - [Seeding an Admin User](#seeding-an-admin-user)
  - [Authentication Flow](#authentication-flow)
  - [MFA Flow](#mfa-flow)
  - [RBAC — How Roles Work](#rbac--how-roles-work)
  - [API Reference](#api-reference)
  - [Token Strategy](#token-strategy)
  - [Tech Stack](#tech-stack)
- [License](#license)

---

## For Everyone — What This Project Does

> This section explains the project in plain English — no coding knowledge required.

### The Problem It Solves

Most applications need users to sign up, log in, and have different levels of access. For example, a regular user might only see their own profile, while an administrator can manage everyone. Setting all of this up securely from scratch is complex, time-consuming, and easy to get wrong.

This project gives developers a **ready-made starting point** that handles all of that for them.

### What's Included

**Secure login system**
Users can create an account with their email and password. The login process uses AWS Cognito — Amazon's enterprise-grade authentication service trusted by thousands of companies worldwide. Passwords are never stored directly; Cognito handles everything securely.

**Two-Factor Authentication (MFA)**
Users can optionally enable a second layer of security on their account. After enabling it, every login requires a 6-digit code from an app like Google Authenticator or Authy — similar to how banking apps work. This makes accounts significantly harder to break into even if a password is stolen.

**Two user roles**
- **Admin** — can see and manage all users in the system
- **Client** — regular user, can only access their own account and settings

**A working dashboard**
Once logged in, users land on a dashboard that shows their account details, role, and security status. Admins see an extra "User Management" section. All users can manage their account from a Settings page, including enabling MFA.

**Password recovery**
Users can reset a forgotten password via email — Cognito sends a verification code automatically.

### Who This Is For

This is a **developer starter kit** — a template that developers use as the foundation for building a new application. Instead of spending weeks building login/auth from scratch, a developer clones this project and focuses on building the actual product on top of it.

---

## For Developers — Technical Reference

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js 14 (port 3000)                        │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐ │
│  │  App Router Pages   │   │  Next.js API Routes              │ │
│  │  /login             │   │  /api/auth/*  (proxy to NestJS)  │ │
│  │  /dashboard         │   │  /api/users   (proxy to NestJS)  │ │
│  │  /settings          │   └──────────────────────────────────┘ │
│  │  /admin  (ADMIN)    │                                        │
│  └─────────────────────┘                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP  (Authorization: Bearer <id_token>)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS API (port 4000)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ AuthModule   │  │ UsersModule  │  │  HealthController   │   │
│  │ MfaController│  │ UsersService │  │  /health            │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ AWS SDK v3
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Cognito User Pool                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Admins  │  │   Clients    │  │  TOTP MFA (optional)     │   │
│  │  group   │  │   group      │  │  cognito:groups in JWT   │   │
│  └──────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

Session tokens are stored in `sessionStorage` (tab-isolated). The Next.js layer acts as a thin proxy — it forwards the `Authorization` header to NestJS and returns the response. There is no server-side cookie or session storage.

---

### Repository Structure

```
cognito-rbac-mfa-starter/
├── apps/
│   ├── api/                              # NestJS backend (port 4000)
│   │   ├── scripts/
│   │   │   └── seed-admin.js             # One-shot admin user seeder
│   │   └── src/
│   │       ├── auth/
│   │       │   ├── auth.controller.ts    # register, login, logout, refresh, confirm
│   │       │   ├── auth.service.ts       # orchestrates auth flows
│   │       │   ├── mfa.controller.ts     # setup, verify-setup, challenge, disable
│   │       │   ├── cognito.provider.ts   # all AWS SDK Cognito calls
│   │       │   ├── cognito-group.manager.ts
│   │       │   ├── cognito-token.verifier.ts
│   │       │   ├── jwt.strategy.ts       # passport-jwt, validates ID token
│   │       │   ├── guards/
│   │       │   │   ├── jwt-auth.guard.ts
│   │       │   │   └── roles.guard.ts
│   │       │   └── dto/
│   │       ├── users/
│   │       │   ├── users.controller.ts   # GET /users, GET /users/me, PATCH role
│   │       │   ├── users.service.ts
│   │       │   └── cognito-user.repository.ts
│   │       ├── common/
│   │       │   ├── decorators/           # @CurrentUser, @Roles
│   │       │   ├── filters/              # global HTTP exception filter
│   │       │   └── interceptors/         # transform response interceptor
│   │       ├── health/
│   │       │   └── health.controller.ts
│   │       └── main.ts
│   └── web/                              # Next.js 14 frontend (port 3000)
│       └── src/
│           ├── app/
│           │   ├── (auth)/               # login, register, verify-email, forgot-password
│           │   │   └── mfa/              # mfa/setup, mfa/verify (login challenge)
│           │   ├── (dashboard)/          # protected route group
│           │   │   ├── dashboard/        # main dashboard page
│           │   │   ├── settings/         # account settings + MFA toggle
│           │   │   └── admin/            # user management (ADMIN only)
│           │   └── api/                  # Next.js proxy route handlers
│           │       ├── auth/             # login, register, logout, refresh, confirm, mfa/*
│           │       └── users/
│           ├── components/
│           │   ├── auth/auth-shell.tsx   # shared auth page wrapper
│           │   └── ui/                   # shadcn/ui primitives
│           ├── hooks/
│           │   └── use-auth.ts           # session state, idToken, logout
│           └── lib/
│               └── session.ts            # sessionStorage helpers (save/get/clear tokens)
├── packages/
│   ├── shared-types/                     # @repo/shared-types
│   │   └── src/
│   │       ├── auth.ts                   # AuthenticatedUser, AuthTokens, UserRole, COGNITO_GROUPS
│   │       └── api.ts
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json
├── pnpm-workspace.yaml
└── .nvmrc                                # Node 20
```

---

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Use `nvm use` with the included `.nvmrc` |
| pnpm | 9+ | `corepack enable && corepack prepare pnpm@latest --activate` |
| AWS account | — | Free tier is sufficient for development |
| AWS CLI | any | `aws configure` with an IAM user that has Cognito permissions |

---

### Local Development Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/MianMArslan/cognito-rbac-mfa-starter
cd cognito-rbac-mfa-starter
nvm use
pnpm install

# 2. Configure environment variables (see next section)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Fill in your Cognito credentials in both files

# 3. Start both apps in parallel
pnpm dev
# API  → http://localhost:4000
# Web  → http://localhost:3000
# Docs → http://localhost:4000/api/docs  (Swagger)
```

---

### AWS Cognito Setup

Before running the app, you need a Cognito User Pool. You can create one via the AWS Console or CLI.

#### Required Cognito settings

**1. User Pool — Sign-in options**
- Enable **Email** as a sign-in option

**2. MFA**
- Set MFA enforcement to **Optional** (required for the MFA toggle in settings to work)
- Enable **Authenticator apps (TOTP)** as an MFA method

**3. App Client**
- Create an app client **with a client secret**
- Under **Authentication flows**, enable:
  - `ALLOW_USER_PASSWORD_AUTH`
  - `ALLOW_REFRESH_TOKEN_AUTH`
  - `ALLOW_USER_SRP_AUTH`

**4. User Pool Groups**

Create two groups manually (or via the seeder):
- `Admins`
- `Clients`

After creating the User Pool, copy the **User Pool ID**, **App Client ID**, and **App Client Secret** into `apps/api/.env`.

---

### Environment Variables

#### `apps/api/.env`

```env
PORT=4000

# AWS Cognito
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS credentials (for AdminCreateUser, AdminAddUserToGroup, etc.)
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

### Seeding an Admin User

The project includes a seeder script that creates an admin user in Cognito, sets a permanent password, and adds them to the `Admins` group.

```bash
# From the monorepo root
ADMIN_EMAIL=admin@yoursite.com ADMIN_PASSWORD='Str0ng!Pass' pnpm seed:admin

# Or add ADMIN_EMAIL / ADMIN_PASSWORD to apps/api/.env and run:
pnpm seed:admin
```

The seeder is idempotent — safe to run multiple times. If the user already exists it skips creation and only updates the password and group.

---

### Authentication Flow

```
Register
  └─ POST /api/v1/auth/register
       └─ SignUpCommand (Cognito) → sends email verification code
  └─ POST /api/v1/auth/confirm  (user submits code)
       └─ ConfirmSignUpCommand → account confirmed

Login (no MFA)
  └─ POST /api/v1/auth/login
       └─ InitiateAuthCommand (USER_PASSWORD_AUTH)
            └─ returns { accessToken, idToken, refreshToken }

Login (MFA enabled)
  └─ POST /api/v1/auth/login
       └─ InitiateAuthCommand → returns { mfaRequired: true, session }
  └─ POST /api/v1/auth/mfa/challenge  (user submits TOTP code)
       └─ RespondToAuthChallengeCommand → returns tokens

Token Refresh
  └─ POST /api/v1/auth/refresh  (sends refreshToken + username)
       └─ InitiateAuthCommand (REFRESH_TOKEN_AUTH) → new accessToken + idToken

Logout
  └─ POST /api/v1/auth/logout  (sends accessToken)
       └─ GlobalSignOutCommand → invalidates all sessions
```

---

### MFA Flow

**Enabling MFA** (from Settings page)

```
1. POST /api/v1/auth/mfa/setup  (Authorization: Bearer <accessToken>)
     └─ AssociateSoftwareTokenCommand → { secretCode, qrCodeUrl }

2. User scans QR code in Google Authenticator / Authy / 1Password

3. POST /api/v1/auth/mfa/verify-setup  { code: "123456" }
     └─ VerifySoftwareTokenCommand
     └─ SetUserMFAPreferenceCommand (enabled: true, preferred: true)
```

**Disabling MFA**

```
POST /api/v1/auth/mfa/disable  (Authorization: Bearer <accessToken>)
  └─ SetUserMFAPreferenceCommand (enabled: false)
```

> **Note:** MFA endpoints accept the **access token** directly. Cognito's SDK validates it — no JWT guard is applied on these routes. All other protected endpoints use the **ID token** (see Token Strategy below).

---

### RBAC — How Roles Work

Cognito includes `cognito:groups` in every ID token JWT automatically:

```json
{
  "sub": "abc-123",
  "email": "user@example.com",
  "cognito:groups": ["Admins"],
  "aud": "your-client-id"
}
```

`JwtStrategy` maps this to a `UserRole` enum on every authenticated request:

```typescript
const role = groups.includes(COGNITO_GROUPS.ADMIN) ? UserRole.ADMIN : UserRole.CLIENT;
```

Endpoints are protected with guards and the `@Roles` decorator:

```typescript
@Get()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
async listUsers() { ... }  // only Admins
```

On the frontend, the dashboard layout reads `user.role` from the decoded ID token and conditionally renders the Admin nav link and redirects non-admins away from `/admin`.

---

### API Reference

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/v1/auth/register` | — | Create a new account |
| `POST` | `/api/v1/auth/confirm` | — | Confirm email with verification code |
| `POST` | `/api/v1/auth/resend-confirmation` | — | Resend email verification code |
| `POST` | `/api/v1/auth/login` | — | Sign in, returns tokens or MFA challenge |
| `POST` | `/api/v1/auth/refresh` | — | Exchange refresh token for new tokens |
| `POST` | `/api/v1/auth/logout` | Access token | Revoke all sessions (GlobalSignOut) |
| `POST` | `/api/v1/auth/forgot-password` | — | Send password reset code to email |
| `POST` | `/api/v1/auth/mfa/setup` | Access token | Begin TOTP setup, returns QR code + secret |
| `POST` | `/api/v1/auth/mfa/verify-setup` | Access token | Confirm TOTP code to activate MFA |
| `POST` | `/api/v1/auth/mfa/challenge` | — | Respond to MFA challenge during login |
| `POST` | `/api/v1/auth/mfa/disable` | Access token | Disable MFA on the account |
| `GET` | `/api/v1/users/me` | ID token | Get current user's profile |
| `GET` | `/api/v1/users` | ID token + Admin | List all users (Admin only) |
| `PATCH` | `/api/v1/users/:username/role` | ID token + Admin | Assign user to a Cognito group |
| `GET` | `/health` | — | Health check |

Full interactive docs with request/response schemas: `http://localhost:4000/api/docs`

---

### Token Strategy

Cognito issues three tokens on login. This project uses them as follows:

| Token | Used for |
|-------|----------|
| **ID token** | `Authorization: Bearer` header on all NestJS-guarded endpoints. Has `aud = clientId` (required by `JwtStrategy`) and carries `email`, `cognito:groups`. |
| **Access token** | Passed directly to Cognito SDK calls: MFA setup/verify/disable, logout. Has no `aud` claim — the JWT guard would reject it, so MFA endpoints have no guard. |
| **Refresh token** | Sent to `POST /auth/refresh` to get a new ID + access token pair. |

All tokens are stored in `sessionStorage` (tab-isolated, cleared on tab close). The `useAuth()` hook exposes `idToken` for API calls and `logout()` for clearing the session.

---

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, react-hook-form, zod |
| Backend | NestJS 10, Passport JWT (passport-jwt + jwks-rsa), AWS SDK v3 |
| Auth service | AWS Cognito (User Pools + TOTP MFA) |
| Shared types | `@repo/shared-types` — `AuthenticatedUser`, `AuthTokens`, `UserRole`, `COGNITO_GROUPS` |
| Monorepo | Turborepo + pnpm workspaces |
| Language | TypeScript (strict mode throughout) |

---

## License

MIT
