'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  GraduationCap,
  Briefcase,
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  X,
  Save,
  Loader2,
  MapPin,
  ExternalLink,
} from 'lucide-react';

// 类型定义
interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string | null;
  highlights: string[];
}

interface Project {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string;
  techStack: string[];
  achievements: string[];
  link: string | null;
}

type ActiveSection = 'education' | 'experience' | 'project' | null;

// 空表单
const emptyEducationForm = {
  school: '',
  degree: '',
  major: '',
  startDate: '',
  endDate: '',
  description: '',
};

const emptyExperienceForm = {
  company: '',
  position: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  highlights: '',
};

const emptyProjectForm = {
  name: '',
  role: '',
  startDate: '',
  endDate: '',
  description: '',
  techStack: '',
  achievements: '',
  link: '',
};

export default function ProfilePage() {
  const { toast } = useToast();

  // 数据状态
  const [educations, setEducations] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // UI 状态
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 表单状态
  const [educationForm, setEducationForm] = useState(emptyEducationForm);
  const [experienceForm, setExperienceForm] = useState(emptyExperienceForm);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eduRes, expRes, projRes] = await Promise.all([
        apiClient.get<Education[]>('/users/me/educations'),
        apiClient.get<Experience[]>('/users/me/experiences'),
        apiClient.get<Project[]>('/users/me/projects'),
      ]);
      setEducations(eduRes.data);
      setExperiences(expRes.data);
      setProjects(projRes.data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载个人档案数据',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 教育经历操作
  const handleAddEducation = () => {
    setActiveSection('education');
    setEditingId(null);
    setEducationForm(emptyEducationForm);
  };

  const handleEditEducation = (edu: Education) => {
    setActiveSection('education');
    setEditingId(edu.id);
    setEducationForm({
      school: edu.school,
      degree: edu.degree,
      major: edu.major,
      startDate: edu.startDate.split('T')[0],
      endDate: edu.endDate ? edu.endDate.split('T')[0] : '',
      description: edu.description || '',
    });
  };

  const handleSaveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...educationForm, endDate: educationForm.endDate || null };
      if (editingId) {
        await apiClient.patch(`/users/me/educations/${editingId}`, payload);
        toast({ title: '更新成功', description: '教育经历已更新' });
      } else {
        await apiClient.post('/users/me/educations', payload);
        toast({ title: '添加成功', description: '教育经历已添加' });
      }
      setActiveSection(null);
      loadData();
    } catch (error) {
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('确定要删除这条教育经历吗？')) return;
    try {
      await apiClient.delete(`/users/me/educations/${id}`);
      toast({ title: '删除成功', description: '教育经历已删除' });
      loadData();
    } catch (error) {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  // 工作经历操作
  const handleAddExperience = () => {
    setActiveSection('experience');
    setEditingId(null);
    setExperienceForm(emptyExperienceForm);
  };

  const handleEditExperience = (exp: Experience) => {
    setActiveSection('experience');
    setEditingId(exp.id);
    setExperienceForm({
      company: exp.company,
      position: exp.position,
      location: exp.location || '',
      startDate: exp.startDate.split('T')[0],
      endDate: exp.endDate ? exp.endDate.split('T')[0] : '',
      current: exp.current,
      description: exp.description || '',
      highlights: exp.highlights.join('\n'),
    });
  };

  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        company: experienceForm.company,
        position: experienceForm.position,
        location: experienceForm.location || null,
        startDate: experienceForm.startDate,
        endDate: experienceForm.current ? null : experienceForm.endDate || null,
        current: experienceForm.current,
        description: experienceForm.description || null,
        highlights: experienceForm.highlights.split('\n').filter(Boolean),
      };
      if (editingId) {
        await apiClient.patch(`/users/me/experiences/${editingId}`, payload);
        toast({ title: '更新成功', description: '工作经历已更新' });
      } else {
        await apiClient.post('/users/me/experiences', payload);
        toast({ title: '添加成功', description: '工作经历已添加' });
      }
      setActiveSection(null);
      loadData();
    } catch (error) {
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('确定要删除这条工作经历吗？')) return;
    try {
      await apiClient.delete(`/users/me/experiences/${id}`);
      toast({ title: '删除成功', description: '工作经历已删除' });
      loadData();
    } catch (error) {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  // 项目经历操作
  const handleAddProject = () => {
    setActiveSection('project');
    setEditingId(null);
    setProjectForm(emptyProjectForm);
  };

  const handleEditProject = (proj: Project) => {
    setActiveSection('project');
    setEditingId(proj.id);
    setProjectForm({
      name: proj.name,
      role: proj.role,
      startDate: proj.startDate.split('T')[0],
      endDate: proj.endDate ? proj.endDate.split('T')[0] : '',
      description: proj.description,
      techStack: proj.techStack.join(', '),
      achievements: proj.achievements.join('\n'),
      link: proj.link || '',
    });
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: projectForm.name,
        role: projectForm.role,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate || null,
        description: projectForm.description,
        techStack: projectForm.techStack.split(',').map((s) => s.trim()).filter(Boolean),
        achievements: projectForm.achievements.split('\n').filter(Boolean),
        link: projectForm.link || null,
      };
      if (editingId) {
        await apiClient.patch(`/users/me/projects/${editingId}`, payload);
        toast({ title: '更新成功', description: '项目经历已更新' });
      } else {
        await apiClient.post('/users/me/projects', payload);
        toast({ title: '添加成功', description: '项目经历已添加' });
      }
      setActiveSection(null);
      loadData();
    } catch (error) {
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('确定要删除这个项目经历吗？')) return;
    try {
      await apiClient.delete(`/users/me/projects/${id}`);
      toast({ title: '删除成功', description: '项目经历已删除' });
      loadData();
    } catch (error) {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    }
  };

  const degreeOptions = ['高中', '大专', '本科', '硕士', '博士'];

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });

  const resetForm = () => {
    setActiveSection(null);
    setEditingId(null);
    setEducationForm(emptyEducationForm);
    setExperienceForm(emptyExperienceForm);
    setProjectForm(emptyProjectForm);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">个人档案</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的教育背景、工作经历和项目经历</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        ) : (
          <>
            {/* 教育经历卡片 */}
            <SectionCard
              title="教育经历"
              icon={<GraduationCap className="w-5 h-5 text-primary" />}
              onAdd={handleAddEducation}
              showForm={activeSection === 'education'}
              formContent={
                <form onSubmit={handleSaveEducation} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="学校" required value={educationForm.school} onChange={(v) => setEducationForm({ ...educationForm, school: v })} placeholder="例如：北京大学" />
                    <SelectField label="学历" required value={educationForm.degree} onChange={(v) => setEducationForm({ ...educationForm, degree: v })} options={degreeOptions} />
                    <InputField label="专业" required value={educationForm.major} onChange={(v) => setEducationForm({ ...educationForm, major: v })} placeholder="例如：计算机科学与技术" />
                    <div className="grid grid-cols-2 gap-2">
                      <InputField label="开始时间" required type="date" value={educationForm.startDate} onChange={(v) => setEducationForm({ ...educationForm, startDate: v })} />
                      <InputField label="结束时间" type="date" value={educationForm.endDate} onChange={(v) => setEducationForm({ ...educationForm, endDate: v })} />
                    </div>
                  </div>
                  <TextAreaField label="描述" value={educationForm.description} onChange={(v) => setEducationForm({ ...educationForm, description: v })} placeholder="主修课程、荣誉奖项等（可选）" />
                  <FormButtons onCancel={resetForm} isSaving={isSaving} />
                </form>
              }
              items={educations.map((edu) => ({
                id: edu.id,
                title: edu.school,
                subtitle: `${edu.degree} · ${edu.major}`,
                date: `${formatDate(edu.startDate)} - ${edu.endDate ? formatDate(edu.endDate) : '至今'}`,
                description: edu.description,
                onEdit: () => handleEditEducation(edu),
                onDelete: () => handleDeleteEducation(edu.id),
              }))}
              emptyIcon={<GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />}
              emptyText="暂无教育经历"
            />

            {/* 工作经历卡片 */}
            <SectionCard
              title="工作经历"
              icon={<Briefcase className="w-5 h-5 text-primary" />}
              onAdd={handleAddExperience}
              showForm={activeSection === 'experience'}
              formContent={
                <form onSubmit={handleSaveExperience} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="公司" required value={experienceForm.company} onChange={(v) => setExperienceForm({ ...experienceForm, company: v })} placeholder="例如：阿里巴巴" />
                    <InputField label="职位" required value={experienceForm.position} onChange={(v) => setExperienceForm({ ...experienceForm, position: v })} placeholder="例如：高级前端工程师" />
                    <InputField label="地点" value={experienceForm.location} onChange={(v) => setExperienceForm({ ...experienceForm, location: v })} placeholder="例如：杭州" icon={<MapPin className="w-3 h-3" />} />
                    <div className="grid grid-cols-2 gap-2">
                      <InputField label="开始时间" required type="date" value={experienceForm.startDate} onChange={(v) => setExperienceForm({ ...experienceForm, startDate: v })} />
                      <InputField label="结束时间" type="date" value={experienceForm.endDate} onChange={(v) => setExperienceForm({ ...experienceForm, endDate: v })} disabled={experienceForm.current} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="current"
                      checked={experienceForm.current}
                      onChange={(e) => setExperienceForm({ ...experienceForm, current: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="current" className="text-sm text-gray-700">目前在职</label>
                  </div>
                  <TextAreaField label="工作描述" value={experienceForm.description} onChange={(v) => setExperienceForm({ ...experienceForm, description: v })} placeholder="工作职责描述..." />
                  <TextAreaField label="主要成就" value={experienceForm.highlights} onChange={(v) => setExperienceForm({ ...experienceForm, highlights: v })} placeholder="每行一条成就..." rows={3} />
                  <FormButtons onCancel={resetForm} isSaving={isSaving} />
                </form>
              }
              items={experiences.map((exp) => ({
                id: exp.id,
                title: exp.company,
                subtitle: exp.position,
                date: `${formatDate(exp.startDate)} - ${exp.current ? '至今' : exp.endDate ? formatDate(exp.endDate) : '至今'}`,
                location: exp.location,
                description: exp.description,
                highlights: exp.highlights,
                onEdit: () => handleEditExperience(exp),
                onDelete: () => handleDeleteExperience(exp.id),
              }))}
              emptyIcon={<Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />}
              emptyText="暂无工作经历"
            />

            {/* 项目经历卡片 */}
            <SectionCard
              title="项目经历"
              icon={<FolderKanban className="w-5 h-5 text-primary" />}
              onAdd={handleAddProject}
              showForm={activeSection === 'project'}
              formContent={
                <form onSubmit={handleSaveProject} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="项目名称" required value={projectForm.name} onChange={(v) => setProjectForm({ ...projectForm, name: v })} placeholder="例如：电商平台重构" />
                    <InputField label="担任角色" required value={projectForm.role} onChange={(v) => setProjectForm({ ...projectForm, role: v })} placeholder="例如：技术负责人" />
                    <InputField label="技术栈" value={projectForm.techStack} onChange={(v) => setProjectForm({ ...projectForm, techStack: v })} placeholder="例如：React, TypeScript, Node.js" />
                    <div className="grid grid-cols-2 gap-2">
                      <InputField label="开始时间" required type="date" value={projectForm.startDate} onChange={(v) => setProjectForm({ ...projectForm, startDate: v })} />
                      <InputField label="结束时间" type="date" value={projectForm.endDate} onChange={(v) => setProjectForm({ ...projectForm, endDate: v })} />
                    </div>
                  </div>
                  <InputField label="项目链接" value={projectForm.link} onChange={(v) => setProjectForm({ ...projectForm, link: v })} placeholder="https://..." icon={<ExternalLink className="w-3 h-3" />} />
                  <TextAreaField label="项目描述" required value={projectForm.description} onChange={(v) => setProjectForm({ ...projectForm, description: v })} placeholder="项目背景、目标、规模..." />
                  <TextAreaField label="主要成果" value={projectForm.achievements} onChange={(v) => setProjectForm({ ...projectForm, achievements: v })} placeholder="每行一条成果..." rows={3} />
                  <FormButtons onCancel={resetForm} isSaving={isSaving} />
                </form>
              }
              items={projects.map((proj) => ({
                id: proj.id,
                title: proj.name,
                subtitle: proj.role,
                date: `${formatDate(proj.startDate)} - ${proj.endDate ? formatDate(proj.endDate) : '至今'}`,
                description: proj.description,
                techStack: proj.techStack,
                achievements: proj.achievements,
                link: proj.link,
                onEdit: () => handleEditProject(proj),
                onDelete: () => handleDeleteProject(proj.id),
              }))}
              emptyIcon={<FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-50" />}
              emptyText="暂无项目经历"
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// 通用组件
function InputField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  icon,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 ${icon ? 'pl-8' : ''} py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500`}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  required,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">请选择</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function FormButtons({ onCancel, isSaving }: { onCancel: () => void; isSaving: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        <X className="w-4 h-4 mr-1" />
        取消
      </Button>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
        保存
      </Button>
    </div>
  );
}

interface SectionItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  location?: string | null;
  description?: string | null;
  highlights?: string[];
  techStack?: string[];
  achievements?: string[];
  link?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}

function SectionCard({
  title,
  icon,
  onAdd,
  showForm,
  formContent,
  items,
  emptyIcon,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  onAdd: () => void;
  showForm: boolean;
  formContent: React.ReactNode;
  items: SectionItem[];
  emptyIcon: React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {!showForm && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" />
            添加
          </Button>
        )}
      </div>

      {showForm && formContent}

      {items.length === 0 && !showForm ? (
        <div className="text-center py-8 text-gray-400">
          {emptyIcon}
          <p>{emptyText}</p>
          <p className="text-sm">点击上方"添加"按钮添加</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                    {item.location && (
                      <>
                        <MapPin className="w-3 h-3" />
                        {item.location}
                      </>
                    )}
                  </p>
                  {item.description && <p className="text-sm text-gray-500 mt-2">{item.description}</p>}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {item.highlights.map((h, i) => (
                        <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.techStack && item.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.techStack.map((tech, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      查看项目
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={item.onEdit} className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={item.onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
