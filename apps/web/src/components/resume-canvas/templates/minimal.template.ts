/**
 * 极简模板
 * 纯黑白极简设计，注重内容本身
 */

import type { ResumeTemplate, TemplateStyles, TemplateLayout } from '../types/template.types';
import { COLOR_THEMES, DEFAULT_FONTS } from '../types/template.types';

const minimalStyles: TemplateStyles = {
  colors: COLOR_THEMES.minimal,
  fonts: DEFAULT_FONTS,

  header: {
    name: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 24,
      fontWeight: 'normal',
      color: '#18181b',
      lineHeight: 1.3,
      letterSpacing: 0,
      textAlign: 'left',
    },
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 13,
      fontWeight: 'normal',
      color: '#52525b',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
    contact: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 10,
      fontWeight: 'normal',
      color: '#a1a1aa',
      lineHeight: 1.5,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  section: {
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#18181b',
      lineHeight: 1.4,
      letterSpacing: 2,
      textAlign: 'left',
    },
    accentColor: '#d4d4d8',
  },

  body: {
    normal: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 10,
      fontWeight: 'normal',
      color: '#3f3f46',
      lineHeight: 1.7,
      letterSpacing: 0,
      textAlign: 'left',
    },
    bold: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#18181b',
      lineHeight: 1.5,
      letterSpacing: 0,
      textAlign: 'left',
    },
    small: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 9,
      fontWeight: 'normal',
      color: '#a1a1aa',
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  spacing: {
    sectionGap: 16,
    paragraphGap: 6,
    listItemGap: 8,
    tagGap: 6,
  },
};

const minimalLayout: TemplateLayout = {
  layoutType: 'single-column',

  header: {
    align: 'left',
    showDivider: false,
    decoration: {
      type: 'none',
    },
  },

  sectionOrder: ['experience', 'skills', 'education', 'projects'],

  sectionTitleStyle: {
    type: 'minimal',
    accentColor: '#d4d4d8',
    thickness: 0,
    borderRadius: 0,
    padding: { horizontal: 0, vertical: 2 },
  },

  dividerStyle: {
    type: 'solid',
    color: '#e4e4e7',
    thickness: 0.5,
  },

  skillDisplayStyle: {
    type: 'tags',
    borderRadius: 0,
    trackColor: '#f4f4f5',
    fillColor: '#18181b',
  },

  showSourceBadge: false,
  highlightMatchedSkills: false,
  sectionGap: 16,
};

export const minimalTemplate: ResumeTemplate = {
  id: 'minimal',
  name: '极简风格',
  description: '纯黑白极简设计，注重内容本身，无多余装饰',
  thumbnail: '/templates/minimal.png',
  category: 'simple',
  isPremium: false,
  styles: minimalStyles,
  layout: minimalLayout,
};
