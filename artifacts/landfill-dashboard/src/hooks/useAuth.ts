import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "epwgcet_auth_token";

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

// Wire token into the shared API client so all dashboard hooks send Authorization header
setAuthTokenGetter(() => getStoredToken());

interface AuthMe {
  authenticated: boolean;
  email?: string;
}

async function fetchMe(): Promise<AuthMe> {
  const token = getStoredToken();
  if (!token) return { authenticated: false };
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    setStoredToken(null);
    return { authenticated: false };
  }
  return res.json();
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur de connexion");
      }
      const data = await res.json();
      setStoredToken(data.token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = getStoredToken();
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setStoredToken(null);
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth-me"], { authenticated: false });
    },
  });

  return {
    isAuthenticated: data?.authenticated === true,
    email: data?.email,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: () => logoutMutation.mutate(),
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
  };
}
