/**
 * 岗位关键词面板组件
 * 展示从岗位提取的关键词和匹配分析
 */

'use client';

import React from 'react';
import { JobKeywordExtraction, SkillMatchResult } from '@/lib/api/resumes';
import {
  X,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
  Code,
  Users,
  Target,
  Briefcase,
  Building,
  TrendingUp,
} from 'lucide-react';

interface JobKeywordsPanelProps {
  /** 关键词提取结果 */
  keywords: JobKeywordExtraction | null;
  /** 技能匹配结果 */
  skillMatch: SkillMatchResult | null;
  /** 简历技能列表 */
  resumeSkills: string[];
  /** 关闭面板 */
  onClose: () => void;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 点击添加技能 */
  onAddSkill?: (skill: string) => void;
}

export function JobKeywordsPanel({
  keywords,
  skillMatch,
  resumeSkills,
  onClose,
  isLoading = false,
  onAddSkill,
}: JobKeywordsPanelProps) {
  if (isLoading) {
    return (
      <div className="fixed right-4 top-20 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">岗位关键词</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className="text-gray-500 text-sm">正在分析岗位关键词...</p>
        </div>
      </div>
    );
  }

  if (!keywords) {
    return (
      <div className="fixed right-4 top-20 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">岗位关键词</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Target className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">无法提取关键词</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-20 w-96 max-h-[calc(100vh-120px)] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">岗位关键词</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 行业和经验级别 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">行业</span>
            </div>
            <p className="font-medium text-gray-900 text-sm">
              {keywords.industry || '未识别'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">经验级别</span>
            </div>
            <p className="font-medium text-gray-900 text-sm">
              {getExperienceLabel(keywords.experienceLevel)}
            </p>
          </div>
        </div>

        {/* 技能匹配概览 */}
        {skillMatch && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">技能匹配度</span>
              <span className="text-sm font-bold text-blue-600">
                {skillMatch.matched.length}/{skillMatch.matched.length + skillMatch.missing.length}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    skillMatch.matched.length + skillMatch.missing.length > 0
                      ? (skillMatch.matched.length /
                          (skillMatch.matched.length + skillMatch.missing.length)) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* 技术技能 */}
        <KeywordSection
          title="技术技能"
          icon={Code}
          keywords={keywords.technicalSkills}
          matchedKeywords={skillMatch?.matched || []}
          resumeSkills={resumeSkills}
          onAddSkill={onAddSkill}
        />

        {/* 软技能 */}
        <KeywordSection
          title="软技能"
          icon={Users}
          keywords={keywords.softSkills}
          matchedKeywords={skillMatch?.matched || []}
          resumeSkills={resumeSkills}
          onAddSkill={onAddSkill}
        />

        {/* 硬性要求 */}
        <KeywordSection
          title="硬性要求"
          icon={Target}
          keywords={keywords.requirements}
          matchedKeywords={[]}
          resumeSkills={resumeSkills}
          showMatchStatus={false}
        />

        {/* 核心职责 */}
        <KeywordSection
          title="核心职责"
          icon={Briefcase}
          keywords={keywords.responsibilities}
          matchedKeywords={[]}
          resumeSkills={resumeSkills}
          showMatchStatus={false}
        />

        {/* 推荐添加的技能 */}
        {skillMatch && skillMatch.recommended.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">推荐添加技能</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {skillMatch.recommended.map((skill) => (
                <button
                  key={skill}
                  onClick={() => onAddSkill?.(skill)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white text-green-700 text-xs rounded-full border border-green-300 hover:bg-green-100 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 关键词区块
 */
function KeywordSection({
  title,
  icon: Icon,
  keywords,
  matchedKeywords,
  resumeSkills,
  showMatchStatus = true,
  onAddSkill,
}: {
  title: string;
  icon: React.ElementType;
  keywords: string[];
  matchedKeywords: string[];
  resumeSkills: string[];
  showMatchStatus?: boolean;
  onAddSkill?: (skill: string) => void;
}) {
  if (keywords.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-xs text-gray-400">({keywords.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => {
          const isMatched = matchedKeywords.some(
            (m) => m.toLowerCase() === keyword.toLowerCase(),
          );
          const isInResume = resumeSkills.some(
            (s) => s.toLowerCase() === keyword.toLowerCase(),
          );

          return (
            <span
              key={keyword}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                showMatchStatus
                  ? isMatched || isInResume
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {showMatchStatus && (
                isMatched || isInResume ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )
              )}
              {keyword}
              {!isInResume && showMatchStatus && onAddSkill && (
                <button
                  onClick={() => onAddSkill(keyword)}
                  className="ml-1 hover:bg-white/50 rounded-full p-0.5"
                  title="添加到简历"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 获取经验级别标签
 */
function getExperienceLabel(level: string): string {
  const labels: Record<string, string> = {
    entry: '入门级',
    junior: '初级',
    mid: '中级',
    senior: '高级',
    lead: '技术负责人',
  };
  return labels[level] || level;
}

export default JobKeywordsPanel;
