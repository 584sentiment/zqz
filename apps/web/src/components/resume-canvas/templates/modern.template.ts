/**
 * 现代简约模板
 * 左侧边栏布局，蓝色主题
 */

import type { ResumeTemplate, TemplateStyles, TemplateLayout } from '../types/template.types';
import { COLOR_THEMES, DEFAULT_FONTS } from '../types/template.types';

const modernStyles: TemplateStyles = {
  colors: COLOR_THEMES.modern,
  fonts: DEFAULT_FONTS,

  header: {
    name: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 28,
      fontWeight: 'bold',
      color: '#1f2937',
      lineHeight: 1.3,
      letterSpacing: 0,
      textAlign: 'left',
    },
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 14,
      fontWeight: 'normal',
      color: '#4b5563',
      lineHeight: 1.4,
      letterSpacing: 0.5,
      textAlign: 'left',
    },
    contact: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#6b7280',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  section: {
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1f2937',
      lineHeight: 1.4,
      letterSpacing: 0.5,
      textAlign: 'left',
    },
    accentColor: '#2563eb',
  },

  body: {
    normal: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#374151',
      lineHeight: 1.6,
      letterSpacing: 0,
      textAlign: 'left',
    },
    bold: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 13,
      fontWeight: 'bold',
      color: '#1f2937',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
    small: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 10,
      fontWeight: 'normal',
      color: '#6b7280',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  spacing: {
    sectionGap: 18,
    paragraphGap: 8,
    listItemGap: 12,
    tagGap: 8,
  },
};

const modernLayout: TemplateLayout = {
  layoutType: 'left-sidebar',

  header: {
    align: 'left',
    showDivider: false,
    decoration: {
      type: 'none',
    },
  },

  sectionOrder: ['experience', 'projects'],

  sectionTitleStyle: {
    type: 'left-bar',
    accentColor: '#2563eb',
    thickness: 4,
    borderRadius: 0,
    padding: { horizontal: 12, vertical: 4 },
  },

  dividerStyle: {
    type: 'solid',
    color: '#e5e7eb',
    thickness: 1,
  },

  skillDisplayStyle: {
    type: 'pills',
    borderRadius: 16,
    trackColor: '#eff6ff',
    fillColor: '#2563eb',
    matchedBorderColor: '#22c55e',
    matchedBackgroundColor: '#dcfce7',
  },

  sidebar: {
    widthRatio: 0.32,
    backgroundColor: '#1e40af',
    padding: 20,
    sections: ['skills', 'education'],
    textColor: '#ffffff',
  },

  showSourceBadge: false,
  highlightMatchedSkills: true,
  sectionGap: 18,
};

export const modernTemplate: ResumeTemplate = {
  id: 'modern',
  name: '现代简约',
  description: '简洁现代的设计风格，左侧边栏突出联系方式和技能，适合科技行业求职',
  thumbnail: '/templates/modern.png',
  category: 'professional',
  isPremium: false,
  styles: modernStyles,
  layout: modernLayout,
};
