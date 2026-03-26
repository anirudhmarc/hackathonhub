# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HackHub is an AWS serverless hackathon management platform. The repo contains both **Terraform infrastructure** (root directory) and **4 React frontend apps** (under `frontends/`). The platform supports three user roles: Admin, Judge, and Participant, each with a dedicated portal backed by Cognito authentication.

## Commands

### Frontend Development (each app under `frontends/`)

```bash
# Install dependencies
cd frontends/<app-name> && npm install

# Dev server (runs on port 8080)
npm run dev

# Build
npm run build          # production build (includes tsc for admin app)
npm run build:dev      # development build (judge + participant apps only)

# Lint
npm run lint
```

Frontend apps and their directories:
- `greataihackaton-admin-public` — Admin dashboard (React 19, react-router v7)
- `greataihackaton-judge-public` — Judge scoring (React 18, react-router v6, has `npm run server` for backend proxy)
- `hackhub-public` — Participant portal (React 18, react-router v6)
- `greataihackaton-hackhub-public` — Alternate participant portal (identical to hackhub-public)

### Terraform Infrastructure (root directory)

```bash
terraform init
terraform fmt          # format .tf files
terraform validate     # validate configuration
terraform plan         # preview changes
terraform apply        # deploy (487 resources)
./validate-terraform.sh  # comprehensive validation script
```

## Architecture

### Infrastructure (Terraform Modules)

Root `main.tf` orchestrates 7 modules:

- **`modules/vpc/`** — Multi-AZ VPC with public/private/database subnets, VPC endpoints (no NAT Gateway for cost savings)
- **`modules/rds/`** — MySQL 8.0.39 on RDS, credentials in Secrets Manager, 10 tables
- **`modules/cognito/`** — User pool with 3 groups (Admins, Judges, Participants), OAuth2 authorization code flow
- **`modules/dynamodb/`** — Participant registrations table with GSIs on email and status
- **`modules/s3_cloudfront/`** — 3 portal buckets + submissions bucket, CloudFront CDN with OAC
- **`modules/lambda_api/`** — 46 Node.js 22.x Lambda functions + REST API Gateway with Cognito authorizer
- **`modules/frontend/`** — Builds React apps locally and syncs to S3 via `local-exec` provisioner

Key root-level files:
- `frontends.tf` — Wires each frontend app to its S3 bucket, Cognito config, and API URL
- `db_init.tf` — Invokes `HackhubDbInitializer` Lambda to create tables
- `db_seed.tf` — Invokes `SqlEditorLambda` to insert default data (tracks, problems, judges, teams)

### Frontend Architecture

All frontends are **Vite + React + TypeScript** SPAs using:
- **shadcn/ui** (Radix UI primitives) for components in `src/components/ui/`
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Sonner** for toast notifications
- **`@` path alias** mapped to `src/` via vite config

**Authentication pattern:** All apps use Cognito OIDC (authorization code flow). The admin and participant apps use `react-oidc-context` as the provider wrapper. The judge app has a hybrid approach with manual token exchange in `src/services/auth.ts` and `src/contexts/AuthContext.tsx`.

**OIDC config** is driven by `VITE_*` environment variables injected at build time by `modules/frontend/main.tf`. Key env vars: `VITE_API_URL`, `VITE_ADMIN_COGNITO_AUTHORITY`, `VITE_ADMIN_COGNITO_CLIENT_ID`, `VITE_ADMIN_COGNITO_REDIRECT_URI`.

**API calls** use **axios** with Bearer token from the OIDC session. The judge app has a custom caching layer in `src/services/api.ts` with localStorage TTL-based cache. Participant apps use **@tanstack/react-query** for server state.

**State management:** React Context. The judge app has a `useReducer`-based `HackathonContext` for teams, scores, stages, and assignments.

### API Gateway Routes

All endpoints are under a single REST API with Cognito authorizer:
- `/admin/*` — Participant/team/problem/judge CRUD, leaderboard, broadcast email, assignments
- `/judge/*` — Teams, problems, scores, stages, assigned teams
- `/participant/*` — Teams, problems, submissions (with S3 presigned URLs), feedback

### Database Schema (MySQL)

10 tables: Track, Problem_Statement, Judge, Judging_Stage, Leader, Team, Participant, Score, Submission, Judge_Assignment.

## Key Conventions

- Terraform version >= 1.5.0, AWS provider ~> 5.0
- Lambda functions are pre-packaged as `.zip` files in `lambda-code/`
- Each frontend gets its `.env` file generated during `terraform apply` — do not commit `.env` files
- The `terraform.tfstate` file is in `.gitignore` for backup only; state is currently local
- Path aliases: use `@/` imports in frontend code (resolves to `src/`)
