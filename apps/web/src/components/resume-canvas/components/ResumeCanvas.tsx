'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva';
import type {
  ResumeContent,
  ResumeElement,
  LayoutResult,
  TextElement,
  SectionHeaderElement,
  ExperienceCardElement,
  SkillTagsElement,
  EducationElement,
  DividerElement,
  HeaderBannerElement,
  SidebarContainerElement,
} from '../types/resume-canvas.types';
import type { ResumeTemplate, SectionTitleStyleType } from '../types/template.types';
import { A4_PAGE } from '../types/template.types';
import { LayoutEngine } from '../core/layout-engine';

interface ResumeCanvasProps {
  /** 简历内容 */
  content: ResumeContent;
  /** 模板配置 */
  template: ResumeTemplate;
  /** 缩放比例 (0.5 - 2.0) */
  scale?: number;
  /** 当前页码（从 1 开始，undefined 表示显示全部） */
  currentPage?: number;
  /** 显示页面阴影 */
  showShadow?: boolean;
  /** 显示页面边框 */
  showBorder?: boolean;
  /** 点击元素回调 */
  onElementClick?: (element: ResumeElement) => void;
  /** 布局完成回调 */
  onLayoutComplete?: (result: LayoutResult) => void;
}

/**
 * Canvas 简历渲染组件
 */
export const ResumeCanvas: React.FC<ResumeCanvasProps> = ({
  content,
  template,
  scale = 1,
  currentPage,
  showShadow = true,
  showBorder = false,
  onElementClick,
  onLayoutComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);

  // 计算布局
  useEffect(() => {
    const engine = new LayoutEngine(template);
    const result = engine.layout(content);
    setLayoutResult(result);
    onLayoutComplete?.(result);
  }, [content, template, onLayoutComplete]);

  // 要渲染的页面
  const pagesToRender = useMemo(() => {
    if (!layoutResult) return [];
    if (currentPage) {
      return layoutResult.pages.filter((p) => p.number === currentPage);
    }
    return layoutResult.pages;
  }, [layoutResult, currentPage]);

  if (!layoutResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="resume-canvas-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
      }}
    >
      {pagesToRender.map((page) => (
        <Stage
          key={page.number}
          width={A4_PAGE.width * scale}
          height={A4_PAGE.height * scale}
          scaleX={scale}
          scaleY={scale}
          style={{
            backgroundColor: '#f0f0f0',
          }}
        >
          <Layer>
            {/* 页面背景 */}
            <Rect
              x={0}
              y={0}
              width={A4_PAGE.width}
              height={A4_PAGE.height}
              fill="white"
              shadowColor={showShadow ? 'black' : undefined}
              shadowBlur={showShadow ? 10 : 0}
              shadowOpacity={showShadow ? 0.15 : 0}
              shadowOffsetY={showShadow ? 5 : 0}
              stroke={showBorder ? '#e5e7eb' : undefined}
              strokeWidth={showBorder ? 1 : 0}
            />

            {/* 渲染所有元素 */}
            {page.elements.map((element) => (
              <ElementRenderer
                key={element.id}
                element={element}
                onClick={() => onElementClick?.(element)}
              />
            ))}

            {/* 页码 */}
            {layoutResult.pages.length > 1 && (
              <Text
                x={A4_PAGE.width / 2 - 50}
                y={A4_PAGE.height - 25}
                text={`第 ${page.number} 页 / 共 ${layoutResult.pages.length} 页`}
                fontSize={10}
                fill="#9ca3af"
                width={100}
                align="center"
              />
            )}
          </Layer>
        </Stage>
      ))}
    </div>
  );
};

/**
 * 元素渲染器
 */
const ElementRenderer: React.FC<{
  element: ResumeElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  switch (element.type) {
    case 'text':
      return <TextElementRenderer element={element as TextElement} onClick={onClick} />;
    case 'section-header':
      return <SectionHeaderRenderer element={element as SectionHeaderElement} onClick={onClick} />;
    case 'experience-card':
      return <ExperienceCardRenderer element={element as ExperienceCardElement} onClick={onClick} />;
    case 'skill-tags':
      return <SkillTagsRenderer element={element as SkillTagsElement} onClick={onClick} />;
    case 'education-item':
      return <EducationItemRenderer element={element as EducationElement} onClick={onClick} />;
    case 'divider':
      return <DividerRenderer element={element as DividerElement} />;
    case 'header-banner':
      return <HeaderBannerRenderer element={element as HeaderBannerElement} onClick={onClick} />;
    case 'sidebar':
      return <SidebarContainerRenderer element={element as SidebarContainerElement} onClick={onClick} />;
    default:
      return null;
  }
};

/**
 * 文本元素渲染器
 */
const TextElementRenderer: React.FC<{
  element: TextElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  const lines = element.content.split('\n');
  const lineHeight = element.style.fontSize * element.style.lineHeight;

  return (
    <Group x={element.x} y={element.y} onClick={onClick}>
      {lines.map((line, index) => (
        <Text
          key={index}
          x={0}
          y={index * lineHeight}
          text={line}
          fontSize={element.style.fontSize}
          fontFamily={element.style.fontFamily}
          fontStyle={element.style.fontWeight === 'bold' ? 'bold' : 'normal'}
          fill={element.style.color}
          width={element.width}
          align={element.style.textAlign}
          letterSpacing={element.style.letterSpacing}
        />
      ))}
    </Group>
  );
};

/**
 * 区块标题渲染器
 */
const SectionHeaderRenderer: React.FC<{
  element: SectionHeaderElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  return (
    <Group x={element.x} y={element.y} onClick={onClick}>
      <Text
        x={0}
        y={0}
        text={element.title}
        fontSize={element.style.fontSize}
        fontFamily={element.style.fontFamily}
        fontStyle="bold"
        fill={element.style.color}
      />
      <Line
        points={[0, element.height + 5, element.width, element.height + 5]}
        stroke={element.style.accentColor || element.style.color}
        strokeWidth={2}
      />
    </Group>
  );
};

/**
 * 工作经历卡片渲染器
 */
const ExperienceCardRenderer: React.FC<{
  element: ExperienceCardElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  const lineHeight = element.style.highlight.fontSize * element.style.highlight.lineHeight;

  return (
    <Group x={element.x} y={element.y} onClick={onClick}>
      {/* 左侧竖线 */}
      <Line
        points={[0, 0, 0, element.height]}
        stroke={element.style.bulletColor}
        strokeWidth={3}
      />

      <Group x={15}>
        {/* 职位 */}
        <Text
          x={0}
          y={0}
          text={element.position}
          fontSize={element.style.title.fontSize}
          fontFamily={element.style.title.fontFamily}
          fontStyle="bold"
          fill={element.style.title.color}
        />

        {/* 公司和时间段 */}
        <Text
          x={0}
          y={element.style.title.fontSize * 1.3}
          text={`${element.company} | ${element.period}`}
          fontSize={element.style.subtitle.fontSize}
          fontFamily={element.style.subtitle.fontFamily}
          fill={element.style.subtitle.color}
        />

        {/* 工作亮点 */}
        {element.highlights.map((highlight, index) => (
          <Group key={index} y={element.style.title.fontSize * 1.3 + element.style.subtitle.fontSize * 1.5 + index * lineHeight}>
            <Text
              x={0}
              y={0}
              text="•"
              fontSize={element.style.highlight.fontSize}
              fill={element.style.bulletColor}
            />
            <Text
              x={15}
              y={0}
              text={highlight}
              fontSize={element.style.highlight.fontSize}
              fontFamily={element.style.highlight.fontFamily}
              fill={element.style.highlight.color}
              width={element.width - 30}
            />
          </Group>
        ))}
      </Group>
    </Group>
  );
};

/**
 * 技能标签渲染器
 */
const SkillTagsRenderer: React.FC<{
  element: SkillTagsElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  const { skills, style } = element;
  const tagHeight = style.tag.fontSize * 1.5 + style.tag.paddingY * 2;
  let currentX = 0;
  let currentY = 0;

  return (
    <Group x={element.x} y={element.y} onClick={onClick}>
      {skills.map((skill, index) => {
        const tagWidth = skill.name.length * style.tag.fontSize * 0.6 + style.tag.paddingX * 2;

        // 检查是否需要换行
        if (currentX + tagWidth > element.width && currentX > 0) {
          currentX = 0;
          currentY += tagHeight + 5;
        }

        const x = currentX;
        const y = currentY;
        currentX += tagWidth + style.gap;

        return (
          <Group key={index} x={x} y={y}>
            <Rect
              x={0}
              y={0}
              width={tagWidth}
              height={tagHeight}
              fill={skill.matched ? '#dcfce7' : style.tag.backgroundColor}
              cornerRadius={style.tag.borderRadius}
              stroke={skill.matched ? '#22c55e' : undefined}
              strokeWidth={skill.matched ? 1 : 0}
            />
            <Text
              x={tagWidth / 2}
              y={tagHeight / 2 - style.tag.fontSize / 2}
              text={skill.name}
              fontSize={style.tag.fontSize}
              fontFamily={style.tag.fontFamily}
              fill={skill.matched ? '#166534' : style.tag.color}
              align="center"
            />
          </Group>
        );
      })}
    </Group>
  );
};

/**
 * 教育经历渲染器
 */
const EducationItemRenderer: React.FC<{
  element: EducationElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  return (
    <Group x={element.x} y={element.y} onClick={onClick}>
      <Text
        x={0}
        y={0}
        text={element.school}
        fontSize={element.style.school.fontSize}
        fontFamily={element.style.school.fontFamily}
        fontStyle="bold"
        fill={element.style.school.color}
      />
      <Text
        x={0}
        y={element.style.school.fontSize * 1.3}
        text={`${element.major} · ${element.degree} | ${element.period}`}
        fontSize={element.style.detail.fontSize}
        fontFamily={element.style.detail.fontFamily}
        fill={element.style.detail.color}
      />
    </Group>
  );
};

/**
 * 分割线渲染器
 */
const DividerRenderer: React.FC<{
  element: DividerElement;
}> = ({ element }) => {
  return (
    <Line
      x={element.x}
      y={element.y}
      points={[0, 0, element.width, 0]}
      stroke={element.color}
      strokeWidth={element.thickness}
      dash={element.style === 'dashed' ? [5, 5] : undefined}
    />
  );
};

/**
 * 头部横幅渲染器
 */
const HeaderBannerRenderer: React.FC<{
  element: HeaderBannerElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  const { decoration, children } = element;

  const renderBackground = () => {
    switch (decoration.type) {
      case 'gradient':
        return (
          <Rect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: element.width, y: element.height }}
            fillLinearGradientColorStops={[
              0, decoration.primaryColor || '#7c3aed',
              1, decoration.secondaryColor || '#a855f7',
            ]}
            cornerRadius={decoration.borderRadius || 0}
          />
        );
      case 'color-block':
        return (
          <Rect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            fill={decoration.primaryColor}
            opacity={decoration.opacity || 1}
            cornerRadius={decoration.borderRadius || 0}
          />
        );
      case 'pattern-dots':
        // 简化的圆点图案
        const dotSize = decoration.patternSize || 20;
        const dots = [];
        for (let i = 0; i < Math.ceil(element.width / dotSize); i++) {
          for (let j = 0; j < Math.ceil(element.height / dotSize); j++) {
            dots.push(
              <Circle
                key={`${i}-${j}`}
                x={i * dotSize + dotSize / 2}
                y={j * dotSize + dotSize / 2}
                radius={dotSize / 8}
                fill={decoration.secondaryColor || decoration.primaryColor}
                opacity={(decoration.opacity || 1) * 0.3}
              />
            );
          }
        }
        return (
          <>
            <Rect
              x={0}
              y={0}
              width={element.width}
              height={element.height}
              fill={decoration.primaryColor}
              cornerRadius={decoration.borderRadius || 0}
            />
            {dots}
          </>
        );
      default:
        return (
          <Rect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            fill={decoration.primaryColor || '#7c3aed'}
            cornerRadius={decoration.borderRadius || 0}
          />
        );
    }
  };

  return (
    <Group x={element.x} y={element.y} onClick={onClick}>
      {renderBackground()}
      {children.map((child) => (
        <ElementRenderer key={child.id} element={child} />
      ))}
    </Group>
  );
};

/**
 * 侧边栏容器渲染器
 */
const SidebarContainerRenderer: React.FC<{
  element: SidebarContainerElement;
  onClick?: () => void;
}> = ({ element, onClick }) => {
  return (
    <Group x={element.x} y={element.y} onClick={onClick}>
      {/* 背景 */}
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        fill={element.backgroundColor}
      />
      {/* 子元素 */}
      {element.children.map((child) => (
        <ElementRenderer key={child.id} element={child} />
      ))}
    </Group>
  );
};

export default ResumeCanvas;
