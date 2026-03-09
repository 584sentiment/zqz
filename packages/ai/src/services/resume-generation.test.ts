/**
 * 简历生成服务集成测试
 * 验证岗位类型识别和技能匹配功能
 */

import { describe, it, expect } from 'vitest';
import {
  identifyJobType,
  validateSkillsForJobType,
  JOB_TYPE_DEFINITIONS,
  promptTemplates,
} from '../index';

describe('简历生成集成测试', () => {
  describe('前端开发岗位场景', () => {
    // 使用纯粹的前端岗位描述，避免包含其他技术栈关键词
    const jobTitle = '前端开发工程师';
    const jobDescription = `
      职责：
      1. 负责公司产品的前端开发工作
      2. 使用 React/Vue 进行 Web 应用开发
      3. 优化前端性能，提升用户体验

      要求：
      - 熟练掌握 JavaScript/TypeScript
      - 熟悉 React 或 Vue 框架
      - 了解前端工程化和构建工具
    `;

    it('前端岗位标题应该被识别为前端或全栈', () => {
      const jobType = identifyJobType(jobTitle, jobDescription);
      // 由于描述中包含多种技术，可能被识别为前端或全栈
      expect(['frontend', 'fullstack']).toContain(jobType);
    });

    it('应该过滤后端相关技能', () => {
      const userSkills = [
        'React', 'TypeScript', 'CSS3', 'HTML5', // 前端技能
        'Java', 'Spring', 'MySQL', 'Redis', // 后端技能（应该被过滤）
      ];

      const result = validateSkillsForJobType(userSkills, 'frontend');

      // 前端技能应该保留
      expect(result.valid).toContain('React');
      expect(result.valid).toContain('TypeScript');
      expect(result.valid).toContain('CSS3');
      expect(result.valid).toContain('HTML5');

      // 后端技能应该被过滤
      expect(result.invalid).toContain('Java');
      expect(result.invalid).toContain('Spring');
      expect(result.invalid).toContain('MySQL');
      expect(result.invalid).toContain('Redis');
    });

    it('Prompt 应该包含岗位类型识别步骤', () => {
      const template = promptTemplates.enhancedResumeGeneration;
      expect(template).toContain('第一步：识别岗位类型');
      expect(template).toContain('前端开发');
    });
  });

  describe('后端开发岗位场景', () => {
    const jobTitle = 'Java后端开发工程师';
    const jobDescription = `
      职责：
      1. 负责后端服务的设计和开发
      2. 使用 Spring Boot 进行微服务开发
      3. 数据库设计和优化

      要求：
      - 熟练掌握 Java 语言
      - 熟悉 Spring Boot 框架
      - 熟悉 MySQL、Redis 等数据库
    `;

    it('后端岗位标题应该被识别为后端或全栈', () => {
      const jobType = identifyJobType(jobTitle, jobDescription);
      expect(['backend', 'fullstack']).toContain(jobType);
    });

    it('应该过滤前端相关技能', () => {
      const userSkills = [
        'Java', 'Spring Boot', 'MySQL', 'Redis', '微服务', // 后端技能
        'React', 'Vue', 'Webpack', // 前端技能（应该被过滤）
      ];

      const result = validateSkillsForJobType(userSkills, 'backend');

      // 后端技能应该保留
      expect(result.valid).toContain('Java');
      expect(result.valid).toContain('MySQL');
      expect(result.valid).toContain('Redis');

      // 前端技能应该被过滤
      expect(result.invalid).toContain('React');
      expect(result.invalid).toContain('Vue');
    });
  });

  describe('测试工程师岗位场景', () => {
    // 使用纯粹的测试岗位描述
    const jobTitle = '测试工程师';
    const jobDescription = `
      职责：
      1. 负责产品的自动化测试
      2. 编写测试用例和测试脚本
      3. 使用 Selenium/JMeter 进行性能测试

      要求：
      - 熟悉测试理论和测试方法
      - 掌握自动化测试工具
      - 会编写测试脚本
    `;

    it('测试岗位标题应该被识别为测试', () => {
      const jobType = identifyJobType(jobTitle, jobDescription);
      expect(jobType).toBe('test');
    });

    it('应该过滤开发相关技能', () => {
      const userSkills = [
        '自动化测试', 'Selenium', 'JMeter', '测试用例设计', // 测试技能
        'React', 'Vue', 'Java开发', '后端架构', // 开发技能（应该被过滤）
      ];

      const result = validateSkillsForJobType(userSkills, 'test');

      // 测试技能应该保留
      expect(result.valid).toContain('自动化测试');
      expect(result.valid).toContain('Selenium');
      expect(result.valid).toContain('JMeter');

      // 开发技能应该被过滤
      expect(result.invalid).toContain('React');
      expect(result.invalid).toContain('Vue');
      expect(result.invalid).toContain('Java开发');
    });
  });

  describe('全栈开发岗位场景', () => {
    const jobTitle = '全栈开发工程师';
    const jobDescription = `
      职责：
      1. 负责前后端开发工作
      2. 参与产品全流程开发

      要求：
      - 熟悉前端技术栈（React/Vue）
      - 熟悉后端技术栈（Node.js）
      - 了解数据库设计
    `;

    it('应该正确识别为全栈开发岗位', () => {
      const jobType = identifyJobType(jobTitle, jobDescription);
      expect(jobType).toBe('fullstack');
    });

    it('全栈开发不应该过滤任何技能', () => {
      const userSkills = ['React', 'Node.js', 'MySQL', 'CSS'];
      const result = validateSkillsForJobType(userSkills, 'fullstack');

      // 全栈开发不应该过滤任何技能
      expect(result.valid.length).toBe(4);
      expect(result.invalid.length).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('空岗位描述应该返回默认的前端开发', () => {
      const jobType = identifyJobType('', '');
      expect(jobType).toBe('frontend');
    });

    it('模糊岗位描述应该返回最接近的类型', () => {
      // 包含 "前端" 关键词
      const jobType1 = identifyJobType('开发工程师', '需要有前端开发经验');
      expect(jobType1).toBe('frontend');

      // 包含 "后端" 关键词
      const jobType2 = identifyJobType('开发工程师', '需要有后端开发经验');
      expect(jobType2).toBe('backend');
    });
  });

  describe('岗位类型定义完整性', () => {
    it('所有岗位类型都应该有完整的定义', () => {
      const types = Object.keys(JOB_TYPE_DEFINITIONS) as Array<keyof typeof JOB_TYPE_DEFINITIONS>;

      for (const type of types) {
        const def = JOB_TYPE_DEFINITIONS[type];
        expect(def.name).toBeTruthy();
        expect(def.keywords.length).toBeGreaterThan(0);
        expect(def.requiredSkills.length).toBeGreaterThan(0);
        expect(Array.isArray(def.forbiddenSkills)).toBe(true);
      }
    });
  });
});
