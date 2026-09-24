# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HackHub is an AWS serverless **multi-tenant** hackathon management platform. A single
deployment hosts **many concurrent hackathons**, each fully isolated by `hackathon_id`
(own teams, judges, problems, rubric, submissions, scores, and timeline).

The repo contains both **Terraform infrastructure** (root directory) and **3 React frontend
apps** (under `frontends/`).

### Roles

| Role | Scope | Auth |
| --- | --- | --- |
| **Admin** | Platform super-user; sees/manages every hackathon | Cognito `Admins` group — bypasses all tenant checks |
| **Host** | Per-hackathon organizer; sees/manages only hackathons they own | Cognito `Hosts` group + `Hackathon.owner_email` / `host` membership |
| **Judge** | Scoped to one hackathon | Cognito `Judges` group + `judge` membership row |
| **Participant** | Scoped to one hackathon | Cognito `Participants` group + `participant` membership row |

Tenant authorization is enforced **in the Lambda handlers** (not in the API Gateway
authorizer, which only validates the JWT) via the shared `tenancy` layer's
`assertMembership()`. Identity → data link is `email_address`.

## Commands

### Frontend Development (each app under `frontends/`)

```bash
cd frontends/<app-name> && npm install   # install deps
npm run dev                               # dev server (Vite, port 8080)
npm run build                             # production build (admin runs `tsc -b && vite build`)
npm run build:dev                         # dev-mode build (judge + participant only)
npm run lint                              # eslint
```

Frontend apps and their directories:
- `hackerhub-admin-public` — **Admin + Host** dashboard (React 19, react-router v7, `react-oidc-context`). Host screens (`HostHackathonsPage`, `CreateHackathonPage`) live here gated to `Admins`/`Hosts`.
- `hackerhub-judge-public` — Judge scoring (React 18, react-router v6, hand-rolled OAuth; `npm run server` runs a local Express proxy under `src/server/`).
- `hackerhub-hackhub-public` — Participant portal (React 18, react-router v6, `react-oidc-context` + backend-hydrate `AuthContext`).

### Terraform Infrastructure (root directory)

State and config are **per-environment**. There is no root `terraform.tfvars`; each env has
its own backend config + tfvars, **both gitignored**. Only the `.example` templates are committed:
run `./bootstrap-backend.sh <env>` to generate `backend.config` for the current account, and
`cp env/<env>/<env>.tfvars.example env/<env>/<env>.tfvars` for the vars (`db_password` is the only
variable with no default). The README's "Deploy a fresh version from scratch" section is the
end-to-end runbook.

```bash
# DEV
./bootstrap-backend.sh dev   # first time in a given account only (idempotent)
terraform init -reconfigure -backend-config=env/dev/backend.config
terraform plan  -var-file=env/dev/dev.tfvars
terraform apply -var-file=env/dev/dev.tfvars

# PROD
terraform init -reconfigure -backend-config=env/prod/backend.config
terraform apply -var-file=env/prod/prod.tfvars   # prod tfvars is gitignored; create locally

terraform fmt            # format .tf files
terraform validate       # validate configuration
./validate-terraform.sh  # comprehensive validation script
```

> **Env isolation:** dev and prod share the same state bucket + lock table but use distinct
> state **keys** (`.../dev/...` vs `.../prod/...`) and distinct `vpc_cidr`. Always confirm which
> backend is active (`grep key .terraform/terraform.tfstate`) before planning/applying.

### Bootstrap the state backend (per account — manual prerequisite)
The S3 state bucket + DynamoDB lock table are **NOT managed by this Terraform** (Terraform can't
create the backend that holds its own state). They are a one-time prerequisite **per AWS account**:

```bash
./bootstrap-backend.sh dev            # or prod;  PROJECT_NAME=/REGION= to override defaults
./bootstrap-backend.sh dev --force    # re-render an existing backend.config
```

The script resolves the account ID from the **caller's own credentials**, creates
`hackhub-tfstate-<account_id>` (versioned, AES256, public-access blocked) and `hackhub-tflock`
(PAY_PER_REQUEST, `LockID` HASH key) only if absent, then renders `env/<env>/backend.config` from
the committed `.example` template. Idempotent and non-destructive — it never deletes or
reconfigures existing state, and re-running on a bootstrapped account is a no-op. It prompts for
confirmation before bootstrapping `prod`.

Because the bucket name embeds an account ID, **no `backend.config` is committed** — that's what
keeps a clone independent of any particular account. Each account has its own bucket, state, and
resources; a freshly bootstrapped account starts from empty state, so the first `apply` builds a
complete new stack.

> **Symptom of a missing bucket or a `backend.config` pointing at an account you don't own:**
> `terraform init` → `Error refreshing state: ... HeadObject ... 403 Forbidden`. S3 returns **403,
> not 404**, for a bucket owned by another account, so a stale bucket name reads like a permissions
> bug. Fix: `./bootstrap-backend.sh <env> --force`, then re-init.

## Architecture

### Infrastructure (Terraform Modules)

Root `main.tf` orchestrates the modules; root files: `provider.tf`, `versions.tf`, `data.tf`,
`variables.tf`, `outputs.tf`, `frontends.tf`, `db_init.tf`, `db_seed.tf`.

- **`modules/vpc/`** — Multi-AZ VPC with public/private/database subnets. VPC endpoints for S3,
  DynamoDB, Secrets Manager, and **Lambda** (`enable_lambda_endpoint` — lets VPC handlers invoke
  other Lambdas without a NAT Gateway). No NAT Gateway (cost).
- **`modules/rds/`** — MySQL 8 on RDS, credentials in Secrets Manager (`DB_SECRET_ARN`), 11 tables.
- **`modules/cognito/`** — User pool with **4 groups** (`Admins`, `Hosts`, `Judges`,
  `Participants`), OAuth2 authorization-code flow. Optional default users per env.
- **`modules/dynamodb/`** — Participant-registrations table (PK `participant_id`, `hackathon_id`
  attribute) with GSIs.
- **`modules/s3_cloudfront/`** — 3 portal buckets + 1 submissions bucket, CloudFront with OAC.
- **`modules/lambda_api/`** — **51** Node.js 22.x Lambda functions + REST API Gateway with
  Cognito authorizer, plus the shared **`tenancy` Lambda layer**.
- **`modules/frontend/`** — Builds each React app locally and syncs to S3 via a `local-exec`
  provisioner; writes the app's `.env` from `VITE_*` values. Re-runs on source or config change.

Key root-level files:
- `frontends.tf` — Wires each frontend to its S3 bucket, Cognito config, API URL, and app config vars.
- `db_init.tf` — Invokes `HackhubDbInitializer` to create the schema (DROP + CREATE — destructive).
- `db_seed.tf` — **Legacy** global single-tenant seed via `SqlEditorLambda`. In the multi-tenant
  model, per-hackathon defaults (track, system problem, 2 stages, 4 rubric rows) are provisioned by
  **`CreateHackathon`** instead. Treat `db_seed.tf` as historical unless intentionally re-seeding a
  legacy single-tenant deployment.

### Shared tenancy Lambda layer

`lambda-code/layers/tenancy/nodejs/tenancy.js` — mounted at `/opt/nodejs/tenancy.js`; almost every
DB-touching handler does `const t = require('/opt/nodejs/tenancy')`. Exports:
- `getConnection()` — cached mysql2 connection (creds from Secrets Manager)
- `getCaller(event)` — `{ email, groups[] }` from Cognito claims (tolerates REST v1 + HTTP v2 shapes)
- `resolveHackathonId(event)` — path param `hackathonId` (falls back to header/query/body)
- `assertMembership(conn, caller, hackathonId, role)` — throws `HttpError(403)` unless authorized; **Admins bypass**
- `isAdmin(caller)`, `respond(status, body)` (CORS envelope), `HttpError`

The layer bundles its own `mysql2` in `node_modules`. AWS SDK **v3** (`@aws-sdk/*`) is built into
the `nodejs22.x` runtime — do not bundle it. New handlers requiring the DB must be `vpc_enabled = true`
in `lambda_functions.tf` (they connect to RDS in private subnets).

### Frontend Architecture

All frontends are **Vite + React + TypeScript** SPAs using **shadcn/ui** (Radix), **Tailwind**,
**Lucide** icons, **Sonner** toasts, and the `@/` path alias → `src/`.

- **Auth:** Cognito OIDC (authorization-code flow). Admin + participant use `react-oidc-context`;
  judge uses a hand-rolled token exchange (`src/services/auth.ts`, `src/contexts/AuthContext.tsx`).
- **OIDC/config** is injected at build time via `VITE_*` env vars written by `modules/frontend/main.tf`
  (`VITE_API_URL`, `VITE_*_COGNITO_*`, `VITE_APP_NAME`, `VITE_SHOW_SCORE`, `VITE_ENABLE_SCORING_DATETIME_CONTROL`,
  `VITE_SCORING_START/END/LOCK_DATE`).
- **Tenancy in the UI:** each app has a `CurrentHackathonContext` that calls `GET /hackathons`,
  exposes `currentHackathonId` + timeline, persists the selection, and auto-selects when there's one.
  Admin uses `src/lib/apiClient.ts` to inject the Bearer token + `/hackathons/{currentHackathonId}` prefix.
- **API calls:** axios with the OIDC Bearer token. Judge app has a localStorage TTL cache in
  `src/services/api.ts` (cache keys are namespaced by `hackathonId`). Participant uses `@tanstack/react-query`.
- **Timeline gating:** participant date-gating reads the per-hackathon timeline from the API; the
  **judge scoring window** still reads build-time `VITE_SCORING_*` vars.

### API Gateway Routes

Single REST API, Cognito authorizer, all tenant routes nested under `/hackathons/{hackathonId}`:
- `POST/GET /hackathons`, `GET/PUT /hackathons/{id}`, `POST /hackathons/{id}/logo-url` — hackathon CRUD + logo (host/admin)
- `/hackathons/{id}/admin/*` — participants, teams, problems, judges, assignments, leaderboard, broadcast-email, judging-stages
- `/hackathons/{id}/judge/*` — teams, judges, problems, scores (POST **upserts**), stages, assignments/{judgeId}/teams
- `/hackathons/{id}/participant/*` — teams, problems, submissions, submission-urls (presigned PUT), feedback

Note: `/judge/scores` exposes **GET + POST only** — `PostJudgeScores` upserts, so the frontend
always POSTs (no PUT route exists).

### Database Schema (MySQL, 11 tables)

`Hackathon` (created first; timeline + `owner_email` + `logo_url`), `Hackathon_Membership`
(`hackathon_id`, `email_address`, `role`), `Track`, `Problem_Statement`, `Judge`, `Leader`,
`Team`, `Judging_Stage`, `Judge_Assignment`, `Team_Submission`, `Score`. Every tenant-scoped table
carries `hackathon_id` (FK → `Hackathon`) with an index; `Judge` is `UNIQUE(hackathon_id, email_address)`.

Schema source of truth: `lambda-code/src/HackhubDbInitializer/index.js` (its DDL runs DROP-then-CREATE).

## How to do things manually

### Get a JWT for API testing
```bash
aws cognito-idp initiate-auth --client-id <CLIENT_ID> --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=admin@hackhub.com,PASSWORD='<pw>' --region us-east-1 \
  --query 'AuthenticationResult.IdToken' --output text
# then: curl -H "Authorization: Bearer $TOKEN" "$API_URL/hackathons"
```
`USER_PASSWORD_AUTH` is enabled on the app client. Set a permanent password for a seeded user with
`aws cognito-idp admin-set-user-password --user-pool-id <POOL> --username <email> --password '<pw>' --permanent`.

### Run arbitrary SQL against a DB (dev)
Invoke `SqlEditorLambda` with `{"sql":"..."}`. Prefer a payload **file** to avoid shell escaping:
```bash
printf '%s' 'SELECT * FROM Hackathon' > /tmp/q.txt
python3 -c "import json;print(json.dumps({'sql':open('/tmp/q.txt').read()}))" > /tmp/p.json
aws lambda invoke --function-name hackhub-dev-SqlEditorLambda --region us-east-1 \
  --cli-binary-format raw-in-base64-out --payload file:///tmp/p.json /tmp/out.json
```

### Re-initialize the schema (DESTRUCTIVE — drops all tables)
Edit the DDL in `lambda-code/src/HackhubDbInitializer/index.js`, repackage the zip, `terraform apply`,
then invoke the initializer:
```bash
terraform apply -replace=null_resource.db_init_trigger -var-file=env/dev/dev.tfvars
# or invoke directly:
aws lambda invoke --function-name hackhub-dev-HackhubDbInitializer --region us-east-1 /tmp/init.json
```
For an **additive** change that must preserve data (e.g. prod), use `ALTER TABLE ...` via
`SqlEditorLambda` — never the DROP-based initializer.

### Repackage a Lambda after editing its source
Handlers live in `lambda-code/src/<Name>/index.{js,mjs}`; Terraform deploys the prebuilt
`lambda-code/<Name>_code.zip`. There is no build pipeline — repackage manually:
```bash
# Simple handler (uses the tenancy layer + runtime SDK v3): just the index file at zip root
cd lambda-code/src/<Name> && zip -q -X ../../<Name>_code.zip index.js && cd -
# Handler that bundles node_modules (e.g. HackhubDbInitializer): keep node_modules in the zip
terraform apply -var-file=env/dev/dev.tfvars   # picks up the new source_code_hash
```
Some functions (e.g. `AdminGetLeaderboardData`) historically shipped **without** a `src/` dir — the
code lived only in the zip. Recover with `unzip -o <Name>_code.zip -d /tmp/x` before editing, and
add the recovered `index.js` back under `lambda-code/src/<Name>/`.

### Create a hackathon (provisions its own defaults)
```bash
curl -X POST "$API_URL/hackathons" -H "Authorization: Bearer $HOST_JWT" -H 'Content-Type: application/json' \
  -d '{"name":"My Hackathon","submission_start":"2026-07-01T00:00:00Z","submission_end":"2026-12-31T23:59:00Z"}'
```
`CreateHackathon` writes the `Hackathon` row, a `host` membership for the caller, and provisions one
`Track` ("General"), the `__SYSTEM__` problem, 2 judging stages, and 4 rubric rows — all stamped with
the new `hackathon_id`, in one transaction.

### Add a judge / participant to a hackathon
Membership is a relational row, not a Cognito attribute. Insert into `Hackathon_Membership`
(`hackathon_id`, `email_address`, `role`) and, for judges, a `Judge` row
(`UNIQUE(hackathon_id, email_address)`). Admin-facing flows do this via `PostAdminJudges` /
registration-approval; manually, use `SqlEditorLambda`.

### Deploy only the frontends / tail logs
```bash
# Force a single app to rebuild+sync (src_hash triggers it automatically on edits)
terraform apply -replace=module.admin_public.null_resource.deploy -var-file=env/dev/dev.tfvars
aws logs tail /aws/lambda/hackhub-dev-<Name> --follow --region us-east-1
```

## Key Conventions

- Terraform `>= 1.5.0`, AWS provider `~> 5.0`. Default region var is `ap-southeast-1`; dev/prod use `us-east-1`.
- Lambda functions are pre-packaged `.zip` files in `lambda-code/`; editable sources in `lambda-code/src/`.
- Use SDK **v3** in Lambda code (built into nodejs22.x). Only `mysql2` needs bundling (via the tenancy layer or per-zip `node_modules`).
- DB-touching handlers must set `vpc_enabled = true`.
- **Never commit secrets or account-specific config:** `*.tfvars`, `env/**/*.tfvars`, `.env`,
  `*.tfstate`, and `env/**/backend.config` are gitignored. Each frontend `.env` is generated during
  `terraform apply`; each `backend.config` by `./bootstrap-backend.sh`. Commit changes to the
  `env/**/backend.config.example` templates instead — never a rendered config with a real account ID.
- Resource names follow `${var.project_name}-${var.environment}-*` (e.g. `hackhub-dev-*`).
- Path aliases: use `@/` imports in frontend code (resolves to `src/`).
- Production-safety: assume prod when uncertain; never run the DROP-based initializer or delete
  resources against prod without explicit direction.
