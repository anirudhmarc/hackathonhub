/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_API_URL: string
  readonly VITE_ADMIN_COGNITO_AUTHORITY: string
  readonly VITE_ADMIN_COGNITO_CLIENT_ID: string
  readonly VITE_ADMIN_COGNITO_REDIRECT_URI: string
  readonly VITE_ADMIN_COGNITO_LOGOUT_URI: string
  readonly VITE_ADMIN_COGNITO_AUTH_DOMAIN: string
  readonly VITE_SHOW_PROBLEM_SUBMISSION_STATS: string
  readonly VITE_SHOW_LEADERBOARD_SUMMARY: string
  readonly VITE_ENABLE_ENHANCED_RESULTS: string
  readonly VITE_ENABLE_SORTING: string
  readonly VITE_SHOW_TOP_FLAGS: string
  readonly VITE_SHOW_STAR: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
