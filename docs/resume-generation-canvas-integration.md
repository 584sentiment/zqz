# 简历生成与画布渲染完整解决方案

## 方案概述

本方案实现了从用户档案到画布渲染的完整流程：

1. **AI 生成** - 后端根据用户档案和岗位要求生成简历内容
2. **数据扩充** - 如果数据不足，AI 自动智能扩充
3. **内容转换** - 前端将简历内容转换为画布渲染指令
4. **画布渲染** - 使用 V2 渲染引擎或 Tldraw 渲染到画布
5. **自由编辑** - 用户可以在画布上自由修改

## 架构流程

```
用户档案 + 岗位要求
    ↓
┌─────────────────────────────┐
│  后端：AI 简历生成服务      │
│  - 使用增强 Prompt 模板        │
│  - 智能扩充不足数据          │
│  - 生成标准 ResumeContent   │
└─────────────────────────────┘
           ↓
        HTTP API
           ↓
┌─────────────────────────────┐
│  前端：接收 ResumeContent    │
└─────────────────────────────┘
           ↓
┌─────────────────────────────┐
│  前端：内容转换器           │
│  - ResumeContent → RenderPlan │
│  - 支持多种布局模板          │
└─────────────────────────────┘
           ↓
┌─────────────────────────────┐
│  前端：画布渲染引擎           │
│  - RenderEngine 执行指令     │
│  - 渲染到 HTML5 Canvas       │
│  - 支持导出 PDF             │
└─────────────────────────────┘
           ↓
┌─────────────────────────────┐
│  用户：自由编辑               │
│  - 使用 InteractiveCanvas    │
│  - 或 Tldraw 自由编辑器     │
└─────────────────────────────┘
```

## 核心代码文件

### 后端

#### 1. 增强的 Prompt 模板

**文件**: `packages/ai/src/prompts/enhanced-resume-generation.ts`

- `ENHANCED_RESUME_GENERATION_PROMPT` - 简历生成提示词，支持智能扩充
- `AI_ENHANCEMENT_PROMPT` - 内容增强提示词

#### 2. AI 增强服务

**文件**: `packages/ai/src/services/ai-enhancement.ts`

```typescript
import { getAIEnhancementService } from '@ai-job-assistant/ai';

// 在 ResumeService 中调用
async generateResumeWithEnhancement(userId: string, resumeId: string) {
  const resume = await this.getOne(userId, resumeId);
  const userProfile = await this.getUserProfileForResume(userId);
  const jobDescription = this.buildJobDescription(resume.job);

  // 1. 使用增强的 Prompt 生成简历
  const aiResult = await this.resumeGenerationService.generate(
    JSON.stringify(userProfile),
    jobDescription
  );

  // 2. 如果数据不足，调用增强服务
  const enhancementService = getAIEnhancementService();
  const suggestions = await enhancementService.generateEnhancement(
    JSON.stringify(userProfile),
    jobDescription
  );

  // 3. 合并增强建议到简历内容
  const enhancedContent = this.applyEnhancements(
    aiResult,
    suggestions
  );

  await this.prisma.resume.update({
    where: { id: resumeId },
    data: { content: enhancedContent, status: 'completed' }
  });
}
```

### 前端

#### 3. 内容转换器

**文件**: `apps/web/src/components/resume-canvas/v2/services/resume-content-converter.ts`

```typescript
import { createResumeContentConverter } from '@/components/resume-canvas/v2/services/resume-content-converter';
import { getStylePreset } from '@/components/resume-canvas/v2/services/style-presets';
import { createRenderEngine } from '@/components/resume-canvas/v2/services/render-engine';

// 使用示例
function ResumeCanvasRenderer({ resumeContent, templateId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderPlan, setRenderPlan] = useState(null);

  useEffect(() => {
    if (!resumeContent) return;

    // 1. 获取样式预设
    const preset = getStylePreset(templateId || 'modern');

    // 2. 转换内容为渲染方案
    const converter = createResumeContentConverter(preset);
    const plan = converter.convert(resumeContent);
    setRenderPlan(plan);
  }, [resumeContent, templateId]);

  useEffect(() => {
    if (!renderPlan || !canvasRef.current) return;

    // 3. 渲染到 Canvas
    const engine = createRenderPlanreset(getStylePreset(templateId || 'modern'));
    engine.renderPage(renderPlan.pages[0], canvasRef.current, 1);
  }, [renderPlan, templateId]);

  return <canvas ref={canvasRef} className="resume-canvas" />;
}
```

#### 4. 集成到简历详情页

**修改文件**: `apps/web/src/app/(dashboard)/dashboard/resumes/[id]/page.tsx`

```typescript
import { createResumeContentConverter } from '@/components/resume-canvas/v2/services/resume-content-converter';
import { getStylePreset } from '@/components/resume-canvas/v2/services/style-presets';
import { createRenderEngine } from '@/components/resume-canvas/v2/services/render-engine';
import { InteractiveCanvas } from '@/components/resume-canvas/v2';

export default function ResumeDetailPage() {
  const [useCanvasRenderer, setUseCanvasRenderer] = useState(false);
  const [renderPlan, setRenderPlan] = useState(null);

  // 生成渲染方案
  const generateRenderPlan = useCallback(() => {
    if (!resume || !resume.content) return;

    const preset = getStylePreset(selectedPresetId);
    const converter = createResumeContentConverter(preset);
    const plan = converter.convert(resume.content as ResumeContent);
    setRenderPlan(plan);
  }, [resume, selectedPresetId]);

  // 使用 Canvas 渲染
  if (useCanvasRenderer && renderPlan) {
    return (
      <div className="w-full h-full bg-gray-100">
        <InteractiveCanvas
          content={resume.content as ResumeContent}
          presetId={selectedPresetId}
          scale={canvasScale}
          onContentChange={handleCanvasContentChange}
          onRenderPlanGenerated={(plan) => setRenderPlan(plan)}
          isEditing={isEditing}
          useRichText={true}
          enableSectionDrag={true}
        />
      </div>
    );
  }

  // 默认使用现有的编辑器
  return <ResumeEditor {...} />;
}
```

## 关键特性

### 1. AI 智能扩充

#### 扩充规则

- ✅ **允许扩充**：
  - 根据职位推断合理的职责描述
  - 补充行业通用技术栈
  - 优化表达方式（更专业）
  - 添加常见的项目类型

- ❌ **禁止编造**：
  - 虚构不存在的工作或项目
  - 虚构不存在的技能或证书
  - 虚构量化数据

### 2. 支持的画布类型

#### A. InteractiveCanvas（推荐）

- 基于 HTML5 Canvas 的交互式画布
- 支持点击编辑文本
- 支持区块拖拽排序
- 内联富文本编辑
- 性能更好

#### B. Tldraw 编辑器

- 基于 tldraw 的自由编辑
- 完全自由布局
- 丰富的形状和样式
- 适合需要完全自定义的用户

### 3. 支持的模板

- `modern` - 现代简约
- `classic` - 经典商务
- `creative` - 创意设计
- `minimal` - 极简风格
- `executive` - 高管专业

### 4. 导出功能

```typescript
// PDF 导出
const pdfBytes = await exportToPDF(renderPlan, preset);
downloadPDF(pdfBytes, filename);

// Word 导出
const result = await resumesApi.exportWord(resumeId);
```

## 使用流程

### 步骤 1：创建简历

```typescript
const resume = await resumesApi.create({
  name: '前端工程师简历',
  jobId: 'job-123',
  templateId: 'modern',
  language: 'zh',
});
```

### 步骤 2：AI 生成内容

```typescript
const result = await resumesApi.generate(resume.id);

// 后端会：
// 1. 获取用户档案
// 2. 获取岗位信息
// 3. 调用 AI 生成
// 4. 如果数据不足，调用增强服务
// 5. 返回增强后的内容
```

### 步骤 3：切换到画布渲染

```typescript
const [useCanvasRenderer, setUseCanvasRenderer] = useState(false);

<Button onClick={() => setUseCanvasRenderer(!useCanvasRenderer)}>
  {useCanvasRenderer ? '使用表单编辑' : '使用画布渲染'}
</Button>

{useCanvasRenderer ? <ResumeCanvasRenderer /> : <ResumeEditor />}
```

### 步骤 4：在画布上编辑

用户可以直接：

- 点击文本进行编辑
- 拖拽区块进行排序
- 实时看到渲染效果

### 步骤 5：导出 PDF/Word

```typescript
const handleExport = async () => {
  if (useCanvasRenderer) {
    // 使用画布渲染器导出
    await handleCanvasExportPdf();
  } else {
    // 使用后端 API 导出
    await resumesApi.exportPdf(resume.id);
  }
};
```

## 数据格式

### ResumeContent（标准格式）

```typescript
{
  name: "张三",
  title: "高级前端工程师",
  contact: {
    email: "zhangsan@example.com",
    phone: "13800138000",
    location: "北京"
  },
  summary: "5年前端开发经验，专注于 React 生态...",
  skills: ["React", "TypeScript", "Node.js", "MongoDB"],
  matchedSkills: ["React", "TypeScript"],
  experience: [
    {
      company: "科技公司",
      position: "高级前端工程师",
      period: "2021.01 - 至今",
      location: "北京",
      highlights: [
        "使用 React + TypeScript 重构核心项目",
        "提升页面加载速度 50%"
      ]
    }
  ],
  projects: [],
  education: [
    {
      school: "清华大学",
      degree: "本科",
      major: "计算机科学",
      period: "2014.09 - 2018.06"
    }
  ]
}
```

### RenderPlan（画布渲染格式）

```typescript
{
  version: "1.0",
  presetId: "modern",
  pages: [
    {
      type: "page",
      id: "page-1",
      number: 1,
      size: { width: 595, height: 842 },
      children: [
        { type: "text", ... },
        { type: "skillTag", ... },
        { type: "line", ... },
        { type: "divider", ... }
      ]
    }
  ],
  meta: {
    generatedAt: "2024-01-01T00:00:00.000Z",
    model: "resume-content-converter"
  }
}
```

## 性能优化

### 1. 懒加载

```typescript
// 按需加载画布渲染器
const InteractiveCanvas = React.lazy(
  () => import('@/components/resume-canvas/v2/components/InteractiveCanvas')
);
```

### 2. 缓存渲染方案

```typescript
const cache = new Map<string, RenderPlan>();

const getCachedRenderPlan = (content: ResumeContent, presetId: string) => {
  const key = JSON.stringify(content) + presetId;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const plan = converter.convert(content);
  cache.set(key, plan);
  return plan;
};
```

### 3. 防抖渲染

```typescript
useEffect(() => {
  const handler = setTimeout(() => {
    generateRenderPlan();
  }, 500);

  return () => clearTimeout(handler);
}, [resume.content, selectedPresetId]);
```

## 错误处理

### 1. AI 生成失败

```typescript
try {
  const result = await resumesApi.generate(resume.id);
} catch (error) {
  if (error.response?.data?.data?.upgradeRequired) {
    // 配额用尽
    toast({ title: '配额已用尽', description: '请升级套餐', variant: 'destructive' });
  } else if (error.message?.includes('timeout')) {
    // AI 超时
    toast({ title: '生成超时', description: '请稍后重试', variant: 'destructive' });
  } else {
    toast({ title: '生成失败', description: error.message, variant: 'destructive' });
  }
}
```

### 2. 画布渲染失败

```typescript
try {
  engine.renderPage(page, canvasRef.current, scale);
} catch (error) {
  console.error('画布渲染失败:', error);
  toast({
    title: '渲染失败',
    description: '请尝试切换渲染模式',
    variant: 'destructive',
  });
}
```

## 总结

本方案提供了一个完整的、可扩展的简历生成和画布渲染解决方案：

1. **AI 驱动** - 智能生成内容，合理扩充不足数据
2. **灵活渲染** - 支持多种画布编辑器
3. **实时编辑** - 用户可以自由修改内容
4. **多种导出** - PDF/Word 导出
5. **性能优化** - 懒加载、缓存、防抖

通过这个方案，用户可以：

- 让 AI 自动生成专业的简历
- 在画布上自由编辑和调整
- 实时预览渲染效果
- 一键导出为多种格式
