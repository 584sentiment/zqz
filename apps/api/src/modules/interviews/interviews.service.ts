import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@ai-job-assistant/database';

interface CreateInterviewDto {
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

interface SubmitAnswerDto {
  questionIndex: number;
  answer: string;
  duration?: number;
}

@Injectable()
export class InterviewsService {
  // 获取用户的面试列表
  async getList(userId: string, params?: { status?: string; type?: string }) {
    const where: Record<string, unknown> = { userId };

    if (params?.status) {
      where.status = params.status;
    }
    if (params?.type) {
      where.type = params.type;
    }

    const interviews = await prisma.interview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return interviews;
  }

  // 获取单个面试详情
  async getOne(userId: string, interviewId: string) {
    const interview = await prisma.interview.findFirst({
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
      const job = await prisma.job.findFirst({
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

    const interview = await prisma.interview.create({
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

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'in_progress',
        transcript: { messages: [], answers: [] },
      },
    });

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

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        transcript: {
          ...transcript,
          answers,
        },
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

    const report = {
      totalScore,
      summary: this.generateSummary(totalScore),
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
      })),
      generatedAt: new Date().toISOString(),
    };

    await prisma.interview.update({
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

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: { status: 'aborted' },
    });

    return updated;
  }

  // 删除面试记录
  async delete(userId: string, interviewId: string) {
    const interview = await this.getOne(userId, interviewId);

    await prisma.interview.delete({
      where: { id: interview.id },
    });

    return { success: true };
  }

  // 获取面试统计
  async getStats(userId: string) {
    const total = await prisma.interview.count({
      where: { userId },
    });

    const completed = await prisma.interview.count({
      where: { userId, status: 'completed' },
    });

    const inProgress = await prisma.interview.count({
      where: { userId, status: 'in_progress' },
    });

    // 获取最近的面试平均分
    const recentInterviews = await prisma.interview.findMany({
      where: {
        userId,
        status: 'completed',
        report: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { report: true },
    });

    let avgScore = null;
    if (recentInterviews.length > 0) {
      const scores = recentInterviews
        .map((i) => (i.report as Record<string, unknown>)?.totalScore as number)
        .filter(Boolean);
      if (scores.length > 0) {
        avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
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
}
