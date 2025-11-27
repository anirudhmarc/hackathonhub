import { WebStorageStateStore } from 'oidc-client-ts';

export const getOidcConfig = () => ({
  authority: import.meta.env.VITE_ADMIN_COGNITO_AUTHORITY,
  client_id: import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID,
  redirect_uri: window.location.origin + '/callback',
  response_type: 'code',
  scope: 'email openid phone',
  post_logout_redirect_uri: window.location.origin + '/logout',
  automaticSilentRenew: true,
  loadUserInfo: true,
  monitorSession: true,
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  userStore: new WebStorageStateStore({ store: window.sessionStorage })
});