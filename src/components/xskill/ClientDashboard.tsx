'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageType } from './Sidebar';
import { 
  Users, 
  ClipboardList, 
  DollarSign, 
  MessageSquare,
  Calendar,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Star,
  TrendingUp,
  Search,
  CreditCard,
  Building2,
  MapPin,
  Settings,
  Mail
} from 'lucide-react';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

interface ClientDashboardProps {
  onPageChange?: (page: PageType) => void;
  onOpenPayment?: () => void;
}

interface Recommendation {
  id: number;
  name: string;
  avatar?: string;
  skills: string[];
  score: number;
  reason: string;
}

interface ClientPaymentSummary {
  total_expense?: number;
  platform_fees_paid?: number;
}

interface TrialRecord {
  id: number;
  task_description: string;
  status: 'Pending' | 'In Progress' | 'Submitted' | 'Approved';
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export default function ClientDashboard({ onPageChange, onOpenPayment }: ClientDashboardProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ClientPaymentSummary | null>(null);
  const [smartNeed, setSmartNeed] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const loadPaymentSummary = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/payments/summary'), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (res.ok) {
          setSummary(data.summary || null);
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadPaymentSummary();
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
    const loadTrials = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/trials'), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (res.ok) {
          setTrials(data.trials || []);
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadTrials();
    window.addEventListener('xskill:trial-created', loadTrials);
    return () => {
      window.removeEventListener('xskill:trial-created', loadTrials);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const formatTimeAgo = (value: string) => {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'Unknown time';

    const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (diffSeconds < 60) return 'Just now';

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const recentRequests = useMemo(() => {
    if (!trials.length) {
      return [];
    }

    const normalizeStatus = (status: TrialRecord['status']) => {
      if (status === 'Approved') return 'completed';
      if (status === 'In Progress' || status === 'Submitted') return 'accepted';
      return 'pending';
    };

    return trials.slice(0, 4).map((trial) => ({
      id: trial.id,
      name: trial.student_name || 'Student',
      skill: trial.task_description || 'Trial request',
      avatar: '',
      status: normalizeStatus(trial.status),
      time: formatTimeAgo(trial.updated_at || trial.created_at),
    }));
  }, [trials, now]);

  const runSmartFilter = async () => {
    const requirement = smartNeed.trim();
    if (!requirement) {
      window.alert('Describe your project need first.');
      return;
    }

    setIsLoadingRecommendations(true);
    try {
      const res = await fetch(buildApiUrl('/api/students/recommendations'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          requirement,
          limit: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run smart filter');
      }
      setRecommendations(data.recommendations || []);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to get recommendations');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const formattedSpent = `INR ${(summary?.total_expense || 0).toLocaleString('en-IN')}`;
  const activeTrials = trials.filter((trial) => trial.status !== 'Approved').length;
  const studentsEngaged = new Set(
    trials.map((trial) => (trial.student_name || '').trim()).filter(Boolean)
  ).size;

  const stats = [
    { 
      label: 'Active Trials', 
      value: String(activeTrials), 
      icon: ClipboardList, 
      change: `${trials.filter((trial) => trial.status === 'Pending').length} pending review`,
      color: 'from-violet-500 to-purple-600',
      page: 'trials' as PageType
    },
    { 
      label: 'Total Students', 
      value: String(studentsEngaged), 
      icon: Users, 
      change: `${trials.length} total requests`,
      color: 'from-blue-500 to-cyan-600',
      page: 'browse' as PageType
    },
    { 
      label: 'Total Spent', 
      value: formattedSpent, 
      icon: DollarSign, 
      change: `Fees: INR ${(summary?.platform_fees_paid || 0).toLocaleString('en-IN')}`,
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

  const topStudents = recommendations;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Accepted</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80")', filter: 'brightness(0.9)' }}
        />
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
        
        <div className="relative z-20 px-6 py-16 md:px-12 md:py-24 flex flex-col justify-center w-full max-w-5xl">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-sans font-medium tracking-tight text-white mb-6 leading-[1.1] drop-shadow-lg">
            Our freelancers <br className="hidden md:block"/> will take it from here.
          </h1>
          
          {/* Search Bar */}
          <div className="flex w-full mb-6">
            <div className="relative w-full max-w-3xl flex items-center bg-white rounded-lg overflow-hidden shadow-2xl border border-white/20">
              <input 
                type="text" 
                placeholder="Describe your need: e.g. Build a React dashboard with API integration" 
                value={smartNeed}
                onChange={(e) => setSmartNeed(e.target.value)}
                className="w-full py-4 pl-5 pr-14 text-slate-900 border-none outline-none focus:ring-0 text-lg placeholder:text-slate-500 font-sans"
              />
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 hover:bg-black transition-colors p-3 rounded-md"
                onClick={runSmartFilter}
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-3 mb-10 lg:mb-16">
            {(trials.length > 0
              ? Array.from(new Set(trials.map((trial) => trial.task_description).filter(Boolean))).slice(0, 5)
              : ['Create your first trial request']
            ).map(pill => (
              <button 
                key={pill}
                className="px-4 py-2 rounded-full border border-white/40 text-white text-sm font-medium hover:bg-white hover:text-black transition-colors backdrop-blur-sm"
                onClick={() => onPageChange?.('browse')}
                disabled={trials.length === 0}
              >
                {pill} <ArrowUpRight className="inline w-3 h-3 ml-1 opacity-70" />
              </button>
            ))}
          </div>

          {/* Trusted By */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-white/80 font-semibold text-sm mt-4">
            <span className="opacity-80">Pipeline:</span>
            <div className="flex flex-wrap items-center gap-6 md:gap-8 opacity-90 text-white leading-none">
               <span className="font-extrabold text-xl tracking-tighter">{trials.filter((trial) => trial.status === 'Pending').length} Pending</span>
               <span className="font-bold text-xl tracking-tight opacity-80">{trials.filter((trial) => trial.status === 'In Progress').length} In Progress</span>
               <span className="font-black text-xl tracking-widest opacity-90">{trials.filter((trial) => trial.status === 'Submitted').length} Submitted</span>
               <span className="font-serif text-xl italic font-bold opacity-80 text-white">{trials.filter((trial) => trial.status === 'Approved').length} Approved</span>
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
                className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-border/50 dark:border-slate-800/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer group"
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
        {/* Recent Trial Requests */}
        <Card className="lg:col-span-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-border/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground dark:text-white">Recent Trial Requests</CardTitle>
              <CardDescription className="text-muted-foreground">Latest requests from students</CardDescription>
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
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
                     onClick={() => onPageChange?.('trials')}>
                  <Avatar className="w-10 h-10 border-2 border-border dark:border-slate-700">
                    <AvatarImage src={request.avatar} />
                    <AvatarFallback className="bg-theme-gradient-br text-white text-sm">
                      {request.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground dark:text-white font-medium truncate">{request.name}</p>
                    <p className="text-muted-foreground text-sm">{request.skill}</p>
                  </div>
                  {getStatusBadge(request.status)}
                  <span className="text-xs text-muted-foreground hidden sm:block">{request.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-border/50 dark:border-slate-800/50">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Smart AI Matches
            </CardTitle>
            <CardDescription className="text-muted-foreground">Best freelancers based on your requirement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStudents.map((student, index) => (
                <div key={student.id} className="p-3 rounded-lg bg-accent/50 border border-border dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="w-8 h-8 border border-border dark:border-slate-600">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-foreground dark:text-white text-sm font-medium">{student.name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-muted-foreground">Match score: {student.score}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {student.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{student.reason}</p>
                </div>
              ))}
              {isLoadingRecommendations && (
                <p className="text-sm text-muted-foreground">Running AI filter...</p>
              )}
              {!isLoadingRecommendations && topStudents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Enter your need in the hero search bar and click search to get best freelancer matches.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.75 }}
      >
        <Card className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-border/50 dark:border-slate-800/50">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Client Profile
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your account overview, similar to the student dashboard profile summary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="w-16 h-16 border-2 border-border dark:border-slate-700">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-theme-gradient-br text-white text-lg">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-foreground dark:text-white truncate">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user?.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {user?.location || 'Add location in settings'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                {[
                  { label: 'Open Trials', value: String(activeTrials) },
                  { label: 'Students Engaged', value: String(studentsEngaged) },
                  { label: 'Messages', value: String(unreadMessages) },
                  { label: 'Spent', value: formattedSpent },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-accent/50 border border-border dark:border-slate-700 p-3 text-center">
                    <p className="text-lg font-bold text-foreground dark:text-white">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                <Button className="pro-cta" onClick={() => onPageChange?.('settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Profile
                </Button>
                <Button
                  variant="outline"
                  className="border-border dark:border-slate-700 text-muted-foreground hover:bg-accent"
                  onClick={() => onPageChange?.('messages')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Open Messages
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Card className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-border/50 dark:border-slate-800/50 hover:border-primary/50 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Search, label: 'Find Students', description: 'Search by skills', page: 'browse' as PageType },
              { icon: ClipboardList, label: 'New Trial', description: 'Create request', page: 'browse' as PageType },
              { icon: MessageSquare, label: 'Messages', description: unreadMessages > 0 ? `${unreadMessages} unread` : 'No unread', page: 'messages' as PageType },
              { icon: CreditCard, label: 'Payment Option', description: 'Open UPI gateway', action: onOpenPayment },
            ].map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 bg-accent/50 border-border dark:border-slate-700 hover:bg-accent hover:border-violet-500/50"
                  onClick={() => {
                    if (action.page && onPageChange) onPageChange(action.page);
                    if (action.action) action.action();
                  }}
                >
                  <Icon className="w-6 h-6 text-violet-400" />
                  <div className="text-center">
                    <p className="text-foreground dark:text-white font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
}
