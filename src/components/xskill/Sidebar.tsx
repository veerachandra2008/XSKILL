'use client';

import React from 'react';
import { useAuth } from './AuthContext';
import { cn } from '@/lib/utils';
import { 
  Home, 
  User, 
  Briefcase, 
  Users, 
  ClipboardList, 
  MessageSquare, 
  Settings,
  LogOut,
  Sparkles,
  CreditCard,
  GraduationCap
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { ModeToggle } from '@/components/ui/mode-toggle';

export type PageType = 
  | 'dashboard' 
  | 'profile' 
  | 'skills' 
  | 'skill-tests'
  | 'browse' 
  | 'trials' 
  | 'payments'
  | 'messages' 
  | 'settings';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  onOpenPayment: () => void;
  mobile?: boolean;
}

interface NavItem {
  id: PageType;
  label: string;
  icon: React.ElementType;
  roles: ('student' | 'client' | 'admin')[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['student', 'client', 'admin'] },
  { id: 'profile', label: 'My Profile', icon: User, roles: ['student', 'client'] },
  { id: 'skills', label: 'My Skills', icon: Briefcase, roles: ['student'] },
  { id: 'skill-tests', label: 'Skill Tests', icon: GraduationCap, roles: ['student'] },
  { id: 'browse', label: 'Browse Students', icon: Users, roles: ['client', 'admin'] },
  { id: 'trials', label: 'Trial Requests', icon: ClipboardList, roles: ['student', 'client'] },
  { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['student', 'client', 'admin'] },
  { id: 'messages', label: 'Messages', icon: MessageSquare, roles: ['student', 'client', 'admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['student', 'client', 'admin'] },
];

export default function Sidebar({
  currentPage,
  onPageChange,
  onOpenPayment,
  mobile = false,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

 const getInitials = (name?: string) => {
  if (!name) return "U";   // fallback letter

  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
};

  return (
    <aside
      className={cn(
        "glass-panel z-50",
        mobile
          ? "fixed inset-y-0 left-0 flex h-full w-80 max-w-[88vw] flex-col border-r border-border/50 dark:border-slate-800/50"
          : "fixed left-0 top-0 hidden w-full border-b border-border/50 dark:border-slate-800/50 lg:block"
      )}
    >
      {mobile ? (
        <>
          <div className="flex h-16 items-center gap-3 border-b border-border/50 px-4 dark:border-slate-800/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground dark:text-white">XSkill</p>
              <p className="text-xs font-medium text-muted-foreground">Navigation</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = currentPage === item.id;
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onPageChange(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-border/50 p-4 dark:border-slate-800/50">
            {user && (
              <div className="mb-4 flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-border dark:border-slate-700">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground dark:text-white">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}

            <div className="mb-3 flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={onOpenPayment}
                className="flex-1 justify-start text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Option
              </Button>
              <ModeToggle />
            </div>

            <Separator className="my-3 bg-border/50 dark:bg-slate-800/50" />

            <Button
              variant="ghost"
              onClick={logout}
              className="w-full justify-start text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </div>
        </>
      ) : (
        <div className="mx-auto flex h-20 max-w-[1440px] items-center gap-6 px-6 xl:px-8">
          <div className="flex min-w-fit items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="leading-none">
              <p className="text-xl font-extrabold text-foreground dark:text-white">XSkill</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Talent Network
              </p>
            </div>
          </div>

          <nav className="min-w-0 flex-1 overflow-x-auto">
            <TooltipProvider delayDuration={0}>
              <ul className="flex min-w-max items-center gap-2">
                {filteredNavItems.map((item) => {
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;

                  const navButton = (
                    <button
                      onClick={() => onPageChange(item.id)}
                      className={cn(
                        "group flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  );

                  return (
                    <li key={item.id}>
                      {navButton}
                    </li>
                  );
                })}
              </ul>
            </TooltipProvider>
          </nav>

          <div className="flex min-w-fit items-center gap-2">
            <Button
              variant="ghost"
              onClick={onOpenPayment}
              className="rounded-full px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Payment Option
            </Button>

            <ModeToggle />

            {user && (
              <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/70 px-2 py-1.5 dark:border-slate-800/60">
                <Avatar className="h-9 w-9 border border-border dark:border-slate-700">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 xl:block">
                  <p className="truncate text-sm font-semibold text-foreground dark:text-white">{user.name}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">{user.role}</p>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
