'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Briefcase,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  MoreVertical,
  Award,
  TrendingUp,
  FileText,
  ArrowUpDown,
  Trash2,
  IndianRupee,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';
import { SkillRecord } from './AuthContext';

type SkillStatus = 'validated' | 'pending' | 'in_progress';
type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface Skill {
  id: number;
  name: string;
  category: string;
  level: SkillLevel;
  status: SkillStatus;
  progress: number;
  endorsements: number;
  lastAssessment?: string;
  bestScore?: number | null;
  hasCertificate?: boolean;
  price?: number | null;
}

interface AssessmentResource {
  title: string;
  embedUrl: string;
}

function normalizeLevel(level?: string): SkillLevel {
  const value = (level || '').toLowerCase();
  if (value === 'expert' || value === 'advanced' || value === 'intermediate') {
    return value;
  }
  return 'beginner';
}

function formatCategory(category?: string) {
  if (!category) return 'General';
  return category
    .split(/[_\s-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function mergeSkills(records: SkillRecord[] | undefined) {
  return (records || []).map((record) => {
    const status =
      record.validation_status === 'validated' || record.validation_status === 'in_progress'
        ? record.validation_status
        : 'pending';
    const bestScore = typeof record.best_test_score === 'number' ? record.best_test_score : null;
    const progress = status === 'validated'
      ? 100
      : Math.max(0, Math.min(99, Number(record.progress ?? bestScore ?? record.test_score ?? 0)));

    return {
      id: Number(record.id),
      name: record.skill_name,
      category: formatCategory(record.category),
      level: normalizeLevel(record.level),
      status,
      progress: status === 'pending' && Number(record.test_attempts || 0) > 0 ? Math.max(progress, 15) : progress,
      endorsements: 0,
      lastAssessment: record.last_tested_at || undefined,
      bestScore,
      hasCertificate: Boolean(record.has_certificate),
      price: record.skill_price ?? null,
    };
  });
}

const assessmentResources: Record<string, AssessmentResource[]> = {
  react: [
    { title: 'React Crash Course', embedUrl: 'https://www.youtube.com/embed/w7ejDZ8SWv8' },
    { title: 'React Hooks Tutorial', embedUrl: 'https://www.youtube.com/embed/TNhaISOUy6Q' },
  ],
  typescript: [
    { title: 'TypeScript for Beginners', embedUrl: 'https://www.youtube.com/embed/30LWjhZzg50' },
    { title: 'TypeScript Full Course', embedUrl: 'https://www.youtube.com/embed/BwuLxPH8IDs' },
  ],
  'node.js': [
    { title: 'Node.js Tutorial', embedUrl: 'https://www.youtube.com/embed/TlB_eWDSMt4' },
    { title: 'Build REST API with Node', embedUrl: 'https://www.youtube.com/embed/l8WPWK9mS5M' },
  ],
  python: [
    { title: 'Python Full Course', embedUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc' },
    { title: 'Python Projects', embedUrl: 'https://www.youtube.com/embed/rfscVS0vtbw' },
  ],
  'ui design': [
    { title: 'UI Design Basics', embedUrl: 'https://www.youtube.com/embed/c9Wg6Cb_YlU' },
    { title: 'Figma UI Tutorial', embedUrl: 'https://www.youtube.com/embed/jwCmIBJ8Jtc' },
  ],
  postgresql: [
    { title: 'PostgreSQL Tutorial', embedUrl: 'https://www.youtube.com/embed/qw--VYLpxG4' },
    { title: 'SQL for Beginners', embedUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY' },
  ],
  docker: [
    { title: 'Docker Crash Course', embedUrl: 'https://www.youtube.com/embed/fqMOX6JJhGo' },
    { title: 'Docker in 100 Seconds', embedUrl: 'https://www.youtube.com/embed/Gjnup-PuquQ' },
  ],
  graphql: [
    { title: 'GraphQL Full Course', embedUrl: 'https://www.youtube.com/embed/ed8SzALpx1Q' },
    { title: 'GraphQL Basics', embedUrl: 'https://www.youtube.com/embed/5199E50O7SI' },
  ],
};

export default function SkillsManagement() {
  const { updateUser, user } = useAuth();
  const [skillsData, setSkillsData] = useState(() => mergeSkills(user?.skill_records));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [assessmentSkill, setAssessmentSkill] = useState<Skill | null>(null);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', category: '', level: 'beginner', price: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingSkillId, setRemovingSkillId] = useState<number | null>(null);
  const [updatingPriceSkillId, setUpdatingPriceSkillId] = useState<number | null>(null);

  useEffect(() => {
    setSkillsData(mergeSkills(user?.skill_records));
  }, [user?.skill_records]);

  const syncUserSkills = (records: SkillRecord[]) => {
    updateUser({
      skills: records.map(skill => skill.skill_name),
      skill_records: records,
    });
  };

  const handleAddSkill = async () => {
    if (!newSkill.name || !newSkill.category) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(buildApiUrl('/api/skills'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          skill_name: newSkill.name,
          category: newSkill.category,
          level: newSkill.level,
          skill_price: newSkill.price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add skill');
      }

      const nextSkillRecord: SkillRecord = {
        id: data.id || Date.now(),
        skill_name: newSkill.name,
        category: newSkill.category,
        level: newSkill.level,
        skill_price: newSkill.price ? Number(newSkill.price) : null,
      };

      const nextRecords = [nextSkillRecord, ...(user?.skill_records || [])];
      syncUserSkills(nextRecords);
      setNewSkill({ name: '', category: '', level: 'beginner', price: '' });
      setIsAddDialogOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to add skill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSkill = async (skillId: number) => {
    const targetSkill = skillsData.find(skill => skill.id === skillId);
    if (!targetSkill) return;

    setRemovingSkillId(skillId);

    try {
      const res = await fetch(buildApiUrl(`/api/skills/${skillId}`), {
        method: 'DELETE',
        headers: createAuthHeaders(false),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove skill');
      }

      const nextRecords = (user?.skill_records || []).filter(skill => Number(skill.id) !== skillId);
      syncUserSkills(nextRecords);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to remove skill');
    } finally {
      setRemovingSkillId(null);
    }
  };

  const handleRequestAssessment = (skillId: number) => {
    const selected = skillsData.find(skill => skill.id === skillId) || null;
    setAssessmentSkill(selected);
    setIsAssessmentOpen(true);
  };

  const handleUpdateSkillPrice = async (skillId: number) => {
    const targetSkill = skillsData.find(skill => skill.id === skillId);
    if (!targetSkill) return;

    const currentValue = targetSkill.price != null ? String(targetSkill.price) : '';
    const input = window.prompt(`Enter price for ${targetSkill.name} (INR). Leave empty to clear:`, currentValue);
    if (input === null) return;

    const trimmed = input.trim();
    let nextPrice: number | null = null;
    if (trimmed) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        window.alert('Please enter a valid non-negative price.');
        return;
      }
      nextPrice = Number(parsed.toFixed(2));
    }

    setUpdatingPriceSkillId(skillId);
    try {
      const res = await fetch(buildApiUrl(`/api/skills/${skillId}/price`), {
        method: 'PUT',
        headers: createAuthHeaders(),
        body: JSON.stringify({ skill_price: nextPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update skill price');
      }

      const updatedSkill = data.skill;
      const nextRecords = (user?.skill_records || []).map(record =>
        Number(record.id) === skillId ? { ...record, ...updatedSkill } : record
      );
      syncUserSkills(nextRecords);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to update skill price');
    } finally {
      setUpdatingPriceSkillId(null);
    }
  };

  const currentAssessmentResources = assessmentResources[(assessmentSkill?.name || '').toLowerCase()] || [
    { title: `${assessmentSkill?.name || 'Skill'} Assessment Guide`, embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  ];

  const filteredSkills = useMemo(() => {
    const filtered = skillsData.filter(skill => {
      const matchesSearch =
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || skill.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'level-desc': {
          const weight = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
          return weight[b.level] - weight[a.level];
        }
        case 'status':
          return a.status.localeCompare(b.status);
        case 'newest':
        default:
          return b.id - a.id;
      }
    });

    return sorted;
  }, [searchQuery, skillsData, sortBy, statusFilter]);

  const getStatusBadge = (status: SkillStatus) => {
    switch (status) {
      case 'validated':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Validated
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 gap-1">
            <AlertCircle className="w-3 h-3" />
            In Progress
          </Badge>
        );
    }
  };

  const getLevelColor = (level: SkillLevel) => {
    switch (level) {
      case 'expert':
        return 'text-emerald-400';
      case 'advanced':
        return 'text-blue-400';
      case 'intermediate':
        return 'text-violet-400';
      case 'beginner':
        return 'text-slate-400';
    }
  };

  const stats = [
    { label: 'Total Skills', value: skillsData.length, icon: Briefcase },
    { label: 'Validated', value: skillsData.filter(s => s.status === 'validated').length, icon: CheckCircle2 },
    { label: 'In Progress', value: skillsData.filter(s => s.status === 'in_progress').length, icon: TrendingUp },
    { label: 'Total Endorsements', value: skillsData.reduce((acc, s) => acc + s.endorsements, 0), icon: Star },
  ];

  return (
    <motion.div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">My Skills</h1>
          <p className="text-muted-foreground mt-1">Manage and validate your professional skills</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-theme-gradient hover:opacity-90 text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add New Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white">
            <DialogHeader>
              <DialogTitle>Add New Skill</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add a new skill to your profile for validation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="skill-name" className="text-foreground dark:text-slate-300">Skill Name</Label>
                <Input
                  id="skill-name"
                  placeholder="e.g., JavaScript, Figma, AWS"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground dark:text-slate-300">Category</Label>
                <Select value={newSkill.category} onValueChange={(v) => setNewSkill({ ...newSkill, category: v })}>
                  <SelectTrigger className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border dark:border-slate-700">
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="devops">DevOps</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level" className="text-foreground dark:text-slate-300">Current Level</Label>
                <Select value={newSkill.level} onValueChange={(v) => setNewSkill({ ...newSkill, level: v })}>
                  <SelectTrigger className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border dark:border-slate-700">
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-price" className="text-foreground dark:text-slate-300">Skill Price (INR)</Label>
                <Input
                  id="skill-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={newSkill.price}
                  onChange={(e) => setNewSkill({ ...newSkill, price: e.target.value })}
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border dark:border-slate-700 text-muted-foreground">
                Cancel
              </Button>
              <Button onClick={handleAddSkill} className="pro-cta" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Skill'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="pro-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground dark:text-white">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="pro-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'validated', 'in_progress', 'pending'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={statusFilter === status
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'border-border dark:border-slate-700 text-muted-foreground hover:bg-accent'
                  }
                >
                  {status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <div className="w-full md:w-52">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sort skills" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border dark:border-slate-700">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="level-desc">Highest Level</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill, index) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="pro-card pro-card-hover cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-foreground dark:text-white text-lg">{skill.name}</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">{skill.category}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border-border dark:border-slate-700">
                      <DropdownMenuItem
                        className="text-popover-foreground focus:bg-accent"
                        onClick={() => {
                          setSelectedSkill(skill);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-popover-foreground focus:bg-accent"
                        onClick={() => handleRequestAssessment(skill.id)}
                      >
                        <Award className="w-4 h-4 mr-2" />
                        Request Assessment
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-popover-foreground focus:bg-accent"
                        onClick={() => handleUpdateSkillPrice(skill.id)}
                        disabled={updatingPriceSkillId === skill.id}
                      >
                        <IndianRupee className="w-4 h-4 mr-2" />
                        {updatingPriceSkillId === skill.id ? 'Updating Price...' : 'Update Price'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500 focus:bg-accent"
                        onClick={() => handleRemoveSkill(skill.id)}
                        disabled={removingSkillId === skill.id}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {removingSkillId === skill.id ? 'Removing...' : 'Remove Skill'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  {getStatusBadge(skill.status)}
                  <span className={`text-sm font-medium capitalize ${getLevelColor(skill.level)}`}>
                    {skill.level}
                  </span>
                </div>

                {skill.status !== 'validated' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{skill.progress}%</span>
                    </div>
                    <Progress value={skill.progress} className="h-2 bg-secondary" />
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span>{skill.endorsements} endorsements</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {skill.price != null ? `INR ${Number(skill.price).toLocaleString('en-IN')}` : 'Price not set'}
                  </span>
                  {skill.lastAssessment && (
                    <span className="text-xs text-muted-foreground">
                      Last: {skill.lastAssessment}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <Card className="pro-card">
          <CardContent className="p-8 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No skills found matching your criteria</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white">
          <DialogHeader>
            <DialogTitle>{selectedSkill?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Skill details and validation state
            </DialogDescription>
          </DialogHeader>
          {selectedSkill && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <span>{selectedSkill.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Level</span>
                <span className="capitalize">{selectedSkill.level}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(selectedSkill.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Endorsements</span>
                <span>{selectedSkill.endorsements}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Assessment Progress</span>
                  <span>{selectedSkill.progress}%</span>
                </div>
                <Progress value={selectedSkill.progress} className="h-2 bg-secondary" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>{assessmentSkill?.name} Assessment Resources</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review these videos before taking or requesting validation for this skill.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2">
            {currentAssessmentResources.map((resource) => (
              <div key={resource.title} className="space-y-2">
                <p className="text-sm font-medium text-foreground dark:text-white">{resource.title}</p>
                <div className="overflow-hidden rounded-xl border border-border dark:border-slate-700 bg-black aspect-video">
                  <iframe
                    className="w-full h-full"
                    src={resource.embedUrl}
                    title={resource.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
