/**
 * 经典专业模板
 * 单栏布局，精致下划线装饰
 */

import type { ResumeTemplate, TemplateStyles, TemplateLayout } from '../types/template.types';
import { COLOR_THEMES, DEFAULT_FONTS } from '../types/template.types';

const classicStyles: TemplateStyles = {
  colors: COLOR_THEMES.classic,
  fonts: DEFAULT_FONTS,

  header: {
    name: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 32,
      fontWeight: 'bold',
      color: '#111827',
      lineHeight: 1.2,
      letterSpacing: 1,
      textAlign: 'left',
    },
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 16,
      fontWeight: 'normal',
      color: '#374151',
      lineHeight: 1.3,
      letterSpacing: 0.5,
      textAlign: 'left',
    },
    contact: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#6b7280',
      lineHeight: 1.5,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  section: {
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 14,
      fontWeight: 'bold',
      color: '#111827',
      lineHeight: 1.4,
      letterSpacing: 1.5,
      textAlign: 'left',
    },
    accentColor: '#111827',
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
      fontSize: 12,
      fontWeight: 'bold',
      color: '#111827',
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
    sectionGap: 20,
    paragraphGap: 8,
    listItemGap: 12,
    tagGap: 6,
  },
};

const classicLayout: TemplateLayout = {
  layoutType: 'single-column',

  header: {
    align: 'left',
    showDivider: false,
    decoration: {
      type: 'none',
    },
  },

  sectionOrder: ['experience', 'education', 'skills', 'projects'],

  sectionTitleStyle: {
    type: 'underline',
    accentColor: '#111827',
    thickness: 2,
    borderRadius: 0,
    padding: { horizontal: 0, vertical: 4 },
  },

  dividerStyle: {
    type: 'double',
    color: '#d1d5db',
    thickness: 1,
  },

  skillDisplayStyle: {
    type: 'list',
    borderRadius: 0,
    trackColor: '#f3f4f6',
    fillColor: '#111827',
  },

  showSourceBadge: false,
  highlightMatchedSkills: false,
  sectionGap: 20,
};

export const classicTemplate: ResumeTemplate = {
  id: 'classic',
  name: '经典专业',
  description: '传统商务风格，精致的下划线装饰，适合金融、咨询等行业',
  thumbnail: '/templates/classic.png',
  category: 'professional',
  isPremium: false,
  styles: classicStyles,
  layout: classicLayout,
};
