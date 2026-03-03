/**
 * 创意模板
 */

import type { ResumeTemplate, TemplateStyles, TemplateLayout } from '../types/template.types';
import { DEFAULT_FONTS } from '../types/template.types';

const creativeColorTheme = {
  primary: '#7c3aed',
  secondary: '#5b21b6',
  accent: '#8b5cf6',
  text: { primary: '#1f2937', secondary: '#4b5563', muted: '#9ca3af' },
  background: { primary: '#ffffff', secondary: '#faf5ff', tag: '#f3e8ff' },
  border: '#e5e7eb',
};

const creativeStyles: TemplateStyles = {
  colors: creativeColorTheme,
  fonts: DEFAULT_FONTS,

  header: {
    name: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 30,
      fontWeight: 'bold',
      color: '#1f2937',
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'center',
    },
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 15,
      fontWeight: 'normal',
      color: '#7c3aed',
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
      color: '#7c3aed',
      lineHeight: 1.3,
      letterSpacing: 0.5,
      textAlign: 'left',
    },
    accentColor: '#8b5cf6',
  },

  body: {
    normal: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#374151',
      lineHeight: 1.7,
      letterSpacing: 0,
      textAlign: 'left',
    },
    bold: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 13,
      fontWeight: 'bold',
      color: '#5b21b6',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
    small: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 10,
      fontWeight: 'normal',
      color: '#a78bfa',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  spacing: {
    sectionGap: 22,
    paragraphGap: 10,
    listItemGap: 14,
    tagGap: 10,
  },
};

const creativeLayout: TemplateLayout = {
  header: { align: 'center', showDivider: true },
  sectionOrder: ['experience', 'projects', 'skills', 'education'],
  showSourceBadge: true,
  highlightMatchedSkills: true,
};

export const creativeTemplate: ResumeTemplate = {
  id: 'creative',
  name: '创意风格',
  description: '活泼设计，适合设计、创意行业',
  thumbnail: '/templates/creative.png',
  category: 'creative',
  isPremium: true,
  styles: creativeStyles,
  layout: creativeLayout,
};
