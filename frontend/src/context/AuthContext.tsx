"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Cookies from "js-cookie";
import api from "@/lib/api";

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  is_active: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = Cookies.get("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    Cookies.set("token", data.access_token, { expires: 1 });
    Cookies.set("user", JSON.stringify(data.user), { expires: 1 });
    setUser(data.user);
  };

  const logout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
