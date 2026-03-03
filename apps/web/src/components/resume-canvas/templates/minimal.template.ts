/**
 * 极简模板
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
      lineHeight: 1.4,
      letterSpacing: 0,
      textAlign: 'left',
    },
  },

  section: {
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 12,
      fontWeight: 'normal',
      color: '#18181b',
      lineHeight: 1.4,
      letterSpacing: 1,
      textAlign: 'left',
    },
    accentColor: '#e4e4e7',
  },

  body: {
    normal: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 10,
      fontWeight: 'normal',
      color: '#3f3f46',
      lineHeight: 1.6,
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
  header: { align: 'left', showDivider: false },
  sectionOrder: ['experience', 'skills', 'education', 'projects'],
  showSourceBadge: false,
  highlightMatchedSkills: false,
};

export const minimalTemplate: ResumeTemplate = {
  id: 'minimal',
  name: '极简风格',
  description: '超简洁设计，注重内容本身',
  thumbnail: '/templates/minimal.png',
  category: 'simple',
  isPremium: false,
  styles: minimalStyles,
  layout: minimalLayout,
};
