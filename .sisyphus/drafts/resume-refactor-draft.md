# 简历模块重构计划 - 需求草案

## 当前实现分析

### 已有的 tldraw 集成

- `TldrawResumeEditor.tsx`: 基于 tldraw 的画布编辑器
- 支持 LayoutResume 和旧格式简历内容
- 5 种颜色主题：modern, classic, creative, minimal, executive
- 导出 PNG/PDF 功能

### 当前简历功能模块

1. **简历列表** (`resumes/page.tsx`): 创建、删除、复制、模板选择
2. **简历详情/编辑** (`resumes/[id]/page.tsx`): 查看、编辑、AI 优化、导出
3. **AI 编辑页面** (`resumes/[id]/ai-edit/page.tsx`): AI 辅助编辑

### 现有组件结构

```
resume-canvas/
├── editor/components/TldrawResumeEditor.tsx  # tldraw 编辑器
├── components/
│   ├── ResumeCanvas.tsx      # 简历画布
│   ├── ResumePreview.tsx     # 简历预览
│   └── TemplateSelector.tsx  # 模板选择
├── templates/                # 简历模板
└── exporters/               # 导出器
```

## 重构方向分析

基于 tldraw 的能力，可以考虑以下重构方向：

### 方向 1: 统一画布编辑体验

- 将生成、预览、编辑统一到 tldraw 画布中
- 实现真正的 WYSIWYG 编辑

### 方向 2: 增强交互编辑能力

- 使用 tldraw 的 shapes 实现可编辑文本
- 拖拽排版、调整布局
- 实时预览效果

### 方向 3: AI 驱动的智能编辑

- AI 直接操作 tldraw shapes
- 智能布局建议
- 实时内容优化

### 方向 4: 模板系统重构

- 使用 tldraw shapes 定义模板
- 模板即 shapes 组合
- 灵活的模板定制

## 待确认问题

1. **AI 集成方式**: 您希望 AI 如何与画布交互？
   - A) AI 直接生成/修改 tldraw shapes
   - B) AI 生成内容，前端转换为 shapes
   - C) 两者都支持

2. **模板系统**: 是否需要保留现有的模板概念？
   - A) 使用 tldraw shapes 组合作为模板
   - B) 模板配置驱动自动生成 shapes
   - C) 简化模板，只保留主题/样式

3. **现有数据**: 是否需要兼容现有的简历数据格式？
   - A) 完全兼容 LayoutResume 格式
   - B) 迁移到新的 shapes-based 格式

4. **导出需求**: 需要支持哪些导出格式？
   - A) PDF (必须)
   - B) PNG
   - C) Word
   - D) JSON (画布快照)
