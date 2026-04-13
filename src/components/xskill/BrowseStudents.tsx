'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  Star, 
  MapPin,
  Briefcase,
  MessageSquare,
  ClipboardList,
  Grid,
  List,
  SlidersHorizontal,
  X,
  Globe,
  Clock,
  DollarSign
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';

interface Student {
  id: number;
  name: string;
  avatar: string;
  location: string;
  title: string;
  skills: string[];
  rating: number;
  completedTrials: number;
  hourlyRate: number;
  available: boolean;
  bio: string;
  experience: string;
  languages: string[];
  responseTime: string;
}

const skillOptions = [
  'React', 'TypeScript', 'Node.js', 'Python', 'UI Design', 
  'PostgreSQL', 'AWS', 'Docker', 'Figma', 'Machine Learning',
  'Flutter', 'GraphQL', 'Kubernetes', 'Django', 'Firebase'
];

const locations = [
  'All Locations', 'United States', 'Canada', 'United Kingdom', 
  'Germany', 'India', 'Australia', 'Remote'
];

export default function BrowseStudents() {
  const { user } = useAuth();
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [selectedExperience, setSelectedExperience] = useState<string>('all');
  const [rateRange, setRateRange] = useState([0, 200]);
  const [sortBy, setSortBy] = useState<string>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [trialDescription, setTrialDescription] = useState('');
  const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const res = await fetch(buildApiUrl('/api/students'), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load students');
        }
        setStudentsData(data.students || []);
      } catch (error) {
        console.error(error);
        setStudentsData([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => studentsData
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           student.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           student.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSkills = selectedSkills.length === 0 || 
                           selectedSkills.some(skill => student.skills.includes(skill));
      
      const matchesLocation = selectedLocation === 'All Locations' || 
                             student.location.includes(selectedLocation);
      
      const matchesAvailability = selectedAvailability === 'all' ||
                                  (selectedAvailability === 'available' && student.available) ||
                                  (selectedAvailability === 'busy' && !student.available);
      
      const matchesRate = student.hourlyRate >= rateRange[0] && student.hourlyRate <= rateRange[1];
      
      return matchesSearch && matchesSkills && matchesLocation && matchesAvailability && matchesRate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'trials': return b.completedTrials - a.completedTrials;
        case 'rate_low': return a.hourlyRate - b.hourlyRate;
        case 'rate_high': return b.hourlyRate - a.hourlyRate;
        default: return 0;
      }
    }), [rateRange, searchQuery, selectedAvailability, selectedLocation, selectedSkills, sortBy, studentsData]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSkills([]);
    setSelectedLocation('All Locations');
    setSelectedAvailability('all');
    setSelectedExperience('all');
    setRateRange([0, 200]);
  };

  const handleRequestTrial = (student: Student) => {
    setSelectedStudent(student);
    setIsRequestDialogOpen(true);
  };

  const submitTrialRequest = async () => {
    if (!selectedStudent || !trialDescription.trim()) {
      window.alert('Please enter a project description before sending the request.');
      return;
    }

    if (user?.role !== 'client') {
      window.alert('Only client accounts can create trial requests.');
      return;
    }

    setIsSubmittingTrial(true);

    try {
      const res = await fetch(buildApiUrl('/api/trials'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          seller_id: selectedStudent.id,
          task_description: trialDescription.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create trial');
      }

      setIsRequestDialogOpen(false);
      setTrialDescription('');
      window.dispatchEvent(new CustomEvent('xskill:trial-created', { detail: data.trial || null }));
      window.alert('Trial request saved successfully.');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create trial');
    } finally {
      setIsSubmittingTrial(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const activeFilterCount = [
    selectedSkills.length > 0,
    selectedLocation !== 'All Locations',
    selectedAvailability !== 'all',
    rateRange[0] > 0 || rateRange[1] < 200,
  ].filter(Boolean).length;

  const renderFilterContent = () => (
    <div className="space-y-6">
      {/* Skills Filter */}
      <div className="space-y-3">
        <Label className="text-white font-medium">Skills</Label>
        <div className="flex flex-wrap gap-2">
          {skillOptions.map((skill) => (
            <Badge
              key={skill}
              variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${
                selectedSkills.includes(skill)
                  ? 'bg-violet-600 hover:bg-violet-700'
                  : 'border-slate-600 text-slate-300 hover:border-violet-500'
              }`}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
              {selectedSkills.includes(skill) && (
                <X className="w-3 h-3 ml-1" onClick={(e) => { e.stopPropagation(); toggleSkill(skill); }} />
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* Location Filter */}
      <div className="space-y-3">
        <Label className="font-medium flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Location
        </Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="bg-background/50 border-border text-foreground">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc} className="focus:bg-accent">
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Availability Filter */}
      <div className="space-y-3">
        <Label className="font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Availability
        </Label>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'available', label: 'Available' },
            { value: 'busy', label: 'Busy' },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={selectedAvailability === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAvailability(opt.value)}
              className={selectedAvailability === opt.value 
                ? 'bg-violet-600 hover:bg-violet-700' 
                : 'border-border text-muted-foreground'
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Rate Range Filter */}
      <div className="space-y-3">
        <Label className="font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Hourly Rate: ${rateRange[0]} - ${rateRange[1]}
        </Label>
        <Slider
          value={rateRange}
          onValueChange={setRateRange}
          max={200}
          step={5}
          className="py-4"
        />
      </div>

      {/* Experience Filter */}
      <div className="space-y-3">
        <Label className="font-medium flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Experience
        </Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: '1', label: '1+ years' },
            { value: '3', label: '3+ years' },
            { value: '5', label: '5+ years' },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={selectedExperience === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedExperience(opt.value)}
              className={selectedExperience === opt.value 
                ? 'bg-violet-600 hover:bg-violet-700' 
                : 'border-border text-muted-foreground'
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full border-border text-muted-foreground">
          <X className="w-4 h-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <motion.div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Browse Students</h1>
          <p className="text-muted-foreground mt-1">Find talented students for your projects</p>
        </div>
            <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground'}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground'}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, skill, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Desktop Filters */}
              <div className="hidden lg:flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white">
                    <SlidersHorizontal className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border dark:border-slate-700">
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="trials">Most Trials</SelectItem>
                    <SelectItem value="rate_low">Lowest Rate</SelectItem>
                    <SelectItem value="rate_high">Highest Rate</SelectItem>
                  </SelectContent>
                </Select>

                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="border-border dark:border-slate-700 text-foreground dark:text-slate-300 relative">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white w-[400px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="text-foreground dark:text-white">Filters</SheetTitle>
                      <SheetDescription className="text-muted-foreground">
                        Refine your search with advanced filters
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      {renderFilterContent()}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden border-border dark:border-slate-700 text-foreground dark:text-slate-300 relative">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white w-[300px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-foreground dark:text-white">Filters</SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      Refine your search
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    {renderFilterContent()}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedSkills.map((skill) => (
            <Badge key={skill} className="bg-violet-600/20 text-violet-300 gap-1">
              {skill}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleSkill(skill)} />
            </Badge>
          ))}
          {selectedLocation !== 'All Locations' && (
            <Badge className="bg-violet-600/20 text-violet-300 gap-1">
              {selectedLocation}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedLocation('All Locations')} />
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <p className="text-muted-foreground text-sm">
        Showing {filteredStudents.length} of {studentsData.length} students
      </p>

      {isLoadingStudents && (
        <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading logged-in student profiles...</p>
          </CardContent>
        </Card>
      )}

      {/* Students Grid/List */}
      {!isLoadingStudents && viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
            <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 hover:border-primary/50 transition-all duration-300 overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <Avatar className="w-14 h-14 border-2 border-border dark:border-slate-700 group-hover:border-primary/50 transition-colors">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback className="bg-theme-gradient-br text-white">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    {student.available && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground dark:text-white font-semibold truncate">{student.name}</h3>
                    <p className="text-violet-400 text-sm">{student.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{student.location}</span>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{student.bio}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {student.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {student.skills.length > 3 && (
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                      +{student.skills.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-foreground dark:text-white font-medium">{student.rating}</span>
                    <span className="text-muted-foreground">({student.completedTrials} trials)</span>
                  </div>
                  <span className="text-emerald-400 font-medium">${student.hourlyRate}/hr</span>
                </div>

                <div className="flex gap-2">
                    <Button 
                    className="flex-1 pro-cta hover:opacity-90"
                    size="sm"
                    onClick={() => handleRequestTrial(student)}
                  >
                    <ClipboardList className="w-4 h-4 mr-1" />
                    Request Trial
                  </Button>
                  <Button variant="outline" size="sm" className="border-border dark:border-slate-700 text-muted-foreground hover:bg-accent">
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </div>
      ) : !isLoadingStudents ? (
        <div className="space-y-4">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
            <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12 border-2 border-border dark:border-slate-700">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback className="bg-theme-gradient-br text-white">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    {student.available && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground dark:text-white font-semibold">{student.name}</h3>
                      <span className="text-violet-400 text-sm">{student.title}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {student.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {student.rating}
                      </span>
                      <span>{student.completedTrials} trials</span>
                      <span className="text-emerald-400 font-medium">${student.hourlyRate}/hr</span>
                    </div>
                  </div>
                  <div className="hidden md:flex flex-wrap gap-1.5 max-w-xs">
                    {student.skills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      className="pro-cta hover:opacity-90"
                      size="sm"
                      onClick={() => handleRequestTrial(student)}
                    >
                      <ClipboardList className="w-4 h-4 mr-1" />
                      Request
                    </Button>
                    <Button variant="outline" size="sm" className="border-border dark:border-slate-700 text-muted-foreground hover:bg-accent">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </div>
      ) : null}

      {filteredStudents.length === 0 && (
        <Card className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800">
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No students found matching your criteria</p>
            <Button 
              variant="outline" 
              className="mt-4 border-border dark:border-slate-700 text-muted-foreground hover:bg-accent"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trial Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white">
          <DialogHeader>
            <DialogTitle>Request Trial</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Send a trial request to {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedStudent && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                    {getInitials(selectedStudent.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-foreground dark:text-white font-medium">{selectedStudent.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedStudent.title} • ${selectedStudent.hourlyRate}/hr</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-foreground dark:text-slate-300">Project Description</Label>
              <Textarea
                placeholder="Describe the trial project you'd like this student to work on..."
                value={trialDescription}
                onChange={(e) => setTrialDescription(e.target.value)}
                rows={4}
                className="bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white placeholder:text-muted-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This description is required and will appear in both client and student trial request sections.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)} className="border-border dark:border-slate-700 text-muted-foreground">
                Cancel
              </Button>
              <Button
                onClick={submitTrialRequest}
                className="bg-violet-600 hover:bg-violet-700"
                disabled={isSubmittingTrial || !trialDescription.trim()}
              >
                {isSubmittingTrial ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
