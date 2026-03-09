/**
 * 简历生成 Prompt 测试
 */

import { describe, it, expect } from 'vitest';
import {
  promptTemplates,
  identifyJobType,
  validateSkillsForJobType,
  JOB_TYPE_DEFINITIONS,
  type JobType,
} from './enhanced-resume-generation';

describe('enhanced-resume-generation', () => {
  describe('promptTemplates', () => {
    it('应该导出 enhancedResumeGeneration 模板', () => {
      expect(promptTemplates.enhancedResumeGeneration).toBeDefined();
      expect(typeof promptTemplates.enhancedResumeGeneration).toBe('string');
      expect(promptTemplates.enhancedResumeGeneration.length).toBeGreaterThan(100);
    });

    it('enhancedResumeGeneration 模板应包含岗位类型识别步骤', () => {
      const template = promptTemplates.enhancedResumeGeneration;
      expect(template).toContain('第一步：识别岗位类型');
      expect(template).toContain('岗位类型');
    });

    it('enhancedResumeGeneration 模板应包含岗位类型技能映射表', () => {
      const template = promptTemplates.enhancedResumeGeneration;
      expect(template).toContain('前端开发');
      expect(template).toContain('后端开发');
      expect(template).toContain('测试工程师');
    });

    it('enhancedResumeGeneration 模板应包含禁止技能列表', () => {
      const template = promptTemplates.enhancedResumeGeneration;
      expect(template).toContain('禁止技能');
      expect(template).toContain('Java, Spring, MySQL');
    });

    it('enhancedResumeGeneration 模板应要求输出识别的岗位类型', () => {
      const template = promptTemplates.enhancedResumeGeneration;
      expect(template).toContain('jobTypeIdentified');
    });
  });

  describe('identifyJobType', () => {
    describe('前端开发', () => {
      it('应该识别 "前端开发工程师" 为前端开发', () => {
        const result = identifyJobType('前端开发工程师', '');
        expect(result).toBe('frontend');
      });

      it('应该识别包含 React 的岗位为前端开发', () => {
        const result = identifyJobType('开发工程师', '需要熟练使用 React 和 TypeScript');
        expect(result).toBe('frontend');
      });

      it('应该识别包含 Vue 的岗位为前端开发', () => {
        const result = identifyJobType('Web开发', '熟悉 Vue.js 框架');
        expect(result).toBe('frontend');
      });

      it('应该识别 H5 开发为前端开发', () => {
        const result = identifyJobType('H5开发工程师', '');
        expect(result).toBe('frontend');
      });

      it('应该识别小程序开发为前端开发', () => {
        const result = identifyJobType('小程序开发', '');
        expect(result).toBe('frontend');
      });
    });

    describe('后端开发', () => {
      it('应该识别 "后端开发工程师" 为后端开发', () => {
        const result = identifyJobType('后端开发工程师', '');
        expect(result).toBe('backend');
      });

      it('应该识别包含 Java 的岗位为后端开发', () => {
        const result = identifyJobType('开发工程师', '需要熟练使用 Java 和 Spring');
        expect(result).toBe('backend');
      });

      it('应该识别包含服务端的岗位为后端开发', () => {
        const result = identifyJobType('服务端开发', '');
        expect(result).toBe('backend');
      });
    });

    describe('测试工程师', () => {
      it('应该识别 "测试工程师" 为测试岗位', () => {
        const result = identifyJobType('测试工程师', '');
        expect(result).toBe('test');
      });

      it('应该识别包含自动化测试的岗位为测试岗位', () => {
        const result = identifyJobType('QA', '负责自动化测试');
        expect(result).toBe('test');
      });
    });

    describe('全栈开发', () => {
      it('应该识别 "全栈开发工程师" 为全栈开发', () => {
        const result = identifyJobType('全栈开发工程师', '');
        expect(result).toBe('fullstack');
      });

      it('应该识别包含前后端的岗位为全栈开发', () => {
        const result = identifyJobType('开发工程师', '需要负责前后端开发');
        expect(result).toBe('fullstack');
      });
    });

    describe('运维工程师', () => {
      it('应该识别 "运维工程师" 为运维岗位', () => {
        const result = identifyJobType('运维工程师', '');
        expect(result).toBe('devops');
      });

      it('应该识别包含 Docker/K8s 的岗位为运维岗位', () => {
        const result = identifyJobType('DevOps', '熟悉 Docker 和 Kubernetes');
        expect(result).toBe('devops');
      });
    });

    describe('数据分析师', () => {
      it('应该识别 "数据分析师" 为数据分析岗位', () => {
        const result = identifyJobType('数据分析师', '');
        expect(result).toBe('data');
      });

      it('应该识别包含数据分析的岗位', () => {
        const result = identifyJobType('BI工程师', '负责数据分析和可视化');
        expect(result).toBe('data');
      });
    });

    describe('算法工程师', () => {
      it('应该识别 "算法工程师" 为算法岗位', () => {
        const result = identifyJobType('算法工程师', '');
        expect(result).toBe('algorithm');
      });

      it('应该识别包含机器学习的岗位', () => {
        const result = identifyJobType('AI工程师', '负责机器学习模型开发');
        expect(result).toBe('algorithm');
      });
    });

    describe('产品经理', () => {
      it('应该识别 "产品经理" 为产品岗位', () => {
        const result = identifyJobType('产品经理', '');
        expect(result).toBe('pm');
      });
    });

    describe('UI/UX设计', () => {
      it('应该识别 "UI设计师" 为设计岗位', () => {
        const result = identifyJobType('UI设计师', '');
        expect(result).toBe('design');
      });

      it('应该识别 "UX设计师" 为设计岗位', () => {
        const result = identifyJobType('UX设计师', '');
        expect(result).toBe('design');
      });
    });

    describe('默认情况', () => {
      it('当没有匹配时应该返回默认的前端开发', () => {
        const result = identifyJobType('通用岗位', '这是一个通用描述');
        expect(result).toBe('frontend');
      });
    });
  });

  describe('validateSkillsForJobType', () => {
    describe('前端开发', () => {
      it('应该保留前端技能，过滤后端技能', () => {
        const skills = ['React', 'TypeScript', 'CSS', 'Java', 'Spring', 'MySQL'];
        const result = validateSkillsForJobType(skills, 'frontend');

        expect(result.valid).toContain('React');
        expect(result.valid).toContain('TypeScript');
        expect(result.valid).toContain('CSS');
        expect(result.invalid).toContain('Java');
        expect(result.invalid).toContain('Spring');
        expect(result.invalid).toContain('MySQL');
      });

      it('应该建议添加前端相关技能', () => {
        const skills = ['React'];
        const result = validateSkillsForJobType(skills, 'frontend');

        expect(result.suggested.length).toBeGreaterThan(0);
      });
    });

    describe('后端开发', () => {
      it('应该保留后端技能，过滤前端技能', () => {
        const skills = ['Java', 'Spring', 'MySQL', 'React', 'Vue', 'CSS布局'];
        const result = validateSkillsForJobType(skills, 'backend');

        expect(result.valid).toContain('Java');
        expect(result.valid).toContain('Spring');
        expect(result.valid).toContain('MySQL');
        expect(result.invalid).toContain('React');
        expect(result.invalid).toContain('Vue');
        expect(result.invalid).toContain('CSS布局');
      });
    });

    describe('测试工程师', () => {
      it('应该保留测试技能，过滤开发技能', () => {
        const skills = ['自动化测试', 'Selenium', 'JMeter', 'React', 'Java开发'];
        const result = validateSkillsForJobType(skills, 'test');

        expect(result.valid).toContain('自动化测试');
        expect(result.valid).toContain('Selenium');
        expect(result.valid).toContain('JMeter');
        expect(result.invalid).toContain('React');
        expect(result.invalid).toContain('Java开发');
      });
    });

    describe('数据分析师', () => {
      it('应该保留数据分析技能，过滤前后端框架', () => {
        const skills = ['Python', 'SQL', 'Pandas', 'React', 'Java', 'Spring'];
        const result = validateSkillsForJobType(skills, 'data');

        expect(result.valid).toContain('Python');
        expect(result.valid).toContain('SQL');
        expect(result.valid).toContain('Pandas');
        expect(result.invalid).toContain('React');
        expect(result.invalid).toContain('Java');
        expect(result.invalid).toContain('Spring');
      });
    });
  });

  describe('JOB_TYPE_DEFINITIONS', () => {
    it('应该包含所有必要的岗位类型', () => {
      const expectedTypes = [
        'frontend',
        'backend',
        'fullstack',
        'test',
        'devops',
        'data',
        'algorithm',
        'pm',
        'design',
      ];

      for (const type of expectedTypes) {
        expect(JOB_TYPE_DEFINITIONS[type as JobType]).toBeDefined();
      }
    });

    it('每个岗位类型应该有必要的属性', () => {
      for (const [, definition] of Object.entries(JOB_TYPE_DEFINITIONS)) {
        expect(definition.name).toBeDefined();
        expect(definition.keywords).toBeDefined();
        expect(Array.isArray(definition.keywords)).toBe(true);
        expect(definition.keywords.length).toBeGreaterThan(0);
        expect(definition.requiredSkills).toBeDefined();
        expect(Array.isArray(definition.requiredSkills)).toBe(true);
        expect(definition.forbiddenSkills).toBeDefined();
        expect(Array.isArray(definition.forbiddenSkills)).toBe(true);
      }
    });

    it('前端开发应该禁止后端技能', () => {
      expect(JOB_TYPE_DEFINITIONS.frontend.forbiddenSkills).toContain('Java');
      expect(JOB_TYPE_DEFINITIONS.frontend.forbiddenSkills).toContain('Spring');
      expect(JOB_TYPE_DEFINITIONS.frontend.forbiddenSkills).toContain('MySQL');
    });

    it('后端开发应该禁止前端技能', () => {
      expect(JOB_TYPE_DEFINITIONS.backend.forbiddenSkills).toContain('React');
      expect(JOB_TYPE_DEFINITIONS.backend.forbiddenSkills).toContain('Vue');
    });
  });
});
