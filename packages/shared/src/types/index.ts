// 共享类型定义

// ============== 用户相关 ==============

export interface User {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  gender?: string;
  birthDate?: Date;
  location?: string;
  educationLevel?: string;
  workYears?: number;
  selfIntro?: string;
  careerGoals?: string;
  targetRoles: string[];
  targetLocations: string[];
  expectedSalary?: SalaryRange;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
}

export interface Skill {
  id: string;
  profileId: string;
  name: string;
  category: 'technical' | 'soft' | 'language';
  level: number; // 1-5
  verified: boolean;
  evidence?: string;
  years?: number;
}

export interface Experience {
  id: string;
  profileId: string;
  company: string;
  position: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
  highlights: string[];
}

export interface Project {
  id: string;
  profileId: string;
  name: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  techStack: string[];
  achievements: string[];
  link?: string;
}

export interface Education {
  id: string;
  profileId: string;
  school: string;
  degree: string;
  major: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  description?: string;
}

// ============== 岗位相关 ==============

export interface Job {
  id: string;
  userId: string;
  title?: string;
  company?: string;
  location?: string;
  sourceType: 'screenshot' | 'link' | 'text';
  sourceUrl?: string;
  description?: string;
  requirements?: JobRequirements;
  matchScore?: number;
  matchedSkills: string[];
  status: 'active' | 'archived' | 'applied';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobRequirements {
  mustHave?: string[];
  niceToHave?: string[];
  skills?: string[];
  experienceYears?: string;
  education?: string;
}

// ============== 简历相关 ==============

export interface Resume {
  id: string;
  userId: string;
  jobId?: string;
  name: string;
  templateId: string;
  language: 'zh' | 'en';
  status: 'draft' | 'generating' | 'completed' | 'failed';
  content?: ResumeContent;
  fileUrl?: string;
  matchScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeContent {
  header: ResumeHeader;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: ResumeSkill[];
  projects?: ResumeProject[];
}

export interface ResumeHeader {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  avatar?: string;
  links?: Array<{
    type: 'github' | 'linkedin' | 'portfolio' | 'other';
    url: string;
  }>;
}

export interface ResumeExperience {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  description?: string;
}

export interface ResumeSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
}

export interface ResumeProject {
  name: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
  technologies: string[];
  achievements: string[];
  link?: string;
}

// ============== 简历排版相关 ==============

export {
  // 类型
  type ResumeBlockType,
  type EmphasisLevel,
  type DisplayStyle,
  type ResumeLayoutHint,
  type ResumeHeaderContent,
  type ResumeSummaryContent,
  type StarHighlight,
  type ResumeExperienceItem,
  type ResumeExperienceContent,
  type ResumeSkillItem,
  type ResumeSkillCategory,
  type ResumeSkillContent,
  type ResumeProjectItem,
  type ResumeProjectContent,
  type ResumeEducationItem,
  type ResumeEducationContent,
  type ResumeBlockContent,
  type ResumeLayoutBlock,
  type LayoutType,
  type ColorTheme,
  type ResumeLayoutConfig,
  type ResumeMeta,
  type LayoutResume,
  // 类型守卫函数
  isHeaderContent,
  isSummaryContent,
  isExperienceContent,
  isSkillContent,
  isProjectContent,
  isEducationContent,
} from './resume-layout';

// ============== 面试相关 ==============

export interface Interview {
  id: string;
  userId: string;
  type: 'mock' | 'preparation';
  status: 'pending' | 'in_progress' | 'completed' | 'aborted';
  jobContext?: Record<string, unknown>;
  questions: InterviewQuestion[];
  transcript?: InterviewTranscript[];
  report?: InterviewReport;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  type: 'technical' | 'behavioral' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  answer?: string;
  score?: number;
  feedback?: QuestionFeedback;
}

export interface QuestionFeedback {
  overallScore: number;
  criteria: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
  strengths: string[];
  improvements: string[];
}

export interface InterviewTranscript {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface InterviewReport {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  criteriaScores: Array<{
    category: string;
    score: number;
    details: string;
  }>;
}

// ============== 订阅相关 ==============

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'basic' | 'pro';
  aiQuota: number;
  resumeQuota: number;
  interviewQuota: number;
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
}

// ============== API 响应 ==============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}
