import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import {
  setAuthTokenGetter,
  setUnauthorizedHandler,
  useExchangeMobileAuthorizationCode,
  useLogoutMobileSession,
} from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "bb_session_token";
const OIDC_ISSUER = "https://replit.com/oidc";

// Register the auth token getter once at module level.
// Every API call will invoke this to attach the Bearer token.
setAuthTokenGetter(async () => {
  if (Platform.OS === "web") return null; // web uses session cookies
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
});

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const queryClient = useQueryClient();

  const discovery = AuthSession.useAutoDiscovery(OIDC_ISSUER);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "bougiebams-mobile",
    path: "auth/callback",
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_REPL_ID!,
      redirectUri,
      scopes: ["openid", "email", "profile"],
      usePKCE: true,
    },
    discovery,
  );

  const exchangeMutation = useExchangeMobileAuthorizationCode();
  const logoutMutation = useLogoutMobileSession();

  // Load persisted token on mount
  useEffect(() => {
    async function loadToken() {
      try {
        if (Platform.OS !== "web") {
          const stored = await SecureStore.getItemAsync(TOKEN_KEY);
          setToken(stored);
        }
      } finally {
        setTokenLoaded(true);
      }
    }
    loadToken();
  }, []);

  // Handle OAuth response — exchange auth code for session token
  useEffect(() => {
    if (response?.type !== "success") return;
    const { code } = response.params;
    if (!code || !request?.codeVerifier) return;

    exchangeMutation.mutate(
      {
        data: {
          code,
          code_verifier: request.codeVerifier,
          redirect_uri: redirectUri,
          state: request.state,
          nonce: undefined,
        },
      },
      {
        onSuccess: async (data) => {
          const newToken = data.token;
          if (Platform.OS !== "web") {
            await SecureStore.setItemAsync(TOKEN_KEY, newToken);
          }
          setToken(newToken);
          queryClient.invalidateQueries();
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const signIn = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Best-effort server logout — still clear local state
    }
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    setToken(null);
    queryClient.invalidateQueries();
  }, [logoutMutation, queryClient]);

  // Global 401 interceptor: register a handler on the shared fetch layer so
  // that ANY API call returning 401 while a token is stored triggers sign-out.
  // This covers all screens — not just the auth/user poll — so members are
  // gracefully signed out regardless of which endpoint detected the expiry.
  useEffect(() => {
    if (!tokenLoaded) return;

    if (token && Platform.OS !== "web") {
      setUnauthorizedHandler(() => {
        setSessionExpired(true);
        signOut();
      });
    } else {
      setUnauthorizedHandler(null);
    }

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [token, tokenLoaded, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!token,
      isLoading: !tokenLoaded,
      sessionExpired,
      clearSessionExpired,
      signIn,
      signOut,
    }),
    [token, tokenLoaded, sessionExpired, clearSessionExpired, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
