import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AuthMe {
  authenticated: boolean;
  email?: string;
}

async function fetchMe(): Promise<AuthMe> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return { authenticated: false };
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur de connexion");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
