# 简历生成与画布渲染 - 使用指南

## 🎯 核心流程

```
用户档案 + 岗位要求
    ↓
┌────────────────────────┐
│ 后端 AI 生成服务       │
│ - 增强的 Prompt 模板       │
│ - 智能数据扩充           │
│ - 标准 ResumeContent 格式    │
└────────────────────────┘
    ↓
┌────────────────────────┐
│ 前端内容转换器           │
│ - ResumeContent → RenderPlan  │
│ - 支持 5 种模板           │
│ - 自动计算坐标和样式      │
└────────────────────────┘
    ↓
┌────────────────────────┐
│ 画布渲染引擎             │
│ - 执行绘制指令             │
│ - 渲染到 HTML5 Canvas        │
└────────────────────────┘
    ↓
┌────────────────────────┐
│ 用户：自由编辑            │
│ - 点击文本直接编辑          │
│ - 拖拽区块重新排序        │
└────────────────────────┘
    ↓
┌────────────────────────┐
│ 导出 PDF/Word              │
└────────────────────────┘
```

## 📂 文件结构

### 后端

```
packages/ai/
├── src/
│   ├── prompts/
│   │   ├── index.ts                    # 主入口
│   │   └── enhanced-resume-generation.ts  # 增强的 Prompt 模板
│   └── services/
│       ├── index.ts                   # 服务导出
│       ├── ai-enhancement.ts            # AI 内容增强服务
│       ├── resume-suggestion.ts          # 简历优化建议
│       └── ...
```

### 前端

```
apps/web/src/components/resume-canvas/v2/
├── services/
│   ├── resume-content-converter.ts    # 内容转换器 ✨
│   ├── render-engine.ts              # 渲染引擎 ✨
│   ├── style-presets.ts              # 样式预设 ✨
│   └── interactive-generator.ts      # 交互式生成器
│   ├── components/
│   │   ├── InteractiveCanvas.tsx        # 交互式画布 ✨
│   │   ├── InlineRichTextEditor.tsx    # 富文本编辑器 ✨
│   │   └── ...
```

## 🚀 快速开始

### 1. 创建简历

```typescript
// 调用后端 API 创建简历
const resume = await resumesApi.create({
  name: '前端工程师简历',
  jobId: 'job-123',
  templateId: 'modern',
  language: 'zh',
});
```

### 2. AI 生成内容

```typescript
// 后端会自动：
// 1. 获取用户完整档案
// 2. 获取目标岗位信息
// 3. 调用 AI 生成（使用增强的 Prompt）
// 4. 如果数据不足，调用增强服务扩充
// 5. 返回增强后的 ResumeContent

const result = await resumesApi.generate(resume.id);

console.log('生成的简历内容:', result.content);
console.log('AI 匹配分析:', result.matchAnalysis);
```

### 3. 切换到画布渲染模式

```typescript
const [useCanvasRenderer, setUseCanvasRenderer] = useState(false);

<Button onClick={() => setUseCanvasRenderer(!useCanvasRenderer)}>
  {useCanvasRenderer ? '切换到表单编辑' : '切换到画布渲染'}
</Button>

{useCanvasRenderer ? (
  <InteractiveCanvas
    content={resume.content}
    presetId={selectedPresetId}
    scale={canvasScale}
    onContentChange={handleCanvasContentChange}
    isEditing={isEditing}
    useRichText={true}
    enableSectionDrag={true}
  />
) : (
  <ResumeEditor
    initialContent={editedContent}
    onChange={handleEditorChange}
  />
)}
```

### 4. 在画布上自由编辑

用户可以直接：

- **点击文本** - 点击任何文本即可编辑
- **拖拽区块** - 拖拽左侧手柄重新排序区块
- **调整布局** - 拖拽元素调整位置
- **切换模板** - 实时查看不同模板效果

### 5. 导出简历

```typescript
// PDF 导出（使用画布渲染）
const handleCanvasExportPdf = async () => {
  if (!v2RenderPlan) return;

  const preset = getStylePreset(selectedPresetId);
  const pdfBytes = await exportToPDF(v2RenderPlan, preset);
  downloadPDF(pdfBytes, 'resume.pdf');
};

// Word 导出（使用后端 API）
const handleExportWord = async () => {
  const result = await resumesApi.exportWord(resume.id);
  const blob = new Blob([result.html], { type: 'application/msword' });
  downloadBlob(blob, 'resume.doc');
};
```

## 🎨 样式预设对比

| 模板      | 适用场景     | 特点                  |
| --------- | ------------ | --------------------- |
| modern    | 一般技术岗位 | 左侧边栏 + 右侧主内容 |
| classic   | 传统企业     | 双栏布局，正式风格    |
| creative  | 创意行业     | 顶部横幅 + 多彩设计   |
| minimal   | 个人作品     | 单栏无装饰，简洁      |
| executive | 高管/资深    | 双栏布局，专业风格    |

## 🔧 核心功能

### AI 智能扩充

#### 允许的扩充：

- ✅ 根据职位推断合理的职责描述
- ✅ 补充行业通用技术栈（如用户写"React" → 补充"TypeScript, Redux, Webpack"）
- ✅ 优化表达方式（如"做了优化" → "优化了性能，提升 30%"）

#### 禁止的编造：

- ❌ 虚构不存在的工作或项目
- ❌ 虚构不存在的技能或证书
- ❌ 虚构不存在的量化数据

### 画布编辑

#### 支持的操作：

- **点击编辑** - 点击任何文本元素即可编辑
- **拖拽移动** - 拖拽元素调整位置
- **区块排序** - 拖拽左侧手柄重新排序区块
- **实时预览** - 编辑后立即看到效果

#### 导出功能：

- **PDF 导出** - 高清 PDF，支持 A4 页面
- **Word 导出** - 可编辑的 Word 文档
- **图片导出** - PNG 格式（可扩展）

## 📊 数据格式

### 输入：ResumeContent

```typescript
{
  name: "张三",
  title: "高级前端工程师",
  contact: {
    email: "zhangsan@example.com",
    phone: "13800138000",
    location: "北京",
  },
  summary: "5年前端开发经验，精通 React 生态系统...",
  skills: ["React", "TypeScript", "Node.js", "JavaScript"],
  matchedSkills: ["React", "TypeScript"],
  experience: [
    {
      company: "科技有限公司",
      position: "前端工程师",
      location: "北京",
      period: "2021.01 - 至今",
      highlights: [
        "使用 React + TypeScript 重构核心产品，提升性能 40%",
        "设计并实现前端工程化方案，建立统一的代码规范",
      ],
    },
  ],
  projects: [
    {
      name: "电商平台",
      role: "前端负责人",
      period: "2022.03 - 2022.12",
      techStack: ["React", "Redux Toolkit", "Ant Design"],
      highlights: [
        "实现响应式设计，支持移动端适配",
        "集成支付、物流等第三方服务",
      ],
    },
  ],
  education: [
    {
      school: "北京大学",
      degree: "本科",
      major: "计算机科学",
      period: "2015.09 - 2019.06",
    },
  ],
}
```

### 输出：RenderPlan

```typescript
{
  version: "1.0",
  presetId: "modern",
  pages: [
    {
      type: "page",
      number: 1,
      size: { width: 595, height: 842 },
      children: [
        { type: "text", ... },   // 姓名
        { type: "text", ... },   // 职位
        { type: "line", ... },   // 分隔线
        { type: "text", ... },   // 个人简介
        { type: "skillTag", ... }, // 技能标签
        { type: "text", ... },   // 工作经历标题
        { type: "text", ... },   // 工作经历内容
        { type: "divider", ... }, // 分隔线
        { type: "text", ... },   // 项目经历标题
        { type: "text", ... },   // 项目经历内容
        { type: "divider", ... }, // 分隔线
        { type: "text", ... },   // 教育背景标题
        { type: "text", ... },   // 教育背景内容
      ],
    },
  ],
  meta: {
    generatedAt: "2024-01-01T00:00:00.000Z",
    model: "resume-content-converter",
  },
}
```

## 🎯 完整示例代码

### 前端集成示例

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  InteractiveCanvas,
  createRenderEngine,
  exportToPDF,
  downloadPDF,
  getStylePreset,
  type ResumeContent,
  type RenderPlan,
} from '@/components/resume-canvas/v2';

export default function ResumeCanvasPage() {
  const params = useParams();
  const resumeId = params.id as string;

  const [resume, setResume] = useState<ResumeContent | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState('modern');
  const [renderPlan, setRenderPlan] = useState<RenderPlan | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  // 加载简历数据
  const loadResume = useCallback(async () => {
    const response = await fetch(`/api/resumes/${resumeId}`);
    const data = await response.json();
    setResume(data);
  }, [resumeId]);

  useEffect(() => {
    loadResume();
  }, [resumeId]);

  // 生成渲染方案
  const generateRenderPlan = useCallback(() => {
    if (!resume) return;

    const preset = getStylePreset(selectedPresetId);
    const converter = createResumeContentConverter(preset);
    const plan = converter.convert(resume);
    setRenderPlan(plan);
  }, [resume, selectedPresetId]);

  useEffect(() => {
    generateRenderPlan();
  }, [generateRenderPlan]);

  // 渲染到 Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!renderPlan || !canvasRef.current) return;

    const preset = getStylePreset(selectedPresetId);
    const engine = createRenderEngine(preset);
    engine.renderPage(renderPlan.pages[0], canvasRef.current, canvasScale);
  }, [renderPlan, selectedPresetId, canvasScale]);

  // 导出 PDF
  const handleExportPdf = async () => {
    if (!renderPlan) return;

    try {
      const preset = getStylePreset(selectedPresetId);
      const pdfBytes = await exportToPDF(renderPlan, preset);
      const filename = `${resume?.name || 'resume'}.pdf`;
      downloadPDF(pdfBytes, filename);
    } catch (error) {
      console.error('导出 PDF 失败:', error);
      alert('导出失败，请稍后重试');
    }
  };

  return (
    <div className="p-6">
      {/* 模板选择 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">选择模板</h3>
        <div className="flex gap-2">
          {['modern', 'classic', 'creative', 'minimal', 'executive'].map((id) => (
            <button
              key={id}
              onClick={() => setSelectedPresetId(id)}
              className={`px-4 py-2 border rounded ${
                selectedPresetId === id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {id === 'modern' && '现代简约'}
              {id === 'classic' && '经典商务'}
              {id === 'creative' && '创意设计'}
              {id === 'minimal' && '极简风格'}
              {id === 'executive' && '高管专业'}
            </button>
          ))}
        </div>
      </div>

      {/* 缩放控制 */}
      <div className="mb-6">
        <h3 class="text-lg font-semibold mb-3">缩放: {Math.round(canvasScale * 100)}%</h3>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.1}
          value={canvasScale}
          onChange={(e) => setCanvasScale(parseFloat(e.target.value))}
          className="w-full max-w-md"
        />
      </div>

      {/* 画布 */}
      {resume && renderPlan && (
        <div className="flex justify-center bg-gray-100 p-4">
          <canvas
            ref={canvasRef}
            className="bg-white shadow-lg border border-gray-200"
          />
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => generateRenderPlan()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          刷新渲染
        </button>

        <button
          onClick={handleExportPdf}
          disabled={!renderPlan}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
        >
          导出 PDF
        </button>
      </div>

      {/* 状态提示 */}
      {!resume && (
        <div className="text-center text-gray-500">加载中...</div>
      )}

      {resume && !renderPlan && (
        <div className="text-center text-gray-500">
          正在生成渲染方案...
        </div>
      )}
    </div>
  );
}
```

## 🚨 故障排除

### AI 生成失败

```typescript
// 检查错误类型
if (error.message.includes('timeout')) {
  // AI 服务超时
  toast({ title: '生成超时', description: '请稍后重试', variant: 'destructive' });
} else if (error.response?.data?.data?.upgradeRequired) {
  // 配额不足
  toast({ title: '配额已用尽', description: '请升级套餐', variant: 'destructive' });
} else {
  // 其他错误
  toast({ title: '生成失败', description: error.message, variant: 'destructive' });
}
```

### 画布渲染失败

```typescript
// 1. 检查 ResumeContent 是否有效
if (!resume || !resume.name) {
  toast({ title: '简历内容为空', variant: 'destructive' });
  return;
}

// 2. 检查 RenderPlan 是否生成
if (!renderPlan) {
  toast({ title: '渲染方案未生成', variant: 'destructive' });
  return;
}

// 3. 检查样式预设是否存在
const preset = getStylePreset(selectedPresetId);
if (!preset) {
  toast({ title: '样式预设不存在', variant: 'destructive' });
  return;
}

// 4. 检查 Canvas 是否就绪
if (!canvasRef.current) {
  toast({ title: 'Canvas 未就绪', variant: 'destructive' });
  return;
}

// 5. 捕获渲染引擎异常
try {
  const engine = createRenderEngine(preset);
  engine.renderPage(renderPlan.pages[0], canvasRef.current, canvasScale);
} catch (error) {
  console.error('画布渲染失败:', error);
  toast({ title: '渲染失败', description: error.message, variant: 'destructive' });
}
```

### 类型错误处理

如果遇到 TypeScript 类型错误，确保：

1. **导入类型正确**：

```typescript
import type {
  ResumeContent,
  RenderPlan,
  StylePreset,
  DrawCommand,
} from '@/components/resume-canvas/v2/types';
```

2. **类型断言正确**：

```typescript
const textCmd = command as TextCommand;
const lineCmd = command as LineCommand;
const skillTagCmd = command as SkillTagCommand;
```

3. **可选属性处理**：

```typescript
const color = (command.style.color as string) || '#000000';
const lineHeight = command.style.lineHeight || 1.4;
```

## 🎓 下一步

要完整集成到你的项目，需要：

1. **修复类型错误** - 更新类型定义，修复兼容性问题
2. **完善错误处理** - 添加更详细的错误提示
3. **添加单元测试** - 为核心功能编写测试
4. **集成到现有页面** - 将画布渲染器集成到简历详情页
5. **优化性能** - 添加缓存、懒加载等

需要我帮你完成这些后续任务吗？
