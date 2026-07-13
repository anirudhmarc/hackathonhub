/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_API_URL: string;
  readonly VITE_ADMIN_COGNITO_AUTHORITY: string;
  readonly VITE_ADMIN_COGNITO_CLIENT_ID: string;
  readonly VITE_ADMIN_COGNITO_REDIRECT_URI: string;
  readonly VITE_ADMIN_COGNITO_LOGOUT_URI: string;
  readonly VITE_ADMIN_COGNITO_AUTH_DOMAIN: string;
  readonly VITE_S3_BUCKET_NAME: string;
  readonly VITE_AWS_REGION: string;
  readonly VITE_SCORING_END_DATE: string;
  readonly VITE_SCORING_START_DATE: string;
  readonly VITE_SCORING_LOCK_DATE: string;
  readonly VITE_ENABLE_SCORING_DATETIME_CONTROL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}