import { useState, useEffect, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "epwgcet_auth_token";

export function getStoredToken(): string | null {
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

// Wire stored token into all generated API hooks
setAuthTokenGetter(getStoredToken);

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; email: string }
  | { status: "unauthenticated" };

async function checkToken(token: string): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.authenticated ? (data.email ?? "") : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // On mount, validate any stored token
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState({ status: "unauthenticated" });
      return;
    }
    checkToken(token).then((email) => {
      if (email !== null) {
        setState({ status: "authenticated", email });
      } else {
        setStoredToken(null);
        setState({ status: "unauthenticated" });
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? "Erreur de connexion");
        return;
      }
      setStoredToken(data.token);
      setState({ status: "authenticated", email });
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    const token = getStoredToken();
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setStoredToken(null);
    setState({ status: "unauthenticated" });
  }, []);

  return {
    isLoading: state.status === "loading",
    isAuthenticated: state.status === "authenticated",
    email: state.status === "authenticated" ? state.email : undefined,
    login,
    logout,
    isLoggingIn,
    loginError,
  };
}
