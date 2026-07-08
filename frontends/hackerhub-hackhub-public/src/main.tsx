import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from "react-oidc-context";
import React from "react";
import { BrowserRouter } from "react-router-dom";

const adminCognitoAuthConfig = {
    authority: import.meta.env.VITE_ADMIN_COGNITO_AUTHORITY,
    client_id: import.meta.env.VITE_ADMIN_COGNITO_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_ADMIN_COGNITO_REDIRECT_URI,
    response_type: "code",
    scope: "email openid profile",
    post_logout_redirect_uri: import.meta.env.VITE_ADMIN_COGNITO_LOGOUT_URI,
};

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider {...adminCognitoAuthConfig}>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);