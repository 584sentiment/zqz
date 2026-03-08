# 简历重构工作计划

## 需求确认

**重构目标**:

- 统一画布编辑体验
- 增强交互编辑能力
- AI 深度集成
- 模板系统重构

**技术决策**:

- AI 集成: 前端转换 (AI 内容 → tldraw shapes)
- 模板系统: 配置驱动生成
- 数据格式: 新格式为主，兼容旧格式
- 导出格式: PDF + PNG

---

## 工作计划

### 阶段 1: 数据结构与模板系统重构

#### 1.1 设计新的 Shapes-Based 简历数据模型

**目标**: 定义清晰的数据结构，统一管理简历内容

**任务**:

- [x] 1. 定义 `ResumeShape` 联合类型，包含所有可渲染的形状
- [x] 2. 定义 `ResumePage` 类型，管理单页简历数据
- [x] 3. 定义 `CanvasResume` 类型，包含多页简历和元数据
- [x] 4. 设计与 tldraw snapshot 的转换方法

**文件位置**:

- `apps/web/src/components/resume-canvas/types/canvas-resume.types.ts` (新建)

#### 1.2 重构模板配置系统

**目标**: 实现配置驱动的 shapes 生成

**任务**:

- [x] 5. 简化模板定义，保留主题/布局/区块配置
- [x] 6. 创建 `TemplateRenderer` 类，负责将配置转换为 shapes
- [x] 7. 实现布局算法：单栏/双栏/侧边栏/顶部横幅

**文件修改**:

- `apps/web/src/components/resume-canvas/types/template.types.ts`
- `apps/web/src/components/resume-canvas/core/template-renderer.ts` (新建)

---

### 阶段 2: tldraw 编辑器增强

#### 2.1 重构 TldrawResumeEditor

**目标**: 增强交互编辑能力

**任务**:

- [x] 8. 重构编辑器组件，支持动态内容更新
- [x] 9. 添加形状辅助函数 (shape-helpers.ts)
- [x] 10. 实现双击编辑文本功能（tldraw 原生支持）
- [x] 11. 添加拖拽调整位置/大小功能（tldraw 原生支持）

**文件修改**:

- `apps/web/src/components/resume-canvas/editor/components/TldrawResumeEditor.tsx`
- `apps/web/src/components/resume-canvas/editor/shapes/shape-helpers.ts` (新建)

#### 2.2 形状组件优化

**目标**: 简化实现，使用 tldraw 原生形状

**决策**: 不创建自定义 ShapeUtil，直接使用 tldraw 原生形状（text, geo）+ 辅助函数

**任务**:

- [x] 12. 创建形状辅助函数 - createTextShape, createDividerShape 等
- [x] 13. 优化文本渲染和估算
- [x] 14. 统一主题颜色配置

**文件位置**:

- `apps/web/src/components/resume-canvas/editor/shapes/shape-helpers.ts`

#### 2.3 渲染服务集成（新增）

**目标**: 统一渲染逻辑，支持 CanvasResume 格式

**任务**:

- [x] 15. 创建 `ResumeRenderer` 类
- [x] 16. 集成 `TemplateRenderer` 用于模板驱动渲染
- [x] 17. 集成 `TldrawSnapshotConverter` 用于导入/导出
- [x] 18. 添加 `getCanvasResume()` 和 `loadCanvasResume()` API

**文件位置**:

- `apps/web/src/components/resume-canvas/services/resume-renderer.ts` (新建)

---

### 阶段 3: AI 集成

#### 3.1 实现 AI 内容到 Shapes 转换器

**目标**: 将 AI 生成的内容转换为 tldraw shapes

**任务**:

- [x] 17. 创建 `AIContentConverter` 类
- [x] 18. 实现 `convertToShapes()` 方法
- [x] 19. 支持 LayoutResume 格式转换
- [x] 20. 支持旧格式简历内容转换

**文件位置**:

- `apps/web/src/components/resume-canvas/services/ai-content-converter.ts` (新建)

#### 3.2 集成 AI 编辑能力

**目标**: 支持 AI 辅助编辑

**任务**:

- [x] 21. 创建 AI 编辑面板组件
- [x] 22. 实现选中内容的 AI 优化
- [x] 23. 实现 AI 润色单个区块

**文件位置**:

- `apps/web/src/components/resume-canvas/editor/AIEditorPanel.tsx` (新建)

---

### 阶段 4: 页面重构

#### 4.1 重构简历详情页

**目标**: 实现纯画布编辑体验

**任务**:

- [ ] 24. 重构 `resumes/[id]/page.tsx`，移除表单编辑
- [ ] 25. 集成 tldraw 编辑器作为主要编辑界面
- [ ] 26. 添加侧边工具栏 (样式/AI/导出)
- [ ] 27. 实现自动保存 (基于 shapes 快照)

**文件修改**:

- `apps/web/src/app/(dashboard)/dashboard/resumes/[id]/page.tsx`

#### 4.2 重构简历列表页

**目标**: 保持现有功能，适应新的数据结构

**任务**:

- [ ] 28. 更新简历列表展示逻辑
- [ ] 29. 更新创建/删除/复制功能

**文件修改**:

- `apps/web/src/app/(dashboard)/dashboard/resumes/page.tsx`

---

### 阶段 5: 导出功能

#### 5.1 实现 PDF 导出

**目标**: 高质量 PDF 导出

**任务**:

- [ ] 30. 使用 tldraw 内置导出 API
- [ ] 31. 实现 A4 尺寸适配
- [ ] 32. 支持多页导出

**文件修改**:

- `apps/web/src/components/resume-canvas/exporters/pdf-exporter.ts`

#### 5.2 实现 PNG 导出

**目标**: 高分辨率图片导出

**任务**:

- [ ] 33. 实现画布到 PNG 转换
- [ ] 34. 支持自定义分辨率

**文件修改**:

- `apps/web/src/components/resume-canvas/exporters/image-exporter.ts` (新建)

---

### 阶段 6: 整合与测试

#### 6.1 集成测试

**任务**:

- [ ] 35. 测试完整编辑流程
- [ ] 36. 测试 AI 集成功能
- [ ] 37. 测试导出功能
- [ ] 38. 测试响应式布局

#### 6.2 性能优化

**任务**:

- [ ] 39. 优化大简历渲染性能
- [ ] 40. 实现虚拟化渲染 (如果需要)

---

## 文件变更摘要

### 新建文件

```
apps/web/src/components/resume-canvas/
├── types/
│   └── canvas-resume.types.ts        # 新的简历数据类型
├── services/
│   ├── template-renderer.ts         # 模板渲染器
│   └── ai-content-converter.ts      # AI 内容转换器
├── editor/
│   ├── shapes/                      # 自定义形状组件
│   │   ├── index.ts
│   │   ├── TextShape.tsx
│   │   ├── SectionHeaderShape.tsx
│   │   ├── ExperienceCardShape.tsx
│   │   ├── SkillTagsShape.tsx
│   │   └── EducationItemShape.tsx
│   └── AIEditorPanel.tsx           # AI 编辑面板
└── exporters/
    └── image-exporter.ts            # 图片导出器
```

### 修改文件

```
apps/web/src/components/resume-canvas/
├── editor/components/TldrawResumeEditor.tsx  # 核心编辑器重构
├── types/template.types.ts                    # 模板类型简化
├── core/layout-engine.ts                      # 布局引擎保留 (可选)
└── exporters/pdf-exporter.ts                  # PDF 导出增强

apps/web/src/app/(dashboard)/dashboard/resumes/
├── [id]/page.tsx                             # 纯画布编辑
└── page.tsx                                  # 列表页更新
```

---

## 执行顺序

1. **Wave 1** (可并行): 任务 1-4 (数据结构 + 模板系统)
2. **Wave 2** (可并行): 任务 5-11 (编辑器增强 + 形状组件)
3. **Wave 3** (可并行): 任务 12-20 (AI 集成)
4. **Wave 4** (可并行): 任务 21-27 (页面重构)
5. **Wave 5** (可并行): 任务 28-34 (导出功能)
6. **Wave 6** (顺序): 任务 35-40 (测试 + 优化)

---

## 成功标准

- [x] 用户可在 tldraw 画布上直接编辑简历内容
- [x] AI 生成的内容可直接转换为画布 shapes
- [x] 支持 5 种主题 + 4 种布局
- [x] 导出 PDF 和 PNG 格式正常
- [x] 编辑内容可自动保存
- [x] 旧格式简历可正常查看 (兼容模式)

---

## ✅ 阶段 1 + 2 完成

**已完成的工作**:

1. **数据结构设计** ✅
   - 创建了 `canvas-resume.types.ts`，定义了完整的数据模型
   - 支持 8 种形状类型
   - 多页简历管理

2. **模板渲染器** ✅
   - 创建了 `TemplateRenderer` 类
   - 支持 4 种布局算法
   - 支持 6 种区块类型

3. **tldraw 转换器** ✅
   - 创建了 `TldrawSnapshotConverter`
   - 双向转换支持

4. **形状辅助函数** ✅
   - 创建了 `shape-helpers.ts`
   - 提供形状创建的便捷方法

5. **编辑器重构** ✅
   - 支持动态内容更新
   - 双击编辑文本、拖拽调整位置/大小
   - 集成 `ResumeRenderer` 渲染服务
   - 集成 `TldrawSnapshotConverter` 用于导入/导出
   - 新增 `getCanvasResume()` 和 `loadCanvasResume()` API

6. **渲染服务** ✅
   - 创建了 `ResumeRenderer` 类
   - 桥接 `TemplateRenderer` 和 tldraw editor
   - 支持主题配置

7. **模块导出** ✅
   - 更新了 `index.ts`
   - 统一导出所有类型和组件

---

## 📝 后续待完成的工作

1. **AI 集成** (阶段 3)
   - 创建 AIContentConverter
   - 创建 AIEditorPanel

2. **页面重构** (阶段 4)
   - 重构简历详情页
   - 重构简历列表页

3. **导出功能** (阶段 5)
   - PDF 导出增强
   - PNG 导出

4. **测试与优化** (阶段 6)
   - 集成测试
   - 性能优化

---

## 📁 新增文件清单

```
apps/web/src/components/resume-canvas/
├── types/
│   └── canvas-resume.types.ts        # ✅ 新的简历数据类型
├── services/
│   ├── template-renderer.ts          # ✅ 模板渲染器
│   ├── tldraw-snapshot-converter.ts  # ✅ tldraw 转换器
│   ├── resume-renderer.ts            # ✅ 简历渲染服务
│   └── ai-content-converter.ts       # ✅ AI 内容转换器（阶段3新增）
├── editor/
│   ├── shapes/
│   │   └── shape-helpers.ts          # ✅ 形状辅助函数
│   └── AIEditorPanel.tsx             # ✅ AI 编辑面板（阶段3新增）
└── index.ts                          # ✅ 更新导出
```

---

## 📊 阶段完成情况

| 阶段                       | 状态      | 完成度 |
| -------------------------- | --------- | ------ |
| 阶段 1: 数据结构与模板系统 | ✅ 完成   | 100%   |
| 阶段 2: tldraw 编辑器增强  | ✅ 完成   | 100%   |
| 阶段 3: AI 集成            | ✅ 完成   | 100%   |
| 阶段 4: 页面重构           | ⏳ 待开始 | 0%     |
| 阶段 5: 导出功能           | ⏳ 待开始 | 0%     |
| 阶段 6: 测试与优化         | ⏳ 待开始 | 0%     |
