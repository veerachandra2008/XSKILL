'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Trophy,
  Play,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Award,
  Target,
  Brain,
  Code,
  Palette,
  Database,
  Globe,
  Zap,
  RefreshCw,
  Smartphone,
  Briefcase,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

interface SkillTest {
  id: number;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number;
  questions: number;
  passed: boolean | null;
  score: number | null;
  bestScore: number | null;
  attempts: number;
  icon: React.ElementType;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  selected: number | null;
}

const sampleQuestions: Question[] = [
  { id: 1, question: 'What is the purpose of the useState hook in React?', options: ['To manage component state', 'To fetch data', 'To handle routing', 'To create context'], correct: 0, selected: null },
  { id: 2, question: 'Which method is used to update state in a class component?', options: ['this.updateState()', 'this.setState()', 'this.changeState()', 'this.modifyState()'], correct: 1, selected: null },
  { id: 3, question: 'What does JSX stand for?', options: ['JavaScript XML', 'Java Syntax Extension', 'JavaScript Extension', 'Java XML'], correct: 0, selected: null },
  { id: 4, question: 'Which hook is used for side effects in React?', options: ['useState', 'useEffect', 'useContext', 'useReducer'], correct: 1, selected: null },
  { id: 5, question: 'What is the virtual DOM?', options: ['A copy of the real DOM', 'A browser feature', 'A React component', 'A styling method'], correct: 0, selected: null },
];

const questionBanks: Record<string, Question[]> = {
  react: [
    { id: 1, question: 'Which hook is commonly used to manage local component state in React?', options: ['useEffect', 'useState', 'useMemo', 'useRef'], correct: 1, selected: null },
    { id: 2, question: 'What is JSX?', options: ['A CSS framework', 'A JavaScript syntax extension for UI', 'A database query language', 'A state library'], correct: 1, selected: null },
    { id: 3, question: 'Which prop helps React identify list items efficiently?', options: ['index', 'id', 'key', 'ref'], correct: 2, selected: null },
    { id: 4, question: 'What does useEffect handle most often?', options: ['Component styling', 'Side effects', 'Routing', 'Type checking'], correct: 1, selected: null },
    { id: 5, question: 'React components should primarily be built as?', options: ['Monolithic classes only', 'Reusable UI units', 'Database entities', 'Static templates'], correct: 1, selected: null },
  ],
  typescript: [
    { id: 1, question: 'What is the main purpose of TypeScript?', options: ['Run faster than JavaScript', 'Add static typing to JavaScript', 'Replace HTML', 'Compile CSS'], correct: 1, selected: null },
    { id: 2, question: 'Which keyword defines a type-safe contract for an object?', options: ['class', 'enum', 'interface', 'extends'], correct: 2, selected: null },
    { id: 3, question: 'What does `string | number` represent?', options: ['Intersection type', 'Union type', 'Generic type', 'Tuple'], correct: 1, selected: null },
    { id: 4, question: 'Which compiler catches type errors before runtime?', options: ['babel', 'node', 'tsc', 'vite'], correct: 2, selected: null },
    { id: 5, question: 'What does `?` mark on an interface property?', options: ['Readonly', 'Optional', 'Private', 'Deprecated'], correct: 1, selected: null },
  ],
  'node.js': [
    { id: 1, question: 'Node.js primarily runs JavaScript on?', options: ['The browser', 'The server', 'A database', 'A mobile app'], correct: 1, selected: null },
    { id: 2, question: 'Which module often creates HTTP servers in Node.js?', options: ['fs', 'path', 'http', 'crypto'], correct: 2, selected: null },
    { id: 3, question: 'What package file lists dependencies?', options: ['node.json', 'package.json', 'deps.lock', 'module.txt'], correct: 1, selected: null },
    { id: 4, question: 'Express is most commonly used for?', options: ['Machine learning', 'Web APIs', 'SQL migrations', 'CSS bundling'], correct: 1, selected: null },
    { id: 5, question: 'What is npm used for?', options: ['Rendering images', 'Managing packages', 'Writing SQL', 'Compiling Python'], correct: 1, selected: null },
  ],
  python: [
    { id: 1, question: 'Python uses indentation to define?', options: ['Comments', 'Code blocks', 'Imports', 'Variables'], correct: 1, selected: null },
    { id: 2, question: 'Which data type is ordered and mutable?', options: ['tuple', 'set', 'list', 'frozenset'], correct: 2, selected: null },
    { id: 3, question: 'What does `def` create?', options: ['A loop', 'A function', 'A class instance', 'An import'], correct: 1, selected: null },
    { id: 4, question: 'Which keyword handles exceptions?', options: ['catch', 'rescue', 'except', 'error'], correct: 2, selected: null },
    { id: 5, question: 'Pandas is commonly used for?', options: ['Web routing', 'Data analysis', 'Game engines', 'CSS styling'], correct: 1, selected: null },
  ],
  'ui design': [
    { id: 1, question: 'What does visual hierarchy help users do?', options: ['Write code', 'Understand priority', 'Export files', 'Compress images'], correct: 1, selected: null },
    { id: 2, question: 'Whitespace in UI usually improves?', options: ['Confusion', 'Readability', 'Latency', 'SEO'], correct: 1, selected: null },
    { id: 3, question: 'A design system is mainly for?', options: ['Deleting assets', 'Consistency and reuse', 'Database normalization', 'Server monitoring'], correct: 1, selected: null },
    { id: 4, question: 'What is a wireframe?', options: ['Production code', 'Low-fidelity layout', 'Animation export', 'API schema'], correct: 1, selected: null },
    { id: 5, question: 'Color contrast matters most for?', options: ['Accessibility', 'Bundle size', 'Caching', 'Deployment'], correct: 0, selected: null },
  ],
  postgresql: [
    { id: 1, question: 'SQL `SELECT` is used to?', options: ['Delete rows', 'Read data', 'Create servers', 'Compile code'], correct: 1, selected: null },
    { id: 2, question: 'A primary key must be?', options: ['Nullable', 'Unique', 'Duplicated', 'Optional'], correct: 1, selected: null },
    { id: 3, question: 'Which command adds a new row?', options: ['PUSH', 'ADD', 'INSERT', 'APPEND'], correct: 2, selected: null },
    { id: 4, question: 'An index mainly improves?', options: ['Storage size', 'Query speed', 'Syntax highlighting', 'Image quality'], correct: 1, selected: null },
    { id: 5, question: 'JOIN is used to?', options: ['Merge data from tables', 'Delete a database', 'Rename columns only', 'Restart Postgres'], correct: 0, selected: null },
  ],
  docker: [
    { id: 1, question: 'Docker is mainly used for?', options: ['Containerization', 'Photo editing', 'Spreadsheet analysis', 'DNS hosting'], correct: 0, selected: null },
    { id: 2, question: 'A Docker image is?', options: ['A running container', 'A blueprint for a container', 'A SQL dump', 'A log file'], correct: 1, selected: null },
    { id: 3, question: 'Which file defines image build steps?', options: ['docker.yaml', 'Dockerfile', 'compose.lock', 'image.json'], correct: 1, selected: null },
    { id: 4, question: 'Docker Compose helps manage?', options: ['Multiple services', 'Photos', 'Fonts', 'Emails'], correct: 0, selected: null },
    { id: 5, question: 'Containers are usually valued for?', options: ['Consistency across environments', 'Replacing source control', 'Writing CSS', 'Email delivery'], correct: 0, selected: null },
  ],
  graphql: [
    { id: 1, question: 'GraphQL allows clients to?', options: ['Request exactly the data they need', 'Only fetch HTML', 'Replace CSS', 'Store files on disk'], correct: 0, selected: null },
    { id: 2, question: 'A GraphQL schema defines?', options: ['UI colors', 'API types and operations', 'Server hardware', 'Database backups'], correct: 1, selected: null },
    { id: 3, question: 'Which operation is used to read data in GraphQL?', options: ['PUT', 'QUERY', 'PATCH', 'SYNC'], correct: 1, selected: null },
    { id: 4, question: 'Resolvers are responsible for?', options: ['Styling components', 'Fetching field data', 'Running tests only', 'Compiling TypeScript'], correct: 1, selected: null },
    { id: 5, question: 'One common GraphQL benefit is reducing?', options: ['Bundle analysis', 'Over-fetching and under-fetching', 'Keyboard input', 'Static assets'], correct: 1, selected: null },
  ],
  api: [
    { id: 1, question: 'A REST API endpoint should usually represent?', options: ['A resource', 'A CSS class', 'A video stream only', 'A file path on disk'], correct: 0, selected: null },
    { id: 2, question: 'Which HTTP method is commonly used to create data?', options: ['GET', 'POST', 'DELETE', 'TRACE'], correct: 1, selected: null },
    { id: 3, question: 'What status code usually means success for a basic request?', options: ['200', '404', '500', '301'], correct: 0, selected: null },
    { id: 4, question: 'API authentication often uses?', options: ['Tokens', 'SVG files', 'Font weights', 'Zip archives'], correct: 0, selected: null },
    { id: 5, question: 'Good API design usually emphasizes?', options: ['Consistency', 'Random naming', 'Large payloads only', 'Hidden errors'], correct: 0, selected: null },
  ],
  frontend: [
    { id: 1, question: 'Frontend development mainly focuses on?', options: ['User-facing interfaces', 'Disk partitioning', 'Server racks', 'BIOS settings'], correct: 0, selected: null },
    { id: 2, question: 'Which technology is used to structure web pages?', options: ['HTML', 'SMTP', 'SSH', 'Bash'], correct: 0, selected: null },
    { id: 3, question: 'CSS is mainly used for?', options: ['Styling', 'Database indexing', 'Authentication tokens', 'Video encoding'], correct: 0, selected: null },
    { id: 4, question: 'JavaScript in the browser often handles?', options: ['Interactivity', 'Disk defragmentation', 'Kernel modules', 'Power supply'], correct: 0, selected: null },
    { id: 5, question: 'Responsive design helps UIs adapt to?', options: ['Different screen sizes', 'SQL joins', 'Compiler warnings', 'Git branches'], correct: 0, selected: null },
  ],
  backend: [
    { id: 1, question: 'Backend development usually handles?', options: ['Server logic and data', 'Logo design only', 'Font pairing', 'Image cropping'], correct: 0, selected: null },
    { id: 2, question: 'An API server often communicates using?', options: ['HTTP', 'PNG', 'MP4', 'ZIP'], correct: 0, selected: null },
    { id: 3, question: 'Databases are commonly used in backend systems for?', options: ['Persistent storage', 'Window resizing', 'Animations only', 'Keyboard lighting'], correct: 0, selected: null },
    { id: 4, question: 'Authentication verifies?', options: ['User identity', 'Color palettes', 'Video framerate', 'Font licenses'], correct: 0, selected: null },
    { id: 5, question: 'A backend route handler usually processes?', options: ['Incoming requests', 'Photoshop layers', 'Monitor brightness', 'USB drivers'], correct: 0, selected: null },
  ],
  database: [
    { id: 1, question: 'A database is used to?', options: ['Store and retrieve structured data', 'Compile CSS', 'Render animations', 'Record audio'], correct: 0, selected: null },
    { id: 2, question: 'SQL stands for?', options: ['Structured Query Language', 'Simple Queue Logic', 'Secure Query Link', 'System Quality Layer'], correct: 0, selected: null },
    { id: 3, question: 'A table row usually represents?', options: ['A record', 'A stylesheet', 'An endpoint', 'A router'], correct: 0, selected: null },
    { id: 4, question: 'Normalization helps reduce?', options: ['Data redundancy', 'Battery usage', 'Screen glare', 'Mouse lag'], correct: 0, selected: null },
    { id: 5, question: 'Indexes are mainly for?', options: ['Faster lookups', 'UI themes', 'Video playback', 'Image compression'], correct: 0, selected: null },
  ],
  design: [
    { id: 1, question: 'Design systems help teams maintain?', options: ['Consistency', 'Server uptime', 'Compiler speed', 'Memory allocation'], correct: 0, selected: null },
    { id: 2, question: 'A mockup is usually?', options: ['A visual representation of a product', 'A database export', 'A shell script', 'A network port'], correct: 0, selected: null },
    { id: 3, question: 'Typography choices affect?', options: ['Readability and tone', 'CPU temperature', 'DNS resolution', 'SSL certificates'], correct: 0, selected: null },
    { id: 4, question: 'UX design primarily considers?', options: ['User experience', 'Hard drive sectors', 'Power adapters', 'Terminal colors'], correct: 0, selected: null },
    { id: 5, question: 'Prototyping helps validate?', options: ['Interaction ideas', 'Database migrations', 'Firewall rules', 'Kernel patches'], correct: 0, selected: null },
  ],
  mobile: [
    { id: 1, question: 'Mobile apps should prioritize?', options: ['Responsive performance and usability', 'Large hover menus', 'Desktop-only layouts', 'BIOS updates'], correct: 0, selected: null },
    { id: 2, question: 'A common mobile concern is?', options: ['Screen size constraints', 'Rack mounting', 'Printer toner', 'Ethernet pinout'], correct: 0, selected: null },
    { id: 3, question: 'Touch targets should generally be?', options: ['Easy to tap', 'Hidden', 'As small as possible', 'Placed randomly'], correct: 0, selected: null },
    { id: 4, question: 'Mobile development often includes handling?', options: ['Device permissions', 'Database vacuum only', 'Kernel swaps', 'Fiber termination'], correct: 0, selected: null },
    { id: 5, question: 'Cross-platform frameworks aim to?', options: ['Reuse code across platforms', 'Remove testing', 'Avoid UI design', 'Replace APIs'], correct: 0, selected: null },
  ],
  devops: [
    { id: 1, question: 'DevOps emphasizes?', options: ['Automation and delivery collaboration', 'Photo editing', 'Spreadsheet styling', 'Browser theming'], correct: 0, selected: null },
    { id: 2, question: 'CI/CD pipelines are used for?', options: ['Build, test, and deploy automation', 'Drawing wireframes', 'Managing invoices only', 'Compressing images'], correct: 0, selected: null },
    { id: 3, question: 'Infrastructure as code means?', options: ['Managing infrastructure through code', 'Writing CSS for servers', 'Storing logs in Word files', 'Editing firmware manually'], correct: 0, selected: null },
    { id: 4, question: 'Monitoring helps teams track?', options: ['System health and performance', 'Only font sizes', 'Clipboard history', 'USB cable lengths'], correct: 0, selected: null },
    { id: 5, question: 'Container orchestration is commonly associated with?', options: ['Scaling services', 'Color correction', 'PDF export', 'Static banners'], correct: 0, selected: null },
  ],
};

const iconByCategory: Record<string, React.ElementType> = {
  frontend: Code,
  backend: Database,
  design: Palette,
  database: Database,
  api: Globe,
  devops: Zap,
  mobile: Smartphone,
};

function formatCategory(category?: string) {
  if (!category) return 'General';
  return category
    .split(/[_\s-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeDifficulty(level?: string): SkillTest['difficulty'] {
  const normalized = (level || '').toLowerCase();
  if (normalized === 'expert' || normalized === 'advanced' || normalized === 'intermediate') {
    return normalized;
  }
  return 'beginner';
}

function getQuestionBankForTest(test: SkillTest) {
  const skillName = test.name.toLowerCase().trim();
  const category = test.category.toLowerCase().trim();

  if (questionBanks[skillName]) {
    return questionBanks[skillName];
  }

  const nameMatches = Object.keys(questionBanks).find((key) =>
    skillName.includes(key) || key.includes(skillName)
  );
  if (nameMatches) {
    return questionBanks[nameMatches];
  }

  if (questionBanks[category]) {
    return questionBanks[category];
  }

  const categoryMatches = Object.keys(questionBanks).find((key) =>
    category.includes(key) || key.includes(category)
  );
  if (categoryMatches) {
    return questionBanks[categoryMatches];
  }

  return sampleQuestions;
}

export default function SkillsTest() {
  const { user, updateUser } = useAuth();
  const [selectedTest, setSelectedTest] = useState<SkillTest | null>(null);
  const [testsState, setTestsState] = useState<SkillTest[]>([]);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isCertificatesOpen, setIsCertificatesOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(sampleQuestions);
  const [testCompleted, setTestCompleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [uploadingSkillId, setUploadingSkillId] = useState<number | null>(null);

  const skillTests = useMemo(() => {
    return (user?.skill_records || []).map((skill, index) => {
      const normalizedCategory = (skill.category || 'general').toLowerCase();
      const Icon = iconByCategory[normalizedCategory] || Briefcase;
      const bestScore = typeof skill.best_test_score === 'number' ? skill.best_test_score : null;
      const attempts = Number(skill.test_attempts || 0);
      const validated = skill.validation_status === 'validated';
      return {
        id: Number(skill.id),
        name: skill.skill_name,
        category: formatCategory(skill.category),
        difficulty: normalizeDifficulty(skill.level),
        duration: 20,
        questions: getQuestionBankForTest({
          id: Number(skill.id),
          name: skill.skill_name,
          category: formatCategory(skill.category),
          difficulty: normalizeDifficulty(skill.level),
          duration: 20,
          questions: 5,
          passed: null,
          score: null,
          bestScore: null,
          attempts: 0,
          icon: Icon,
        }).length,
        passed: validated,
        score: typeof skill.test_score === 'number' ? skill.test_score : null,
        bestScore,
        attempts,
        icon: Icon,
      } satisfies SkillTest;
    });
  }, [user?.skill_records]);

  useEffect(() => {
    setTestsState(skillTests);
  }, [skillTests]);

  const filteredTests = testsState.filter(test => {
    const matchesCategory = categoryFilter === 'all' || test.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesDifficulty = difficultyFilter === 'all' || test.difficulty === difficultyFilter;
    return matchesCategory && matchesDifficulty;
  });

  const startTest = (test: SkillTest) => {
    const bank = getQuestionBankForTest(test);
    setSelectedTest(test);
    setCurrentQuestion(0);
    setQuestions(bank.map(q => ({ ...q, selected: null })));
    setTestCompleted(false);
    setIsTestDialogOpen(true);
  };

  const selectAnswer = (questionId: number, optionIndex: number) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId ? { ...q, selected: optionIndex } : q
    ));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      void submitTestResult();
    }
  };

  const submitTestResult = async () => {
    if (!selectedTest) return;
    const score = calculateScore();
    setIsSubmittingResult(true);
    try {
      const res = await fetch(buildApiUrl(`/api/skills/${selectedTest.id}/test-result`), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ score }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save test result');
      }

      const updatedSkill = data.skill;
      setTestsState((prev) => prev.map((test) => {
        if (test.id !== selectedTest.id) return test;
        return {
          ...test,
          attempts: Number(updatedSkill.test_attempts || test.attempts + 1),
          score: Number.isFinite(updatedSkill.test_score) ? updatedSkill.test_score : score,
          bestScore: Number.isFinite(updatedSkill.best_test_score) ? updatedSkill.best_test_score : score,
          passed: updatedSkill.validation_status === 'validated',
        };
      }));

      const nextRecords = (user?.skill_records || []).map((record) =>
        Number(record.id) === selectedTest.id ? { ...record, ...updatedSkill } : record
      );
      updateUser({
        skill_records: nextRecords,
        skills: nextRecords.map((r) => r.skill_name),
      });
      setTestCompleted(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to save test result');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  const handleCertificateUpload = async (test: SkillTest, file: File) => {
    setUploadingSkillId(test.id);
    try {
      const fileToDataUrl = () => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read certificate file'));
        reader.readAsDataURL(file);
      });

      const certificateData = await fileToDataUrl();
      const res = await fetch(buildApiUrl(`/api/skills/${test.id}/certificate`), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          certificate_name: file.name,
          certificate_data: certificateData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload certificate');
      }

      const updatedSkill = data.skill;
      setTestsState((prev) => prev.map((row) => {
        if (row.id !== test.id) return row;
        return {
          ...row,
          passed: updatedSkill.validation_status === 'validated',
          bestScore: Number.isFinite(updatedSkill.best_test_score) ? updatedSkill.best_test_score : row.bestScore,
        };
      }));

      const nextRecords = (user?.skill_records || []).map((record) =>
        Number(record.id) === test.id ? { ...record, ...updatedSkill } : record
      );
      updateUser({
        skill_records: nextRecords,
        skills: nextRecords.map((r) => r.skill_name),
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to upload certificate');
    } finally {
      setUploadingSkillId(null);
    }
  };

  const calculateScore = () => {
    const correct = questions.filter(q => q.selected === q.correct).length;
    return Math.round((correct / questions.length) * 100);
  };

  const getDifficultyColor = (difficulty: SkillTest['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'intermediate':
        return 'bg-blue-500/20 text-blue-400';
      case 'advanced':
        return 'bg-primary/20 text-primary';
      case 'expert':
        return 'bg-red-500/20 text-red-400';
    }
  };

  const stats = [
    { label: 'Tests Completed', value: testsState.filter(t => t.attempts > 0).length, icon: CheckCircle2 },
    { label: 'Validated', value: testsState.filter(t => t.passed === true).length, icon: Trophy },
    { label: 'Available Tests', value: testsState.length, icon: Target },
    { label: 'Total Attempts', value: testsState.reduce((acc, t) => acc + t.attempts, 0), icon: Clock },
  ];

  const certificates = (user?.skill_records || [])
    .filter(skill => skill.validation_status === 'validated' && Boolean(skill.has_certificate))
    .map(skill => ({
      id: Number(skill.id),
      name: skill.skill_name,
      category: formatCategory(skill.category),
      bestScore: skill.best_test_score,
      certificateName: skill.certificate_name || 'Certificate',
    }));

  const categories = ['all', ...Array.from(new Set(testsState.map((t) => t.category.toLowerCase())))];

  return (
    <motion.div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Skill Tests</h1>
          <p className="text-muted-foreground mt-1">Only 100% score plus uploaded certificate gives validated badge.</p>
        </div>
        <Button className="pro-cta hover:opacity-90" onClick={() => setIsCertificatesOpen(true)}>
          <Award className="w-4 h-4 mr-2" />
          View Certificates
        </Button>
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
              <Card className="pro-card pro-card-hover border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
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

      <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat.toLowerCase() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.toLowerCase())}
                  className={categoryFilter === cat.toLowerCase()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border-border dark:border-slate-700 text-muted-foreground hover:bg-accent'
                  }
                >
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto flex-wrap">
              {['all', 'beginner', 'intermediate', 'advanced', 'expert'].map((diff) => (
                <Button
                  key={diff}
                  variant={difficultyFilter === diff ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDifficultyFilter(diff)}
                  className={difficultyFilter === diff
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border-border dark:border-slate-700 text-muted-foreground hover:bg-accent'
                  }
                >
                  {diff === 'all' ? 'All Levels' : diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTests.map((test, index) => {
          const Icon = test.icon;
          return (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="pro-card pro-card-hover border hover:border-primary/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(test.difficulty)}>
                        {test.difficulty}
                      </Badge>
                      {test.passed === true && (
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Validated
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-foreground dark:text-white text-lg mt-3">{test.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{test.category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{test.duration} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Brain className="w-4 h-4" />
                      <span>{test.questions} questions</span>
                    </div>
                  </div>

                  {test.bestScore !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Best Score</span>
                        <span className="text-foreground dark:text-white font-medium">{test.bestScore}%</span>
                      </div>
                      <Progress value={test.bestScore} className="h-2 bg-secondary" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{test.attempts} attempts</span>
                    {test.passed && test.bestScore === 100 && (
                      <span className="text-emerald-400">Validated ✓</span>
                    )}
                  </div>

                  <label className="block">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleCertificateUpload(test, file);
                        }
                        event.currentTarget.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-border dark:border-slate-700 text-muted-foreground hover:bg-accent"
                      disabled={uploadingSkillId === test.id}
                      onClick={(event) => {
                        const input = (event.currentTarget.parentElement?.querySelector('input[type=\"file\"]') as HTMLInputElement | null);
                        input?.click();
                      }}
                    >
                      {uploadingSkillId === test.id ? 'Uploading...' : 'Upload Certificate'}
                    </Button>
                  </label>

                  <Button
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                    onClick={() => startTest(test)}
                  >
                    {test.attempts === 0 ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Test
                      </>
                    ) : test.passed ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retake Test
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white max-w-2xl">
          {!testCompleted ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedTest?.name}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Question {currentQuestion + 1} of {questions.length}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">{selectedTest?.duration}:00</span>
                  </div>
                </div>
                <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2 bg-secondary mt-4" />
              </DialogHeader>

              <div className="py-6">
                <p className="text-lg text-foreground dark:text-white mb-6">
                  {questions[currentQuestion].question}
                </p>
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => selectAnswer(questions[currentQuestion].id, index)}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
                        questions[currentQuestion].selected === index
                          ? 'bg-violet-600/20 border-2 border-violet-500 text-foreground dark:text-white'
                          : 'bg-accent/50 border border-border dark:border-slate-700 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          questions[currentQuestion].selected === index
                            ? 'bg-violet-600 text-white'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                  className="border-border dark:border-slate-700 text-muted-foreground"
                >
                  Previous
                </Button>
                <Button
                  onClick={nextQuestion}
                  disabled={questions[currentQuestion].selected === null || isSubmittingResult}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600"
                >
                  {isSubmittingResult ? 'Submitting...' : currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Test Completed!</DialogTitle>
              </DialogHeader>
              <div className="py-8 text-center">
                <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                  calculateScore() === 100 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  {calculateScore() === 100 ? (
                    <Trophy className="w-12 h-12 text-emerald-400" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-400" />
                  )}
                </div>
                <p className="text-4xl font-bold text-foreground dark:text-white mt-6">{calculateScore()}%</p>
                <p className="text-muted-foreground mt-2">
                  {calculateScore() === 100
                    ? 'Perfect score. Upload certificate to unlock validated badge.'
                    : 'Only a 100% score counts for validation. Retake and try again.'}
                </p>
                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTestCompleted(false);
                      setCurrentQuestion(0);
                      const bank = selectedTest ? getQuestionBankForTest(selectedTest) : sampleQuestions;
                      setQuestions(bank.map(q => ({ ...q, selected: null })));
                    }}
                    className="border-border dark:border-slate-700 text-muted-foreground"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake Test
                  </Button>
                <Button
                  onClick={() => setIsTestDialogOpen(false)}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600"
                  disabled={isSubmittingResult}
                >
                  Done
                </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCertificatesOpen} onOpenChange={setIsCertificatesOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Your Certificates</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Skills you have passed with certification status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {certificates.length === 0 && (
              <p className="text-sm text-muted-foreground">No validated certificates yet. Requirement: 100% test score + uploaded certificate.</p>
            )}
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="rounded-xl border border-border dark:border-slate-700 p-4 flex items-center justify-between bg-accent/30"
              >
                <div>
                  <p className="font-semibold text-foreground dark:text-white">{certificate.name} Certificate</p>
                  <p className="text-sm text-muted-foreground">{certificate.category} • Best Score: {certificate.bestScore}% • {certificate.certificateName}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  Validated
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
