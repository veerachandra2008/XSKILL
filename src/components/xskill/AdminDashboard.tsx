'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageType } from './Sidebar';
import { 
  Users, 
  CheckCircle2, 
  ShieldAlert, 
  TrendingUp,
  Activity,
  AlertCircle,
  Search,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminDashboardProps {
  onPageChange?: (page: PageType) => void;
  onOpenPayment?: () => void;
}

export default function AdminDashboard({ onPageChange }: AdminDashboardProps) {
  const [pendingSkills, setPendingSkills] = useState([
    { id: 1, student: 'Alice Johnson', skill: 'React Development', status: 'pending', date: 'Today' },
    { id: 2, student: 'Bob Smith', skill: 'Node.js Backend', status: 'pending', date: 'Yesterday' },
    { id: 3, student: 'Charlie Davis', skill: 'UI/UX Design', status: 'pending', date: 'Dec 10' }
  ]);

  const handleApprove = (id: number) => {
    setPendingSkills(prev => prev.filter(skill => skill.id !== id));
  };

  const stats = [
    { label: 'Total Users', value: '1,245', icon: Users, change: '+12% this month', color: 'from-violet-500 to-indigo-600' },
    { label: 'Pending Validations', value: pendingSkills.length.toString(), icon: AlertCircle, change: 'Requires review', color: 'from-amber-500 to-orange-600' },
    { label: 'Platform Revenue', value: '$45,200', icon: TrendingUp, change: '+5% this week', color: 'from-emerald-500 to-teal-600' },
    { label: 'Active Trials', value: '34', icon: Activity, change: 'Stable', color: 'from-blue-500 to-cyan-600' },
  ];

  return (
    <motion.div className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Hero Section */}
      <motion.div 
        className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=2850&q=80")', filter: 'brightness(0.9)' }}
        />
        <div className="absolute inset-0 bg-black/50 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-black/60 to-transparent z-10" />
        
        <div className="relative z-20 px-6 py-16 md:px-12 md:py-24 flex flex-col justify-center w-full max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="w-8 h-8 text-emerald-400 drop-shadow-md" />
            <span className="text-emerald-400 font-bold uppercase tracking-widest text-sm drop-shadow-md">Admin Access</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-sans font-medium tracking-tight text-white mb-6 leading-[1.1] drop-shadow-lg">
            Platform <br className="hidden md:block"/> Command Center.
          </h1>
          
          {/* Search Bar */}
          <div className="flex w-full mb-6">
            <div className="relative w-full max-w-3xl flex items-center bg-white rounded-lg overflow-hidden shadow-2xl border border-white/20">
              <input 
                type="text" 
                placeholder="Search users, skills, or transaction IDs..." 
                className="w-full py-4 pl-5 pr-14 text-slate-900 border-none outline-none focus:ring-0 text-lg placeholder:text-slate-500 font-sans"
              />
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 transition-colors p-3 rounded-md shadow-lg"
                onClick={() => onPageChange?.('browse')}
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex flex-wrap gap-3 mb-10 lg:mb-16">
            {[
              "Pending Validations", 
              "User Management", 
              "Financial Reports", 
              "System Logs",
              "Feature Flags"
            ].map(pill => (
              <button 
                key={pill}
                className="px-4 py-2 rounded-full border border-white/40 text-white text-sm font-medium hover:bg-emerald-500 hover:border-emerald-500 transition-colors backdrop-blur-sm"
              >
                {pill} <ArrowUpRight className="inline w-3 h-3 ml-1 opacity-70" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="pro-card pro-card-hover group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <motion.div 
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    whileHover={{ rotate: 5 }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-foreground dark:text-white">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Validations */}
        <Card className="lg:col-span-2 pro-card">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Pending Skill Validations
            </CardTitle>
            <CardDescription className="text-muted-foreground">Approve new skills uploaded by students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingSkills.length > 0 ? pendingSkills.map((item, index) => (
                <motion.div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-all duration-300 border border-border"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground dark:text-white font-semibold truncate">{item.student}</p>
                    <p className="text-muted-foreground text-sm flex gap-2">
                       <span>{item.skill}</span>
                       <span>•</span>
                       <span>{item.date}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-border hover:bg-red-500/10 hover:text-red-500">
                      Reject
                    </Button>
                    <Button className="pro-cta" onClick={() => handleApprove(item.id)}>
                      Approve
                    </Button>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No pending skills to validate.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="pro-card">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">System Status</CardTitle>
            <CardDescription className="text-muted-foreground">Live platform health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">API Response Time</span>
                  <span className="text-emerald-500 font-medium">42ms</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-1/4 rounded-full" />
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Database Load</span>
                  <span className="text-amber-500 font-medium">68%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[68%] rounded-full" />
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active WebSockets</span>
                  <span className="text-primary font-medium">1,402</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[45%] rounded-full" />
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
