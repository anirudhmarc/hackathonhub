# Great Malaysia AI Hackathon - Admin System

[![React](https://img.shields.io/badge/React-19.1.0-61dafb?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.4-646cff?style=flat&logo=vite)](https://vitejs.dev/)
[![AWS](https://img.shields.io/badge/AWS-Cognito-ff9900?style=flat&logo=amazon-aws)](https://aws.amazon.com/cognito/)

Enterprise-grade administrative dashboard for managing hackathon operations, including participant registration, team oversight, judge coordination, and real-time scoring systems.

---

## Features

### Core Management

- **Participant Management** — Review, approve, and manage team registrations with detailed tracking
- **Team Administration** — Monitor team submissions, problem selections, and finalist status
- **Judge Coordination** — Create judge accounts, manage assignments, and track scoring progress
- **Assignment System** — Bulk assign teams to judges across multiple judging stages
- **Problem Statements** — Configure hackathon tracks and problem statement slots

### Scoring & Results

- **Real-time Leaderboards** — View rankings with filtering by track, problem, and judging stage
- **Enhanced Results View** — Interactive podium display with analytics and team insights
- **Judge Performance** — Monitor scoring completion rates and identify gaps
- **AWS Funding Votes** — Track upvote/downvote recommendations per team

### Communication

- **Email Broadcasting** — Send judge credentials, workshop feedback forms, and custom announcements
- **Template System** — Pre-built email templates for preliminary and final round communications
- **Bulk Operations** — Efficiently manage multiple judges and teams simultaneously

---

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- AWS account

### Installation

```bash
# Clone repository
git clone <repository-url>
cd hackerhub-admin

# Install dependencies
npm install

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
```

---

## Technology Stack

### Frontend Framework

- **React** 19.1.0 — Latest React with concurrent features
- **TypeScript** 5.8.3 — Type-safe development
- **Vite** 7.0.4 — Lightning-fast build tool with HMR
- **React Router DOM** 7.7.1 — Client-side routing

### UI & Styling

- **Tailwind CSS** 3.4.4 — Utility-first CSS framework
- **Radix UI** — Accessible component primitives (Dialog, Select, Toast, Toggle)
- **Lucide React** 0.525.0 — Modern icon library
- **Class Variance Authority** — Component variant management

### Authentication & API

- **AWS Cognito** — OAuth 2.0/OIDC authentication
- **react-oidc-context** 3.3.0 — OIDC client integration
- **Axios** 1.11.0 — HTTP client for API requests

### Development Tools

- **ESLint** 9.30.1 — Code linting
- **PostCSS** — CSS processing
- **SWC** — Fast TypeScript/JavaScript compiler

---

## Available Scripts

```bash
npm run dev          # Start development server on port 8080
npm run build        # Build for production (TypeScript + Vite)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint code analysis
npm run flags-server # Start feature flags development server
```

---

## Project Structure

```
hackerhub-admin/
├── public/                    # Static assets
│   ├── aws-logo.svg          # AWS branding
│   ├── logout-redirect.html  # Post-logout redirect page
│   └── robots.txt            # SEO configuration
├── src/
│   ├── components/           # Reusable components
│   │   ├── ui/              # Radix UI component wrappers
│   │   ├── JudgesSummaryChart.tsx
│   │   ├── Layout.tsx       # Main layout wrapper
│   │   ├── Navbar.tsx       # Navigation bar
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── hooks/
│   │   └── use-toast.ts     # Toast notification hook
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── pages/               # Application pages
│   │   ├── BroadcastEmailPage.tsx
│   │   ├── CallbackPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ManageAssignmentsPage.tsx
│   │   ├── ManageJudgesPage.tsx
│   │   ├── ManageParticipantsPage.tsx
│   │   ├── ManageProblemsPage.tsx
│   │   ├── ManageTeamsPage.tsx
│   │   ├── ResultsPage.tsx
│   │   └── UnauthorizedPage.tsx
│   ├── utils/
│   │   └── oidcConfig.ts    # OIDC configuration
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Application entry point
│   └── vite-env.d.ts        # TypeScript environment definitions
├── .github/workflows/
│   └── deploy.yml           # CI/CD deployment pipeline
├── package.json
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
└── tailwind.config.js       # Tailwind CSS configuration
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

### Admin Endpoints

```
# Assignments
GET    /admin/assignments                    # Get all judge-team assignments
POST   /admin/assignments                    # Create assignment
DELETE /admin/assignments/{assignmentId}     # Delete assignment

# Email Broadcasting
POST   /admin/broadcast-email               # Send bulk emails with templates

# Judges Management
GET    /admin/judges                        # Retrieve all judges
POST   /admin/judges                        # Create single judge
PUT    /admin/judges/{judgeId}              # Update judge details
DELETE /admin/judges/{judgeId}              # Delete judge
POST   /admin/judges/create-cognito         # Create Cognito user for judge

# Judging System
GET    /admin/judging-stages                # Get all judging stages
GET    /admin/leaderboard                   # Get teams, scores, judges, and stages

# Participants Management
GET    /admin/participants                  # Get all participants
POST   /admin/participants                  # Create participant
PUT    /admin/participants/{id}             # Update participant
DELETE /admin/participants/{id}             # Delete participant
POST   /admin/participants/{id}/approve     # Approve participant and create team

# Problems Management
GET    /admin/problems                      # Get all problem statements
POST   /admin/problems                      # Create problem statement
PUT    /admin/problems/{problemId}          # Update problem statement
DELETE /admin/problems/{problemId}          # Delete problem statement

# Teams Management
GET    /admin/teams                         # Retrieve all teams with problems and tracks
POST   /admin/teams                         # Create new team
PUT    /admin/teams/{teamId}                # Update team details
DELETE /admin/teams/{teamId}                # Delete team
```

---

## Security

### Authentication & Authorization

- **OAuth 2.0/OIDC** via AWS Cognito with secure token management
- **Admin Group Enforcement** — Routes protected by Cognito group membership
- **Session Management** — Automatic token refresh and secure logout

### Data Protection

- **HTTPS-only** communication with API Gateway
- **Input Sanitization** using DOMPurify for XSS prevention
- **CORS Configuration** with restricted origins
- **Environment Variables** for sensitive credentials

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
aws s3 sync dist/ s3://your-admin-bucket --delete

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
- Local state with useState/useReducer
- Memoization with useMemo/useCallback

---

## Troubleshooting

### Common Issues

**Cognito authentication errors:**

- Verify `VITE_ADMIN_COGNITO_AUTHORITY` format
- Ensure redirect URIs match Cognito app client settings
- Check user pool has "Admins" group configured

**API Gateway CORS errors:**

- Confirm API Gateway has CORS enabled
- Verify `Authorization` header is allowed
- Check API Gateway stage deployment

---

## License

MIT License — See [LICENSE](../LICENSE) for details.
