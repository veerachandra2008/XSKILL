'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import Sidebar, { PageType } from './Sidebar';
import StudentDashboard from './StudentDashboard';
import ClientDashboard from './ClientDashboard';
import AdminDashboard from './AdminDashboard';
import Profile from './Profile';
import SkillsManagement from './SkillsManagement';
import SkillsTest from './SkillsTest';
import BrowseStudents from './BrowseStudents';
import TrialRequests from './TrialRequests';
import Messaging from './Messaging';
import Payments from './Payments';
import Settings from './Settings';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
  };

  const handleOpenPayment = () => {
    setCurrentPage('payments');
  };

  const renderPage = () => {
    if (currentPage === 'dashboard') {
      if (user?.role === 'admin') {
        return <AdminDashboard onPageChange={handlePageChange} onOpenPayment={handleOpenPayment} />;
      }
      return user?.role === 'student' 
        ? <StudentDashboard onPageChange={handlePageChange} onOpenPayment={handleOpenPayment} /> 
        : <ClientDashboard onPageChange={handlePageChange} onOpenPayment={handleOpenPayment} />;
    }

    switch (currentPage) {
      case 'profile':
        return <Profile />;
      case 'skills':
        return <SkillsManagement />;
      case 'skill-tests':
        return <SkillsTest />;
      case 'browse':
        return <BrowseStudents />;
      case 'trials':
        return <TrialRequests />;
      case 'payments':
        return <Payments />;
      case 'messages':
        return <Messaging />;
      case 'settings':
        return <Settings />;
      default:
        return <StudentDashboard onPageChange={handlePageChange} onOpenPayment={handleOpenPayment} />;
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 relative overflow-hidden">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar 
          currentPage={currentPage}
          onPageChange={(page) => {
            handlePageChange(page);
            setMobileSidebarOpen(false);
          }}
          onOpenPayment={() => {
            setMobileSidebarOpen(false);
            handleOpenPayment();
          }}
          mobile
        />
      </div>

      {/* Desktop top navigation */}
      <div className="hidden lg:block relative z-20">
        <Sidebar 
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onOpenPayment={handleOpenPayment}
        />
      </div>

      {/* Main content */}
      <main className={cn(
        "min-h-screen transition-all duration-300 relative z-10",
        "lg:pt-20"
      )}>
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-theme-gradient-br flex items-center justify-center">
              <span className="text-white text-sm font-bold">X</span>
            </div>
            <span className="text-lg font-bold text-foreground">XSkill</span>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}
