import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const LogoutButton = () => {
  const { logout } = useAuth();

  return (
    <Button variant="outline" onClick={logout}>
      Logout
    </Button>
  );
};
