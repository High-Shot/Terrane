import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getClientId } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("terrane_token");
    if (!token) { setReady(true); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem("terrane_token"); })
      .finally(() => setReady(true));
  }, []);

  const persist = (token, u) => {
    localStorage.setItem("terrane_token", token);
    setUser(u);
  };

  const register = useCallback(async ({ email, password, name }) => {
    const { data } = await api.post("/auth/register", { email, password, name, client_id: getClientId() });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password, client_id: getClientId() });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("terrane_token");
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
