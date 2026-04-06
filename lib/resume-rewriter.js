/**
 * 简历重写模块 v2.0 - 优化版
 * 功能：根据AI分析建议，智能重写简历内容
 * 支持保持原格式、STAR法则改写、技能优化
 * 确保保留所有工作经历和项目经历
 */

class ResumeRewriter {
    constructor() {
        this.rewriteHistory = [];
    }

    /**
     * 根据分析建议重写简历
     * @param {string} originalText - 原始简历文本
     * @param {string} suggestions - AI分析建议
     * @param {string} targetRole - 目标职位（可选）
     * @returns {Promise<{success: boolean, rewrittenText: string, error: string}>}
     */
    async rewriteResume(originalText, suggestions, targetRole = '') {
        if (!originalText || originalText.length < 50) {
            return {
                success: false,
                rewrittenText: '',
                error: '简历内容过少，无法重写'
            };
        }

        try {
            const roleSection = targetRole ? `目标职位：${targetRole}\n` : '';
            
            const prompt = `你是一位专业的简历优化专家。请根据以下分析建议，重写简历内容。

${roleSection}
【原始简历】
${originalText.substring(0, 10000)}

【优化建议】
${suggestions.substring(0, 5000)}

【重要要求 - 必须严格遵守】
1. **必须保留所有工作经历**：原始简历中的每段工作经历都要保留，不要删减
2. **必须保留所有项目经历**：原始简历中的每个项目都要单独列出，不要合并或省略
3. **必须保留所有教育经历**：完整保留学历信息
4. **STAR法则优化**：每段工作经历按照"情境-任务-行动-结果"结构改写
5. **数据量化**：尽可能添加可量化的成果数据（如：提升30%、服务1000+用户、节省50%时间）
6. **关键词优化**：针对目标职位优化关键词
7. **完整输出**：输出完整的简历，绝对不要用"..."或"（同上）"省略任何内容

【输出格式要求】
请严格按照以下格式输出，每段经历都要完整详细：

姓名：XXX
电话：XXX
邮箱：XXX
求职意向：XXX
工作年限：X年

个人简介：
（150字以内的个人简介，突出核心优势和职业目标）

工作经历：
1. 公司名称 | 职位名称 | 时间段
   - 成就1：使用STAR法则描述，包含量化数据
   - 成就2：使用STAR法则描述，包含量化数据
   - 成就3：使用STAR法则描述，包含量化数据
   - 成就4：使用STAR法则描述，包含量化数据

2. 公司名称 | 职位名称 | 时间段
   - 成就1：使用STAR法则描述，包含量化数据
   - 成就2：使用STAR法则描述，包含量化数据
   - 成就3：使用STAR法则描述，包含量化数据

（以此类推，保留原始简历中的所有工作经历，每段至少3条成就）

项目经历：
1. 项目名称 | 角色 | 时间段
   - 项目描述：简要说明项目背景和目标
   - 技术栈：使用的核心技术
   - 个人贡献：具体负责的工作内容
   - 项目成果：量化的成果数据

2. 项目名称 | 角色 | 时间段
   - 项目描述：简要说明项目背景和目标
   - 技术栈：使用的核心技术
   - 个人贡献：具体负责的工作内容
   - 项目成果：量化的成果数据

（以此类推，保留原始简历中的所有项目经历）

教育背景：
- 学校名称 | 学位 | 专业 | 时间段

专业技能：
- 技能名称（熟练程度：精通/熟练/了解）
- 技能名称（熟练程度：精通/熟练/了解）

证书/语言：
- 证书/语言名称
- 证书/语言名称

【特别注意】
- 如果原始简历中有5段工作经历，重写后也要有5段
- 如果原始简历中有8个项目，重写后也要有8个
- 每段工作经历至少要有3条具体成就
- 每个项目都要有独立的描述和贡献说明
- 绝对不要省略任何内容，不要使用省略号

请开始重写：`;

            const systemPrompt = '你是资深简历优化专家，擅长使用STAR法则和数据量化改写简历。输出要完整、专业、有说服力。绝对不能省略或删减任何工作经历、项目经历。每段经历都要详细描述。';
            
            const rewrittenText = await window.aiCore.prompt(prompt, { systemPrompt });
            
            // 保存历史
            this._saveToHistory(originalText, rewrittenText, suggestions);
            
            return {
                success: true,
                rewrittenText: rewrittenText,
                error: null
            };

        } catch (error) {
            console.error('简历重写失败:', error);
            return {
                success: false,
                rewrittenText: '',
                error: `重写失败: ${error.message}`
            };
        }
    }

    /**
     * 快速重写（不依赖分析建议）
     * @param {string} originalText - 原始简历文本
     * @param {string} targetRole - 目标职位
     */
    async quickRewrite(originalText, targetRole = '') {
        if (!originalText || originalText.length < 50) {
            return {
                success: false,
                rewrittenText: '',
                error: '简历内容过少'
            };
        }

        try {
            const roleSection = targetRole ? `目标职位：${targetRole}\n` : '';
            
            const prompt = `请重写以下简历，使其更专业、更有吸引力。

${roleSection}
【原始简历】
${originalText.substring(0, 8000)}

【重写要求】
1. 使用STAR法则改写工作经历
2. 添加量化数据
3. 优化关键词
4. 保持真实性，不要编造
5. 保留所有工作经历和项目经历

请直接输出重写后的完整简历，不要省略任何内容。`;

            const rewrittenText = await window.aiCore.prompt(prompt);
            
            return {
                success: true,
                rewrittenText: rewrittenText,
                error: null
            };

        } catch (error) {
            return {
                success: false,
                rewrittenText: '',
                error: error.message
            };
        }
    }

    /**
     * 重写单个工作经历段落
     * @param {string} experienceText - 原始工作经历描述
     * @param {string} company - 公司名称
     * @param {string} title - 职位名称
     */
    async rewriteWorkExperience(experienceText, company, title) {
        const prompt = `请使用STAR法则重写以下工作经历：

公司：${company}
职位：${title}
原始描述：${experienceText}

要求：
1. 情境(S)：说明工作背景和面临的挑战
2. 任务(T)：说明具体任务和目标
3. 行动(A)：说明采取的行动和解决方案
4. 结果(R)：说明取得的成果（尽量量化，如提升X%、节省Y小时、服务Z用户）

请直接输出重写后的描述，不要添加额外说明。`;

        return await window.aiCore.prompt(prompt);
    }

    /**
     * 重写个人简介
     * @param {string} summary - 原始个人简介
     * @param {string} targetRole - 目标职位
     */
    async rewriteSummary(summary, targetRole = '') {
        const roleSection = targetRole ? `目标职位：${targetRole}` : '';
        
        const prompt = `请重写以下个人简介，使其更吸引HR注意：

${roleSection}
原始简介：${summary}

要求：
1. 突出核心优势（3个左右）
2. 体现岗位匹配度
3. 体现职业规划
4. 控制在150字以内
5. 语言简洁有力，有感染力

请直接输出重写后的个人简介。`;

        return await window.aiCore.prompt(prompt);
    }

    /**
     * 重写技能描述
     * @param {string} skillsText - 原始技能描述
     * @param {string} targetRole - 目标职位
     */
    async rewriteSkills(skillsText, targetRole = '') {
        const roleSection = targetRole ? `目标职位：${targetRole}` : '';
        
        const prompt = `请优化以下技能描述：

${roleSection}
原始技能：${skillsText}

要求：
1. 按熟练度排序（精通 > 熟练 > 了解）
2. 添加技能水平说明
3. 突出与目标职位匹配的技能
4. 每项技能格式：技能名称（熟练程度）
5. 输出10项以内核心技能

请直接输出优化后的技能列表，每行一项。`;

        return await window.aiCore.prompt(prompt);
    }

    /**
     * 提取简历中的结构化数据
     * @param {string} resumeText - 简历文本
     * @returns {Promise<object>} 结构化数据
     */
    async extractStructuredData(resumeText) {
        const prompt = `请从以下简历中提取结构化信息，输出JSON格式。

【简历】
${resumeText.substring(0, 10000)}

【输出格式】
{
    "name": "姓名",
    "phone": "电话",
    "email": "邮箱",
    "location": "城市",
    "jobTitle": "求职意向",
    "years": "工作年限",
    "summary": "个人简介",
    "workExperience": [
        {
            "company": "公司名称",
            "title": "职位",
            "date": "时间段",
            "responsibilities": ["成就描述1", "成就描述2", "成就描述3"]
        }
    ],
    "projects": [
        {
            "name": "项目名称",
            "role": "角色",
            "date": "时间段",
            "description": "项目描述",
            "techStack": "技术栈",
            "responsibilities": ["贡献描述1", "贡献描述2"]
        }
    ],
    "education": [
        {
            "school": "学校名称",
            "degree": "学位",
            "major": "专业",
            "date": "时间段"
        }
    ],
    "skills": ["技能1", "技能2", "技能3"],
    "certificates": ["证书1", "证书2"]
}

【重要】
- 如果简历中有项目经历，一定要提取到 projects 数组中
- 每个工作经历至少要有3条 responsibilities
- 不要省略任何信息
- 请只输出JSON，不要添加其他内容`;

        const result = await window.aiCore.prompt(prompt);
        
        try {
            // 尝试解析JSON
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                // 确保数组字段存在
                if (!parsed.workExperience) parsed.workExperience = [];
                if (!parsed.projects) parsed.projects = [];
                if (!parsed.education) parsed.education = [];
                if (!parsed.skills) parsed.skills = [];
                if (!parsed.certificates) parsed.certificates = [];
                return parsed;
            }
            return JSON.parse(result);
        } catch (e) {
            console.error('解析结构化数据失败:', e);
            // 返回基础结构
            return {
                name: '',
                phone: '',
                email: '',
                summary: '',
                workExperience: [],
                projects: [],
                education: [],
                skills: [],
                certificates: []
            };
        }
    }

    /**
     * 保存重写历史
     */
    async _saveToHistory(original, rewritten, suggestions) {
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString(),
            originalPreview: original.substring(0, 200),
            rewrittenPreview: rewritten.substring(0, 200),
            fullRewritten: rewritten
        };
        
        this.rewriteHistory.unshift(record);
        
        if (this.rewriteHistory.length > 20) {
            this.rewriteHistory = this.rewriteHistory.slice(0, 20);
        }
        
        try {
            await chrome.storage.local.set({ rewriteHistory: this.rewriteHistory });
        } catch (e) {
            console.warn('保存重写历史失败:', e);
        }
    }

    /**
     * 获取重写历史
     */
    getHistory() {
        return this.rewriteHistory;
    }

    /**
     * 加载历史
     */
    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['rewriteHistory']);
            if (result.rewriteHistory) {
                this.rewriteHistory = result.rewriteHistory;
                console.log(`加载了 ${this.rewriteHistory.length} 条重写历史`);
            }
        } catch (e) {
            console.warn('加载重写历史失败:', e);
        }
    }

    /**
     * 清除历史
     */
    async clearHistory() {
        this.rewriteHistory = [];
        await chrome.storage.local.remove(['rewriteHistory']);
    }
}

// 创建全局实例
window.resumeRewriter = new ResumeRewriter();
window.resumeRewriter.loadHistory();