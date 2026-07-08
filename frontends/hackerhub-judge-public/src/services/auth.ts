import { UserManager, User } from "oidc-client-ts";

const cognitoAuthConfig = {
    authority: import.meta.env.VITE_COGNITO_AUTHORITY,
    client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
    redirect_uri: window.location.origin + "/callback",
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: "email openid profile",
    automaticSilentRenew: true,
    filterProtocolClaims: true,
    loadUserInfo: true
};

export const userManager = new UserManager(cognitoAuthConfig);

export const authService = {
    signIn: () => {
        return userManager.signinRedirect();
    },
    
    signOut: async () => {
        await userManager.signoutRedirect();
    },
    
    handleCallback: () => userManager.signinRedirectCallback(),
    
    getUser: () => userManager.getUser(),
    
    isAuthenticated: async () => {
        const user = await userManager.getUser();
        return !!user && !user.expired;
    },
    
    getAccessToken: async () => {
        const user = await userManager.getUser();
        return user?.access_token;
    },
    
    addUserLoadedEvent: (callback: (user: User) => void) => {
        userManager.events.addUserLoaded(callback);
    },
    
    removeUserLoadedEvent: (callback: (user: User) => void) => {
        userManager.events.removeUserLoaded(callback);
    }
};

export async function signOutRedirect() {
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const logoutUri = encodeURIComponent(window.location.origin);
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
}
