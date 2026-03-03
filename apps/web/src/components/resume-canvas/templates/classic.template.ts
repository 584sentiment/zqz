/**
 * 经典专业模板
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
      letterSpacing: 0.5,
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
      color: '#111827',
      lineHeight: 1.3,
      letterSpacing: 1,
      textAlign: 'left',
    },
    accentColor: '#1f2937',
  },

  body: {
    normal: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#374151',
      lineHeight: 1.5,
      letterSpacing: 0,
      textAlign: 'left',
    },
    bold: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 12,
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
      lineHeight: 1.3,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  spacing: {
    sectionGap: 18,
    paragraphGap: 6,
    listItemGap: 10,
    tagGap: 6,
  },
};

const classicLayout: TemplateLayout = {
  header: { align: 'left', showDivider: false },
  sectionOrder: ['experience', 'education', 'skills', 'projects'],
  showSourceBadge: false,
  highlightMatchedSkills: false,
};

export const classicTemplate: ResumeTemplate = {
  id: 'classic',
  name: '经典专业',
  description: '传统商务风格，适合金融、咨询等行业',
  thumbnail: '/templates/classic.png',
  category: 'professional',
  isPremium: false,
  styles: classicStyles,
  layout: classicLayout,
};
