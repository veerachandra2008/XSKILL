'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageType } from './Sidebar';
import { 
  Briefcase, 
  ClipboardList, 
  DollarSign, 
  MessageSquare, 
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  GraduationCap,
  Search,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

interface StudentDashboardProps {
  onPageChange?: (page: PageType) => void;
  onOpenPayment?: () => void;
}

interface TrialRecord {
  id: number;
  client_id: number;
  seller_id: number;
  task_description: string;
  status: 'Pending' | 'In Progress' | 'Submitted' | 'Approved';
  created_at: string;
  updated_at: string;
  student_name?: string;
  client_name?: string;
  student_skills_summary?: string;
}

interface StudentPaymentSummary {
  total_income?: number;
  pending_income?: number;
}

export default function StudentDashboard({ onPageChange, onOpenPayment }: StudentDashboardProps) {
  const { user } = useAuth();
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(true);
  const [paymentSummary, setPaymentSummary] = useState<StudentPaymentSummary | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const loadTrials = async () => {
      setIsLoadingTrials(true);
      try {
        const res = await fetch(buildApiUrl('/api/trials'), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load trials');
        }
        setTrials(data.trials || []);
      } catch (error) {
        console.error(error);
        setTrials([]);
      } finally {
        setIsLoadingTrials(false);
      }
    };

    loadTrials();
    window.addEventListener('xskill:trial-created', loadTrials);
    return () => {
      window.removeEventListener('xskill:trial-created', loadTrials);
    };
  }, []);

  useEffect(() => {
    const loadUnreadMessages = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/messages/unread-summary'), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (res.ok) {
          setUnreadMessages(Number(data.total_unread || 0));
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadUnreadMessages();
    const timer = window.setInterval(loadUnreadMessages, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/payments/summary'), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (res.ok) {
          setPaymentSummary(data.summary || null);
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadPayments();
  }, []);

  const pendingTrials = trials.filter((trial) => trial.status === 'Pending');
  const inProgressTrials = trials.filter((trial) => trial.status === 'In Progress');
  const completedTrials = trials.filter((trial) => trial.status === 'Approved' || trial.status === 'Submitted');
  const validatedSkills = (user?.skill_records || []).filter((record) => record.validation_status === 'validated');
  const topSkillPills = (user?.skills || []).slice(0, 5);
  const skillProgressRows = (user?.skill_records || [])
    .slice(0, 3)
    .map((record) => ({
      skill: record.skill_name,
      progress: Number(record.progress ?? record.best_test_score ?? record.test_score ?? 0),
      status: record.validation_status === 'validated'
        ? 'Validated'
        : record.validation_status === 'in_progress'
          ? 'In Progress'
          : 'Pending',
    }));

  const recentActivity = useMemo(() => {
    if (trials.length === 0) {
      return [
        { id: 1, type: 'info', title: 'No trial activity yet', status: 'pending', time: 'Waiting for requests' },
      ];
    }

    return trials.slice(0, 4).map((trial) => ({
      id: trial.id,
      type: 'trial',
      title: `${trial.client_name || 'Client'} requested a trial`,
      status: trial.status === 'Approved' || trial.status === 'Submitted' ? 'completed' : 'pending',
      time: new Date(trial.updated_at || trial.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [trials]);

  const upcomingTrials = useMemo(() => {
    return trials.slice(0, 3).map((trial) => ({
      id: trial.id,
      company: trial.client_name || 'Client',
      skill: trial.student_skills_summary
        ? String(trial.student_skills_summary).split(',')[0].trim()
        : 'Trial Request',
      date: new Date(trial.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status:
        trial.status === 'Pending'
          ? 'pending'
          : trial.status === 'In Progress'
            ? 'scheduled'
            : 'completed',
    }));
  }, [trials]);

  const stats = [
    { 
      label: 'Skills Validated', 
      value: String(validatedSkills.length), 
      icon: Briefcase, 
      change: `${user?.skill_records?.length || 0} total skills`,
      color: 'from-violet-500 to-purple-600',
      page: 'skills' as PageType
    },
    { 
      label: 'Active Trials', 
      value: String(trials.length), 
      icon: ClipboardList, 
      change: `${pendingTrials.length} pending review`,
      color: 'from-blue-500 to-cyan-600',
      page: 'trials' as PageType
    },
    { 
      label: 'Total Earnings', 
      value: `INR ${(paymentSummary?.total_income || 0).toLocaleString('en-IN')}`, 
      icon: DollarSign, 
      change: `Pending INR ${(paymentSummary?.pending_income || 0).toLocaleString('en-IN')}`,
      color: 'from-emerald-500 to-teal-600',
      action: onOpenPayment
    },
    { 
      label: 'Messages', 
      value: String(unreadMessages), 
      icon: MessageSquare, 
      change: unreadMessages > 0 ? `${unreadMessages} unread` : 'No unread',
      color: 'from-orange-500 to-amber-600',
      page: 'messages' as PageType
    },
  ];

  return (
    <motion.div className="space-y-8">
      {/* Hero Section */}
      <motion.div 
        className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2850&q=80")', filter: 'brightness(0.9)' }}
        />
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/80 via-black/50 to-transparent z-10" />
        
        <div className="relative z-20 px-6 py-16 md:px-12 md:py-24 flex flex-col justify-center w-full max-w-5xl">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-sans font-medium tracking-tight text-white mb-6 leading-[1.1] drop-shadow-lg">
            Find your next <br className="hidden md:block"/> big opportunity.
          </h1>
          
          {/* Search Bar */}
          <div className="flex w-full mb-6">
            <div className="relative w-full max-w-3xl flex items-center bg-white rounded-lg overflow-hidden shadow-2xl border border-white/20">
              <input 
                type="text" 
                placeholder="Search for jobs, trials, and clients..." 
                className="w-full py-4 pl-5 pr-14 text-slate-900 border-none outline-none focus:ring-0 text-lg placeholder:text-slate-500 font-sans"
              />
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-violet-600 hover:bg-violet-700 transition-colors p-3 rounded-md shadow-lg"
                onClick={() => onPageChange?.('trials')}
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-3 mb-10 lg:mb-16">
            {(topSkillPills.length > 0 ? topSkillPills : ['Add your skills']).map(pill => (
              <button 
                key={pill}
                className="px-4 py-2 rounded-full border border-white/40 text-white text-sm font-medium hover:bg-white hover:text-violet-900 transition-colors backdrop-blur-sm"
                onClick={() => onPageChange?.('trials')}
                disabled={topSkillPills.length === 0}
              >
                {pill} <ArrowUpRight className="inline w-3 h-3 ml-1 opacity-70" />
              </button>
            ))}
          </div>

          {/* Action Buttons & Top Companies */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button 
                className="pro-cta h-12 px-6 text-sm font-semibold"
                onClick={() => onPageChange?.('skill-tests')}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Take Skill Test
              </Button>
              <Button 
                variant="outline"
                className="h-12 border-white/30 bg-white/10 px-6 text-sm font-medium text-white hover:bg-white hover:text-violet-900 backdrop-blur-md"
                onClick={() => onPageChange?.('skills')}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Add New Skill
              </Button>
            </div>
            
            <div className="flex flex-col md:items-end text-white/80 font-semibold text-sm">
              <span className="opacity-80 mb-2">Current Pipeline:</span>
              <div className="flex flex-wrap items-center gap-4 opacity-90 text-white">
                 <span className="font-bold tracking-tight">{pendingTrials.length} Pending</span>
                 <span className="font-serif italic font-bold">{inProgressTrials.length} In Progress</span>
                 <span className="font-black tracking-widest">{completedTrials.length} Completed</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
            >
              <Card 
                className="pro-card pro-card-hover cursor-pointer group"
                onClick={() => {
                  if (stat.page && onPageChange) onPageChange(stat.page);
                  if (stat.action) stat.action();
                }}
              >
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
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {/* Recent Activity */}
        <Card className="lg:col-span-2 pro-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground dark:text-white">Recent Activity</CardTitle>
              <CardDescription className="text-muted-foreground">Your latest updates and notifications</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onPageChange?.('trials')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div 
                  key={activity.id} 
                  className="flex items-center gap-4 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-all duration-300 hover:shadow-md cursor-pointer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activity.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {activity.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground dark:text-white font-medium truncate">{activity.title}</p>
                    <p className="text-muted-foreground text-sm">{activity.time}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Trials */}
        <Card className="pro-card">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              Upcoming Trials
            </CardTitle>
            <CardDescription className="text-muted-foreground">Your scheduled assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTrials.map((trial, index) => (
                <motion.div 
                  key={trial.id} 
                  className="p-3 rounded-lg bg-accent/50 border border-border dark:border-slate-700 hover:border-primary/50 transition-all duration-300 hover:shadow-md"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-foreground dark:text-white font-medium">{trial.company}</p>
                    <Badge variant={trial.status === 'scheduled' ? 'default' : 'secondary'} className={
                      trial.status === 'scheduled'
                        ? 'bg-violet-600 text-white'
                        : trial.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-secondary text-secondary-foreground'
                    }>
                      {trial.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{trial.skill}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {trial.date}
                  </p>
                </motion.div>
              ))}
            </div>
            {isLoadingTrials && (
              <p className="text-xs text-muted-foreground mt-4 text-center">Loading trial requests...</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Skill Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Card className="pro-card">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              Skill Validation Progress
            </CardTitle>
            <CardDescription className="text-muted-foreground">Track your skill assessment progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(skillProgressRows.length > 0
                ? skillProgressRows
                : [{ skill: 'No skills added yet', progress: 0, status: 'Pending' }]
              ).map((item, index) => (
                <motion.div 
                  key={index} 
                  className="space-y-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-foreground dark:text-white font-medium">{item.skill}</span>
                    <Badge variant="outline" className="border-border text-muted-foreground">{item.status}</Badge>
                  </div>
                  <Progress value={item.progress} className="h-2 bg-secondary" />
                  <p className="text-xs text-muted-foreground">{item.progress}% completed</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button 
                className="pro-cta px-6"
                onClick={() => onPageChange?.('skill-tests')}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Take Skill Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
