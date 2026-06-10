# cognito-rbac-mfa-starter

A production-grade, full-stack starter kit for AWS Cognito authentication with **Role-Based Access Control (RBAC)** and **Multi-Factor Authentication (MFA)**. Built as a Turborepo monorepo with **Next.js 14** (App Router) frontend and **NestJS** backend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js 14 (port 3000)                        │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐ │
│  │  App Router Pages   │   │  API Routes /api/auth/*          │ │
│  │  - /login           │   │  (proxy to NestJS)               │ │
│  │  - /dashboard       │   └──────────────────────────────────┘ │
│  │  - /admin (ADMIN)   │                                        │
│  │  - /settings        │                                        │
│  └─────────────────────┘                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (Bearer token)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS API (port 4000)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │       AuthModule   UsersModule   HealthController          │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ AWS SDK v3
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Cognito User Pool                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Admins  │  │   Clients    │  │      TOTP MFA            │   │
│  │  group   │  │   group      │  │  cognito:groups in JWT   │   │
│  └──────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature            | Details                                                        |
| ------------------ | -------------------------------------------------------------- |
| **Authentication** | Email + password via Cognito SRP                               |
| **MFA**            | TOTP (Google Authenticator, Authy) + optional SMS              |
| **RBAC**           | Two roles — `Admin` and `Client` via Cognito Groups            |
| **JWT**            | `cognito:groups` claim read directly — no Lambda needed        |
| **Session**        | HTTP-only cookies (access, id, refresh tokens)                 |
| **Frontend**       | Next.js 14 App Router, middleware auth guard, role-gated pages |
| **Backend**        | NestJS with SOLID principles, Swagger docs at `/api/docs`      |
| **Monorepo**       | Turborepo with pnpm workspaces, shared types package           |

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

| Method  | Path                            | Auth        | Description         |
| ------- | ------------------------------- | ----------- | ------------------- |
| `POST`  | `/api/v1/auth/register`         | —           | Create account      |
| `POST`  | `/api/v1/auth/login`            | —           | Sign in             |
| `POST`  | `/api/v1/auth/refresh`          | —           | Refresh tokens      |
| `POST`  | `/api/v1/auth/logout`           | JWT         | Revoke session      |
| `POST`  | `/api/v1/auth/mfa/setup`        | JWT         | Start TOTP setup    |
| `POST`  | `/api/v1/auth/mfa/verify-setup` | JWT         | Activate MFA        |
| `POST`  | `/api/v1/auth/mfa/challenge`    | —           | Verify MFA on login |
| `POST`  | `/api/v1/auth/mfa/disable`      | JWT         | Disable MFA         |
| `GET`   | `/api/v1/users/me`              | JWT         | Current user        |
| `GET`   | `/api/v1/users`                 | JWT + Admin | List all users      |
| `PATCH` | `/api/v1/users/:username/role`  | JWT + Admin | Assign role         |
| `GET`   | `/health`                       | —           | Health check        |

Full interactive docs available at `http://localhost:4000/api/docs`

---

## Tech Stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Frontend | Next.js 14 (App Router), Tailwind CSS, react-hook-form, zod |
| Backend  | NestJS 10, Passport JWT, AWS SDK v3                         |
| Auth     | AWS Cognito (User Pools + TOTP MFA)                         |
| Monorepo | Turborepo + pnpm workspaces                                 |
| Language | TypeScript (strict mode throughout)                         |

---

## License

MIT
