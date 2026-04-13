'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Code2,
  MessageSquareQuote,
  PenTool,
  Sparkles,
  Star,
  Video,
} from 'lucide-react';
import { ModeToggle } from '@/components/ui/mode-toggle';

const skills = [
  {
    title: 'Graphic Design',
    description: 'Brand kits, posters, social creatives, and presentation decks from verified students.',
    icon: PenTool,
    accent: 'from-cyan-400/40 to-violet-500/40',
  },
  {
    title: 'Coding',
    description: 'Frontend, backend, and full-stack talent ready to take on real client projects.',
    icon: Code2,
    accent: 'from-sky-400/40 to-indigo-500/40',
  },
  {
    title: 'Copywriting',
    description: 'Clear product copy, social captions, and campaign writing with strong research depth.',
    icon: MessageSquareQuote,
    accent: 'from-orange-300/40 to-pink-500/40',
  },
  {
    title: 'Video Editing',
    description: 'Short-form reels, explainers, and polished edits for content teams and brands.',
    icon: Video,
    accent: 'from-rose-300/40 to-indigo-500/40',
  },
];

const reviews = [
  {
    name: 'Aarav Menon',
    role: 'Startup Founder',
    quote: 'We hired a student developer through XSkill and shipped our landing page in three days.',
    rating: 5,
    company: 'NovaStack',
    accent: 'from-cyan-400/30 to-violet-500/30',
  },
  {
    name: 'Nitya Rao',
    role: 'Design Lead',
    quote: 'The quality felt far above intern level. The review and skill-test flow made hiring easy.',
    rating: 5,
    company: 'Frame Theory',
    accent: 'from-orange-300/30 to-rose-400/30',
  },
  {
    name: 'Rahul Verma',
    role: 'CS Student',
    quote: 'The platform helped me prove my skills, get client trust, and earn from real work quickly.',
    rating: 5,
    company: 'Student Seller',
    accent: 'from-sky-400/30 to-indigo-500/30',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,125,87,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.2),_transparent_28%),linear-gradient(135deg,_#fff8f4_0%,_#f2f8ff_32%,_#eef5ff_64%,_#eef2ff_100%)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,125,87,0.45),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.42),_transparent_30%),radial-gradient(circle_at_50%_55%,_rgba(129,140,248,0.28),_transparent_28%),linear-gradient(135deg,_#1b1236_0%,_#0d1125_36%,_#141d3b_64%,_#112a3d_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.8),_transparent_18%,_transparent_82%,_rgba(255,255,255,0.42))] dark:bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.08),_transparent_18%,_transparent_82%,_rgba(255,255,255,0.06))]" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-orange-400/20 blur-[110px] dark:bg-orange-400/25" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-[140px] dark:bg-cyan-400/20" />

        <div className="relative mx-auto max-w-[1240px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-24">
          <motion.header
            className="glass-panel mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl px-5 py-4 text-slate-900 shadow-2xl shadow-slate-300/30 dark:text-white dark:shadow-black/20 md:flex-row md:items-center md:justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">XSkill</p>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-600 dark:text-white/60">Campus Talent Network</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-700 dark:text-white/75">
              <a href="#skills" className="transition hover:text-slate-950 dark:hover:text-white">Explore Skills</a>
              <a href="#reviews" className="transition hover:text-slate-950 dark:hover:text-white">Reviews</a>
              <a href="#how-it-works" className="transition hover:text-slate-950 dark:hover:text-white">How It Works</a>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <ModeToggle />
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-900 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/12 dark:text-white dark:hover:bg-white/20"
              >
                Find Talent
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
              >
                Find Work
              </Link>
            </div>
          </motion.header>

          <div className="grid items-center gap-14 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="max-w-2xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-cyan-700 backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-cyan-200">
                <BadgeCheck className="h-4 w-4" />
                Verified skills. Real projects. Faster hiring.
              </div>
              <h1 className="max-w-xl text-5xl font-extrabold leading-[0.95] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                Unlock student potential. Build stronger teams with XSkill.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 dark:text-white/78 sm:text-xl">
                Connect businesses with skilled students who have already proven themselves through tests,
                portfolios, and project-ready workflows.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-7 py-3.5 text-base font-bold text-slate-950 shadow-[0_18px_50px_-18px_rgba(34,211,238,0.9)] transition hover:scale-[1.01] hover:bg-cyan-300"
                >
                  Hire Student Talent
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-orange-400 px-7 py-3.5 text-base font-bold text-slate-950 shadow-[0_18px_50px_-18px_rgba(251,146,60,0.9)] transition hover:scale-[1.01] hover:bg-orange-300"
                >
                  Start Freelancing
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {['React', 'UI Design', 'Video Editing', 'Copywriting'].map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 backdrop-blur-sm dark:border-white/15 dark:bg-white/10 dark:text-white/85"
                  >
                    Skill: {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="relative"
            >
              <div className="relative mx-auto max-w-xl">
                <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[36px] bg-gradient-to-br from-violet-400/35 via-fuchsia-300/20 to-cyan-300/30 blur-2xl dark:from-violet-400/35 dark:via-fuchsia-300/20 dark:to-cyan-300/30" />
                <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/65 p-5 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.25)] backdrop-blur-2xl dark:border-white/20 dark:bg-white/10 dark:shadow-[0_24px_80px_-24px_rgba(15,23,42,0.8)]">
                  <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white/90 via-white/75 to-sky-50/80 p-6 dark:border-white/20 dark:bg-gradient-to-br dark:from-white/25 dark:via-white/10 dark:to-white/5">
                    <div className="mb-6 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-white/80">
                      <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 dark:border-white/20 dark:bg-black/20">Skill: Coding</span>
                      <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 dark:border-white/20 dark:bg-black/20">Rating: 4.8</span>
                    </div>
                    <div className="rounded-[26px] border border-white/40 bg-[linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(225,232,255,0.78))] p-8 shadow-inner shadow-violet-200/40 dark:border-white/20 dark:bg-[linear-gradient(180deg,_rgba(255,255,255,0.85),_rgba(225,232,255,0.72))]">
                      <div className="mx-auto w-full max-w-xs rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-2xl shadow-violet-300/30">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="h-3 w-24 rounded-full bg-slate-200" />
                          <div className="flex gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                          </div>
                        </div>
                        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 via-indigo-50 to-cyan-100 p-5">
                          <div className="relative mx-auto h-28 w-44 rounded-t-[18px] border-[10px] border-slate-800 bg-gradient-to-br from-white via-violet-50 to-cyan-50 shadow-lg">
                            <div className="absolute inset-3 rounded-lg bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.24),_transparent_40%),linear-gradient(135deg,_rgba(255,255,255,0.95),_rgba(224,231,255,0.9))]" />
                          </div>
                          <div className="mx-auto h-3 w-52 rounded-b-full bg-slate-300" />
                        </div>
                        <div className="space-y-3 text-left">
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                            <Code2 className="h-4 w-4 text-indigo-500" />
                            <div className="h-3 flex-1 rounded-full bg-slate-200" />
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                            <Briefcase className="h-4 w-4 text-cyan-500" />
                            <div className="h-3 w-4/5 rounded-full bg-slate-200" />
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <div className="h-3 w-3/5 rounded-full bg-slate-200" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -left-3 top-14 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-900 backdrop-blur-md shadow-lg dark:border-white/20 dark:bg-white/14 dark:text-white">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Briefcase className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
                      Client-ready projects
                    </div>
                  </div>

                  <div className="absolute -right-4 top-8 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-900 backdrop-blur-md shadow-lg dark:border-white/20 dark:bg-white/14 dark:text-white">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                      Top rated talent
                    </div>
                  </div>

                  <div className="absolute bottom-6 right-5 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-900 backdrop-blur-md shadow-lg dark:border-white/20 dark:bg-white/14 dark:text-white">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-200" />
                      Faster shortlist
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="skills" className="mx-auto max-w-[1240px] px-4 py-18 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Popular Skills</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Browse in-demand campus skills</h2>
          </div>
          <Link href="/login" className="text-sm font-semibold text-primary transition hover:text-foreground">
            Explore more talent
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {skills.map((skill, index) => {
            const Icon = skill.icon;
            return (
              <motion.div
                key={skill.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="pro-card overflow-hidden rounded-3xl border border-border/70 p-[1px] shadow-[0_24px_60px_-32px_rgba(79,70,229,0.28)]"
              >
                <div className={`h-full rounded-[calc(var(--radius-lg)+10px)] bg-gradient-to-br ${skill.accent} p-6`}>
                  <div className="rounded-[24px] bg-background/90 p-6 backdrop-blur-md">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">{skill.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{skill.description}</p>
                    <Link
                      href="/login"
                      className="mt-6 inline-flex items-center text-sm font-semibold text-primary transition hover:text-foreground"
                    >
                      View profiles
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border/70 bg-muted/40">
        <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-18 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-24">
          {[
            {
              title: 'Students prove skills',
              text: 'Assessments, portfolios, and practical work make talent more trustworthy from day one.',
            },
            {
              title: 'Clients shortlist faster',
              text: 'Businesses discover the right people through skills, reviews, and ready-to-work profiles.',
            },
            {
              title: 'Projects move quickly',
              text: 'From first message to paid work, the platform is designed for fast collaboration.',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="pro-card rounded-3xl p-7"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Step {index + 1}</p>
              <h3 className="mt-4 text-2xl font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="reviews" className="relative overflow-hidden border-y border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,246,255,0.92))] px-4 py-18 sm:px-6 lg:px-8 lg:py-24 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.55),rgba(15,23,42,0.9))]">
        <div className="absolute left-0 top-10 h-56 w-56 rounded-full bg-cyan-300/15 blur-[110px]" />
        <div className="absolute right-0 bottom-10 h-64 w-64 rounded-full bg-orange-300/15 blur-[120px]" />

        <div className="relative mx-auto max-w-[1240px]">
          <div className="mb-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Reviews</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Trusted by students and clients</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Strong first impressions come from visible outcomes. These testimonials make the platform feel active, credible, and worth exploring.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { value: '4.9/5', label: 'Average rating' },
                { value: '2.4k+', label: 'Profiles reviewed' },
                { value: '89%', label: 'Repeat clients' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-[0_18px_50px_-30px_rgba(79,70,229,0.28)] backdrop-blur-md dark:bg-white/5">
                  <p className="text-2xl font-extrabold tracking-tight">{item.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <motion.article
                key={review.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="overflow-hidden rounded-[30px] border border-border/70 bg-background/85 p-[1px] shadow-[0_24px_60px_-32px_rgba(79,70,229,0.28)] backdrop-blur-md dark:bg-white/5"
              >
                <div className={`h-full rounded-[29px] bg-gradient-to-br ${review.accent} p-6`}>
                  <div className="flex h-full flex-col rounded-[24px] bg-background/92 p-6 dark:bg-slate-950/80">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, starIndex) => (
                          <Star key={starIndex} className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground dark:bg-white/5">
                        {review.company}
                      </span>
                    </div>

                    <p className="text-lg leading-8 text-foreground/90">“{review.quote}”</p>

                    <div className="mt-8 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-extrabold text-white dark:bg-white dark:text-slate-950">
                        {review.name.split(' ').map((part) => part[0]).join('')}
                      </div>
                      <div>
                        <p className="text-base font-bold">{review.name}</p>
                        <p className="text-sm text-muted-foreground">{review.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-2xl font-extrabold tracking-tight">XSkill</p>
            <p className="mt-2 text-sm text-white/60">Built for students, startups, and fast-moving client teams.</p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-white/70">
            <a href="#skills" className="transition hover:text-white">Skills</a>
            <a href="#reviews" className="transition hover:text-white">Reviews</a>
            <a href="#how-it-works" className="transition hover:text-white">How It Works</a>
            <Link href="/login" className="transition hover:text-white">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
