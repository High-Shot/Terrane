import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getClientId } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // On mount, ask the backend who we are. The httpOnly cookie (if present)
  // is sent automatically, so there is no token to read on the client.
  useEffect(() => {
    let active = true;
    api
      .get("/auth/me")
      .then((r) => { if (active) setUser(r.data); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const register = useCallback(async ({ email, password, name }) => {
    // Backend sets the httpOnly auth cookie in its response.
    const { data } = await api.post("/auth/register", { email, password, name, client_id: getClientId() });
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password, client_id: getClientId() });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
