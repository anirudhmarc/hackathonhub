# Great Malaysia AI Hackathon - HackHub Portal

[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.5-646cff?style=flat&logo=vite)](https://vitejs.dev/)
[![AWS](https://img.shields.io/badge/AWS-Cognito-ff9900?style=flat&logo=amazon-aws)](https://aws.amazon.com/cognito/)

Participant portal for hackathon team registration, problem selection, project submissions, and real-time progress tracking.

---

## Features

### Problem Selection

- **Problem Statements** — Browse available AI challenges by track
- **Slot Management** — First-come, first-served problem selection system
- **Track Filtering** — View Student and Corporate track challenges
- **Selection Status** — Real-time availability tracking

### Project Submission

- **Video Upload** — Submit demo videos
- **Repository Integration** — Link GitHub/GitLab repositories
- **Documentation** — Provide project descriptions and technical details
- **File Uploads** — Additional materials and presentations

### Dashboard

- **Event Timeline** — Real-time countdown and milestone tracking
- **Progress Monitoring** — Track registration and submission status
- **Quick Actions** — Direct access to key features
- **Status Indicators** — Visual feedback on completion progress

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
cd greataihackaton-hackhub

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
VITE_COGNITO_DOMAIN=https://your-domain.auth.region.amazoncognito.com
VITE_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_COGNITO_REDIRECT_URI=http://localhost:8080/callback
VITE_COGNITO_LOGOUT_URI=http://localhost:8080/logout-redirect.html
```

---

## Technology Stack

### Frontend Framework

- **React** 18.3.1 — UI library with hooks
- **TypeScript** 5.5.3 — Type-safe development
- **Vite** 7.1.5 — Lightning-fast build tool with HMR
- **React Router DOM** 6.26.2 — Client-side routing

### UI & Styling

- **Tailwind CSS** 3.4.11 — Utility-first CSS framework
- **Radix UI** — Accessible component primitives
- **Shadcn/UI** — Pre-built component library
- **Lucide React** 0.462.0 — Icon library
- **Tailwind Typography** 0.5.15 — Rich text styling

### Forms & Validation

- **React Hook Form** 7.53.0 — Performant form management
- **Zod** 3.23.8 — TypeScript-first schema validation
- **@hookform/resolvers** 3.9.0 — Validation resolver integration

### State & Data Management

- **TanStack Query** 5.56.2 — Server state management and caching
- **React Context** — Authentication and global state
- **Axios** 1.10.0 — HTTP client for API requests

### Authentication & AWS

- **react-oidc-context** 3.3.0 — OIDC client integration
- **AWS Cognito** — OAuth 2.0/OIDC authentication
- **oidc-client-ts** 3.2.1 — OpenID Connect client library

### Additional Libraries

- **React Helmet Async** 2.0.5 — SEO and meta tag management
- **date-fns** 3.6.0 — Date manipulation
- **Recharts** 2.12.7 — Data visualization
- **Embla Carousel** 8.3.0 — Carousel component

### Development Tools

- **ESLint** 9.9.0 — Code linting
- **PostCSS** 8.4.47 — CSS processing
- **SWC** — Fast TypeScript/JavaScript compiler

---

## Available Scripts

```bash
npm run dev        # Start development server on port 8080
npm run build      # Build for production
npm run build:dev  # Build for development environment
npm run preview    # Preview production build locally
npm run lint       # Run ESLint code analysis
```

---

## Project Structure

```
greataihackaton-hackhub/
├── public/                    # Static assets
│   ├── aws-logo.svg          # AWS branding
│   ├── logout-redirect.html  # Post-logout redirect page
│   ├── manifest.json         # PWA manifest
│   ├── robots.txt            # SEO configuration
│   └── sitemap.xml           # Site map for search engines
├── src/
│   ├── components/           # Reusable components
│   │   ├── ui/              # Shadcn/UI and Radix components
│   │   ├── MobileNav.tsx    # Mobile navigation
│   │   ├── Navigation.tsx   # Main navigation bar
│   │   ├── ProtectedRoute.tsx
│   │   └── SEOHead.tsx      # SEO meta tags
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── hooks/
│   │   ├── use-mobile.tsx   # Mobile detection hook
│   │   └── use-toast.ts     # Toast notification hook
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── pages/               # Application pages
│   │   ├── Callback.tsx     # OAuth callback handler
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── Feedback.tsx     # Feedback form
│   │   ├── Index.tsx        # Landing page
│   │   ├── Login.tsx        # Login page
│   │   ├── Problems.tsx     # Problem statements
│   │   ├── Register.tsx     # Team registration
│   │   ├── Unauthorized.tsx # Access denied page
│   │   ├── Video.tsx        # Video submission
│   │   └── Welcome.tsx      # Welcome page
│   ├── types/
│   │   ├── files.ts         # File type definitions
│   │   └── user.ts          # User type definitions
│   ├── utils/
│   │   └── navigationUtils.ts
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Application entry point
│   └── vite-env.d.ts        # TypeScript environment definitions
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

### Participant Endpoints

```
GET    /participant/feedback       # Get feedback data
POST   /participant/feedback       # Submit workshop feedback

GET    /participant/problems       # Get all problem statements  
PUT    /participant/problems       # Select problem for team

POST   /participant/submission-urls # Get S3 upload URLs
GET    /participant/submissions    # Get team submission
PUT    /participant/submissions    # Update submission

GET    /participant/teams          # Get team details
```

---

## Security

### Authentication & Authorization

- **OAuth 2.0/OIDC** via AWS Cognito with secure token management
- **Session Management** — Automatic token refresh and secure logout
- **Protected Routes** — Authentication required for sensitive pages

### Data Protection

- **HTTPS-only** communication with API Gateway
- **Input Validation** using Zod schemas for all forms
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
aws s3 sync dist/ s3://your-hackhub-bucket --delete

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

- Verify `VITE_COGNITO_DOMAIN` format
- Ensure redirect URIs match Cognito app client settings
- Check user pool configuration

**API Gateway CORS errors:**

- Confirm API Gateway has CORS enabled
- Verify `Authorization` header is allowed
- Check API Gateway stage deployment

**Vite proxy issues:**

- Review proxy configuration in `vite.config.ts`
- Check API Gateway endpoint URL
- Verify CORS headers in proxy response

---

## License

MIT License — See [LICENSE](../LICENSE) for details.
