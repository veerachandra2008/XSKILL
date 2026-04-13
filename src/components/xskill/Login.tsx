'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, UserRole } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  Briefcase,
  ShieldAlert,
  Loader2,
  Sparkles,
  User as UserIcon,
  Lightbulb,
  Coins,
} from 'lucide-react';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

export default function Login() {
  const { login, signup } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const isDark = resolvedTheme !== 'light';
    let animationFrame = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    type Star = {
      x: number;
      y: number;
      length: number;
      speed: number;
      size: number;
      opacity: number;
      glow: number;
    };

    const stars: Star[] = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.8,
      length: 110 + Math.random() * 180,
      speed: 4.5 + Math.random() * 4.5,
      size: 1.2 + Math.random() * 1.8,
      opacity: 0.35 + Math.random() * 0.45,
      glow: 8 + Math.random() * 18,
    }));

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        context.beginPath();
        const gradient = context.createLinearGradient(star.x, star.y, star.x - star.length, star.y + star.length * 0.45);
        gradient.addColorStop(0, isDark ? `rgba(255,255,255,${star.opacity})` : `rgba(79,70,229,${star.opacity})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.strokeStyle = gradient;
        context.lineWidth = star.size;
        context.shadowBlur = star.glow;
        context.shadowColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(79,70,229,0.45)';
        context.moveTo(star.x, star.y);
        context.lineTo(star.x - star.length, star.y + star.length * 0.45);
        context.stroke();
        context.shadowBlur = 0;

        context.beginPath();
        context.fillStyle = isDark ? `rgba(255,255,255,${Math.min(1, star.opacity + 0.2)})` : `rgba(99,102,241,${Math.min(1, star.opacity + 0.2)})`;
        context.arc(star.x, star.y, star.size * 1.1, 0, Math.PI * 2);
        context.fill();

        star.x += star.speed;
        star.y -= star.speed * 0.35;

        if (star.x - star.length > canvas.width || star.y < -50) {
          star.x = -20;
          star.y = canvas.height * (0.25 + Math.random() * 0.65);
          star.length = 110 + Math.random() * 180;
          star.speed = 4.5 + Math.random() * 4.5;
          star.opacity = 0.35 + Math.random() * 0.45;
          star.glow = 8 + Math.random() * 18;
        }
      });

      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [resolvedTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    let success;
    if (isSignUp) {
      success = await signup(name, email, password, role);
      if (success) {
        setIsSignUp(false);
        setSuccessMessage('Account created successfully! Please sign in.');
        setIsLoading(false);
        return;
      }
    } else {
      success = await login(email, password, role);
    }
    
    if (!success) {
      setError('Invalid credentials. Please try again.');
    }
    setIsLoading(false);
  };

  const isDark = resolvedTheme !== 'light';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4 transition-colors duration-500">
      {/* Dynamic Background Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.2),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.92),_rgba(238,246,255,0.94),_rgba(244,241,255,0.95))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_28%),linear-gradient(135deg,_rgba(10,14,30,1),_rgba(18,25,49,1),_rgba(18,28,56,1))]" />
      <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-primary/15 blur-[120px] animate-pulse-glow" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-theme-gradient-br opacity-20 blur-[120px] animate-pulse-glow" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 opacity-90" />

      {/* Theme Toggle */}
      <div className="absolute right-4 top-4 z-50">
        <ModeToggle />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.02fr_0.98fr] xl:gap-10">
        <Card className="order-2 animate-float border border-white/30 bg-white/80 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.4)] backdrop-blur-2xl transition-colors duration-500 dark:border-white/10 dark:bg-slate-950/55 lg:order-2">
          <CardHeader className="space-y-1 pb-4">
            <div className="mb-4 text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${
                  isDark
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/25'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-500/25'
                }`}>
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <span className="text-3xl font-bold text-foreground">XSkill</span>
              </div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Student Skill Validation & Earning Platform
              </p>
            </div>
            <CardTitle className="text-center text-2xl text-foreground lg:text-left">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground lg:text-left">
              {isSignUp ? 'Enter your details to get started' : 'Sign in to access your dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Tabs
              value={role}
              onValueChange={(v) => {
                setRole(v as UserRole);
                if (v === 'admin') setIsSignUp(false);
              }}
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/50 p-1">
                <TabsTrigger
                  value="student"
                  className="rounded-lg text-slate-700 transition-all data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-300 dark:data-[state=active]:bg-theme-gradient dark:data-[state=active]:text-primary-foreground"
                >
                  <GraduationCap className="h-4 w-4 md:mr-2" />
                  <span className="ml-2 inline">Student</span>
                </TabsTrigger>
                <TabsTrigger
                  value="client"
                  className="rounded-lg text-slate-700 transition-all data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-300 dark:data-[state=active]:bg-theme-gradient dark:data-[state=active]:text-primary-foreground"
                >
                  <Briefcase className="h-4 w-4 md:mr-2" />
                  <span className="ml-2 inline">Client</span>
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="rounded-lg text-slate-700 transition-all data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-300 dark:data-[state=active]:bg-theme-gradient dark:data-[state=active]:text-primary-foreground"
                >
                  <ShieldAlert className="h-4 w-4 md:mr-2" />
                  <span className="ml-2 inline">Admin</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className={isDark ? 'text-slate-300' : 'text-slate-700'}>Full Name</Label>
                  <div className="relative">
                    <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`pl-9 ${
                        isDark
                          ? 'border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20'
                          : 'border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
                      }`}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className={isDark ? 'text-slate-300' : 'text-slate-700'}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={role === 'student' ? 'student@xskill.com' : 'client@xskill.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${
                    isDark
                      ? 'border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20'
                      : 'border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className={isDark ? 'text-slate-300' : 'text-slate-700'}>Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${
                    isDark
                      ? 'border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20'
                      : 'border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  required
                />
              </div>

              {error && (
                <p className="text-center text-sm text-red-400">{error}</p>
              )}
              {successMessage && (
                <p className="text-center text-sm text-green-400">{successMessage}</p>
              )}

              <Button
                type="submit"
                className="w-full rounded-xl bg-slate-950 py-6 text-lg font-semibold text-white hover:bg-slate-800 dark:bg-gradient-to-r dark:from-violet-600 dark:to-indigo-600 dark:hover:from-violet-700 dark:hover:to-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  isSignUp ? 'Sign Up' : 'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-0">
            <div className="text-center">
              {role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className={`text-sm hover:underline ${isDark ? 'text-violet-400' : 'text-blue-700'}`}
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              )}
            </div>
            <div className="text-center text-sm text-slate-500">
              Demo: Enter any email and password to login
            </div>
          </CardFooter>
        </Card>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative order-1 hidden min-h-[660px] overflow-hidden rounded-[32px] border border-white/15 bg-[radial-gradient(circle_at_bottom_left,_rgba(255,125,87,0.35),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.32),_transparent_30%),linear-gradient(135deg,_#1a1238_0%,_#12162f_42%,_#141d3b_70%,_#101f36_100%)] p-8 text-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.9)] dark:border-white/15 lg:order-1 lg:block"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.06),_transparent_18%,_transparent_82%,_rgba(255,255,255,0.06))]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="max-w-md">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
                Talent Access
              </p>
              <h2 className="text-5xl font-extrabold leading-[0.95] tracking-tight text-white xl:text-6xl">
                Your Future, Forged.
              </h2>
              <p className="mt-5 max-w-sm text-lg leading-8 text-white/78 xl:text-xl">
                Log in to connect with top student talent or find your next project with a verified profile.
              </p>
            </div>

            <div className="mx-auto mt-6 flex w-full max-w-[420px] flex-1 flex-col items-center justify-center">
              <div className="relative flex h-[360px] w-full items-center justify-center">
                <div className="absolute h-[280px] w-[280px] rounded-full bg-gradient-to-br from-cyan-300/22 via-violet-300/24 to-orange-300/18 blur-3xl" />

                <div className="absolute left-4 top-6 rounded-3xl border border-white/20 bg-white/12 p-3 shadow-2xl backdrop-blur-md">
                  <GraduationCap className="h-10 w-10 text-violet-100" />
                </div>
                <div className="absolute right-5 bottom-8 rounded-3xl border border-white/20 bg-white/12 p-3 shadow-2xl backdrop-blur-md">
                  <Coins className="h-10 w-10 text-orange-200" />
                </div>

                <div className="relative flex h-[250px] w-[250px] items-center justify-center rounded-[34px] border border-white/15 bg-white/10 p-3 shadow-[0_30px_80px_-30px_rgba(167,139,250,0.7)] backdrop-blur-md">
                  <div className="absolute inset-4 rounded-[26px] bg-gradient-to-br from-violet-300/20 via-cyan-300/14 to-orange-300/14" />

                  <div className="relative h-full w-full overflow-hidden rounded-[26px] border border-white/20 shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80"
                      alt="Students collaborating"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/18 via-transparent to-white/6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
