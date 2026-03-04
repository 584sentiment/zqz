/**
 * 创意模板
 * 顶部横幅布局，紫色渐变主题
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
      fontSize: 28,
      fontWeight: 'bold',
      color: '#ffffff',
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: 'center',
    },
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 16,
      fontWeight: 'normal',
      color: '#e9d5ff',
      lineHeight: 1.4,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    contact: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 11,
      fontWeight: 'normal',
      color: '#f3e8ff',
      lineHeight: 1.5,
      letterSpacing: 0,
      textAlign: 'center',
    },
  },

  section: {
    title: {
      fontFamily: DEFAULT_FONTS.primary,
      fontSize: 15,
      fontWeight: 'bold',
      color: '#7c3aed',
      lineHeight: 1.4,
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
  layoutType: 'top-banner',

  header: {
    align: 'center',
    showDivider: false,
    decoration: {
      type: 'gradient',
      height: 120,
      primaryColor: '#7c3aed',
      secondaryColor: '#a855f7',
      opacity: 1,
      borderRadius: 0,
    },
    fullBleed: true,
  },

  sectionOrder: ['experience', 'skills', 'projects', 'education'],

  sectionTitleStyle: {
    type: 'icon-prefix',
    accentColor: '#7c3aed',
    iconName: 'star',
    borderRadius: 8,
    padding: { horizontal: 10, vertical: 4 },
  },

  dividerStyle: {
    type: 'gradient',
    color: '#7c3aed',
    secondaryColor: '#f3e8ff',
    thickness: 2,
  },

  skillDisplayStyle: {
    type: 'tags',
    borderRadius: 20,
    trackColor: '#f3e8ff',
    fillColor: '#7c3aed',
    matchedBorderColor: '#22c55e',
    matchedBackgroundColor: '#dcfce7',
  },

  topBanner: {
    height: 120,
    decoration: {
      type: 'gradient',
      primaryColor: '#7c3aed',
      secondaryColor: '#a855f7',
      opacity: 1,
    },
    padding: 25,
    layout: 'vertical',
  },

  showSourceBadge: true,
  highlightMatchedSkills: true,
  sectionGap: 22,
};

export const creativeTemplate: ResumeTemplate = {
  id: 'creative',
  name: '创意风格',
  description: '紫色渐变顶部横幅，活泼的设计元素，适合设计、创意行业',
  thumbnail: '/templates/creative.png',
  category: 'creative',
  isPremium: true,
  styles: creativeStyles,
  layout: creativeLayout,
};
