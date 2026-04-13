'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/components/xskill/AuthContext';
import DashboardLayout from '@/components/xskill/DashboardLayout';
import LandingPage from '@/components/xskill/LandingPage';

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <DashboardLayout />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
