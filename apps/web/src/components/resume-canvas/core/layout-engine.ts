/**
 * 布局引擎
 * 负责计算简历各元素的位置和大小
 */

import type {
  ResumeContent,
  ResumeElement,
  TextElement,
  SectionHeaderElement,
  ExperienceCardElement,
  SkillTagsElement,
  EducationElement,
  DividerElement,
  LayoutResult,
  PageData,
  ContentSourceType,
} from '../types/resume-canvas.types';
import { A4_PAGE, type ResumeTemplate } from '../types/template.types';
import { TextMeasurer } from './text-measurer';

export class LayoutEngine {
  private measurer: TextMeasurer;
  private template: ResumeTemplate;

  constructor(template: ResumeTemplate) {
    this.template = template;
    this.measurer = new TextMeasurer();
  }

  /**
   * 计算简历布局
   */
  layout(content: ResumeContent): LayoutResult {
    const pages: PageData[] = [];
    let currentPage: PageData = {
      number: 1,
      elements: [],
    };

    let currentY = A4_PAGE.margin.top;
    const contentWidth = A4_PAGE.width - A4_PAGE.margin.left - A4_PAGE.margin.right;

    // 1. 渲染头部（姓名、联系方式）
    const headerResult = this.layoutHeader(content, currentY, contentWidth);
    currentPage.elements.push(...headerResult.elements);
    currentY = headerResult.bottomY + 15;

    // 2. 渲染个人简介
    if (content.summary) {
      const summaryResult = this.layoutSummary(content.summary, currentY, contentWidth);
      currentPage.elements.push(...summaryResult.elements);
      currentY = summaryResult.bottomY + 10;
    }

    // 3. 渲染工作经历
    if (content.experience && content.experience.length > 0) {
      const expResult = this.layoutExperience(content.experience, currentY, contentWidth);
      currentPage.elements.push(...expResult.elements);
      currentY = expResult.bottomY + 10;
    }

    // 4. 渲染技能
    if (content.skills && content.skills.length > 0) {
      const skillsResult = this.layoutSkills(content.skills, content.matchedSkills || [], currentY, contentWidth);
      currentPage.elements.push(...skillsResult.elements);
      currentY = skillsResult.bottomY + 10;
    }

    // 5. 渲染教育经历
    if (content.education && content.education.length > 0) {
      const eduResult = this.layoutEducation(content.education, currentY, contentWidth);
      currentPage.elements.push(...eduResult.elements);
      currentY = eduResult.bottomY + 10;
    }

    // 保存页面
    pages.push(currentPage);

    return {
      pages,
      totalHeight: currentY,
    };
  }

  /**
   * 布局头部
   */
  private layoutHeader(
    content: ResumeContent,
    startY: number,
    contentWidth: number
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;

    // 姓名
    const nameElement: TextElement = {
      id: 'header-name',
      type: 'text',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: 28 * 1.2,
      content: content.name,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'center',
      },
      source: { type: 'profile_original', basedOn: ['profile.name'] },
    };
    elements.push(nameElement);
    currentY += nameElement.height + 8;

    // 职位标题
    if (content.title) {
      const titleElement: TextElement = {
        id: 'header-title',
        type: 'text',
        x: A4_PAGE.margin.left,
        y: currentY,
        width: contentWidth,
        height: 14 * 1.3,
        content: content.title,
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 14,
          fontWeight: 'normal',
          color: '#4b5563',
          lineHeight: 1.3,
          letterSpacing: 0,
          textAlign: 'center',
        },
        source: { type: 'ai_generated', basedOn: ['job.title'] },
      };
      elements.push(titleElement);
      currentY += titleElement.height + 8;
    }

    // 联系方式
    if (content.contact) {
      const contactParts: string[] = [];
      if (content.contact.email) contactParts.push(content.contact.email);
      if (content.contact.phone) contactParts.push(content.contact.phone);
      if (content.contact.location) contactParts.push(content.contact.location);

      if (contactParts.length > 0) {
        const contactElement: TextElement = {
          id: 'header-contact',
          type: 'text',
          x: A4_PAGE.margin.left,
          y: currentY,
          width: contentWidth,
          height: 11 * 1.3,
          content: contactParts.join(' | '),
          style: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 11,
            fontWeight: 'normal',
            color: '#6b7280',
            lineHeight: 1.3,
            letterSpacing: 0,
            textAlign: 'center',
          },
          source: { type: 'profile_original', basedOn: ['profile.contact'] },
        };
        elements.push(contactElement);
        currentY += contactElement.height + 10;
      }
    }

    // 分割线
    const divider: DividerElement = {
      id: 'header-divider',
      type: 'divider',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: 1,
      color: '#2563eb',
      thickness: 2,
      style: 'solid',
    };
    elements.push(divider);
    currentY += 10;

    return { elements, bottomY: currentY };
  }

  /**
   * 布局个人简介
   */
  private layoutSummary(
    summary: string,
    startY: number,
    contentWidth: number
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'summary-header',
      type: 'section-header',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: 16 * 1.3,
      title: '个人简介',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        lineHeight: 1.3,
        letterSpacing: 0,
        textAlign: 'left',
        accentColor: '#2563eb',
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + 10;

    // 简介内容
    const contentElement: TextElement = {
      id: 'summary-content',
      type: 'text',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: 11 * 1.6 * 3, // 估算高度
      content: summary,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 11,
        fontWeight: 'normal',
        color: '#374151',
        lineHeight: 1.6,
        letterSpacing: 0,
        textAlign: 'left',
      },
      source: { type: 'ai_generated', basedOn: ['profile.highlights', 'job.requirements'] },
    };
    elements.push(contentElement);
    currentY += contentElement.height + 5;

    return { elements, bottomY: currentY };
  }

  /**
   * 布局工作经历
   */
  private layoutExperience(
    experiences: ResumeContent['experience'],
    startY: number,
    contentWidth: number
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'experience-header',
      type: 'section-header',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: 16 * 1.3,
      title: '工作经历',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        lineHeight: 1.3,
        letterSpacing: 0,
        textAlign: 'left',
        accentColor: '#2563eb',
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + 15;

    // 各工作经历
    for (let i = 0; i < experiences.length; i++) {
      const exp = experiences[i];
      const cardHeight = 60 + exp.highlights.length * 18;

      const cardElement: ExperienceCardElement = {
        id: `experience-${i}`,
        type: 'experience-card',
        x: A4_PAGE.margin.left,
        y: currentY,
        width: contentWidth,
        height: cardHeight,
        position: exp.position,
        company: exp.company,
        period: exp.period,
        location: exp.location,
        highlights: exp.highlights,
        style: {
          title: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 13,
            fontWeight: 'bold',
            color: '#1f2937',
            lineHeight: 1.3,
            letterSpacing: 0,
            textAlign: 'left',
          },
          subtitle: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 11,
            fontWeight: 'normal',
            color: '#6b7280',
            lineHeight: 1.3,
            letterSpacing: 0,
            textAlign: 'left',
          },
          highlight: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 11,
            fontWeight: 'normal',
            color: '#374151',
            lineHeight: 1.6,
            letterSpacing: 0,
            textAlign: 'left',
          },
          bulletColor: '#2563eb',
        },
      };
      elements.push(cardElement);
      currentY += cardHeight + 15;
    }

    return { elements, bottomY: currentY };
  }

  /**
   * 布局技能
   */
  private layoutSkills(
    skills: string[],
    matchedSkills: string[],
    startY: number,
    contentWidth: number
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'skills-header',
      type: 'section-header',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: 16 * 1.3,
      title: '专业技能',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        lineHeight: 1.3,
        letterSpacing: 0,
        textAlign: 'left',
        accentColor: '#2563eb',
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + 15;

    // 技能标签
    const matchedSet = new Set(matchedSkills);
    const tagHeight = 30;
    const tagsElement: SkillTagsElement = {
      id: 'skills-tags',
      type: 'skill-tags',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: tagHeight,
      skills: skills.map((skill) => ({
        name: skill,
        matched: matchedSet.has(skill),
      })),
      style: {
        tag: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 11,
          fontWeight: 'normal',
          color: '#1e40af',
          lineHeight: 1.3,
          letterSpacing: 0,
          textAlign: 'left',
          backgroundColor: '#eff6ff',
          borderRadius: 20,
          paddingX: 12,
          paddingY: 6,
        },
        gap: 8,
      },
    };
    elements.push(tagsElement);
    currentY += tagHeight + 10;

    return { elements, bottomY: currentY };
  }

  /**
   * 布局教育经历
   */
  private layoutEducation(
    education: ResumeContent['education'],
    startY: number,
    contentWidth: number
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'education-header',
      type: 'section-header',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: 16 * 1.3,
      title: '教育经历',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        lineHeight: 1.3,
        letterSpacing: 0,
        textAlign: 'left',
        accentColor: '#2563eb',
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + 15;

    // 各教育经历
    for (let i = 0; i < education.length; i++) {
      const edu = education[i];
      const eduElement: EducationElement = {
        id: `education-${i}`,
        type: 'education-item',
        x: A4_PAGE.margin.left,
        y: currentY,
        width: contentWidth,
        height: 40,
        school: edu.school,
        major: edu.major,
        degree: edu.degree,
        period: edu.period,
        style: {
          school: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 13,
            fontWeight: 'bold',
            color: '#1f2937',
            lineHeight: 1.3,
            letterSpacing: 0,
            textAlign: 'left',
          },
          detail: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 11,
            fontWeight: 'normal',
            color: '#6b7280',
            lineHeight: 1.3,
            letterSpacing: 0,
            textAlign: 'left',
          },
        },
      };
      elements.push(eduElement);
      currentY += 50;
    }

    return { elements, bottomY: currentY };
  }
}
