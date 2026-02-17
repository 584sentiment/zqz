import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface CreateInterviewDto {
  type: string;
  jobId?: string;
  mode?: string; // text, voice
  difficulty?: string; // easy, medium, hard
}

interface UpdateInterviewDto {
  status?: string;
  questions?: Record<string, unknown>;
  transcript?: Record<string, unknown>;
  report?: Record<string, unknown>;
}

export interface SubmitAnswerDto {
  questionIndex: number;
  answer: string;
  duration?: number;
}

export interface QuestionBankItem {
  id: string;
  category: string;
  type: string;
  difficulty: string;
  question: string;
  tags: string[];
  keypoints: string[];
  referenceAnswer: string;
}

@Injectable()
export class InterviewsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  // 获取用户的面试列表
  async getList(userId: string, params?: { status?: string; type?: string }) {
    const where: Record<string, unknown> = { userId };

    if (params?.status) {
      where.status = params.status;
    }
    if (params?.type) {
      where.type = params.type;
    }

    const interviews = await this.prisma.interview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return interviews;
  }

  // 获取用户正在进行的面试（用于恢复功能）
  async getInProgress(userId: string) {
    const interview = await this.prisma.interview.findFirst({
      where: {
        userId,
        status: 'in_progress',
        type: 'mock', // 只获取模拟面试，不包括准备计划
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!interview) {
      return null;
    }

    // 计算进度
    const transcript = (interview.transcript as Record<string, unknown>) || {};
    const answers = (transcript.answers as Record<string, unknown>[]) || [];
    const questions = (interview.questions as Record<string, unknown>[]) || [];

    return {
      ...interview,
      progress: {
        answered: answers.length,
        total: questions.length,
        percentage: questions.length > 0 ? Math.round((answers.length / questions.length) * 100) : 0,
      },
    };
  }

  // 获取单个面试详情
  async getOne(userId: string, interviewId: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw new NotFoundException('面试不存在');
    }

    return interview;
  }

  // 创建新面试
  async create(userId: string, dto: CreateInterviewDto) {
    // 获取岗位上下文
    let jobContext: Record<string, unknown> | null = null;
    if (dto.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: dto.jobId, userId },
        select: {
          id: true,
          title: true,
          company: true,
          description: true,
          requirements: true,
        },
      });
      if (job) {
        jobContext = job;
      }
    }

    // 生成面试问题
    const questions = await this.generateQuestions(jobContext, dto.difficulty || 'medium');

    const interview = await this.prisma.interview.create({
      data: {
        userId,
        type: dto.type || 'mock',
        status: 'pending',
        jobContext: jobContext ? JSON.parse(JSON.stringify(jobContext)) : undefined,
        questions: JSON.parse(JSON.stringify(questions)),
      },
    });

    return interview;
  }

  // 生成面试问题
  private async generateQuestions(
    jobContext: Record<string, unknown> | null,
    difficulty: string
  ): Promise<Record<string, unknown>[]> {
    // 基于岗位上下文生成问题（这里使用预设问题，实际应调用 AI）
    const baseQuestions: Record<string, unknown>[] = [
      {
        id: 'q1',
        type: 'behavioral',
        category: '自我介绍',
        question: '请简单介绍一下自己，重点说明你为什么适合这个岗位。',
        keypoints: ['简洁明了', '突出相关经验', '展示对岗位的理解'],
        difficulty,
      },
      {
        id: 'q2',
        type: 'technical',
        category: '技术能力',
        question: jobContext?.title
          ? `请描述你在${jobContext.title}相关项目中遇到的最大挑战是什么？你是如何解决的？`
          : '请描述你在项目中遇到的最大技术挑战是什么？你是如何解决的？',
        keypoints: ['STAR 原则', '具体细节', '结果量化'],
        difficulty,
      },
      {
        id: 'q3',
        type: 'behavioral',
        category: '团队协作',
        question: '请举例说明你在团队中如何处理意见分歧？',
        keypoints: ['沟通方式', '妥协与坚持', '最终结果'],
        difficulty,
      },
      {
        id: 'q4',
        type: 'technical',
        category: '专业深度',
        question: '你认为自己在哪些方面还需要提升？你有什么学习计划？',
        keypoints: ['自我认知', '具体计划', '学习能力'],
        difficulty,
      },
      {
        id: 'q5',
        type: 'hr',
        category: '职业规划',
        question: '你为什么选择我们公司？你对未来的职业规划是什么？',
        keypoints: ['公司了解', '价值观匹配', '长期规划'],
        difficulty,
      },
    ];

    // 根据难度调整问题数量
    if (difficulty === 'easy') {
      return baseQuestions.slice(0, 3);
    } else if (difficulty === 'hard') {
      return [
        ...baseQuestions,
        {
          id: 'q6',
          type: 'technical',
          category: '深度追问',
          question: jobContext?.description
            ? '根据岗位描述，如果让你负责一个从0到1的项目，你会如何规划？'
            : '如果让你负责一个从0到1的项目，你会如何规划？',
          keypoints: ['项目规划', '风险管理', '团队协调'],
          difficulty,
        },
      ];
    }

    return baseQuestions;
  }

  // 开始面试
  async startInterview(userId: string, interviewId: string) {
    const interview = await this.getOne(userId, interviewId);

    if (interview.status !== 'pending') {
      throw new ForbiddenException('面试已经开始或已完成');
    }

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'in_progress',
        transcript: { messages: [], answers: [] },
      },
    });

    // 记录面试使用量
    await this.subscriptionsService.recordUsage(userId, 'interview_mock', interviewId);

    return updated;
  }

  // 提交回答
  async submitAnswer(userId: string, interviewId: string, dto: SubmitAnswerDto) {
    const interview = await this.getOne(userId, interviewId);

    if (interview.status !== 'in_progress') {
      throw new ForbiddenException('面试未在进行中');
    }

    const transcript = (interview.transcript as Record<string, unknown>) || {
      messages: [],
      answers: [],
    };

    const answers = (transcript.answers as Record<string, unknown>[]) || [];

    // 添加回答记录
    answers.push({
      questionIndex: dto.questionIndex,
      answer: dto.answer,
      duration: dto.duration,
      timestamp: new Date().toISOString(),
      feedback: this.generateFeedback(dto.answer),
    });

    const questions = interview.questions as Record<string, unknown>[];
    const isLastQuestion = dto.questionIndex >= questions.length - 1;

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        transcript: JSON.parse(JSON.stringify({
          ...transcript,
          answers,
        })),
        // 如果是最后一题，更新状态为完成
        ...(isLastQuestion ? { status: 'completed' } : {}),
      },
    });

    // 如果面试完成，生成报告
    if (isLastQuestion) {
      await this.generateReport(interviewId, answers);
    }

    return {
      interview: updated,
      feedback: answers[answers.length - 1]?.feedback,
      isCompleted: isLastQuestion,
    };
  }

  // 生成回答反馈
  private generateFeedback(answer: string): Record<string, unknown> {
    // 简单的反馈生成（实际应调用 AI）
    const score = Math.min(100, Math.max(60, 70 + Math.floor(Math.random() * 20)));

    return {
      score,
      strengths:
        score >= 80
          ? ['回答结构清晰', '内容充实', '表达流畅']
          : ['回答基本完整', '态度认真'],
      improvements:
        score >= 80
          ? ['可以更具体地举例说明', '适当展示更多技术深度']
          : ['建议使用 STAR 原则组织回答', '可以增加更多具体细节'],
      suggestions:
        '回答整体不错，建议在描述经历时更多使用具体的数据和成果来支撑你的观点。',
    };
  }

  // 生成面试报告
  private async generateReport(
    interviewId: string,
    answers: Record<string, unknown>[]
  ): Promise<void> {
    // 计算总分
    const scores = answers.map((a) => (a.feedback as Record<string, unknown>)?.score as number);
    const totalScore = Math.round(
      scores.reduce((sum, s) => sum + (s || 0), 0) / scores.length
    );

    // 计算总耗时（秒）
    const totalTime = answers.reduce(
      (sum, a) => sum + ((a.duration as number) || 0),
      0
    );

    const report = {
      totalScore,
      summary: this.generateSummary(totalScore),
      timeStats: {
        totalTime,
        averageTime: Math.round(totalTime / answers.length),
        questionTimes: answers.map((a, index) => ({
          questionIndex: index,
          duration: (a.duration as number) || 0,
        })),
      },
      dimensions: {
        technical: {
          score: Math.min(100, totalScore + Math.floor(Math.random() * 10) - 5),
          label: '技术能力',
          feedback: '技术基础扎实，能够清晰表达技术观点。',
        },
        communication: {
          score: Math.min(100, totalScore + Math.floor(Math.random() * 10) - 5),
          label: '沟通表达',
          feedback: '表达流畅，逻辑清晰。',
        },
        problemSolving: {
          score: Math.min(100, totalScore + Math.floor(Math.random() * 10) - 5),
          label: '问题解决',
          feedback: '能够系统地分析问题，提出合理的解决方案。',
        },
        teamwork: {
          score: Math.min(100, totalScore + Math.floor(Math.random() * 10) - 5),
          label: '团队协作',
          feedback: '具有团队合作意识，能够妥善处理分歧。',
        },
      },
      recommendations: [
        '建议在回答中多使用具体数据和成果',
        '可以更深入地展示技术理解',
        '继续加强对行业动态的关注',
      ],
      answersSummary: answers.map((a, index) => ({
        questionIndex: index,
        score: (a.feedback as Record<string, unknown>)?.score,
        briefFeedback: (a.feedback as Record<string, unknown>)?.suggestions,
        duration: (a.duration as number) || 0,
      })),
      generatedAt: new Date().toISOString(),
    };

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { report: JSON.parse(JSON.stringify(report)) },
    });
  }

  // 生成总结
  private generateSummary(score: number): string {
    if (score >= 90) {
      return '表现优秀，展现了出色的专业素养和沟通能力。';
    } else if (score >= 80) {
      return '表现良好，回答内容充实，表达清晰。';
    } else if (score >= 70) {
      return '表现中等，基本能够应对面试问题，但仍有提升空间。';
    } else {
      return '表现需要提升，建议加强面试准备。';
    }
  }

  // 获取面试报告
  async getReport(userId: string, interviewId: string) {
    const interview = await this.getOne(userId, interviewId);

    if (interview.status !== 'completed') {
      throw new ForbiddenException('面试尚未完成');
    }

    return interview.report;
  }

  // 提前结束面试
  async abortInterview(userId: string, interviewId: string) {
    const interview = await this.getOne(userId, interviewId);

    if (interview.status !== 'in_progress') {
      throw new ForbiddenException('面试未在进行中');
    }

    const transcript = (interview.transcript as Record<string, unknown>) || {
      messages: [],
      answers: [],
    };
    const answers = (transcript.answers as Record<string, unknown>[]) || [];

    // 即使未完成也生成部分报告
    if (answers.length > 0) {
      await this.generateReport(interviewId, answers);
    }

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: { status: 'aborted' },
    });

    return updated;
  }

  // 删除面试记录
  async delete(userId: string, interviewId: string) {
    const interview = await this.getOne(userId, interviewId);

    await this.prisma.interview.delete({
      where: { id: interview.id },
    });

    return { success: true };
  }

  // 获取面试统计
  async getStats(userId: string) {
    const total = await this.prisma.interview.count({
      where: { userId },
    });

    const completed = await this.prisma.interview.count({
      where: { userId, status: 'completed' },
    });

    const inProgress = await this.prisma.interview.count({
      where: { userId, status: 'in_progress' },
    });

    // 获取最近的面试平均分
    const recentInterviews = await this.prisma.interview.findMany({
      where: {
        userId,
        status: 'completed',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { report: true },
    });

    let avgScore = null;
    if (recentInterviews.length > 0) {
      const scores = recentInterviews
        .map((i: { report: unknown }) => (i.report as Record<string, unknown>)?.totalScore as number)
        .filter(Boolean);
      if (scores.length > 0) {
        avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
      }
    }

    return {
      total,
      completed,
      inProgress,
      avgScore,
    };
  }

  // 获取题库分类
  async getQuestionCategories() {
    return [
      { id: 'behavioral', name: '行为面试', icon: 'users' },
      { id: 'technical', name: '技术面试', icon: 'code' },
      { id: 'hr', name: 'HR 面试', icon: 'briefcase' },
      { id: 'situational', name: '情景面试', icon: 'target' },
    ];
  }

  // ============== 面试题库 ==============

  // 获取题库列表
  async getQuestionBank(params?: {
    category?: string;
    difficulty?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const questions = this.getPredefinedQuestions();

    let filtered = questions;

    // 按分类筛选
    if (params?.category) {
      filtered = filtered.filter((q) => q.category === params.category);
    }

    // 按难度筛选
    if (params?.difficulty) {
      filtered = filtered.filter((q) => q.difficulty === params.difficulty);
    }

    // 搜索
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(searchLower) ||
          q.tags?.some((t: string) => t.toLowerCase().includes(searchLower))
      );
    }

    const total = filtered.length;
    const limit = params?.limit || 20;
    const offset = params?.offset || 0;

    return {
      data: filtered.slice(offset, offset + limit),
      pagination: {
        total,
        hasMore: offset + limit < total,
      },
    };
  }

  // 获取题目详情
  async getQuestionDetail(questionId: string) {
    const questions = this.getPredefinedQuestions();
    const question = questions.find((q) => q.id === questionId);

    if (!question) {
      throw new NotFoundException('题目不存在');
    }

    return question;
  }

  // 预设题库
  private getPredefinedQuestions(): QuestionBankItem[] {
    return [
      // 行为面试
      {
        id: 'b001',
        category: 'behavioral',
        type: 'behavioral',
        difficulty: 'easy',
        question: '请简单介绍一下自己。',
        tags: ['自我介绍', '开场'],
        keypoints: ['简洁明了', '突出相关经验', '展示个人特点'],
        referenceAnswer:
          '建议用 1-2 分钟介绍自己的教育背景、工作经历和核心技能，重点突出与应聘岗位相关的经验。最后可以简单说明为什么对这个岗位感兴趣。',
      },
      {
        id: 'b002',
        category: 'behavioral',
        type: 'behavioral',
        difficulty: 'medium',
        question: '请描述一次你遇到的工作挑战，以及你是如何解决的？',
        tags: ['挑战', '问题解决', 'STAR原则'],
        keypoints: ['STAR 原则', '具体细节', '结果量化'],
        referenceAnswer:
          '使用 STAR 原则回答：Situation（情境）→ Task（任务）→ Action（行动）→ Result（结果）。重点描述你采取的具体行动和最终取得的成果。',
      },
      {
        id: 'b003',
        category: 'behavioral',
        type: 'behavioral',
        difficulty: 'medium',
        question: '你如何处理与同事的意见分歧？',
        tags: ['团队协作', '沟通', '冲突处理'],
        keypoints: ['沟通方式', '寻求共识', '结果导向'],
        referenceAnswer:
          '描述一次具体的分歧经历，说明你如何倾听对方观点、寻找共同点、提出解决方案，最终达成共识的过程。',
      },
      {
        id: 'b004',
        category: 'behavioral',
        type: 'behavioral',
        difficulty: 'hard',
        question: '请举例说明你是如何带领团队完成一个重要项目的。',
        tags: ['领导力', '项目管理', '团队协作'],
        keypoints: ['目标设定', '资源协调', '风险管控', '结果展示'],
        referenceAnswer:
          '重点描述你如何设定目标、分配任务、协调资源、激励团队、处理突发情况，以及最终达成的成果。',
      },

      // 技术面试 - 前端
      {
        id: 't001',
        category: 'technical',
        type: 'technical',
        difficulty: 'easy',
        question: '请解释什么是闭包？在 JavaScript 中有什么应用？',
        tags: ['JavaScript', '闭包', '前端'],
        keypoints: ['定义理解', '作用域链', '实际应用'],
        referenceAnswer:
          '闭包是指有权访问另一个函数作用域中变量的函数。常见应用包括：数据私有化、函数柯里化、模块模式、回调函数等。',
      },
      {
        id: 't002',
        category: 'technical',
        type: 'technical',
        difficulty: 'medium',
        question: 'React 中的虚拟 DOM 是什么？它有什么优势？',
        tags: ['React', '虚拟DOM', '前端'],
        keypoints: ['概念理解', 'Diff算法', '性能优势'],
        referenceAnswer:
          '虚拟 DOM 是真实 DOM 的 JavaScript 对象表示。优势包括：减少真实 DOM 操作、跨平台能力、方便测试和调试。React 使用 Diff 算法比较新旧虚拟 DOM，只更新必要的部分。',
      },
      {
        id: 't003',
        category: 'technical',
        type: 'technical',
        difficulty: 'hard',
        question: '请解释浏览器从输入 URL 到页面展示的完整过程。',
        tags: ['浏览器', '网络', '渲染'],
        keypoints: ['DNS解析', 'TCP连接', 'HTTP请求', '渲染流程'],
        referenceAnswer:
          '主要包括：DNS解析 → TCP连接 → HTTP请求 → 服务器响应 → 浏览器解析HTML → 构建DOM树 → 构建CSSOM树 → 执行JavaScript → 渲染树 → 布局 → 绘制。每个环节都有很多细节可以展开。',
      },

      // 技术面试 - 后端
      {
        id: 't004',
        category: 'technical',
        type: 'technical',
        difficulty: 'medium',
        question: '请解释 RESTful API 的设计原则。',
        tags: ['API设计', 'REST', '后端'],
        keypoints: ['资源导向', 'HTTP方法', '状态码', '无状态'],
        referenceAnswer:
          'RESTful API 设计原则包括：使用名词表示资源、使用HTTP方法表示操作（GET/POST/PUT/DELETE）、使用正确的状态码、无状态设计、版本控制、过滤和分页等。',
      },
      {
        id: 't005',
        category: 'technical',
        type: 'technical',
        difficulty: 'hard',
        question: '如何设计一个高并发系统？',
        tags: ['系统设计', '高并发', '架构'],
        keypoints: ['负载均衡', '缓存', '数据库优化', '异步处理'],
        referenceAnswer:
          '高并发系统设计要点：1）负载均衡（Nginx、服务网关）；2）缓存策略（Redis、CDN）；3）数据库优化（索引、分库分表、读写分离）；4）异步处理（消息队列）；5）服务拆分（微服务）；6）限流降级。',
      },

      // HR 面试
      {
        id: 'h001',
        category: 'hr',
        type: 'hr',
        difficulty: 'easy',
        question: '你为什么想离开目前的公司？',
        tags: ['离职原因', '职业规划'],
        keypoints: ['积极正面', '发展导向', '避免负面'],
        referenceAnswer:
          '从个人发展角度回答，强调对新机会的期待，而非对现有公司的不满。可以提到：寻求更大发展空间、希望接触新技术、对行业方向感兴趣等。',
      },
      {
        id: 'h002',
        category: 'hr',
        type: 'hr',
        difficulty: 'medium',
        question: '你的薪资期望是多少？',
        tags: ['薪资谈判', '期望'],
        keypoints: ['市场调研', '价值匹配', '灵活态度'],
        referenceAnswer:
          '建议先了解市场行情，给出合理区间而非具体数字。可以表示：根据我的经验和能力，期望在 X-Y 范围内，但也愿意根据公司整体package来协商。',
      },
      {
        id: 'h003',
        category: 'hr',
        type: 'hr',
        difficulty: 'hard',
        question: '你觉得自己有什么缺点？',
        tags: ['自我认知', '缺点'],
        keypoints: ['真实可信', '改进措施', '正面转化'],
        referenceAnswer:
          '选择真实但可改进的缺点，并说明你正在采取的改进措施。避免说"没有缺点"或提到影响工作的致命缺点。',
      },

      // 情景面试
      {
        id: 's001',
        category: 'situational',
        type: 'situational',
        difficulty: 'medium',
        question: '如果你的项目进度落后，你会怎么处理？',
        tags: ['项目管理', '进度控制'],
        keypoints: ['分析原因', '调整计划', '沟通协调'],
        referenceAnswer:
          '首先分析落后原因（需求变更、资源不足、技术困难等），然后制定赶工计划（加班、增加资源、调整范围），同时及时与相关方沟通，管理预期。',
      },
      {
        id: 's002',
        category: 'situational',
        type: 'situational',
        difficulty: 'hard',
        question: '如果客户的需求与你的专业判断冲突，你会如何处理？',
        tags: ['沟通', '专业判断', '客户关系'],
        keypoints: ['倾听理解', '专业建议', '寻求平衡'],
        referenceAnswer:
          '先充分理解客户的真实需求和顾虑，然后用专业角度解释可能的风险和更好的替代方案，最终寻求双赢的解决方案。',
      },
    ];
  }

  // ============== 面试准备计划 ==============

  // 创建准备计划
  async createPreparationPlan(
    userId: string,
    data: { jobId?: string; days: number; focusAreas?: string[] },
  ) {
    // 获取岗位上下文
    let jobContext: Record<string, unknown> | null = null;
    if (data.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: data.jobId, userId },
        select: {
          id: true,
          title: true,
          company: true,
          description: true,
          requirements: true,
          matchedSkills: true,
        },
      });
      if (job) {
        jobContext = job;
      }
    }

    // 生成每日准备计划
    const dailyPlan = this.generateDailyPlan(data.days, jobContext, data.focusAreas);

    const plan = await this.prisma.interview.create({
      data: {
        userId,
        type: 'preparation',
        status: 'pending',
        jobContext: jobContext ? JSON.parse(JSON.stringify(jobContext)) : undefined,
        questions: JSON.parse(JSON.stringify(dailyPlan)),
      },
    });

    return plan;
  }

  // 生成每日准备计划
  private generateDailyPlan(
    days: number,
    jobContext: Record<string, unknown> | null,
    focusAreas?: string[],
  ): Record<string, unknown>[] {
    const plan: Record<string, unknown>[] = [];
    const areas = focusAreas || ['technical', 'behavioral', 'company', 'self_intro'];

    // 基础任务模板
    const taskTemplates: Record<string, Record<string, unknown>[]> = {
      technical: [
        { title: '复习核心技术栈', duration: 60, type: 'study' },
        { title: '刷算法题 2 道', duration: 45, type: 'practice' },
        { title: '整理项目技术亮点', duration: 30, type: 'review' },
      ],
      behavioral: [
        { title: '准备 STAR 故事素材', duration: 30, type: 'prepare' },
        { title: '模拟回答行为面试题', duration: 45, type: 'practice' },
        { title: '复盘过往工作经历', duration: 30, type: 'review' },
      ],
      company: [
        { title: '研究目标公司背景', duration: 30, type: 'research' },
        { title: '了解行业动态', duration: 20, type: 'research' },
        { title: '准备针对性问题', duration: 20, type: 'prepare' },
      ],
      self_intro: [
        { title: '完善自我介绍', duration: 20, type: 'prepare' },
        { title: '练习自我介绍表达', duration: 15, type: 'practice' },
        { title: '录制并回看自我介绍', duration: 15, type: 'review' },
      ],
    };

    // 根据天数分配任务
    for (let day = 1; day <= days; day++) {
      const dayIndex = (day - 1) % areas.length;
      const area = areas[dayIndex] ?? 'technical';
      const tasks = taskTemplates[area] || taskTemplates.technical;

      // 根据进度调整任务类型
      let adjustedTasks = [...tasks];
      if (day <= Math.ceil(days / 3)) {
        // 前期：以学习和准备为主
        adjustedTasks = tasks.filter(
          (t) => t.type === 'study' || t.type === 'prepare' || t.type === 'research',
        );
      } else if (day <= Math.ceil((days * 2) / 3)) {
        // 中期：以练习为主
        adjustedTasks = tasks.filter((t) => t.type === 'practice' || t.type === 'prepare');
      } else {
        // 后期：以复习和模拟为主
        adjustedTasks = [
          { title: '模拟面试练习', duration: 60, type: 'mock' },
          { title: '复习重点内容', duration: 30, type: 'review' },
        ];
      }

      // 确保至少有任务
      if (adjustedTasks.length === 0) {
        adjustedTasks = tasks.slice(0, 2);
      }

      plan.push({
        day,
        date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        focusArea: area,
        tasks: adjustedTasks.map((t, index) => ({
          id: `day${day}-task${index + 1}`,
          ...t,
          completed: false,
        })),
        totalDuration: adjustedTasks.reduce((sum, t) => sum + (t.duration as number), 0),
        completedCount: 0,
        totalTasks: adjustedTasks.length,
      });
    }

    return plan;
  }

  // 获取准备计划列表
  async getPreparationPlans(userId: string) {
    const plans = await this.prisma.interview.findMany({
      where: { userId, type: 'preparation' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return plans.map((plan: { id: string; jobContext: unknown; status: string; createdAt: Date; questions: unknown }) => ({
      id: plan.id,
      jobContext: plan.jobContext,
      status: plan.status,
      createdAt: plan.createdAt,
      progress: this.calculatePlanProgress(plan.questions as Record<string, unknown>[]),
    }));
  }

  // 获取单个准备计划详情
  async getPreparationPlan(userId: string, planId: string) {
    const plan = await this.prisma.interview.findFirst({
      where: { id: planId, userId, type: 'preparation' },
    });

    if (!plan) {
      throw new NotFoundException('准备计划不存在');
    }

    return {
      ...plan,
      progress: this.calculatePlanProgress(plan.questions as Record<string, unknown>[]),
    };
  }

  // 计算计划进度
  private calculatePlanProgress(dailyPlan: Record<string, unknown>[]): number {
    if (!dailyPlan || dailyPlan.length === 0) return 0;

    let totalTasks = 0;
    let completedTasks = 0;

    for (const day of dailyPlan) {
      const tasks = day.tasks as Record<string, unknown>[] || [];
      totalTasks += tasks.length;
      completedTasks += tasks.filter((t) => t.completed).length;
    }

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  // 标记任务完成
  async completeTask(userId: string, planId: string, dayIndex: number, taskId: string) {
    const plan = await this.getPreparationPlan(userId, planId);
    const dailyPlan = plan.questions as Record<string, unknown>[];

    if (dayIndex < 0 || dayIndex >= dailyPlan.length) {
      throw new NotFoundException('任务日期不存在');
    }

    const day = dailyPlan[dayIndex] as Record<string, unknown>;
    const tasks = day.tasks as Record<string, unknown>[];
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      throw new NotFoundException('任务不存在');
    }

    // 切换完成状态
    tasks[taskIndex] = { ...tasks[taskIndex], completed: !tasks[taskIndex].completed };

    // 更新当天的完成计数
    day.completedCount = tasks.filter((t) => t.completed).length;

    // 更新整个计划
    const updatedPlan = await this.prisma.interview.update({
      where: { id: planId },
      data: {
        questions: JSON.parse(JSON.stringify(dailyPlan)),
        status: this.calculatePlanProgress(dailyPlan) === 100 ? 'completed' : 'in_progress',
      },
    });

    return {
      ...updatedPlan,
      progress: this.calculatePlanProgress(dailyPlan),
    };
  }

  // 删除准备计划
  async deletePreparationPlan(userId: string, planId: string) {
    const plan = await this.getPreparationPlan(userId, planId);
    await this.prisma.interview.delete({
      where: { id: plan.id },
    });
    return { success: true };
  }

  /**
   * 根据岗位预测面试题（AI 增强版本）
   */
  async predictInterviewQuestions(jobId: string) {
    // 获取岗位信息
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('岗位不存在');
    }

    // 基于岗位信息生成预测问题
    const questions = await this.generatePredictedQuestions(job);

    return {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      questions,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 生成预测的面试问题
   */
  private async generatePredictedQuestions(job: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const title = job.title as string || '目标岗位';
    const description = job.description as string || '';
    const requirements = job.requirements as Record<string, unknown> || {};

    // 提取技能关键词
    const skills = this.extractSkillsFromJob(requirements, description);

    // 生成不同类型的预测问题
    const questions: Record<string, unknown>[] = [
      // 自我介绍类
      {
        id: 'predict-1',
        type: 'behavioral',
        category: '自我介绍',
        question: `请介绍一下你自己，重点说明你为什么适合${title}这个岗位？`,
        keypoints: ['突出相关经验', '展示对岗位的理解', '简洁有力'],
        difficulty: 'medium',
        source: '岗位匹配',
      },
      // 技术能力类
      {
        id: 'predict-2',
        type: 'technical',
        category: '技术能力',
        question: `作为${title}，你认为最重要的技术能力是什么？请结合你的经验说明。`,
        keypoints: ['技术深度', '实践经验', '持续学习'],
        difficulty: 'medium',
        source: '岗位要求',
      },
      // 项目经验类
      {
        id: 'predict-3',
        type: 'behavioral',
        category: '项目经验',
        question: `请描述一个你认为最能体现你${title}能力的项目，你的角色和贡献是什么？`,
        keypoints: ['STAR 原则', '量化成果', '团队协作'],
        difficulty: 'medium',
        source: '能力验证',
      },
    ];

    // 根据技能生成针对性问题
    if (skills.length > 0) {
      const topSkills = skills.slice(0, 3);

      for (let i = 0; i < topSkills.length; i++) {
        questions.push({
          id: `predict-skill-${i + 1}`,
          type: 'technical',
          category: '技能考察',
          question: `关于${topSkills[i]}，请分享你在实际项目中如何应用这项技能？遇到过什么挑战？`,
          keypoints: ['实际应用', '问题解决', '经验总结'],
          difficulty: 'medium',
          source: '技能要求',
        });
      }
    }

    // 根据岗位类型添加特定问题
    if (title.includes('前端') || title.includes('Frontend')) {
      questions.push(
        {
          id: 'predict-fe-1',
          type: 'technical',
          category: '前端专项',
          question: '请谈谈你对前端性能优化的理解，有哪些具体的优化方法？',
          keypoints: ['性能指标', '优化策略', '实践经验'],
          difficulty: 'medium',
          source: '岗位专业',
        },
        {
          id: 'predict-fe-2',
          type: 'technical',
          category: '前端专项',
          question: '请解释 React/Vue 的核心原理，以及你选择使用它的原因？',
          keypoints: ['框架理解', '技术选型', '深入原理'],
          difficulty: 'hard',
          source: '岗位专业',
        }
      );
    } else if (title.includes('后端') || title.includes('Backend')) {
      questions.push(
        {
          id: 'predict-be-1',
          type: 'technical',
          category: '后端专项',
          question: '请谈谈你对高并发系统设计的理解，有哪些关键点需要注意？',
          keypoints: ['架构设计', '性能优化', '容错处理'],
          difficulty: 'hard',
          source: '岗位专业',
        },
        {
          id: 'predict-be-2',
          type: 'technical',
          category: '后端专项',
          question: '请描述数据库索引的原理，以及如何进行 SQL 优化？',
          keypoints: ['索引原理', '查询优化', '实践经验'],
          difficulty: 'medium',
          source: '岗位专业',
        }
      );
    } else if (title.includes('产品') || title.includes('PM')) {
      questions.push(
        {
          id: 'predict-pm-1',
          type: 'behavioral',
          category: '产品思维',
          question: '请描述你是如何进行需求分析和产品设计的？',
          keypoints: ['需求挖掘', '用户视角', '数据驱动'],
          difficulty: 'medium',
          source: '岗位专业',
        },
        {
          id: 'predict-pm-2',
          type: 'situational',
          category: '产品决策',
          question: '如果开发资源有限，你会如何进行功能优先级排序？',
          keypoints: ['价值评估', '资源分配', '决策逻辑'],
          difficulty: 'medium',
          source: '岗位专业',
        }
      );
    }

    // 添加通用 HR 问题
    questions.push(
      {
        id: 'predict-hr-1',
        type: 'hr',
        category: '职业规划',
        question: `你为什么对我们公司感兴趣？你期望的薪资范围是多少？`,
        keypoints: ['公司了解', '价值观匹配', '期望合理'],
        difficulty: 'easy',
        source: 'HR 必问',
      },
      {
        id: 'predict-hr-2',
        type: 'hr',
        category: '自我评价',
        question: '你认为自己的优势和需要改进的地方分别是什么？',
        keypoints: ['自我认知', '成长心态', '改进计划'],
        difficulty: 'medium',
        source: 'HR 常问',
      },
      {
        id: 'predict-hr-3',
        type: 'behavioral',
        category: '团队协作',
        question: '请举例说明你在团队中如何处理意见分歧或冲突？',
        keypoints: ['沟通技巧', '妥协与坚持', '结果导向'],
        difficulty: 'medium',
        source: '软技能考察',
      }
    );

    return questions;
  }

  /**
   * 从岗位信息中提取技能
   */
  private extractSkillsFromJob(requirements: Record<string, unknown>, description: string): string[] {
    const skills: Set<string> = new Set();

    // 从 requirements 中提取
    if (requirements.skills && Array.isArray(requirements.skills)) {
      requirements.skills.forEach((s: string) => skills.add(s));
    }

    // 从描述中匹配常见技能
    const skillPatterns = [
      /JavaScript|TypeScript|React|Vue|Angular|Node\.js|Python|Java|Go|Rust|PHP/gi,
      /MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch/gi,
      /Docker|Kubernetes|AWS|Azure|GCP|CI\/CD/gi,
      /Git|Linux|Nginx/gi,
      /机器学习|深度学习|NLP|CV|数据分析/gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach((m: string) => skills.add(m));
      }
    }

    return Array.from(skills);
  }
}
