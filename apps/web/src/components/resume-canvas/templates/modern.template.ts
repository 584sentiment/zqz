/**
 * 现代简约模板
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
      textAlign: 'center',
    },
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 14,
      fontWeight: 'normal',
      color: '#4b5563',
      lineHeight: 1.4,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    contact: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#6b7280',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'center',
    },
  },

  section: {
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 16,
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
    sectionGap: 20,
    paragraphGap: 8,
    listItemGap: 12,
    tagGap: 8,
  },
};

const modernLayout: TemplateLayout = {
  header: {
    align: 'center',
    showDivider: true,
  },
  sectionOrder: ['experience', 'skills', 'projects', 'education'],
  showSourceBadge: false,
  highlightMatchedSkills: true,
};

export const modernTemplate: ResumeTemplate = {
  id: 'modern',
  name: '现代简约',
  description: '简洁现代的设计风格，适合科技行业求职',
  thumbnail: '/templates/modern.png',
  category: 'professional',
  isPremium: false,
  styles: modernStyles,
  layout: modernLayout,
};
