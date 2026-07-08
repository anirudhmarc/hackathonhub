# Great Malaysia AI Hackathon - Judge Portal

[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-646cff?style=flat&logo=vite)](https://vitejs.dev/)
[![AWS](https://img.shields.io/badge/AWS-Cognito-ff9900?style=flat&logo=amazon-aws)](https://aws.amazon.com/cognito/)

Professional judging portal for evaluating hackathon teams with multi-criteria scoring, AWS funding recommendations, and real-time leaderboard tracking.

---

## Features

### Scoring System

- **Multi-Criteria Evaluation** — Score teams across Innovation, Technical Complexity, Impact, and Presentation (1-10 scale)
- **AWS Funding Votes** — Cast upvote/downvote recommendations for AWS funding eligibility
- **AWS Special Award** — Nominate teams for AWS Special Award (Final Round only)
- **Auto-Save Functionality** — Automatic localStorage backup to prevent data loss during scoring
- **Score Validation** — Real-time validation and submission confirmation with error handling

### Team Management

- **Assigned Teams Dashboard** — View all teams assigned to your judging panel
- **Team Details Access** — Review project descriptions, demo videos, and GitHub repositories
- **Submission Tracking** — Monitor team submission status with timestamps
- **Progress Indicators** — Visual feedback on scoring completion rates

### Judging Rounds

- **Preliminary Round** — Initial evaluation of all participating teams
- **Final Round** — Advanced scoring with AWS Special Award nominations
- **Stage Filtering** — Seamlessly switch between judging stages
- **Round-Specific Features** — Conditional UI elements based on judging stage

### Results & Leaderboard

- **Real-time Results** — View live leaderboard with team rankings
- **Score Analytics** — Track scoring progress and completion rates
- **Judge Performance** — Monitor your scoring activity and assigned teams
- **Export Capabilities** — Download results for offline review

---

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- AWS account with Cognito configured
- API Gateway endpoint URL

### Installation

```bash
# Clone repository
git clone <repository-url>
cd hackerhub-judge

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your AWS credentials

# Start development server (runs on port 8080)
npm run dev
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=https://your-api-gateway.execute-api.region.amazonaws.com/prod

# AWS Cognito Configuration
VITE_ADMIN_COGNITO_AUTHORITY=https://cognito-idp.region.amazonaws.com/your-user-pool-id
VITE_ADMIN_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_ADMIN_COGNITO_REDIRECT_URI=http://localhost:8080/callback
VITE_ADMIN_COGNITO_LOGOUT_URI=http://localhost:8080/logout-redirect.html
VITE_ADMIN_COGNITO_AUTH_DOMAIN=https://your-domain.auth.region.amazoncognito.com

# AWS S3 Configuration
VITE_S3_BUCKET_NAME=your-s3-bucket-name
VITE_AWS_REGION=ap-southeast-1

# Feature Flags (optional)
VITE_SHOW_RESULTS_PAGE=1
VITE_HIDE_PRELIMINARY_ROUND=0
VITE_ENABLE_SCORING_DATETIME_CONTROL=1
VITE_LOCK_LEADERBOARD_NO_FINAL_TEAMS=0

# Scoring Control (optional)
VITE_SCORING_START_DATE=2025-01-15T09:00:00
VITE_SCORING_END_DATE=2025-01-20T23:59:59
VITE_SCORING_LOCK_DATE=2025-01-21T00:00:00
```

---

## Technology Stack

### Frontend Framework

- **React** 18.3.1 — Latest React with concurrent features
- **TypeScript** 5.5.3 — Type-safe development
- **Vite** 5.4.1 — Lightning-fast build tool with HMR
- **React Router DOM** 6.26.2 — Client-side routing

### UI & Styling

- **Tailwind CSS** 3.4.11 — Utility-first CSS framework
- **Radix UI** — Accessible component primitives (Dialog, Select, Toast, Toggle)
- **Shadcn/UI** — Pre-built component library
- **Lucide React** 0.462.0 — Modern icon library
- **Tailwind Typography** 0.5.15 — Rich text styling

### Forms & Validation

- **React Hook Form** 7.53.0 — Performant form management
- **Zod** 3.23.8 — TypeScript-first schema validation
- **@hookform/resolvers** 3.9.0 — Validation resolver integration

### State & Data Management

- **TanStack Query** 5.56.2 — Server state management and caching
- **React Query** 3.39.3 — Data fetching and synchronization
- **React Context** — Authentication and global state
- **Axios** 1.9.0 — HTTP client for API requests

### Authentication & AWS

- **oidc-client-ts** 3.2.0 — OpenID Connect client library
- **AWS Cognito** — OAuth 2.0/OIDC authentication
- **AWS SDK** 2.1692.0 — AWS service integration

### Backend (Development Server)

- **Express** 5.1.0 — Node.js web framework
- **MySQL2** 3.14.2 — MySQL database client
- **CORS** 2.8.5 — Cross-origin resource sharing

### Development Tools

- **ESLint** 9.9.0 — Code linting
- **Concurrently** 9.1.2 — Run multiple commands simultaneously
- **PostCSS** — CSS processing
- **SWC** — Fast TypeScript/JavaScript compiler
- **Lovable Tagger** 1.1.7 — Component tagging for development

---

## Available Scripts

```bash
npm run dev        # Start development server on port 8080
npm run server     # Start backend API server (development)
npm run dev:full   # Run frontend + backend concurrently
npm run build      # Build for production (TypeScript + Vite)
npm run build:dev  # Build for development environment
npm run preview    # Preview production build locally
npm run lint       # Run ESLint code analysis
```

---

## Project Structure

```
hackerhub-judge/
├── public/                    # Static assets
│   ├── aws-logo2.svg         # AWS branding
│   ├── powered-by-aws.png    # AWS badge
│   ├── robots.txt            # SEO configuration
│   ├── site.webmanifest      # PWA manifest
│   └── team-timestamps.json  # Team submission timestamps
├── src/
│   ├── components/           # Reusable components
│   │   ├── auth/            # Authentication components
│   │   │   ├── AuthRedirect.tsx
│   │   │   ├── LoginButton.tsx
│   │   │   ├── LogoutButton.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── ui/              # Radix UI component wrappers
│   │   ├── Header.tsx       # Main header component
│   │   ├── JudgeSelect.tsx  # Judge selection dropdown
│   │   ├── ResultsCard.tsx  # Results display card
│   │   ├── ScoringCard.tsx  # Team scoring card
│   │   ├── TeamCardSkeleton.tsx
│   │   └── TrackIcon.tsx    # Track indicator icon
│   ├── contexts/
│   │   ├── AuthContext.tsx  # Authentication state management
│   │   └── HackathonContext.tsx
│   ├── data/
│   │   └── teamTimestamps.ts
│   ├── hooks/
│   │   ├── use-mobile.tsx   # Mobile detection hook
│   │   ├── use-toast.ts     # Toast notification hook
│   │   └── useApi.ts        # API integration hook
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── pages/               # Application pages
│   │   ├── AuthCallback.tsx # OAuth callback handler
│   │   ├── Index.tsx        # Main dashboard
│   │   ├── NotFound.tsx     # 404 page
│   │   ├── ResultsPage.tsx  # Leaderboard and results
│   │   ├── TeamsPage.tsx    # Team scoring interface
│   │   └── Unauthorized.tsx # Access denied page
│   ├── server/              # Development API server
│   │   ├── api/
│   │   │   ├── judges.js
│   │   │   ├── problemStatements.js
│   │   │   ├── scores.js
│   │   │   ├── teams.js
│   │   │   └── transcode.js
│   │   ├── db.js            # Database connection
│   │   └── server.js        # Express server
│   ├── services/
│   │   ├── api.ts           # API service layer
│   │   ├── auth.ts          # Authentication service
│   │   └── timestampService.ts
│   ├── styles/
│   │   └── animations.css   # Custom animations
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   ├── judgeAccessControl.ts
│   │   ├── readOnlyMode.ts
│   │   ├── scoringDateTimeControl.ts
│   │   └── submissionTime.ts
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Application entry point
│   └── vite-env.d.ts        # TypeScript environment definitions
├── tools/                    # Utility scripts
│   ├── convert_mov_to_mp4.sh
│   └── transcode_upload.sh
├── .github/workflows/
│   └── deploy.yml           # CI/CD deployment pipeline
├── package.json
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
└── tailwind.config.ts       # Tailwind CSS configuration
```

---

## API Integration

### Authentication

All API requests require a Bearer token obtained from AWS Cognito:

```typescript
const headers = {
  Authorization: `Bearer ${idToken}`,
  "Content-Type": "application/json",
};
```

### Judge Endpoints

```
GET    /judge/assignments/{judgeId}/teams    # Get assigned teams for judge
GET    /judge/judges                         # Get judges information
GET    /judge/problems                       # Get problem statements
GET    /judge/scores                         # Get scores data
POST   /judge/scores                         # Submit new score
PUT    /judge/scores                         # Update existing score
GET    /judge/stages                         # Get judging stages
GET    /judge/teams                          # Get teams information
```

---

## Security

### Authentication & Authorization

- **OAuth 2.0/OIDC** via AWS Cognito with secure token management
- **Judge-Specific Access Control** — Judges can only view and score assigned teams
- **Session Management** — Automatic token refresh and secure logout
- **Protected Routes** — Authentication required for all application pages

### Data Protection

- **HTTPS-only** communication with API Gateway
- **Input Validation** using Zod schemas for all forms
- **CORS Configuration** with restricted origins
- **Environment Variables** for sensitive credentials

### Scoring Integrity

- **Timestamp Tracking** — Record exact submission times for audit trails
- **Auto-Save Mechanism** — Prevent data loss with localStorage backup
- **Read-Only Mode** — Lock scoring interface after deadline
- **Date/Time Controls** — Enforce scoring windows and deadlines

### Best Practices

- Never commit `.env` files to version control
- Rotate AWS credentials regularly
- Use AWS Secrets Manager for production secrets
- Enable CloudWatch logging for audit trails

---

## Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Output directory: dist/
```

### AWS S3 + CloudFront (Recommended)

```bash
# Sync to S3 bucket
aws s3 sync dist/ s3://your-judge-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### GitHub Actions

Automated deployment pipeline configured in `.github/workflows/deploy.yml`:

- Builds on push to main branch
- Deploys to S3
- Invalidates CloudFront cache

**Required Secrets:**

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `CLOUDFRONT_DISTRIBUTION_ID`

---

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Consistent component structure
- Path aliases configured (`@/` → `src/`)

### Component Guidelines

- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow Radix UI patterns for accessibility
- Utilize Tailwind utility classes

### State Management

- React Context for authentication
- TanStack Query for server state
- Local state with useState/useReducer
- Form state with React Hook Form

---

## Troubleshooting

### Common Issues

**Cognito authentication errors:**

- Verify `VITE_ADMIN_COGNITO_AUTHORITY` format
- Ensure redirect URIs match Cognito app client settings
- Check judge user exists in Cognito user pool

**Scoring not saving:**

- Check browser localStorage is enabled
- Verify API endpoint connectivity
- Review browser console for errors
- Ensure scoring window is active

**API Gateway CORS errors:**

- Confirm API Gateway has CORS enabled
- Verify `Authorization` header is allowed
- Check API Gateway stage deployment

---

## License

MIT License — See [LICENSE](../LICENSE) for details.
