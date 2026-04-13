'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
  MoreVertical,
  Eye,
  FileText,
  ArrowRight,
  Briefcase,
  CircleDashed,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

interface TrialRequest {
  id: number;
  studentName: string;
  studentAvatar: string;
  companyName: string;
  skill: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  date: string;
  duration: string;
  budget: number;
  description: string;
}

const statusOrder: TrialRequest['status'][] = ['pending', 'accepted', 'in_progress', 'completed', 'rejected'];

const statusMeta = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    sectionClass: 'border-amber-500/20',
    icon: Clock,
    description: 'Waiting for review or response',
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    sectionClass: 'border-blue-500/20',
    icon: CheckCircle2,
    description: 'Approved and ready to start',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    sectionClass: 'border-violet-500/20',
    icon: ArrowRight,
    description: 'Currently active work',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    sectionClass: 'border-emerald-500/20',
    icon: CheckCircle2,
    description: 'Finished requests',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    sectionClass: 'border-red-500/20',
    icon: XCircle,
    description: 'Declined requests',
  },
};

function TrialRequestCard({
  request,
  role,
  getInitials,
  getStatusBadge,
  onAccept,
  onDecline,
  isUpdating,
}: {
  request: TrialRequest;
  role?: string;
  getInitials: (name: string) => string;
  getStatusBadge: (status: TrialRequest['status']) => React.ReactNode;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  isUpdating: boolean;
}) {
  const isClientView = role === 'client';

  return (
    <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 hover:border-primary/40 transition-colors">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="w-12 h-12 border-2 border-border dark:border-slate-700">
                <AvatarImage src={request.studentAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                  {isClientView ? getInitials(request.studentName) : request.companyName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-foreground dark:text-white truncate">
                  {isClientView ? request.studentName : request.companyName}
                </p>
                <p className="text-sm text-violet-400">
                  {isClientView ? `Requested for ${request.skill}` : `Requested skill: ${request.skill}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(request.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border-border dark:border-slate-700">
                  <DropdownMenuItem className="text-popover-foreground focus:bg-accent">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-popover-foreground focus:bg-accent">
                    <FileText className="w-4 h-4 mr-2" />
                    View Proposal
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-popover-foreground focus:bg-accent">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {isClientView
              ? `You requested this student for: ${request.description}`
              : `${request.companyName} requested you for: ${request.description}`}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-accent/40 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isClientView ? 'Request Sent' : 'Request Received'}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-foreground dark:text-white">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {request.date}
              </p>
            </div>
            <div className="rounded-lg bg-accent/40 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isClientView ? 'Engagement Stage' : 'Work Stage'}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-foreground dark:text-white">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {request.duration}
              </p>
            </div>
            <div className="rounded-lg bg-accent/40 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isClientView ? 'Planned Budget' : 'Expected Budget'}
              </p>
              <p className="mt-1 font-semibold text-emerald-400">${request.budget.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isClientView && request.status === 'pending' && (
              <>
                <Button size="sm" variant="outline" className="border-border dark:border-slate-700">
                  <Eye className="w-4 h-4 mr-1" />
                  Track Request
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  onClick={() => onDecline(request.id)}
                  disabled={isUpdating}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {isUpdating ? 'Cancelling...' : 'Cancel Request'}
                </Button>
              </>
            )}
            {!isClientView && request.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onAccept(request.id)}
                  disabled={isUpdating}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {isUpdating ? 'Accepting...' : 'Accept Request'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  onClick={() => onDecline(request.id)}
                  disabled={isUpdating}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {isUpdating ? 'Declining...' : 'Decline Request'}
                </Button>
              </>
            )}
            {(request.status === 'accepted' || request.status === 'in_progress') && (
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                <MessageSquare className="w-4 h-4 mr-1" />
                {isClientView ? 'Message Student' : 'Message Client'}
              </Button>
            )}
            {request.status === 'completed' && (
              <Button size="sm" variant="outline" className="border-border dark:border-slate-700">
                <Eye className="w-4 h-4 mr-1" />
                {isClientView ? 'Review Delivery' : 'Review Outcome'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
      <CardContent className="p-8 text-center">
        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No {label.toLowerCase()} requests found</p>
      </CardContent>
    </Card>
  );
}

export default function TrialRequests() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTrialId, setUpdatingTrialId] = useState<number | null>(null);

  const refreshTrials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/trials'), {
        headers: createAuthHeaders(false),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load trial requests');
      }

      const normalized: TrialRequest[] = (data.trials || []).map((trial: any) => ({
        id: trial.id,
        studentName: trial.student_name || 'Student',
        studentAvatar: trial.student_avatar || '',
        companyName: trial.client_name || 'Client',
        skill: trial.student_skills_summary
          ? String(trial.student_skills_summary).split(',')[0].trim()
          : 'Trial Request',
        status:
          trial.status === 'Pending'
            ? 'pending'
            : trial.status === 'In Progress'
              ? 'in_progress'
              : trial.status === 'Submitted'
                ? 'accepted'
                : 'completed',
        date: new Date(trial.updated_at || trial.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        duration: 'Active engagement',
        budget: 0,
        description: trial.task_description || 'No description provided.',
      }));

      setRequests(normalized);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTrials();
    window.addEventListener('xskill:trial-created', refreshTrials);
    return () => {
      window.removeEventListener('xskill:trial-created', refreshTrials);
    };
  }, []);

  const handleAccept = async (trialId: number) => {
    setUpdatingTrialId(trialId);
    try {
      const res = await fetch(buildApiUrl(`/api/trials/${trialId}/status`), {
        method: 'PATCH',
        headers: createAuthHeaders(),
        body: JSON.stringify({ status: 'Submitted' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept trial request');
      }
      await refreshTrials();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to accept trial request');
    } finally {
      setUpdatingTrialId(null);
    }
  };

  const handleDecline = async (trialId: number) => {
    setUpdatingTrialId(trialId);
    try {
      const res = await fetch(buildApiUrl(`/api/trials/${trialId}`), {
        method: 'DELETE',
        headers: createAuthHeaders(false),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to decline trial request');
      }
      await refreshTrials();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to decline trial request');
    } finally {
      setUpdatingTrialId(null);
    }
  };

  const groupedRequests = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        requests: requests.filter((request) => request.status === status),
      })),
    [requests]
  );

  const filteredRequests = requests.filter((request) => {
    if (activeTab === 'all') return true;
    return request.status === activeTab;
  });

  const getStatusBadge = (status: TrialRequest['status']) => {
    const config = statusMeta[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} gap-1`} variant="outline">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  const stats = [
    {
      label: user?.role === 'client' ? 'Requests Sent' : 'Requests Received',
      value: requests.length,
      icon: ClipboardList,
      tone: 'text-foreground dark:text-white'
    },
    {
      label: user?.role === 'client' ? 'Awaiting Student' : 'Need Review',
      value: requests.filter((request) => request.status === 'pending').length,
      icon: Clock,
      tone: 'text-amber-400'
    },
    {
      label: user?.role === 'client' ? 'Active With Students' : 'Work In Progress',
      value: requests.filter((request) => request.status === 'in_progress' || request.status === 'accepted').length,
      icon: ArrowRight,
      tone: 'text-violet-400'
    },
    {
      label: user?.role === 'client' ? 'Completed Deliveries' : 'Completed Trials',
      value: requests.filter((request) => request.status === 'completed').length,
      icon: CheckCircle2,
      tone: 'text-emerald-400'
    },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Trial Requests</h1>
        <p className="text-muted-foreground mt-1">
          {user?.role === 'student'
            ? 'Student view: track incoming client requests, review what needs attention, and monitor active trial work.'
            : 'Client view: track the students you requested, follow request status, and monitor active trial delivery.'}
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={refreshTrials}
          disabled={isLoading}
          className="border-border dark:border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-accent/60 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading real trial requests...</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/50 dark:bg-slate-900/50 border border-border dark:border-slate-800 p-1 h-auto flex-wrap">
          <TabsTrigger value="all" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-muted-foreground">
            All Requests
          </TabsTrigger>
          {statusOrder.map((status) => (
            <TabsTrigger
              key={status}
              value={status}
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-muted-foreground"
            >
              {statusMeta[status].label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-0">
          {groupedRequests.map(({ status, requests: statusRequests }) => {
            const meta = statusMeta[status];
            const Icon = meta.icon;

            return (
              <section key={status} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground dark:text-white">{meta.label}</h2>
                        <p className="text-sm text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={meta.color}>
                    {statusRequests.length} request{statusRequests.length === 1 ? '' : 's'}
                  </Badge>
                </div>

                {statusRequests.length === 0 ? (
                  <EmptyState label={meta.label} />
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {statusRequests.map((request, index) => (
                      <motion.div
                        key={`${status}-${request.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                      >
                        <TrialRequestCard
                          request={request}
                          role={user?.role}
                          getInitials={getInitials}
                          getStatusBadge={getStatusBadge}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                          isUpdating={updatingTrialId === request.id}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </TabsContent>

        {statusOrder.map((status) => (
          <TabsContent key={status} value={status} className="space-y-4 mt-0">
            <Card className={`bg-card/50 dark:bg-slate-900/50 border ${statusMeta[status].sectionClass}`}>
              <CardHeader>
                <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
                  <CircleDashed className="w-5 h-5 text-muted-foreground" />
                  {statusMeta[status].label} Requests
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {statusMeta[status].description}
                </CardDescription>
              </CardHeader>
            </Card>

            {filteredRequests.length === 0 ? (
              <EmptyState label={statusMeta[status].label} />
            ) : (
              filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                >
                  <TrialRequestCard
                    request={request}
                    role={user?.role}
                    getInitials={getInitials}
                    getStatusBadge={getStatusBadge}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    isUpdating={updatingTrialId === request.id}
                  />
                </motion.div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
      )}
    </motion.div>
  );
}
