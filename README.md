# cognito-rbac-mfa-starter

A production-grade, full-stack starter kit for AWS Cognito authentication with **Role-Based Access Control (RBAC)** and **Multi-Factor Authentication (MFA)**. Built as a Turborepo monorepo with **Next.js 14** (App Router) frontend, **NestJS** backend, and **CloudFormation** infrastructure — with SOLID principles applied throughout.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              AWS Amplify Hosting (Next.js SSR)                  │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐ │
│  │  App Router Pages   │   │  API Routes /api/auth/*          │ │
│  │  - /login           │   │  (proxy to NestJS, set cookies)  │ │
│  │  - /dashboard       │   └──────────────────────────────────┘ │
│  │  - /admin (ADMIN)   │                                        │
│  │  - /mfa/setup       │   middleware.ts (jose JWT verify)      │
│  └─────────────────────┘                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (Bearer token)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            ALB  →  ECS Fargate (NestJS API :4000)               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  AuthModule   UsersModule   RolesModule   HealthController  │ │
│  │  (SOLID Clean Architecture — see below)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ AWS SDK v3
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Cognito User Pool                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Admins  │  │   Clients    │  │  TOTP MFA (optional SMS)  │  │
│  │ group    │  │   group      │  │  cognito:groups in JWT    │  │
│  └──────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Details |
|---------|---------|
| **Authentication** | Email + password via Cognito SRP |
| **MFA** | TOTP (Google Authenticator, Authy) + optional SMS |
| **RBAC** | Two roles — `Admin` and `Client` via Cognito Groups |
| **JWT** | `cognito:groups` claim read directly — no Lambda needed |
| **Session** | HTTP-only cookies (access, id, refresh tokens) |
| **Frontend** | Next.js 14 App Router, middleware auth guard, role-gated pages |
| **Backend** | NestJS with SOLID principles, Swagger docs at `/api/docs` |
| **IaC** | CloudFormation nested stacks — Cognito, IAM, ECR, ECS, Amplify |
| **Monorepo** | Turborepo with pnpm workspaces, shared types package |

---

## Repository Structure

```
cognito-rbac-mfa-starter/
├── apps/
│   ├── api/                        # NestJS (port 4000)
│   │   ├── src/
│   │   │   ├── auth/               # Domain / Application / Infrastructure / Presentation
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   └── common/
│   │   └── Dockerfile
│   └── web/                        # Next.js 14 (port 3000)
│       └── src/
│           ├── app/
│           │   ├── (auth)/         # login, register, mfa/setup, mfa/verify
│           │   ├── (dashboard)/    # protected pages
│           │   └── api/auth/       # server-side route handlers (set cookies)
│           ├── lib/                # auth utils, api client, cognito helpers
│           └── middleware.ts       # edge JWT guard
├── packages/
│   ├── shared-types/               # @repo/shared-types — UserRole, AuthTokens, etc.
│   ├── eslint-config/              # @repo/eslint-config
│   └── typescript-config/          # @repo/typescript-config
├── infra/
│   ├── cloudformation/
│   │   ├── main.yaml               # Root nested stack
│   │   ├── cognito.yaml            # UserPool + Groups + Client
│   │   ├── iam.yaml                # ECS roles + optional SNS role
│   │   ├── ecr.yaml                # Container registry
│   │   ├── ecs.yaml                # Fargate service + ALB
│   │   └── amplify.yaml            # Next.js hosting
│   └── deploy.sh                   # One-command deploy script
├── .nvmrc                          # Node 20
├── turbo.json
└── pnpm-workspace.yaml
```

---

## SOLID Principles Applied

### Single Responsibility
Each class has one job:
- `LoginUseCase` — orchestrates login only
- `CognitoAuthProviderImpl` — Cognito API calls only
- `RolesGuard` — authorization checks only

### Open/Closed
`CognitoAuthProvider` is an abstract class. Swap the Cognito implementation for any other provider (Auth0, Firebase) without touching `LoginUseCase` or any controller.

### Liskov Substitution
`CognitoAuthProviderImpl`, `CognitoTokenVerifier`, and `CognitoUserGroupManager` fully satisfy their abstract contracts and are drop-in substitutable.

### Interface Segregation
Three focused abstractions instead of one fat interface:
- `TokenVerifier` — just `verify(token)`
- `CognitoAuthProvider` — auth flows only
- `UserGroupManager` — group management only

### Dependency Inversion
Services depend on abstractions, never on concrete classes:

```typescript
// AuthModule wires the concrete implementation at the module level
{ provide: CognitoAuthProvider, useClass: CognitoAuthProviderImpl }

// LoginUseCase never imports CognitoAuthProviderImpl
constructor(private readonly authProvider: CognitoAuthProvider) {}
```

---

## Prerequisites

- Node.js 20 (use `nvm use` with the included `.nvmrc`)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- AWS CLI configured (`aws configure`)
- Docker (for building the API image)

---

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/cognito-rbac-mfa-starter
cd cognito-rbac-mfa-starter
nvm use
pnpm install

# 2. Set up environment variables
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edit both files with your Cognito credentials

# 3. Start both apps
pnpm dev
# API  → http://localhost:4000
# Web  → http://localhost:3000
# Docs → http://localhost:4000/api/docs
```

---

## Deploy to AWS

### Step 1 — Deploy infrastructure

```bash
bash infra/deploy.sh \
  --env dev \
  --region us-east-1 \
  --vpc-id vpc-xxxxxxxx \
  --subnet-ids "subnet-aaaa,subnet-bbbb" \
  --github-repo "https://github.com/YOUR_USERNAME/cognito-rbac-mfa-starter" \
  --github-token "ghp_xxxxxxxxxxxx"
```

The script deploys stacks in order:
`IAM → ECR → Docker build+push → Cognito → ECS → Amplify`

### Step 2 — Update environment variables

Copy the stack outputs (printed at the end of the deploy) into your `.env` files:

```
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
```

---

## RBAC — How Roles Work

Cognito automatically includes `cognito:groups` in every JWT:

```json
{
  "sub": "...",
  "email": "user@example.com",
  "cognito:groups": ["Admins"]
}
```

The NestJS `CognitoJwtStrategy` maps this to a `UserRole` enum:

```typescript
const role = groups.includes('Admins') ? UserRole.ADMIN : UserRole.CLIENT;
```

Guards are applied per endpoint:

```typescript
@Roles(UserRole.ADMIN)          // only Admins
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('users')
listUsers() { ... }
```

---

## MFA — TOTP Setup Flow

1. Login → receive `accessToken`
2. `POST /api/v1/auth/mfa/setup` → receive `secretCode` + `qrCodeUrl`
3. Scan QR code in Google Authenticator / Authy
4. `POST /api/v1/auth/mfa/verify-setup` with 6-digit code → MFA activated
5. On next login, Cognito returns a challenge → `POST /api/v1/auth/mfa/challenge` with code + session

To disable MFA: `POST /api/v1/auth/mfa/disable` (requires valid `accessToken`)

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Create account |
| `POST` | `/api/v1/auth/login` | — | Sign in |
| `POST` | `/api/v1/auth/refresh` | — | Refresh tokens |
| `POST` | `/api/v1/auth/logout` | JWT | Revoke session |
| `POST` | `/api/v1/auth/mfa/setup` | JWT | Start TOTP setup |
| `POST` | `/api/v1/auth/mfa/verify-setup` | JWT | Activate MFA |
| `POST` | `/api/v1/auth/mfa/challenge` | — | Verify MFA on login |
| `POST` | `/api/v1/auth/mfa/disable` | JWT | Disable MFA |
| `GET` | `/api/v1/users/me` | JWT | Current user |
| `GET` | `/api/v1/users` | JWT + Admin | List all users |
| `PATCH` | `/api/v1/users/:username/role` | JWT + Admin | Assign role |
| `GET` | `/health` | — | Health check |

Full interactive docs available at `http://localhost:4000/api/docs`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, react-hook-form, zod |
| Backend | NestJS 10, Passport JWT, AWS SDK v3 |
| Auth | AWS Cognito (User Pools + TOTP MFA) |
| IaC | AWS CloudFormation (nested stacks) |
| Hosting | AWS Amplify (web) + ECS Fargate + ALB (API) |
| Monorepo | Turborepo + pnpm workspaces |
| Language | TypeScript (strict mode throughout) |

---

## License

MIT
