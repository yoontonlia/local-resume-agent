/**
 * 岗位匹配分析模块（增强版）
 * 功能：解析职位要求，与简历进行多维度匹配分析
 */

class JobMatcherEnhanced {
    constructor() {
        this.matchHistory = [];
    }

    /**
     * 执行岗位匹配分析
     * @param {string} resumeText - 简历文本
     @param {string} jobDescription - 职位描述
     * @param {string} jobUrl - 职位链接（可选）
     * @returns {Promise<{success: boolean, analysis: string, score: number, error: string}>}
     */
    async matchJob(resumeText, jobDescription, jobUrl = '') {
        if (!resumeText || resumeText.length < 50) {
            return {
                success: false,
                analysis: '',
                score: 0,
                error: '简历内容过少，请先分析简历'
            };
        }

        if (!jobDescription || jobDescription.length < 50) {
            return {
                success: false,
                analysis: '',
                score: 0,
                error: '职位描述过少，请提供完整的招聘信息'
            };
        }

        try {
            const result = await this._performMatchAnalysis(resumeText, jobDescription, jobUrl);
            
            // 保存匹配历史
            this._saveToHistory(result, jobDescription.substring(0, 200));
            
            return {
                success: true,
                analysis: result.analysis,
                score: result.score,
                error: null
            };
        } catch (error) {
            console.error('岗位匹配失败:', error);
            return {
                success: false,
                analysis: '',
                score: 0,
                error: `匹配失败: ${error.message}`
            };
        }
    }

    /**
     * 执行AI匹配分析
     * @private
     */
    async _performMatchAnalysis(resumeText, jobDescription, jobUrl) {
        const urlSection = jobUrl ? `职位链接：${jobUrl}\n` : '';
        
        const prompt = `你是一位专业的招聘匹配分析师。请对以下简历和职位进行深度匹配分析。

${urlSection}
【职位描述】
${jobDescription.substring(0, 4000)}

【简历内容】
${resumeText.substring(0, 6000)}

请严格按照以下模板输出分析报告：

## 📊 匹配度总览

| 评估维度 | 匹配度 | 权重 | 详细说明 |
|----------|--------|------|----------|
| 硬技能匹配 | ★★★☆☆ | 30% | (具体说明) |
| 工作经验 | ★★★☆☆ | 25% | (具体说明) |
| 教育背景 | ★★★☆☆ | 15% | (具体说明) |
| 软技能 | ★★★☆☆ | 15% | (具体说明) |
| 行业经验 | ★★★☆☆ | 15% | (具体说明) |

**综合匹配度：XX%**

## ✅ 匹配优势分析

### 1. 技能匹配
- **匹配的技能**：(列出3-5项)
- **匹配程度**：(说明)

### 2. 经验匹配
- **相关经验**：(列出2-3项)
- **价值体现**：(说明)

### 3. 其他优势
- (列出2-3项其他优势)

## ⚠️ 差距分析

### 1. 技能差距
- **缺失技能**：(列出2-3项)
- **影响程度**：(高/中/低)

### 2. 经验差距
- **不足领域**：(列出2-3项)
- **弥补建议**：(具体建议)

### 3. 其他差距
- (列出1-2项)

## 📝 简历优化建议

### 针对本岗位的简历修改建议

| 原内容 | 建议修改 | 优化理由 |
|--------|----------|----------|
| xxx | xxx | xxx |

## 🎤 面试准备指南

### 1. 必问技术问题
- (列出3-5个可能的技术问题)

### 2. 项目经验深挖
- (列出2-3个需要准备的项目问题)

### 3. 行为面试准备
- (列出2-3个行为问题)

## 💡 综合评估与建议

### 竞争力评估
- **推荐指数**：★★★★☆
- **面试建议**：(是否推荐面试)
- **薪资预期**：(合理的薪资范围)

### 入职后适应建议
- (给出入职后快速适应的建议)

## 📈 匹配度详情

| 项目 | 职位要求 | 候选人情况 | 匹配度 |
|------|----------|------------|--------|
| 工作年限 | X年 | X年 | ★★★★☆ |
| 学历要求 | X | X | ★★★★☆ |
| 核心技能1 | xxx | xxx | ★★★★☆ |
| 核心技能2 | xxx | xxx | ★★★☆☆ |
| 加分项 | xxx | xxx | ★★★☆☆ |

请确保分析客观、具体、有建设性，匹配度用星级(★)表示，最高5星。`;

        const systemPrompt = '你是专业的招聘匹配分析师，擅长客观评估候选人与职位的匹配度。输出要结构化、有数据支撑、可操作。';
        
        const analysis = await window.aiCore.prompt(prompt, { systemPrompt });
        
        // 提取匹配度分数
        const score = this._extractScore(analysis);
        
        return { analysis, score };
    }

    /**
     * 提取匹配度分数
     * @private
     */
    _extractScore(analysis) {
        // 尝试从文本中提取综合匹配度百分比
        const percentMatch = analysis.match(/综合匹配度[：:]\s*(\d+)%/);
        if (percentMatch) {
            return parseInt(percentMatch[1]);
        }
        
        // 尝试提取星级评分
        const starMatch = analysis.match(/综合匹配度[：:]\s*([★★★★★☆]+)/);
        if (starMatch) {
            const stars = starMatch[1];
            const filledStars = (stars.match(/★/g) || []).length;
            return Math.round(filledStars / 5 * 100);
        }
        
        // 默认返回75分
        return 75;
    }

    /**
     * 快速匹配（仅输出核心结果）
     */
    async quickMatch(resumeText, jobDescription) {
        const prompt = `请快速评估以下匹配情况：

职位要求摘要：${jobDescription.substring(0, 800)}
简历摘要：${resumeText.substring(0, 800)}

请输出：
1. 匹配度：XX%
2. 核心匹配点：1点
3. 主要差距：1点
4. 是否推荐申请：是/否
5. 一句话总结`;

        const result = await window.aiCore.prompt(prompt);
        
        // 提取分数
        const scoreMatch = result.match(/匹配度[：:]\s*(\d+)%/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;
        
        return { analysis: result, score };
    }

    /**
     * 保存匹配历史
     * @private
     */
    async _saveToHistory(result, jobPreview) {
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString(),
            score: result.score,
            jobPreview: jobPreview.substring(0, 100),
            analysisPreview: result.analysis.substring(0, 200)
        };
        
        this.matchHistory.unshift(record);
        
        if (this.matchHistory.length > 20) {
            this.matchHistory = this.matchHistory.slice(0, 20);
        }
        
        try {
            await chrome.storage.local.set({ jobMatchHistoryEnhanced: this.matchHistory });
        } catch (e) {
            console.warn('保存匹配历史失败:', e);
        }
    }

    getHistory() {
        return this.matchHistory;
    }

    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['jobMatchHistoryEnhanced']);
            if (result.jobMatchHistoryEnhanced) {
                this.matchHistory = result.jobMatchHistoryEnhanced;
            }
        } catch (e) {
            console.warn('加载匹配历史失败:', e);
        }
    }

    clearHistory() {
        this.matchHistory = [];
        chrome.storage.local.remove(['jobMatchHistoryEnhanced']);
    }
}

window.jobMatcherEnhanced = new JobMatcherEnhanced();
window.jobMatcherEnhanced.loadHistory();