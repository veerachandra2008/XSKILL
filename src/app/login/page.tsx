'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/components/xskill/AuthContext';
import Login from '@/components/xskill/Login';
import DashboardLayout from '@/components/xskill/DashboardLayout';

function LoginContent() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <DashboardLayout />;
  }

  return <Login />;
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}
