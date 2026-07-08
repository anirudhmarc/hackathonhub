import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

const Register = () => {
  const { signinRedirect } = useAuth();

  useEffect(() => {
    signinRedirect();
  }, [signinRedirect]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to registration/login...</p>
    </div>
  );
};

export default Register;