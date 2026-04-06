/**
 * 职位匹配技能模块 - 增强版
 * 功能：对比简历与招聘信息，分析匹配度，给出优化建议
 * 支持 HR Toolkit MCP 纯算法匹配（零成本）
 */

class JobMatcher {
    constructor() {
        this.matchHistory = [];  // 匹配历史
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
            let matchResult = '';
            let usedMethod = 'AI';
            
            // ========== 优先使用 HR Toolkit 纯算法匹配（零成本） ==========
            if (window.mcpClient && window.mcpClient.isMcpAvailable) {
                console.log('🔌 尝试使用 HR Toolkit 纯算法匹配...');
                try {
                    const mcpMatch = await window.mcpClient.computeMatchScore(resumeText, jobDescription);
                    if (mcpMatch && mcpMatch.similarity) {
                        console.log('✅ HR Toolkit 匹配成功，相似度:', mcpMatch.similarity);
                        matchResult = this._formatMcpMatchResult(mcpMatch);
                        usedMethod = 'HR Toolkit (纯算法)';
                    }
                } catch (mcpError) {
                    console.warn('⚠️ HR Toolkit 匹配失败，降级使用 AI:', mcpError);
                }
            }
            
            // ========== 降级：使用 AI 分析 ==========
            if (!matchResult) {
                console.log('使用 AI 分析匹配...');
                matchResult = await this._performMatch(resumeText, jobDescription);
                usedMethod = 'AI';
            }
            // ==========================================================
            
            // 保存到历史记录
            await this._saveToHistory(matchResult, jobDescription, usedMethod);
            
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
     * 格式化 HR Toolkit 匹配结果为友好格式
     * @private
     */
    _formatMcpMatchResult(mcpMatch) {
        const similarity = mcpMatch.similarity || 0;
        const score = Math.round(similarity * 100);
        
        // 技能匹配详情
        let skillsSection = '';
        if (mcpMatch.skillMatch) {
            const matched = mcpMatch.skillMatch.matched || [];
            const missing = mcpMatch.skillMatch.missing || [];
            
            if (matched.length > 0) {
                skillsSection += `### ✅ 匹配技能\n${matched.map(s => `- ${s}`).join('\n')}\n\n`;
            }
            if (missing.length > 0) {
                skillsSection += `### ⚠️ 缺失技能\n${missing.map(s => `- ${s}`).join('\n')}\n\n`;
            }
        }
        
        // 经验匹配
        let experienceSection = '';
        if (mcpMatch.experienceMatch) {
            experienceSection = `### 💼 经验匹配\n- 匹配度: ${Math.round((mcpMatch.experienceMatch.similarity || 0) * 100)}%\n\n`;
        }
        
        // 推荐决策
        let recommendation = '';
        if (score >= 80) {
            recommendation = '强烈推荐面试 - 候选人非常匹配';
        } else if (score >= 65) {
            recommendation = '推荐面试 - 候选人基本符合要求';
        } else if (score >= 50) {
            recommendation = '可考虑面试 - 需要进一步评估';
        } else {
            recommendation = '暂不推荐 - 匹配度较低';
        }
        
        return `## 📊 匹配度分析报告

**分析方式**: HR Toolkit 纯算法匹配（零成本）

### 🎯 综合匹配度

| 项目 | 结果 |
|------|------|
| 综合匹配度 | **${score}%** |
| 推荐决策 | ${recommendation} |

${skillsSection}${experienceSection}
### 💡 补充说明

此分析基于纯算法计算，不消耗AI Token。如需更详细的面试建议，可使用AI模式重新分析。

---
*报告由 HR Toolkit MCP 生成*
`;
    }

    /**
     * 执行AI匹配分析
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
    async _saveToHistory(result, jobDescription, usedMethod) {
        try {
            // 提取职位标题
            const jobTitle = this._extractJobTitle(jobDescription);
            
            // 提取匹配度分数
            const score = this._extractScore(result);
            
            const record = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                localTime: new Date().toLocaleString(),
                jobTitle: jobTitle,
                score: score,
                usedMethod: usedMethod,
                resultPreview: result.substring(0, 300),
                fullResult: result
            };
            
            this.matchHistory.unshift(record);
            
            // 保留最近20条
            if (this.matchHistory.length > 20) {
                this.matchHistory = this.matchHistory.slice(0, 20);
            }
            
            // 保存到 chrome.storage.local
            await chrome.storage.local.set({ jobMatchHistory: this.matchHistory });
            console.log(`岗位匹配历史已保存 (${usedMethod}):`, jobTitle, '匹配度:', score + '%');
            
        } catch (e) {
            console.warn('保存匹配历史失败:', e);
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
                 trimmed.includes('名称'))) {
                return trimmed.substring(0, 50);
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
                console.log(`加载了 ${this.matchHistory.length} 条岗位匹配历史`);
            } else {
                this.matchHistory = [];
                console.log('暂无岗位匹配历史');
            }
        } catch (error) {
            console.error('加载匹配历史失败:', error);
            this.matchHistory = [];
        }
    }
}

// 创建全局实例
window.jobMatcher = new JobMatcher();

// 立即加载历史
window.jobMatcher.loadHistory();