'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Link as LinkIcon, 
  Camera,
  Save,
  Briefcase,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    website: user?.website || '',
    bio: user?.bio || '',
  });

  useEffect(() => {
    setAvatarPreview(user?.avatar);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      location: user?.location || '',
      website: user?.website || '',
      bio: user?.bio || '',
    });
  }, [user]);

  const skills = user?.skills || [];
  
  const skillLevels: Record<string, { level: string; color: string }> = {
    'React': { level: 'Expert', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    'TypeScript': { level: 'Expert', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    'Node.js': { level: 'Advanced', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'UI Design': { level: 'Intermediate', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    'Python': { level: 'Advanced', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'PostgreSQL': { level: 'Intermediate', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const res = await fetch(buildApiUrl('/api/profile'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          name: formData.name,
          avatar: avatarPreview,
          bio: formData.bio,
          phone: formData.phone,
          website: formData.website,
          location: formData.location,
          skills_summary: skills.join(', '),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      updateUser({
        name: formData.name,
        bio: formData.bio,
        avatar: avatarPreview,
        phone: formData.phone,
        website: formData.website,
        location: formData.location,
      });
      setIsEditing(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and skills</p>
      </div>

      {/* Profile Header Card */}
      <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-border dark:border-slate-700">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-theme-gradient-br text-white text-2xl">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                className="absolute bottom-0 right-0 rounded-full w-8 h-8 bg-theme-gradient hover:opacity-90 text-white"
                onClick={handleAvatarClick}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold text-foreground dark:text-white">{user?.name}</h2>
              <p className="text-muted-foreground capitalize">{user?.role}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {user?.location || 'Add location'}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {skills.length} Skills
                </span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="border-border dark:border-slate-700 text-foreground dark:text-slate-300 hover:bg-accent"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card className="lg:col-span-2 bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-muted-foreground">Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground dark:text-slate-300">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground dark:text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground dark:text-slate-300">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-foreground dark:text-slate-300">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!isEditing}
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white disabled:opacity-50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website" className="text-foreground dark:text-slate-300">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  disabled={!isEditing}
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white disabled:opacity-50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio" className="text-foreground dark:text-slate-300">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!isEditing}
                  rows={4}
                  className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white disabled:opacity-50 resize-none"
                />
              </div>
            </div>
            {isEditing && (
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-theme-gradient hover:opacity-90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Skills Section */}
        <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-violet-400" />
                Skills
              </span>
              {user?.role === 'student' && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground">Your validated skills</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => {
                const skillInfo = skillLevels[skill] || { level: 'Beginner', color: 'bg-secondary text-muted-foreground border-border' };
                return (
                  <div key={skill} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-accent/50 border border-border dark:border-slate-700 min-w-[80px]">
                    <span className="text-foreground dark:text-white text-sm font-medium">{skill}</span>
                    <Badge variant="outline" className={`text-xs ${skillInfo.color}`}>
                      {skillInfo.level}
                    </Badge>
                  </div>
                );
              })}
              {skills.length === 0 && (
                <p className="text-sm text-muted-foreground">No skills added yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats for Students */}
      {user?.role === 'student' && (
        <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">Performance Stats</CardTitle>
            <CardDescription className="text-muted-foreground">Your skill validation metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Skills Added', value: String(skills.length), icon: Briefcase },
                { label: 'Trials Completed', value: '-', icon: User },
                { label: 'Success Rate', value: '-', icon: User },
                { label: 'Avg Rating', value: '-', icon: User },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="p-4 rounded-lg bg-accent/50 border border-border dark:border-slate-700 text-center">
                    <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground dark:text-white">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
