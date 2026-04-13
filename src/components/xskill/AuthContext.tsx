'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

export type UserRole = 'student' | 'client' | 'admin';

export interface SkillRecord {
  id: number;
  skill_name: string;
  category: string;
  level: string;
  skill_price?: number | null;
  validation_status?: 'pending' | 'in_progress' | 'validated';
  test_score?: number | null;
  best_test_score?: number | null;
  test_attempts?: number;
  progress?: number;
  has_certificate?: boolean;
  certificate_name?: string | null;
  certificate_uploaded_at?: string | null;
  last_tested_at?: string | null;
}

export interface UserSettings {
  timezone: string;
  language: string;
  dark_mode: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    trialUpdates: boolean;
    messages: boolean;
    payments: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showSkills: boolean;
    showEarnings: boolean;
    allowMessages: boolean;
  };
}

export interface User {
  id: string | number;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  phone?: string;
  website?: string;
  location?: string;
  skills?: string[];
  skill_records?: SkillRecord[];
  settings?: UserSettings;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;

  signup: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // ✅ ADD THIS AUTO LOGIN BLOCK HERE
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(buildApiUrl("/api/profile"), {
      method: "GET",
      headers: {
        ...createAuthHeaders(false),
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => localStorage.removeItem("token"));
  }, []);


const signup = useCallback(async (
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<boolean> => {
  try {
    const res = await fetch(buildApiUrl("/api/users"), {
      method: "POST",
      headers: createAuthHeaders(),
      body: JSON.stringify({
        name,
        email,
        password,
        role
      }),
    });

    const data = await res.json();
    console.log(data);

    return res.ok;
  } catch (error) {
    console.error("Signup error:", error);
    return false;
  }
}, []);

const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
  try {
    const res = await fetch(buildApiUrl("/api/login"), {
      method: "POST",
      headers: createAuthHeaders(),
      body: JSON.stringify({ email, password, role })
    });

    const data = await res.json();
    console.log(data);

    if (data.token) {
      localStorage.setItem("token", data.token);
      setUser(data.user);
      return true;
    }

    alert(data.error || "Login failed");
    return false;

  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
}, []);

const logout = useCallback(() => {
  localStorage.removeItem("token");
  setUser(null);
  window.location.assign("/");
}, []);


  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
