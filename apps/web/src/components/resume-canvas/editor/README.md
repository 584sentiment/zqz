# 画布编辑器 (Resume Canvas Editor)

基于 tldraw 实现的交互式简历画布编辑功能。

## 功能特性

### 核心功能

1. **A4 纸张底图** - 白色 A4 纸张背景，带阴影效果
2. **智能排版** - 根据 AI 生成的 layoutHint 自动调整样式
3. **自由编辑** - 直接在画布上编辑文本
4. **拖拽移动** - 所有元素可自由拖动
5. **技能标签** - 匹配的技能高亮显示
6. **导出功能** - 支持导出为 PNG 和 PDF

### 样式系统

- **5 种颜色主题**: modern, classic, creative, minimal, executive
- **4 种布局类型**: single-column, left-sidebar, top-banner, two-column
- **3 种强调级别**: high, medium, low
- **5 种显示样式**: default, compact, expanded, tags, timeline

## 文件结构

```
apps/web/src/components/resume-canvas/editor/
├── components/
│   └── TldrawResumeEditor.tsx    # 主编辑器组件
└── index.ts                       # 模块导出
```

## 使用方法

### 基础用法

```tsx
import { TldrawResumeEditor, ResumeContentForEditor } from '@/components/resume-canvas/editor';

const resumeContent: ResumeContentForEditor = {
  name: '张三',
  title: '高级前端工程师',
  contact: {
    email: 'zhangsan@example.com',
    phone: '138-xxxx-xxxx',
    location: '北京',
  },
  summary: '5年前端开发经验...',
  experience: [
    {
      company: 'ABC 公司',
      position: '前端工程师',
      period: '2020-2023',
      highlights: ['负责核心产品开发', '优化性能提升 30%'],
    },
  ],
  skills: ['React', 'TypeScript', 'Node.js'],
  matchedSkills: ['React', 'TypeScript'],
  projects: [],
  education: [],
};

<TldrawResumeEditor
  resumeContent={resumeContent}
  theme="modern"
  onChange={(snapshot) => console.log('内容已更新')}
/>
```

### 使用 LayoutResume 格式

```tsx
import { TldrawResumeEditor } from '@/components/resume-canvas/editor';
import type { LayoutResume } from '@ai-job-assistant/shared/types';

const layoutResume: LayoutResume = {
  meta: {
    templateId: 'ai-generated',
    generatedAt: new Date().toISOString(),
    matchScore: 85,
  },
  layoutConfig: {
    layoutType: 'left-sidebar',
    colorTheme: 'modern',
    sectionOrder: ['header', 'summary', 'skills', 'experience', 'education'],
    highlightMatchedSkills: true,
  },
  blocks: [
    {
      id: 'header',
      type: 'header',
      content: {
        name: '张三',
        title: '高级前端工程师',
        contact: { email: 'zhangsan@example.com' },
      },
    },
    // 更多区块...
  ],
};

<TldrawResumeEditor
  resumeContent={layoutResume}
  theme="modern"
/>
```

### 导出功能

```tsx
import { useRef } from 'react';
import { TldrawResumeEditor, TldrawResumeEditorRef } from '@/components/resume-canvas/editor';

function ResumePage() {
  const editorRef = useRef<TldrawResumeEditorRef>(null);

  const handleExportPNG = async () => {
    const blob = await editorRef.current?.exportToPNG();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.png';
      a.click();
    }
  };

  const handleExportPDF = async () => {
    const blob = await editorRef.current?.exportToPDF();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.pdf';
      a.click();
    }
  };

  return (
    <div>
      <button onClick={handleExportPNG}>导出 PNG</button>
      <button onClick={handleExportPDF}>导出 PDF</button>
      <TldrawResumeEditor
        ref={editorRef}
        resumeContent={resumeContent}
      />
    </div>
  );
}
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `resumeContent` | `ResumeContentForEditor \| LayoutResume \| null` | - | 简历内容 |
| `onChange` | `(snapshot: string) => void` | - | 内容变化回调 |
| `readOnly` | `boolean` | `false` | 只读模式 |
| `theme` | `'modern' \| 'classic' \| 'minimal' \| 'professional'` | `'modern'` | 颜色主题 |
| `showMarginGuides` | `boolean` | `false` | 显示页边距参考线 |

## 技术栈

- **tldraw** - 高性能画布编辑器
- **pdf-lib** - PDF 生成
