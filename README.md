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
├── env/
│   ├── dev/  backend.config + dev.tfvars   (tfvars gitignored)
│   └── prod/ backend.config  (+ prod.tfvars you create locally, gitignored)
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

### Per-environment state
dev and prod share the same state bucket + lock table but use **distinct state keys** and
distinct `vpc_cidr`. Config lives under `env/<env>/`.

### Deploy to dev
```bash
terraform init -reconfigure -backend-config=env/dev/backend.config
terraform plan  -var-file=env/dev/dev.tfvars
terraform apply -var-file=env/dev/dev.tfvars
```

### Deploy to prod
```bash
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

Each env has its own gitignored tfvars. Key variables (defaults in `variables.tf`):

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

**Secrets are never committed:** `*.tfvars`, `env/**/*.tfvars`, `.env`, and `*.tfstate` are
gitignored. Each frontend's `.env` is generated during `terraform apply`.

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
