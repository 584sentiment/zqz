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
  SkillProgressElement,
  EducationElement,
  DividerElement,
  LayoutResult,
  PageData,
  ContentSourceType,
  SidebarContainerElement,
  HeaderBannerElement,
} from '../types/resume-canvas.types';
import { A4_PAGE, type ResumeTemplate, type LayoutType } from '../types/template.types';
import { TextMeasurer } from './text-measurer';

export class LayoutEngine {
  private measurer: TextMeasurer;
  private template: ResumeTemplate;

  constructor(template: ResumeTemplate) {
    this.template = template;
    this.measurer = new TextMeasurer();
  }

  /**
   * 计算简历布局 - 根据布局类型分发
   */
  layout(content: ResumeContent): LayoutResult {
    const layoutType = this.template.layout.layoutType || 'single-column';

    switch (layoutType) {
      case 'left-sidebar':
        return this.layoutWithSidebar(content);
      case 'top-banner':
        return this.layoutWithTopBanner(content);
      case 'two-column':
        return this.layoutTwoColumn(content);
      case 'single-column':
      default:
        return this.layoutSingleColumn(content);
    }
  }

  /**
   * 单栏布局
   */
  private layoutSingleColumn(content: ResumeContent): LayoutResult {
    const pages: PageData[] = [];
    let currentPage: PageData = {
      number: 1,
      elements: [],
    };

    let currentY = A4_PAGE.margin.top;
    const contentWidth = A4_PAGE.width - A4_PAGE.margin.left - A4_PAGE.margin.right;
    const styles = this.template.styles;
    const layout = this.template.layout;
    const sectionGap = layout.sectionGap ?? styles.spacing.sectionGap;

    // 1. 渲染头部（姓名、联系方式）
    const headerResult = this.layoutHeader(content, currentY, contentWidth);
    currentPage.elements.push(...headerResult.elements);
    currentY = headerResult.bottomY + sectionGap;

    // 2. 渲染个人简介
    if (content.summary) {
      const summaryResult = this.layoutSummary(content.summary, currentY, contentWidth);
      currentPage.elements.push(...summaryResult.elements);
      currentY = summaryResult.bottomY + sectionGap;
    }

    // 3. 根据 layout.sectionOrder 渲染各个区块
    for (const section of layout.sectionOrder) {
      switch (section) {
        case 'experience':
          if (content.experience && content.experience.length > 0) {
            const expResult = this.layoutExperience(content.experience, currentY, contentWidth);
            currentPage.elements.push(...expResult.elements);
            currentY = expResult.bottomY + sectionGap;
          }
          break;
        case 'skills':
          if (content.skills && content.skills.length > 0) {
            const skillsResult = this.layoutSkills(content.skills, content.matchedSkills || [], currentY, contentWidth);
            currentPage.elements.push(...skillsResult.elements);
            currentY = skillsResult.bottomY + sectionGap;
          }
          break;
        case 'education':
          if (content.education && content.education.length > 0) {
            const eduResult = this.layoutEducation(content.education, currentY, contentWidth);
            currentPage.elements.push(...eduResult.elements);
            currentY = eduResult.bottomY + sectionGap;
          }
          break;
        case 'projects':
          if (content.projects && content.projects.length > 0) {
            // TODO: 实现项目区块
          }
          break;
      }
    }

    // 保存页面
    pages.push(currentPage);

    return {
      pages,
      totalHeight: currentY,
    };
  }

  /**
   * 左侧边栏布局
   */
  private layoutWithSidebar(content: ResumeContent): LayoutResult {
    const pages: PageData[] = [];
    const sidebarConfig = this.template.layout.sidebar!;
    const styles = this.template.styles;
    const sectionGap = this.template.layout.sectionGap ?? styles.spacing.sectionGap;

    const sidebarWidth = A4_PAGE.contentWidth * sidebarConfig.widthRatio;
    const mainWidth = A4_PAGE.contentWidth * (1 - sidebarConfig.widthRatio) - 30;
    const mainX = A4_PAGE.margin.left + sidebarWidth + 20;

    let currentPage: PageData = { number: 1, elements: [] };
    let mainY = A4_PAGE.margin.top;
    let sidebarY = A4_PAGE.margin.top;

    // 1. 创建侧边栏容器
    const sidebarChildren: ResumeElement[] = [];
    let sidebarContentY = sidebarConfig.padding;

    // 2. 在侧边栏渲染姓名和联系方式
    if (content.name) {
      const nameElement: TextElement = {
        id: 'sidebar-name',
        type: 'text',
        x: sidebarConfig.padding,
        y: sidebarContentY,
        width: sidebarWidth - sidebarConfig.padding * 2,
        height: styles.header.name.fontSize * styles.header.name.lineHeight,
        content: content.name,
        style: {
          ...styles.header.name,
          color: sidebarConfig.textColor || styles.header.name.color,
          textAlign: 'left',
        },
        source: { type: 'profile_original', basedOn: ['profile.name'] },
      };
      sidebarChildren.push(nameElement);
      sidebarContentY += nameElement.height + 15;
    }

    // 职位标题
    if (content.title && styles.header.title) {
      const titleElement: TextElement = {
        id: 'sidebar-title',
        type: 'text',
        x: sidebarConfig.padding,
        y: sidebarContentY,
        width: sidebarWidth - sidebarConfig.padding * 2,
        height: styles.header.title.fontSize * styles.header.title.lineHeight,
        content: content.title,
        style: {
          ...styles.header.title,
          color: sidebarConfig.textColor ? `${sidebarConfig.textColor}cc` : styles.header.title.color,
          textAlign: 'left',
        },
        source: { type: 'ai_generated', basedOn: ['job.title'] },
      };
      sidebarChildren.push(titleElement);
      sidebarContentY += titleElement.height + 20;
    }

    // 联系方式
    if (content.contact) {
      const contactParts: string[] = [];
      if (content.contact.email) contactParts.push(content.contact.email);
      if (content.contact.phone) contactParts.push(content.contact.phone);
      if (content.contact.location) contactParts.push(content.contact.location);

      if (contactParts.length > 0 && styles.header.contact) {
        const contactElement: TextElement = {
          id: 'sidebar-contact',
          type: 'text',
          x: sidebarConfig.padding,
          y: sidebarContentY,
          width: sidebarWidth - sidebarConfig.padding * 2,
          height: styles.header.contact.fontSize * styles.header.contact.lineHeight * contactParts.length,
          content: contactParts.join('\n'),
          style: {
            ...styles.header.contact,
            color: sidebarConfig.textColor ? `${sidebarConfig.textColor}aa` : styles.header.contact.color,
            textAlign: 'left',
          },
          source: { type: 'profile_original', basedOn: ['profile.contact'] },
        };
        sidebarChildren.push(contactElement);
        sidebarContentY += contactElement.height + 25;
      }
    }

    // 侧边栏区块
    for (const section of sidebarConfig.sections) {
      if (section === 'skills' && content.skills && content.skills.length > 0) {
        const skillsResult = this.layoutSidebarSkills(
          content.skills,
          content.matchedSkills || [],
          sidebarContentY,
          sidebarWidth - sidebarConfig.padding * 2,
          sidebarConfig.textColor
        );
        sidebarChildren.push(...skillsResult.elements);
        sidebarContentY = skillsResult.bottomY + 20;
      }
      if (section === 'education' && content.education && content.education.length > 0) {
        const eduResult = this.layoutSidebarEducation(
          content.education,
          sidebarContentY,
          sidebarWidth - sidebarConfig.padding * 2,
          sidebarConfig.textColor
        );
        sidebarChildren.push(...eduResult.elements);
        sidebarContentY = eduResult.bottomY + 20;
      }
    }

    // 侧边栏背景
    const sidebarBg: SidebarContainerElement = {
      id: 'sidebar-container',
      type: 'sidebar',
      x: A4_PAGE.margin.left,
      y: A4_PAGE.margin.top,
      width: sidebarWidth,
      height: Math.max(A4_PAGE.contentHeight, sidebarContentY + sidebarConfig.padding),
      backgroundColor: sidebarConfig.backgroundColor,
      padding: sidebarConfig.padding,
      children: sidebarChildren,
    };
    currentPage.elements.push(sidebarBg);

    // 3. 在主区域渲染主要内容
    // 主区域头部（姓名和职位）
    if (content.name) {
      const mainNameElement: TextElement = {
        id: 'main-name',
        type: 'text',
        x: mainX,
        y: mainY,
        width: mainWidth,
        height: styles.header.name.fontSize * styles.header.name.lineHeight,
        content: content.name,
        style: {
          ...styles.header.name,
          textAlign: 'left',
        },
        source: { type: 'profile_original', basedOn: ['profile.name'] },
      };
      currentPage.elements.push(mainNameElement);
      mainY += mainNameElement.height + 8;
    }

    if (content.title && styles.header.title) {
      const mainTitleElement: TextElement = {
        id: 'main-title',
        type: 'text',
        x: mainX,
        y: mainY,
        width: mainWidth,
        height: styles.header.title.fontSize * styles.header.title.lineHeight,
        content: content.title,
        style: {
          ...styles.header.title,
          textAlign: 'left',
        },
        source: { type: 'ai_generated', basedOn: ['job.title'] },
      };
      currentPage.elements.push(mainTitleElement);
      mainY += mainTitleElement.height + sectionGap;
    }

    // 主区块（排除侧边栏已包含的）
    const mainSections = this.template.layout.sectionOrder.filter(
      s => !sidebarConfig.sections.includes(s)
    );

    for (const section of mainSections) {
      switch (section) {
        case 'experience':
          if (content.experience && content.experience.length > 0) {
            const expResult = this.layoutExperience(content.experience, mainY, mainWidth, mainX);
            currentPage.elements.push(...expResult.elements);
            mainY = expResult.bottomY + sectionGap;
          }
          break;
        case 'skills':
          if (content.skills && content.skills.length > 0) {
            const skillsResult = this.layoutSkills(content.skills, content.matchedSkills || [], mainY, mainWidth, mainX);
            currentPage.elements.push(...skillsResult.elements);
            mainY = skillsResult.bottomY + sectionGap;
          }
          break;
        case 'education':
          if (content.education && content.education.length > 0) {
            const eduResult = this.layoutEducation(content.education, mainY, mainWidth, mainX);
            currentPage.elements.push(...eduResult.elements);
            mainY = eduResult.bottomY + sectionGap;
          }
          break;
        case 'projects':
          if (content.projects && content.projects.length > 0) {
            // TODO: 实现项目区块
          }
          break;
      }
    }

    pages.push(currentPage);
    return { pages, totalHeight: Math.max(mainY, sidebarContentY + sidebarConfig.padding) };
  }

  /**
   * 顶部横幅布局
   */
  private layoutWithTopBanner(content: ResumeContent): LayoutResult {
    const pages: PageData[] = [];
    const bannerConfig = this.template.layout.topBanner!;
    const styles = this.template.styles;
    const sectionGap = this.template.layout.sectionGap ?? styles.spacing.sectionGap;

    let currentPage: PageData = { number: 1, elements: [] };
    let currentY = A4_PAGE.margin.top;

    // 1. 创建横幅容器
    const bannerChildren: ResumeElement[] = [];
    let bannerContentY = bannerConfig.padding;

    // 根据布局方向渲染头部信息
    if (bannerConfig.layout === 'vertical') {
      // 垂直布局：姓名、职位、联系方式上下排列
      if (content.name) {
        const nameElement: TextElement = {
          id: 'banner-name',
          type: 'text',
          x: bannerConfig.padding,
          y: bannerContentY,
          width: A4_PAGE.contentWidth,
          height: styles.header.name.fontSize * styles.header.name.lineHeight,
          content: content.name,
          style: {
            ...styles.header.name,
            textAlign: 'center',
          },
          source: { type: 'profile_original', basedOn: ['profile.name'] },
        };
        bannerChildren.push(nameElement);
        bannerContentY += nameElement.height + 10;
      }

      if (content.title && styles.header.title) {
        const titleElement: TextElement = {
          id: 'banner-title',
          type: 'text',
          x: bannerConfig.padding,
          y: bannerContentY,
          width: A4_PAGE.contentWidth,
          height: styles.header.title.fontSize * styles.header.title.lineHeight,
          content: content.title,
          style: {
            ...styles.header.title,
            textAlign: 'center',
          },
          source: { type: 'ai_generated', basedOn: ['job.title'] },
        };
        bannerChildren.push(titleElement);
        bannerContentY += titleElement.height + 10;
      }

      if (content.contact && styles.header.contact) {
        const contactParts: string[] = [];
        if (content.contact.email) contactParts.push(content.contact.email);
        if (content.contact.phone) contactParts.push(content.contact.phone);
        if (content.contact.location) contactParts.push(content.contact.location);

        if (contactParts.length > 0) {
          const contactElement: TextElement = {
            id: 'banner-contact',
            type: 'text',
            x: bannerConfig.padding,
            y: bannerContentY,
            width: A4_PAGE.contentWidth,
            height: styles.header.contact.fontSize * styles.header.contact.lineHeight,
            content: contactParts.join(' | '),
            style: {
              ...styles.header.contact,
              textAlign: 'center',
            },
            source: { type: 'profile_original', basedOn: ['profile.contact'] },
          };
          bannerChildren.push(contactElement);
        }
      }
    }

    // 横幅背景
    const bannerBg: HeaderBannerElement = {
      id: 'header-banner',
      type: 'header-banner',
      x: this.template.layout.header.fullBleed ? 0 : A4_PAGE.margin.left,
      y: currentY,
      width: this.template.layout.header.fullBleed ? A4_PAGE.width : A4_PAGE.contentWidth,
      height: bannerConfig.height,
      decoration: {
        type: bannerConfig.decoration.type,
        primaryColor: bannerConfig.decoration.primaryColor,
        secondaryColor: bannerConfig.decoration.secondaryColor,
        opacity: bannerConfig.decoration.opacity,
        borderRadius: bannerConfig.decoration.borderRadius,
        patternSize: bannerConfig.decoration.patternSize,
        height: bannerConfig.decoration.height,
      },
      children: bannerChildren,
    };
    currentPage.elements.push(bannerBg);

    currentY = bannerConfig.height + 20;

    // 2. 渲染剩余区块
    for (const section of this.template.layout.sectionOrder) {
      switch (section) {
        case 'experience':
          if (content.experience && content.experience.length > 0) {
            const expResult = this.layoutExperience(content.experience, currentY, A4_PAGE.contentWidth);
            currentPage.elements.push(...expResult.elements);
            currentY = expResult.bottomY + sectionGap;
          }
          break;
        case 'skills':
          if (content.skills && content.skills.length > 0) {
            const skillsResult = this.layoutSkills(content.skills, content.matchedSkills || [], currentY, A4_PAGE.contentWidth);
            currentPage.elements.push(...skillsResult.elements);
            currentY = skillsResult.bottomY + sectionGap;
          }
          break;
        case 'education':
          if (content.education && content.education.length > 0) {
            const eduResult = this.layoutEducation(content.education, currentY, A4_PAGE.contentWidth);
            currentPage.elements.push(...eduResult.elements);
            currentY = eduResult.bottomY + sectionGap;
          }
          break;
        case 'projects':
          if (content.projects && content.projects.length > 0) {
            // TODO: 实现项目区块
          }
          break;
      }
    }

    pages.push(currentPage);
    return { pages, totalHeight: currentY };
  }

  /**
   * 双栏布局
   */
  private layoutTwoColumn(content: ResumeContent): LayoutResult {
    const pages: PageData[] = [];
    const twoColumnConfig = this.template.layout.twoColumn!;
    const styles = this.template.styles;
    const sectionGap = this.template.layout.sectionGap ?? styles.spacing.sectionGap;

    let currentPage: PageData = { number: 1, elements: [] };

    const leftWidth = A4_PAGE.contentWidth * twoColumnConfig.leftRatio - twoColumnConfig.gap / 2;
    const rightWidth = A4_PAGE.contentWidth * (1 - twoColumnConfig.leftRatio) - twoColumnConfig.gap / 2;
    const rightX = A4_PAGE.margin.left + leftWidth + twoColumnConfig.gap;

    // 1. 渲染头部（跨双栏）
    const headerResult = this.layoutHeader(content, A4_PAGE.margin.top, A4_PAGE.contentWidth);
    currentPage.elements.push(...headerResult.elements);
    const headerBottom = headerResult.bottomY + sectionGap;

    // 2. 左栏
    let leftY = headerBottom;
    for (const section of twoColumnConfig.leftSections) {
      switch (section) {
        case 'experience':
          if (content.experience && content.experience.length > 0) {
            const result = this.layoutExperience(content.experience, leftY, leftWidth, A4_PAGE.margin.left);
            currentPage.elements.push(...result.elements);
            leftY = result.bottomY + sectionGap;
          }
          break;
        case 'skills':
          if (content.skills && content.skills.length > 0) {
            const result = this.layoutSkills(content.skills, content.matchedSkills || [], leftY, leftWidth, A4_PAGE.margin.left);
            currentPage.elements.push(...result.elements);
            leftY = result.bottomY + sectionGap;
          }
          break;
        case 'education':
          if (content.education && content.education.length > 0) {
            const result = this.layoutEducation(content.education, leftY, leftWidth, A4_PAGE.margin.left);
            currentPage.elements.push(...result.elements);
            leftY = result.bottomY + sectionGap;
          }
          break;
      }
    }

    // 3. 右栏
    let rightY = headerBottom;
    for (const section of twoColumnConfig.rightSections) {
      switch (section) {
        case 'experience':
          if (content.experience && content.experience.length > 0) {
            const result = this.layoutExperience(content.experience, rightY, rightWidth, rightX);
            currentPage.elements.push(...result.elements);
            rightY = result.bottomY + sectionGap;
          }
          break;
        case 'skills':
          if (content.skills && content.skills.length > 0) {
            const result = this.layoutSkills(content.skills, content.matchedSkills || [], rightY, rightWidth, rightX);
            currentPage.elements.push(...result.elements);
            rightY = result.bottomY + sectionGap;
          }
          break;
        case 'education':
          if (content.education && content.education.length > 0) {
            const result = this.layoutEducation(content.education, rightY, rightWidth, rightX);
            currentPage.elements.push(...result.elements);
            rightY = result.bottomY + sectionGap;
          }
          break;
      }
    }

    pages.push(currentPage);
    return { pages, totalHeight: Math.max(leftY, rightY) };
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
    const styles = this.template.styles;
    const headerStyle = styles.header;
    const layout = this.template.layout;

    // 姓名
    const nameElement: TextElement = {
      id: 'header-name',
      type: 'text',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: headerStyle.name.fontSize * headerStyle.name.lineHeight,
      content: content.name,
      style: {
        fontFamily: headerStyle.name.fontFamily,
        fontSize: headerStyle.name.fontSize,
        fontWeight: headerStyle.name.fontWeight,
        color: headerStyle.name.color,
        lineHeight: headerStyle.name.lineHeight,
        letterSpacing: headerStyle.name.letterSpacing,
        textAlign: layout.header.align,
      },
      source: { type: 'profile_original', basedOn: ['profile.name'] },
    };
    elements.push(nameElement);
    currentY += nameElement.height + 8;

    // 职位标题
    if (content.title && headerStyle.title) {
      const titleElement: TextElement = {
        id: 'header-title',
        type: 'text',
        x: A4_PAGE.margin.left,
        y: currentY,
        width: contentWidth,
        height: headerStyle.title.fontSize * headerStyle.title.lineHeight,
        content: content.title,
        style: {
          fontFamily: headerStyle.title.fontFamily,
          fontSize: headerStyle.title.fontSize,
          fontWeight: headerStyle.title.fontWeight,
          color: headerStyle.title.color,
          lineHeight: headerStyle.title.lineHeight,
          letterSpacing: headerStyle.title.letterSpacing,
          textAlign: layout.header.align,
        },
        source: { type: 'ai_generated', basedOn: ['job.title'] },
      };
      elements.push(titleElement);
      currentY += titleElement.height + 8;
    }

    // 联系方式
    if (content.contact && headerStyle.contact) {
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
          height: headerStyle.contact.fontSize * headerStyle.contact.lineHeight,
          content: contactParts.join(' | '),
          style: {
            fontFamily: headerStyle.contact.fontFamily,
            fontSize: headerStyle.contact.fontSize,
            fontWeight: headerStyle.contact.fontWeight,
            color: headerStyle.contact.color,
            lineHeight: headerStyle.contact.lineHeight,
            letterSpacing: headerStyle.contact.letterSpacing,
            textAlign: layout.header.align,
          },
          source: { type: 'profile_original', basedOn: ['profile.contact'] },
        };
        elements.push(contactElement);
        currentY += contactElement.height + 10;
      }
    }

    // 分割线
    if (layout.header.showDivider) {
      const divider: DividerElement = {
        id: 'header-divider',
        type: 'divider',
        x: A4_PAGE.margin.left,
        y: currentY,
        width: contentWidth,
        height: 1,
        color: styles.colors.primary,
        thickness: 2,
        style: 'solid',
      };
      elements.push(divider);
      currentY += 10;
    }

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
    const styles = this.template.styles;
    const sectionStyle = styles.section;
    const bodyStyle = styles.body;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'summary-header',
      type: 'section-header',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: sectionStyle.title.fontSize * sectionStyle.title.lineHeight,
      title: '个人简介',
      style: {
        fontFamily: sectionStyle.title.fontFamily,
        fontSize: sectionStyle.title.fontSize,
        fontWeight: sectionStyle.title.fontWeight,
        color: sectionStyle.title.color,
        lineHeight: sectionStyle.title.lineHeight,
        letterSpacing: sectionStyle.title.letterSpacing,
        textAlign: sectionStyle.title.textAlign,
        accentColor: sectionStyle.accentColor || styles.colors.primary,
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + styles.spacing.paragraphGap;

    // 简介内容
    const contentElement: TextElement = {
      id: 'summary-content',
      type: 'text',
      x: A4_PAGE.margin.left,
      y: currentY,
      width: contentWidth,
      height: bodyStyle.normal.fontSize * bodyStyle.normal.lineHeight * 3, // 估算高度
      content: summary,
      style: {
        fontFamily: bodyStyle.normal.fontFamily,
        fontSize: bodyStyle.normal.fontSize,
        fontWeight: bodyStyle.normal.fontWeight,
        color: bodyStyle.normal.color,
        lineHeight: bodyStyle.normal.lineHeight,
        letterSpacing: bodyStyle.normal.letterSpacing,
        textAlign: bodyStyle.normal.textAlign,
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
    contentWidth: number,
    startX: number = A4_PAGE.margin.left
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;
    const styles = this.template.styles;
    const sectionStyle = styles.section;
    const bodyStyle = styles.body;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'experience-header',
      type: 'section-header',
      x: startX,
      y: currentY,
      width: contentWidth,
      height: sectionStyle.title.fontSize * sectionStyle.title.lineHeight,
      title: '工作经历',
      style: {
        fontFamily: sectionStyle.title.fontFamily,
        fontSize: sectionStyle.title.fontSize,
        fontWeight: sectionStyle.title.fontWeight,
        color: sectionStyle.title.color,
        lineHeight: sectionStyle.title.lineHeight,
        letterSpacing: sectionStyle.title.letterSpacing,
        textAlign: sectionStyle.title.textAlign,
        accentColor: sectionStyle.accentColor || styles.colors.primary,
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + styles.spacing.listItemGap;

    // 各工作经历
    for (let i = 0; i < experiences.length; i++) {
      const exp = experiences[i];
      const cardHeight = 60 + (exp.highlights?.length || 0) * 18;

      const cardElement: ExperienceCardElement = {
        id: `experience-${i}`,
        type: 'experience-card',
        x: startX,
        y: currentY,
        width: contentWidth,
        height: cardHeight,
        position: exp.position,
        company: exp.company,
        period: exp.period,
        location: exp.location,
        highlights: exp.highlights || [],
        style: {
          title: {
            fontFamily: bodyStyle.bold?.fontFamily || bodyStyle.normal.fontFamily,
            fontSize: bodyStyle.bold?.fontSize || bodyStyle.normal.fontSize + 2,
            fontWeight: bodyStyle.bold?.fontWeight || 'bold',
            color: bodyStyle.bold?.color || styles.colors.text.primary,
            lineHeight: bodyStyle.bold?.lineHeight || 1.4,
            letterSpacing: bodyStyle.bold?.letterSpacing || 0,
            textAlign: 'left',
          },
          subtitle: {
            fontFamily: bodyStyle.small?.fontFamily || bodyStyle.normal.fontFamily,
            fontSize: bodyStyle.small?.fontSize || bodyStyle.normal.fontSize - 1,
            fontWeight: bodyStyle.small?.fontWeight || 'normal',
            color: bodyStyle.small?.color || styles.colors.text.muted,
            lineHeight: bodyStyle.small?.lineHeight || 1.3,
            letterSpacing: bodyStyle.small?.letterSpacing || 0,
            textAlign: 'left',
          },
          highlight: {
            fontFamily: bodyStyle.normal.fontFamily,
            fontSize: bodyStyle.normal.fontSize,
            fontWeight: bodyStyle.normal.fontWeight,
            color: bodyStyle.normal.color,
            lineHeight: bodyStyle.normal.lineHeight,
            letterSpacing: bodyStyle.normal.letterSpacing,
            textAlign: 'left',
          },
          bulletColor: sectionStyle.accentColor || styles.colors.primary,
        },
      };
      elements.push(cardElement);
      currentY += cardHeight + styles.spacing.listItemGap;
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
    contentWidth: number,
    startX: number = A4_PAGE.margin.left
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;
    const styles = this.template.styles;
    const sectionStyle = styles.section;
    const colors = styles.colors;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'skills-header',
      type: 'section-header',
      x: startX,
      y: currentY,
      width: contentWidth,
      height: sectionStyle.title.fontSize * sectionStyle.title.lineHeight,
      title: '专业技能',
      style: {
        fontFamily: sectionStyle.title.fontFamily,
        fontSize: sectionStyle.title.fontSize,
        fontWeight: sectionStyle.title.fontWeight,
        color: sectionStyle.title.color,
        lineHeight: sectionStyle.title.lineHeight,
        letterSpacing: sectionStyle.title.letterSpacing,
        textAlign: sectionStyle.title.textAlign,
        accentColor: sectionStyle.accentColor || colors.primary,
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + styles.spacing.listItemGap;

    // 技能标签
    const matchedSet = new Set(matchedSkills);
    const tagHeight = 30;
    const tagsElement: SkillTagsElement = {
      id: 'skills-tags',
      type: 'skill-tags',
      x: startX,
      y: currentY,
      width: contentWidth,
      height: tagHeight,
      skills: skills.map((skill) => ({
        name: skill,
        matched: matchedSet.has(skill),
      })),
      style: {
        tag: {
          fontFamily: styles.body.normal.fontFamily,
          fontSize: styles.body.normal.fontSize,
          fontWeight: 'normal',
          color: colors.primary,
          lineHeight: 1.3,
          letterSpacing: 0,
          textAlign: 'left',
          backgroundColor: colors.background.tag,
          borderRadius: 20,
          paddingX: 12,
          paddingY: 6,
        },
        gap: styles.spacing.tagGap,
      },
    };
    elements.push(tagsElement);
    currentY += tagHeight + 10;

    return { elements, bottomY: currentY };
  }

  /**
   * 布局侧边栏技能（垂直列表样式）
   */
  private layoutSidebarSkills(
    skills: string[],
    matchedSkills: string[],
    startY: number,
    contentWidth: number,
    textColor?: string
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;
    const styles = this.template.styles;
    const sectionStyle = styles.section;
    const colors = styles.colors;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'sidebar-skills-header',
      type: 'section-header',
      x: 0,
      y: currentY,
      width: contentWidth,
      height: sectionStyle.title.fontSize * sectionStyle.title.lineHeight,
      title: '专业技能',
      style: {
        fontFamily: sectionStyle.title.fontFamily,
        fontSize: sectionStyle.title.fontSize - 2,
        fontWeight: sectionStyle.title.fontWeight,
        color: textColor || sectionStyle.title.color,
        lineHeight: sectionStyle.title.lineHeight,
        letterSpacing: sectionStyle.title.letterSpacing,
        textAlign: 'left',
        accentColor: textColor || colors.primary,
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + 10;

    // 技能列表（侧边栏使用列表样式）
    const matchedSet = new Set(matchedSkills);
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const skillElement: TextElement = {
        id: `sidebar-skill-${i}`,
        type: 'text',
        x: 0,
        y: currentY,
        width: contentWidth,
        height: styles.body.small?.fontSize || 10,
        content: `• ${skill}`,
        style: {
          fontFamily: styles.body.small?.fontFamily || styles.body.normal.fontFamily,
          fontSize: styles.body.small?.fontSize || 10,
          fontWeight: matchedSet.has(skill) ? 'bold' : 'normal',
          color: textColor ? `${textColor}dd` : styles.body.small?.color || styles.colors.text.muted,
          lineHeight: 1.5,
          letterSpacing: 0,
          textAlign: 'left',
        },
        source: { type: 'profile_original', basedOn: ['profile.skills'] },
      };
      elements.push(skillElement);
      currentY += skillElement.height + 4;
    }

    return { elements, bottomY: currentY };
  }

  /**
   * 布局侧边栏教育经历
   */
  private layoutSidebarEducation(
    education: ResumeContent['education'],
    startY: number,
    contentWidth: number,
    textColor?: string
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;
    const styles = this.template.styles;
    const sectionStyle = styles.section;
    const bodyStyle = styles.body;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'sidebar-education-header',
      type: 'section-header',
      x: 0,
      y: currentY,
      width: contentWidth,
      height: sectionStyle.title.fontSize * sectionStyle.title.lineHeight,
      title: '教育经历',
      style: {
        fontFamily: sectionStyle.title.fontFamily,
        fontSize: sectionStyle.title.fontSize - 2,
        fontWeight: sectionStyle.title.fontWeight,
        color: textColor || sectionStyle.title.color,
        lineHeight: sectionStyle.title.lineHeight,
        letterSpacing: sectionStyle.title.letterSpacing,
        textAlign: 'left',
        accentColor: textColor || styles.colors.primary,
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + 10;

    // 教育经历列表
    for (let i = 0; i < education.length; i++) {
      const edu = education[i];

      // 学校名称
      const schoolElement: TextElement = {
        id: `sidebar-edu-school-${i}`,
        type: 'text',
        x: 0,
        y: currentY,
        width: contentWidth,
        height: (bodyStyle.bold?.fontSize || 12) * 1.3,
        content: edu.school,
        style: {
          fontFamily: bodyStyle.bold?.fontFamily || bodyStyle.normal.fontFamily,
          fontSize: bodyStyle.bold?.fontSize || 12,
          fontWeight: 'bold',
          color: textColor || bodyStyle.bold?.color || styles.colors.text.primary,
          lineHeight: 1.3,
          letterSpacing: 0,
          textAlign: 'left',
        },
        source: { type: 'profile_original', basedOn: ['profile.education'] },
      };
      elements.push(schoolElement);
      currentY += schoolElement.height + 4;

      // 专业和学位
      const detailElement: TextElement = {
        id: `sidebar-edu-detail-${i}`,
        type: 'text',
        x: 0,
        y: currentY,
        width: contentWidth,
        height: (bodyStyle.small?.fontSize || 10) * 1.3,
        content: `${edu.major} · ${edu.degree}`,
        style: {
          fontFamily: bodyStyle.small?.fontFamily || bodyStyle.normal.fontFamily,
          fontSize: bodyStyle.small?.fontSize || 10,
          fontWeight: 'normal',
          color: textColor ? `${textColor}aa` : bodyStyle.small?.color || styles.colors.text.muted,
          lineHeight: 1.3,
          letterSpacing: 0,
          textAlign: 'left',
        },
        source: { type: 'profile_original', basedOn: ['profile.education'] },
      };
      elements.push(detailElement);
      currentY += detailElement.height + 4;

      // 时间段
      const periodElement: TextElement = {
        id: `sidebar-edu-period-${i}`,
        type: 'text',
        x: 0,
        y: currentY,
        width: contentWidth,
        height: (bodyStyle.small?.fontSize || 10) * 1.3,
        content: edu.period,
        style: {
          fontFamily: bodyStyle.small?.fontFamily || bodyStyle.normal.fontFamily,
          fontSize: (bodyStyle.small?.fontSize || 10) - 1,
          fontWeight: 'normal',
          color: textColor ? `${textColor}88` : styles.colors.text.muted,
          lineHeight: 1.3,
          letterSpacing: 0,
          textAlign: 'left',
        },
        source: { type: 'profile_original', basedOn: ['profile.education'] },
      };
      elements.push(periodElement);
      currentY += periodElement.height + 15;
    }

    return { elements, bottomY: currentY };
  }

  /**
   * 布局教育经历
   */
  private layoutEducation(
    education: ResumeContent['education'],
    startY: number,
    contentWidth: number,
    startX: number = A4_PAGE.margin.left
  ): { elements: ResumeElement[]; bottomY: number } {
    const elements: ResumeElement[] = [];
    let currentY = startY;
    const styles = this.template.styles;
    const sectionStyle = styles.section;
    const bodyStyle = styles.body;

    // 区块标题
    const headerElement: SectionHeaderElement = {
      id: 'education-header',
      type: 'section-header',
      x: startX,
      y: currentY,
      width: contentWidth,
      height: sectionStyle.title.fontSize * sectionStyle.title.lineHeight,
      title: '教育经历',
      style: {
        fontFamily: sectionStyle.title.fontFamily,
        fontSize: sectionStyle.title.fontSize,
        fontWeight: sectionStyle.title.fontWeight,
        color: sectionStyle.title.color,
        lineHeight: sectionStyle.title.lineHeight,
        letterSpacing: sectionStyle.title.letterSpacing,
        textAlign: sectionStyle.title.textAlign,
        accentColor: sectionStyle.accentColor || styles.colors.primary,
      },
    };
    elements.push(headerElement);
    currentY += headerElement.height + styles.spacing.listItemGap;

    // 各教育经历
    for (let i = 0; i < education.length; i++) {
      const edu = education[i];
      const eduElement: EducationElement = {
        id: `education-${i}`,
        type: 'education-item',
        x: startX,
        y: currentY,
        width: contentWidth,
        height: 40,
        school: edu.school,
        major: edu.major,
        degree: edu.degree,
        period: edu.period,
        style: {
          school: {
            fontFamily: bodyStyle.bold?.fontFamily || bodyStyle.normal.fontFamily,
            fontSize: bodyStyle.bold?.fontSize || bodyStyle.normal.fontSize + 2,
            fontWeight: bodyStyle.bold?.fontWeight || 'bold',
            color: bodyStyle.bold?.color || styles.colors.text.primary,
            lineHeight: bodyStyle.bold?.lineHeight || 1.3,
            letterSpacing: bodyStyle.bold?.letterSpacing || 0,
            textAlign: 'left',
          },
          detail: {
            fontFamily: bodyStyle.small?.fontFamily || bodyStyle.normal.fontFamily,
            fontSize: bodyStyle.small?.fontSize || bodyStyle.normal.fontSize - 1,
            fontWeight: bodyStyle.small?.fontWeight || 'normal',
            color: bodyStyle.small?.color || styles.colors.text.muted,
            lineHeight: bodyStyle.small?.lineHeight || 1.3,
            letterSpacing: bodyStyle.small?.letterSpacing || 0,
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
