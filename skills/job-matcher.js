/**
 * 职位匹配技能模块
 * 功能：对比简历与招聘信息，分析匹配度，给出优化建议
 * 支持历史记录保存
 */

class JobMatcher {
    constructor() {
        this.matchHistory = [];
    }

    /**
     * 匹配简历与职位
     * @param {string} resumeText - 简历文本
     * @param {string} jobDescription - 职位描述
     * @returns {Promise<{success: boolean, result: string, error?: string}>}
     */
    async match(resumeText, jobDescription) {
        // 验证输入
        if (!resumeText || resumeText.length < 50) {
            return {
                success: false,
                result: '',
                error: '简历内容过少，请先上传或分析简历'
            };
        }

        if (!jobDescription || jobDescription.length < 50) {
            return {
                success: false,
                result: '',
                error: '职位描述内容过少，请粘贴完整的招聘信息'
            };
        }

        try {
            const matchResult = await this._performMatch(resumeText, jobDescription);
            
            // 保存到历史记录
            await this._saveToHistory(matchResult, jobDescription);
            
            return {
                success: true,
                result: matchResult,
                error: null
            };

        } catch (error) {
            console.error('职位匹配失败:', error);
            return {
                success: false,
                result: '',
                error: `匹配失败: ${error.message}`
            };
        }
    }

    /**
     * 执行匹配分析
     * @private
     */
    async _performMatch(resumeText, jobDescription) {
        const prompt = `你是一位专业的招聘顾问和职业规划师。请对比以下简历和职位描述，进行全面的匹配度分析。

【职位描述】
${jobDescription.substring(0, 4000)}

【简历内容】
${resumeText.substring(0, 6000)}

请严格按照以下模板输出分析报告：

## 📊 匹配度总览

| 维度 | 匹配度 | 说明 |
|------|--------|------|
| 硬技能匹配 | ★★★☆☆ | (说明) |
| 经验年限 | ★★★☆☆ | (说明) |
| 行业背景 | ★★★☆☆ | (说明) |
| 软技能 | ★★★☆☆ | (说明) |

**综合匹配度：XX%**

## ✅ 匹配优势
1. **优势点1**：(具体说明)
2. **优势点2**：(具体说明)
3. **优势点3**：(具体说明)

## ⚠️ 差距分析
1. **差距点1**：(具体说明)
2. **差距点2**：(具体说明)

## 📝 简历优化建议
1. **建议1**：(如何修改简历更匹配)
2. **建议2**：(如何修改简历更匹配)
3. **建议3**：(如何修改简历更匹配)

## 🎤 面试准备重点
1. (针对差距点的准备方向)
2. (可强调的优势点)
3. (可能的追问方向)

## 💡 综合建议
（是否适合申请、入职后的适应建议等）

请确保分析客观、具体、有可操作性。`;

        const systemPrompt = '你是专业的招聘匹配分析师，擅长发现简历与职位的契合点和差距，输出要具体、有建设性。';
        
        return await window.aiCore.prompt(prompt, { systemPrompt });
    }

    /**
     * 保存匹配历史
     * @private
     */
    async _saveToHistory(result, jobDescription) {
        try {
            console.log('[JobMatcher] 开始保存历史记录...');
            
            const jobTitle = this._extractJobTitle(jobDescription);
            const score = this._extractScore(result);
            
            const newRecord = {
                id: Date.now(),
                type: 'match',
                jobTitle: jobTitle,
                score: score,
                resultPreview: result.substring(0, 300),
                fullResult: result,
                timestamp: new Date().toISOString(),
                localTime: new Date().toLocaleString()
            };
            
            console.log('[JobMatcher] 新记录:', newRecord);
            
            // 获取现有历史
            const storageResult = await chrome.storage.local.get(['jobMatchHistory']);
            let history = storageResult.jobMatchHistory || [];
            
            // 添加新记录到开头
            history.unshift(newRecord);
            
            // 只保留最近50条
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            // 保存
            await chrome.storage.local.set({ jobMatchHistory: history });
            console.log('[JobMatcher] 保存成功，当前共', history.length, '条记录');
            
            // 更新内存中的历史
            this.matchHistory = history;
            
        } catch (error) {
            console.error('[JobMatcher] 保存历史失败:', error);
        }
    }

    /**
     * 从职位描述中提取职位标题
     * @private
     */
    _extractJobTitle(jobDescription) {
        if (!jobDescription) return '职位匹配';
        
        // 尝试提取职位名称
        const lines = jobDescription.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 5 && trimmed.length < 50 && 
                (trimmed.includes('职位') || trimmed.includes('岗位') || 
                 trimmed.includes('招聘') || trimmed.includes('诚聘') ||
                 trimmed.includes('名称') || trimmed.includes('：'))) {
                // 清理常见前缀
                let title = trimmed;
                const prefixes = ['职位名称：', '岗位名称：', '招聘职位：', '职位：', '岗位：'];
                for (const prefix of prefixes) {
                    if (title.startsWith(prefix)) {
                        title = title.substring(prefix.length);
                        break;
                    }
                }
                return title.substring(0, 50);
            }
        }
        
        // 取第一行非空内容
        const firstLine = lines.find(l => l.trim().length > 5);
        if (firstLine && firstLine.length < 50) {
            return firstLine.trim();
        }
        
        return '职位匹配';
    }

    /**
     * 从分析结果中提取匹配度分数
     * @private
     */
    _extractScore(result) {
        if (!result) return 75;
        
        // 尝试提取综合匹配度百分比
        const percentMatch = result.match(/综合匹配度[：:]\s*(\d+)%/);
        if (percentMatch) {
            return parseInt(percentMatch[1]);
        }
        
        // 尝试提取匹配度百分比（其他格式）
        const scoreMatch = result.match(/匹配度[：:]\s*(\d+)%/);
        if (scoreMatch) {
            return parseInt(scoreMatch[1]);
        }
        
        // 尝试提取星级评分
        const starMatch = result.match(/综合匹配度[：:]\s*([★★★★★☆]+)/);
        if (starMatch) {
            const stars = starMatch[1];
            const filledStars = (stars.match(/★/g) || []).length;
            return Math.round(filledStars / 5 * 100);
        }
        
        // 默认返回75分
        return 75;
    }

    /**
     * 获取匹配历史
     */
    getHistory() {
        return this.matchHistory;
    }

    /**
     * 加载历史
     */
    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['jobMatchHistory']);
            if (result.jobMatchHistory && Array.isArray(result.jobMatchHistory)) {
                this.matchHistory = result.jobMatchHistory;
                console.log(`[JobMatcher] 加载了 ${this.matchHistory.length} 条岗位匹配历史`);
            } else {
                this.matchHistory = [];
                console.log('[JobMatcher] 暂无岗位匹配历史');
            }
        } catch (error) {
            console.error('[JobMatcher] 加载历史失败:', error);
            this.matchHistory = [];
        }
    }
}

// 创建全局实例
window.jobMatcher = new JobMatcher();

// 立即加载历史
window.jobMatcher.loadHistory();