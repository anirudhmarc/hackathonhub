# HackHub — Multi-Tenant Serverless Hackathon Platform

HackHub is an AWS serverless platform for running **many hackathons at once**. A single
deployment hosts multiple independent hackathons, each fully isolated by `hackathon_id` — its own
teams, judges, problems, rubric, submissions, scores, and timeline. Everything runs on Terraform
(infrastructure) plus three React SPAs (admin/host, judge, participant).

---

## ✨ Capabilities

### Multi-tenancy
- **Many concurrent hackathons** in one deployment; every entity is scoped by `hackathon_id`.
- **Tenant isolation** enforced in every Lambda (a caller can only read/write hackathons they belong to).
- **Self-service hackathon creation** — a Host spins up a new isolated hackathon (`POST /hackathons`),
  which auto-provisions its default track, system problem, judging stages, and rubric.

### Roles & access control
- **Admin** — platform super-user; sees and manages every hackathon (bypasses tenant checks).
- **Host** — per-hackathon organizer; manages only the hackathons they own.
- **Judge** — scores assigned teams within one hackathon; identity-bound (can't spoof another judge).
- **Participant** — registers a team, submits, and reads judge feedback within one hackathon.
- Backed by Cognito (4 groups: `Admins`, `Hosts`, `Judges`, `Participants`) + a relational
  `Hackathon_Membership` table that maps each user/email to a hackathon and role.

### Hackathon lifecycle
- Configurable **timeline** per hackathon (submission window, scoring window, feedback release,
  finalists/winners announcements, problem-selection window) — stored on the `Hackathon` row and
  served by the API (no rebuild needed to change dates).
- Optional per-hackathon **logo** (presigned upload to the submissions bucket; falls back to the AWS logo).

### Teams, submissions & judging
- Team registration; one submission per team (video + repo URL + description + additional materials),
  uploaded to S3 via **presigned PUT** URLs and served back via **presigned GET**.
- Rubric-based scoring across multiple **judging stages**; `POST /judge/scores` **upserts**
  (insert-or-update) and resolves the judge from the caller's identity.
- Judge **assignments** (which judge scores which teams per stage).
- **Leaderboard** aggregation, per-hackathon.

### Admin operations
- CRUD for participants, teams, problems, judges, and assignments.
- **Broadcast email** (individual recipients or all participants in the hackathon).
- CSV export of approved participants; participant-registration approval flow.
- Manage rubric, agenda, and submissions from the admin UI.

### Infrastructure & delivery
- Cost-optimized VPC (no NAT Gateway; gateway + interface VPC endpoints).
- 3 static portals on S3 + CloudFront (OAC); frontends built and synced by Terraform.
- Per-environment state isolation (dev/prod) via distinct backend state keys.
- Shared **tenancy Lambda layer** consolidating DB access, identity, and authorization.

---

## 🏗️ Architecture

```
Root (Terraform)
├── main.tf, provider.tf, versions.tf, data.tf, variables.tf, outputs.tf
├── frontends.tf        # wires each React app to its bucket / Cognito / API / config
├── db_init.tf          # invokes HackhubDbInitializer (creates schema — destructive)
├── db_seed.tf          # legacy single-tenant seed (superseded by CreateHackathon)
├── bootstrap-backend.sh  # one-time: creates YOUR account's state bucket + lock table
├── env/
│   ├── dev/  backend.config.example + dev.tfvars.example    (the real files are gitignored)
│   └── prod/ backend.config.example + prod.tfvars.example   (copy + edit locally)
├── lambda-code/
│   ├── <Name>_code.zip      # prebuilt deployment artifacts (what Terraform deploys)
│   ├── src/<Name>/index.*   # editable handler sources
│   └── layers/tenancy/nodejs/tenancy.js   # shared layer (getConnection/getCaller/assertMembership/…)
├── modules/
│   ├── vpc/  rds/  cognito/  dynamodb/  s3_cloudfront/
│   ├── lambda_api/   # 51 Lambdas + REST API Gateway + tenancy layer
│   │   ├── lambda_functions.tf   # function definitions (group, vpc_enabled, perms, zip)
│   │   ├── api_routes.tf         # resource tree + route→function map
│   │   └── api_methods.tf        # methods/integrations generated from the map
│   └── frontend/     # builds + syncs a React app, writes its .env
└── frontends/
    ├── hackerhub-admin-public/    # Admin + Host dashboard (React 19)
    ├── hackerhub-judge-public/    # Judge scoring (React 18)
    └── hackerhub-hackhub-public/  # Participant portal (React 18)
```

### Lambda functions by role (51 total)

- **host (5):** `CreateHackathon`, `GetHackathons`, `GetHackathon`, `UpdateHackathon`, `GetHackathonLogoUploadUrl`
- **admin (21):** participants/teams/problems/judges/assignments CRUD (`Get/Post/Put/Delete…`),
  `AdminGetLeaderboardData`, `ExportApprovedParticipantsToCSV`
- **judge (8):** `GetJudgeTeams`, `GetJudgeJudges`, `GetJudgeProblems`, `GetJudgeScores`,
  `PostJudgeScores`, `GetJudgieStages`, `GetAssignedTeams`, `FetchJudgeTriggerCreate`
- **participant (8):** `GetParticipantTeam`, `PostParticipantTeam`, `GetParticipantProblem`,
  `PostParticipantProblem`, `GetParticipantSubmission`, `UpdateSubmissionDetails`,
  `GetSubmissionPresignedUrls`, `GetParticipantScore`
- **utility (9):** `HackhubDbInitializer`, `SqlEditorLambda`, `CognitoUserManager`,
  `CreateJudgesCognito`, `SubmitHackathonRegistration`, `ApproveParticipant`,
  `ApproveParticipantNew`, `BroadcastEmailLambda`, `CertificateSenderDedicatedFunction`

### Database (MySQL, 11 tables)

`Hackathon` · `Hackathon_Membership` · `Track` · `Problem_Statement` · `Judge` · `Leader` ·
`Team` · `Judging_Stage` · `Judge_Assignment` · `Team_Submission` · `Score`

Every tenant-scoped table carries `hackathon_id` (FK → `Hackathon`, indexed). Schema source of
truth: `lambda-code/src/HackhubDbInitializer/index.js`.

### API surface

Single REST API with a Cognito authorizer. All tenant routes are nested under
`/hackathons/{hackathonId}`:

| Area | Routes |
| --- | --- |
| Hackathons | `POST /hackathons`, `GET /hackathons`, `GET|PUT /hackathons/{id}`, `POST /hackathons/{id}/logo-url` |
| Admin | `/hackathons/{id}/admin/{participants,teams,problems,judges,assignments}` (CRUD), `/admin/leaderboard`, `/admin/broadcast-email`, `/admin/judging-stages` |
| Judge | `/hackathons/{id}/judge/{teams,judges,problems,scores,stages}`, `/judge/assignments/{judgeId}/teams` |
| Participant | `/hackathons/{id}/participant/{teams,problems,submissions,submission-urls,feedback}` |

> `/judge/scores` is **GET + POST only** — `PostJudgeScores` upserts, so clients always POST.

---

## 🚀 Deployment

### Prerequisites
- Terraform `>= 1.5.0`, AWS provider `~> 5.0`
- AWS credentials configured (`aws sts get-caller-identity` should succeed)
- Node.js (the frontend module builds the React apps locally during `apply`)
- `aws` CLI v2, `zip`, and `unzip` on `PATH`

---

## 🆕 Deploy a fresh version from scratch

Everything below assumes a **clean clone** into an AWS account that has never run this stack. It
provisions a complete, independent deployment — VPC, RDS, Cognito, 51 Lambdas, API Gateway, and three
CloudFront portals. Nothing is shared with any other account or clone.

> **Cost warning:** this creates real billable resources (RDS `db.t3.small`, 3 CloudFront
> distributions, interface VPC endpoints ~$7/mo each). Expect roughly **$40–70/month** for the dev
> profile if left running. Tear it down with `terraform destroy` when you're done.

### 1. Clone and confirm which account you're pointed at
```bash
git clone https://github.com/anirudhmarc/hackathonhub.git
cd hackathonhub
aws sts get-caller-identity          # ← this MUST be the target account
```
Every later step derives from these credentials. Getting this wrong is the single most common cause
of a failed first deploy.

### 2. Bootstrap the Terraform state backend
```bash
./bootstrap-backend.sh dev
```
Creates `hackhub-tfstate-<your_account_id>` + `hackhub-tflock` in your account and writes
`env/dev/backend.config`. See [Bootstrap the state backend](#bootstrap-the-state-backend-first-step-after-cloning)
for what it does and how to do it by hand.

### 3. Create your tfvars
`env/dev/dev.tfvars` is gitignored (it holds the DB password), so a fresh clone has none. Copy the
template:
```bash
cp env/dev/dev.tfvars.example env/dev/dev.tfvars
```
Then edit at minimum:

| Variable | Why |
| --- | --- |
| `db_password` | **Required** — the only variable with no default. Use a strong, unique value. |
| `admin_email` | Receives the default users' Cognito verification email. |
| `aws_region` | Defaults to `us-east-1` in the template. |
| `vpc_cidr` | Must not overlap anything else in the account. |

### 4. Init and apply
```bash
terraform init -reconfigure -backend-config=env/dev/backend.config
terraform plan  -var-file=env/dev/dev.tfvars     # review before creating anything
terraform apply -var-file=env/dev/dev.tfvars
```
Budget **25–40 minutes** — RDS provisioning dominates, and the `frontend` module runs `npm install`
plus a Vite build for all three React apps on your machine before syncing them to S3.

Two things happen automatically at the end of `apply`, so there is no separate schema step:
- `db_init.tf` invokes `HackhubDbInitializer`, which creates all 11 tables.
- Cognito is seeded with four users — `admin@hackhub.com`, `host@hackhub.com`, `judge@hackhub.com`,
  `participant@hackhub.com` — one per group (`create_default_users` defaults to `true`).

### 5. Collect the outputs
```bash
terraform output       # portal URLs, api_gateway_url, Cognito IDs, RDS endpoint
terraform output -raw admin_portal_url
```

### 6. Set a usable admin password
The seeded users land in `FORCE_CHANGE_PASSWORD`, which blocks both the portal and
`USER_PASSWORD_AUTH`. Promote one to a permanent password:
```bash
POOL=$(terraform output -raw cognito_user_pool_id)
aws cognito-idp admin-set-user-password --user-pool-id "$POOL" \
  --username admin@hackhub.com --password '<StrongPassw0rd!>' --permanent
```

### 7. Log in and create the first hackathon
Open the admin portal URL from step 5, sign in as `admin@hackhub.com`, and create a hackathon.
`CreateHackathon` provisions that tenant's defaults in one transaction — a `General` track, the
`__SYSTEM__` problem, 2 judging stages, and 4 rubric rows. Then add judges and participants.

<details>
<summary>Prefer to create it over the API?</summary>

```bash
API=$(terraform output -raw api_gateway_url)
CLIENT=$(terraform output -raw cognito_client_id)
TOKEN=$(aws cognito-idp initiate-auth --client-id "$CLIENT" --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=admin@hackhub.com,PASSWORD='<StrongPassw0rd!>' \
  --query 'AuthenticationResult.IdToken' --output text)

curl -X POST "$API/hackathons" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Hackathon","submission_start":"2026-07-01T00:00:00Z","submission_end":"2026-12-31T23:59:00Z"}'
```
</details>

### Fresh-deploy troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `init` → `HeadObject ... 403 Forbidden` | `backend.config` names a bucket in an account you don't own. Run `./bootstrap-backend.sh dev --force`, re-init. |
| `No value for required variable "db_password"` | Step 3 skipped — you have no `env/dev/dev.tfvars`. |
| `InvalidClientTokenId` / `ExpiredToken` | Credentials expired mid-apply. Refresh, re-run `apply`; Terraform resumes from state. |
| Frontend build fails during `apply` | Node too old or missing. Build manually: `cd frontends/<app> && npm install && npm run build`. |
| Portal loads but every API call 401s | Password still `FORCE_CHANGE_PASSWORD` — do step 6. |
| `CIDR ... conflicts with existing` | `vpc_cidr` overlaps another VPC in the account. Pick a free range. |

### Tear it down
```bash
terraform destroy -var-file=env/dev/dev.tfvars
```
This leaves the state bucket and lock table behind on purpose — they aren't managed by this
Terraform. Delete them by hand if you want the account fully clean. On prod, `destroy` is blocked
until you flip `db_deletion_protection = false`.

---

### Bootstrap the state backend (first step after cloning)
This repo ships **no** `env/<env>/backend.config` — that file is gitignored because the state bucket
name embeds an **AWS account ID**, so it can only ever be correct for one account. Generate your own
before the first `init`:

```bash
./bootstrap-backend.sh dev      # or: prod
```

The script reads the account ID from *your* credentials (`aws sts get-caller-identity`), creates the
state bucket `hackhub-tfstate-<your_account_id>` (versioned, AES256, public access blocked) and the
`hackhub-tflock` lock table if they don't already exist, then renders `env/dev/backend.config` from
the committed `env/dev/backend.config.example` template. It is idempotent and never deletes or
reconfigures existing state — re-running it on a bootstrapped account is a no-op.

Override the defaults with env vars if you need to: `PROJECT_NAME=myproj REGION=eu-west-1
./bootstrap-backend.sh dev`. Pass `--force` to overwrite an existing `backend.config`.

<details>
<summary>Prefer to do it by hand?</summary>

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)   # the TARGET account
REGION=us-east-1
BUCKET="hackhub-tfstate-${ACCOUNT_ID}"

aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"   # add --create-bucket-configuration LocationConstraint=$REGION outside us-east-1
aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws dynamodb create-table --table-name hackhub-tflock --region "$REGION" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST

cp env/dev/backend.config.example env/dev/backend.config   # replace <ACCOUNT_ID>
```
</details>

Each account is fully **independent**: its own bucket, its own state, its own resources. Nothing is
shared between clones — bootstrapping in your account gives you an empty state, so the first `apply`
provisions a complete new stack.

> **Symptom of skipping this, or of pointing at an account you don't own:** `terraform init` fails
> with `Error refreshing state: ... HeadObject ... 403 Forbidden`. S3 answers `403` (not `404`) for a
> bucket that exists under someone else's account, so a stale `bucket = ...-<someone-elses-account>`
> looks like a permissions bug. Re-run `./bootstrap-backend.sh <env>` to fix it.

### Per-environment state
Within one account, dev and prod share the same state bucket + lock table but use **distinct state
keys** (`.../dev/...` vs `.../prod/...`) and distinct `vpc_cidr`. Config lives under `env/<env>/`.

### Deploy to dev
```bash
./bootstrap-backend.sh dev   # first time in this account only
terraform init -reconfigure -backend-config=env/dev/backend.config
terraform plan  -var-file=env/dev/dev.tfvars
terraform apply -var-file=env/dev/dev.tfvars
```

### Deploy to prod
```bash
./bootstrap-backend.sh prod  # first time in this account only
terraform init -reconfigure -backend-config=env/prod/backend.config
# create env/prod/prod.tfvars locally (gitignored) — see variables below
terraform apply -var-file=env/prod/prod.tfvars
```

> Always confirm which backend is active before planning:
> `grep key .terraform/terraform.tfstate`

### After apply
```bash
terraform output                       # CloudFront portal URLs, API URL, Cognito IDs, RDS endpoint
```
Then log into the admin portal, create a hackathon (which provisions its own defaults), and add
judges/participants.

---

## 🔧 Configuration (tfvars)

Each env has its own gitignored tfvars, created from the committed template:

```bash
cp env/dev/dev.tfvars.example env/dev/dev.tfvars      # or env/prod/prod.tfvars.example
```

`db_password` is the **only** variable with no default — everything else falls back to
`variables.tf`.

> The root-level `terraform.tfvars.example` is **legacy** (single-env, `ap-southeast-2`) and predates
> the `env/<env>/` layout. Use the `env/` templates above. Don't copy it to `terraform.tfvars` —
> Terraform auto-loads that filename, which then shadows parts of your `-var-file`.

Key variables:

```hcl
project_name = "hackhub"   # resource name prefix
environment  = "dev"                     # one of: dev | test | staging | prod
aws_region   = "us-east-1"

vpc_cidr = "10.30.0.0/16"                # MUST differ from other envs
az_count = 2

# Database
db_name     = "hackhub"
db_username = "admin"
db_password = "USE_A_STRONG_PASSWORD"    # secret — keep in tfvars only

# Cost / endpoints
enable_nat_gateway             = false   # save on NAT
enable_secretsmanager_endpoint = true
enable_lambda_endpoint         = true    # VPC handlers invoke other Lambdas without NAT

# Cognito
admin_email = "you@example.com"          # receives default-admin verification email

# Frontend app config (baked into the builds via VITE_*)
app_name                        = "AWS Hackathon"
show_score                      = false
enable_scoring_datetime_control = true
scoring_start_date              = "2026-06-12T00:00:00+08:00"
scoring_end_date                = "2026-06-28T23:59:00+08:00"
scoring_lock_date               = "2026-06-29T00:00:00+08:00"
```

**Secrets and account-specific config are never committed:** `*.tfvars`, `env/**/*.tfvars`, `.env`,
`*.tfstate`, and `env/**/backend.config` are gitignored — only the `.example` templates are tracked.
Each frontend's `.env` is generated during `terraform apply`, and each `backend.config` by
`./bootstrap-backend.sh`.

---

## 🧑‍💻 Frontend development

```bash
cd frontends/<app-name>
npm install
npm run dev        # Vite dev server on :8080
npm run build      # production build (admin runs tsc first)
npm run build:dev  # dev-mode build (judge + participant)
npm run lint
```

Apps: `hackerhub-admin-public` (admin + host), `hackerhub-judge-public` (judge; `npm run server`
runs a local proxy), `hackerhub-hackhub-public` (participant). All are Vite + React + TS +
shadcn/ui + Tailwind, authenticate via Cognito OIDC, and read the current hackathon via a
`CurrentHackathonContext`.

---

## 📖 Common operations

### Get a JWT and call the API
```bash
TOKEN=$(aws cognito-idp initiate-auth --client-id <CLIENT_ID> --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=admin@hackhub.com,PASSWORD='<pw>' --region us-east-1 \
  --query 'AuthenticationResult.IdToken' --output text)
API=$(terraform output -raw api_gateway_url)
curl -H "Authorization: Bearer $TOKEN" "$API/hackathons"
```

### Create a hackathon
```bash
curl -X POST "$API/hackathons" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"My Hackathon","submission_start":"2026-07-01T00:00:00Z","submission_end":"2026-12-31T23:59:00Z"}'
```

### Run SQL against the DB
```bash
printf '%s' 'SELECT hackathon_id, name FROM Hackathon' > /tmp/q.txt
python3 -c "import json;print(json.dumps({'sql':open('/tmp/q.txt').read()}))" > /tmp/p.json
aws lambda invoke --function-name <project>-<env>-SqlEditorLambda --region <region> \
  --cli-binary-format raw-in-base64-out --payload file:///tmp/p.json /tmp/out.json && cat /tmp/out.json
```

### Edit and redeploy a Lambda
```bash
# 1. edit lambda-code/src/<Name>/index.{js,mjs}
# 2. repackage the zip (simple handler = index file at zip root; the tenancy layer + runtime SDK v3 cover deps)
cd lambda-code/src/<Name> && zip -q -X ../../<Name>_code.zip index.js && cd -
# 3. deploy (Terraform picks up the new source_code_hash)
terraform apply -var-file=env/dev/dev.tfvars
```
> New DB-touching handlers must set `vpc_enabled = true` in `lambda_functions.tf`.

### Re-initialize the schema (DESTRUCTIVE)
```bash
# edit the DDL in lambda-code/src/HackhubDbInitializer/index.js, repackage, then:
terraform apply -replace=null_resource.db_init_trigger -var-file=env/dev/dev.tfvars
```
For data-preserving changes (prod), use `ALTER TABLE` via `SqlEditorLambda` — never the
DROP-based initializer.

### Redeploy one frontend / tail logs
```bash
terraform apply -replace=module.admin_public.null_resource.deploy -var-file=env/dev/dev.tfvars
aws logs tail /aws/lambda/<project>-<env>-<Name> --follow --region <region>
```

---

## 🐛 Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| API returns **401/403** on a tenant route | Missing membership: caller has no `Hackathon_Membership` row for that hackathon/role (Admins bypass). Add the row or use an admin token. |
| Lambda 500 `connect ETIMEDOUT` to RDS | Handler isn't in the VPC. Set `vpc_enabled = true` in `lambda_functions.tf`. |
| `PUT` to a route returns a SigV4 `Authorization header` 403 | That method isn't routed (e.g. no PUT on `/judge/scores`). Use the method the route map defines. |
| Schema init failed | `aws logs tail /aws/lambda/<project>-<env>-HackhubDbInitializer` then re-run with `-replace=null_resource.db_init_trigger`. |
| Applying against the wrong env | `grep key .terraform/terraform.tfstate`; re-`init` with the correct `-backend-config`. |
| Portal blank/stale | Re-run the frontend `null_resource.deploy` (see above); CloudFront invalidation runs on deploy. |

---

## 💰 Cost (approximate, low–medium traffic)

VPC endpoints ~$14/mo · RDS `db.t3.small` ~$30/mo · Lambda/API Gateway/S3/CloudFront usage-based ·
DynamoDB pay-per-request · Cognito free tier. No NAT Gateway by design. **≈ $45–65/month.**

---

## 🤝 Contributing

Branch → edit → `terraform fmt` + `terraform validate` → `terraform plan` → commit. Keep secrets
in gitignored tfvars/`.env`. Prefer least-privilege AWS credentials and assume production when
uncertain.
