'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, Shield, Save, CreditCard, Mail, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

type NotificationsState = {
  email: boolean;
  push: boolean;
  trialUpdates: boolean;
  messages: boolean;
  payments: boolean;
  marketing: boolean;
};

type PrivacyState = {
  profileVisible: boolean;
  showSkills: boolean;
  showEarnings: boolean;
  allowMessages: boolean;
};

const defaultNotifications: NotificationsState = {
  email: true,
  push: true,
  trialUpdates: true,
  messages: true,
  payments: true,
  marketing: false,
};

const defaultPrivacy: PrivacyState = {
  profileVisible: true,
  showSkills: true,
  showEarnings: false,
  allowMessages: true,
};

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('English (US)');
  const [darkMode, setDarkMode] = useState(false);

  const [notifications, setNotifications] = useState<NotificationsState>(defaultNotifications);
  const [privacy, setPrivacy] = useState<PrivacyState>(defaultPrivacy);

  useEffect(() => {
    setFullName(user?.name || '');
    setPhone(user?.phone || '');
  }, [user?.name, user?.phone]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/settings'), {
          method: 'GET',
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load settings');
        }
        const settings = data.settings || {};
        setTimezone(settings.timezone || 'UTC');
        setLanguage(settings.language || 'English (US)');
        setDarkMode(Boolean(settings.dark_mode));
        setNotifications({ ...defaultNotifications, ...(settings.notifications || {}) });
        setPrivacy({ ...defaultPrivacy, ...(settings.privacy || {}) });
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveAllSettings = async () => {
    setIsSaving(true);
    try {
      const profileRes = await fetch(buildApiUrl('/api/profile'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          name: fullName,
          phone,
          bio: user?.bio || '',
          website: user?.website || '',
          location: user?.location || '',
          avatar: user?.avatar || '',
          skills_summary: (user?.skills || []).join(', '),
        }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(profileData.error || 'Failed to save account details');
      }

      const settingsRes = await fetch(buildApiUrl('/api/settings'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          timezone,
          language,
          dark_mode: darkMode,
          notifications,
          privacy,
        }),
      });
      const settingsData = await settingsRes.json();
      if (!settingsRes.ok) {
        throw new Error(settingsData.error || 'Failed to save settings');
      }

      updateUser({
        name: fullName,
        phone,
        settings: settingsData.settings,
      });
      window.alert('Settings saved successfully.');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div className="space-y-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Settings</h1>
        <p className="text-muted-foreground">Loading settings...</p>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Settings</h1>
          <p className="text-muted-foreground mt-1">Changes are saved to your account.</p>
        </div>
        <Button onClick={saveAllSettings} disabled={isSaving} className="bg-theme-gradient text-white hover:opacity-90">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="bg-card/50 dark:bg-slate-900/50 border border-border dark:border-slate-800 p-1 flex-wrap h-auto">
          <TabsTrigger value="account" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
            <Shield className="w-4 h-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Personal Information</CardTitle>
              <CardDescription className="text-muted-foreground">These values are stored in your profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground dark:text-white font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Saved in settings preferences.</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-violet-400" />
                Email Notifications
              </CardTitle>
              <CardDescription className="text-muted-foreground">Persisted in your account settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['email', 'Email Notifications', 'Receive email updates for important events'],
                ['trialUpdates', 'Trial Updates', 'Get notified about trial request updates'],
                ['messages', 'Messages', 'Receive alerts for new messages'],
                ['payments', 'Payment Alerts', 'Get notified about payment activities'],
                ['marketing', 'Marketing Emails', 'Receive tips and promotional content'],
              ].map(([key, title, description], index) => (
                <React.Fragment key={key}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground dark:text-white font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={Boolean(notifications[key as keyof NotificationsState])}
                      onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [key]: checked }))}
                    />
                  </div>
                  {index < 4 && <Separator className="bg-border dark:bg-slate-800" />}
                </React.Fragment>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-violet-400" />
                Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground dark:text-white font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Enable push notifications on supported devices.</p>
                </div>
                <Switch checked={notifications.push} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, push: checked }))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Profile Visibility</CardTitle>
              <CardDescription className="text-muted-foreground">Saved to your privacy settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['profileVisible', 'Public Profile', 'Allow others to view your profile'],
                ['showSkills', 'Show Skills', 'Display your validated skills on your profile'],
                ['showEarnings', 'Show Earnings', 'Display your earnings on your profile'],
                ['allowMessages', 'Allow Direct Messages', 'Let others send you direct messages'],
              ].map(([key, title, description], index) => (
                <React.Fragment key={key}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground dark:text-white font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={Boolean(privacy[key as keyof PrivacyState])}
                      onCheckedChange={(checked) => setPrivacy((prev) => ({ ...prev, [key]: checked }))}
                    />
                  </div>
                  {index < 3 && <Separator className="bg-border dark:bg-slate-800" />}
                </React.Fragment>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Billing</CardTitle>
              <CardDescription className="text-muted-foreground">Billing UI placeholder.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50 border border-border dark:border-slate-700">
                <div>
                  <p className="text-foreground dark:text-white font-medium">Default Payment Method</p>
                  <p className="text-xs text-muted-foreground">Add billing support when payment setup is complete.</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400">Placeholder</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
