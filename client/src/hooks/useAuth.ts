import { useQuery } from "@tanstack/react-query";
import { userSession } from "@/lib/userSession";

export function useAuth() {
  // Check if user is logged in via session storage
  const userId = userSession.getUserId();
  const isLoggedIn = !!userId;

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/user/profile?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isLoggedIn,
    retry: false,
  });

  return {
    user,
    isLoading: isLoggedIn ? isLoading : false,
    isAuthenticated: isLoggedIn && !!user,
  };
}