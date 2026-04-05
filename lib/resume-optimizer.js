/**
 * 简历优化模块
 * 功能：基于AI分析结果，生成简历优化建议
 */

class ResumeOptimizer {
    constructor() {
        this.optimizationHistory = [];
    }

    /**
     * 生成简历优化建议
     * @param {string} resumeText - 原始简历文本
     * @param {string} analysisResult - AI分析结果
     * @param {string} targetRole - 目标职位（可选）
     * @returns {Promise<{success: boolean, suggestions: string, error: string}>}
     */
    async generateSuggestions(resumeText, analysisResult, targetRole = '') {
        if (!resumeText || resumeText.length < 50) {
            return {
                success: false,
                suggestions: '',
                error: '简历内容过少，无法生成优化建议'
            };
        }

        try {
            const suggestions = await this._performOptimization(resumeText, analysisResult, targetRole);
            
            // 保存优化历史
            this._saveToHistory(resumeText, suggestions, targetRole);
            
            return {
                success: true,
                suggestions: suggestions,
                error: null
            };
        } catch (error) {
            console.error('生成优化建议失败:', error);
            return {
                success: false,
                suggestions: '',
                error: `生成失败: ${error.message}`
            };
        }
    }

    /**
     * 执行AI优化分析
     * @private
     */
    async _performOptimization(resumeText, analysisResult, targetRole) {
        const roleSection = targetRole ? `目标职位：${targetRole}\n` : '';
        
        const prompt = `你是一位资深简历优化专家。请基于以下简历内容和分析结果，提供具体的简历优化建议。

${roleSection}
【原始简历】
${resumeText.substring(0, 3000)}

【AI分析结果】
${analysisResult.substring(0, 2000)}

请严格按照以下模板输出优化建议：

## 📝 简历优化建议总览

### 1. 格式与结构优化
- **问题描述**：（当前存在的问题）
- **优化建议**：（具体如何修改）
- **优化示例**：（修改前后的对比示例）

### 2. 工作经历优化
- **问题描述**：（当前存在的问题）
- **优化建议**：（具体如何修改）
- **优化示例**：（使用STAR法则的改写示例）

### 3. 技能描述优化
- **问题描述**：（当前存在的问题）
- **优化建议**：（具体如何修改）
- **优化示例**：（更专业化的技能描述）

### 4. 个人简介优化
- **问题描述**：（当前存在的问题）
- **优化建议**：（具体如何修改）
- **优化示例**：（更有吸引力的个人简介）

## 🎯 针对${targetRole || '目标职位'}的定制建议
（如果指定了目标职位，给出针对性建议）

## 📊 优化优先级

| 优先级 | 优化项 | 预期效果 | 难度 |
|--------|--------|----------|------|
| 高 | xxx | xxx | 低 |
| 中 | xxx | xxx | 中 |
| 低 | xxx | xxx | 高 |

## 💡 快速改进清单
- [ ] 建议1
- [ ] 建议2
- [ ] 建议3
- [ ] 建议4
- [ ] 建议5

## 📈 优化后预期效果
（描述优化后简历的预期提升）

请确保建议具体、可操作，提供实际的改写示例。`;

        const systemPrompt = '你是资深简历优化专家，擅长发现简历问题并提供具体可执行的优化方案。输出要结构化、有示例、可操作。';
        
        return await window.aiCore.prompt(prompt, { systemPrompt });
    }

    /**
     * 快速优化建议（仅核心要点）
     * @private
     */
    async _quickOptimization(resumeText, analysisResult) {
        const prompt = `请快速给出以下简历的3个核心优化建议：

简历：${resumeText.substring(0, 1000)}
分析：${analysisResult.substring(0, 500)}

输出格式：
1. 【优先级高】建议内容
2. 【优先级中】建议内容
3. 【优先级低】建议内容`;

        return await window.aiCore.prompt(prompt);
    }

    /**
     * 生成简历改写版本
     * @param {string} section - 需要改写的简历段落
     * @param {string} instruction - 改写指令
     */
    async rewriteSection(section, instruction) {
        const prompt = `请根据以下指令改写简历内容：

【原始内容】
${section}

【改写指令】
${instruction}

【改写要求】
1. 使用更专业的表达方式
2. 突出成果和数据
3. 保持真实性
4. 输出改写后的版本

请直接输出改写后的内容，不要添加额外说明。`;

        return await window.aiCore.prompt(prompt);
    }

    /**
     * 保存优化历史
     * @private
     */
    async _saveToHistory(resumeText, suggestions, targetRole) {
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString(),
            targetRole: targetRole || '未指定',
            suggestionsPreview: suggestions.substring(0, 200)
        };
        
        this.optimizationHistory.unshift(record);
        
        if (this.optimizationHistory.length > 20) {
            this.optimizationHistory = this.optimizationHistory.slice(0, 20);
        }
        
        try {
            await chrome.storage.local.set({ optimizationHistory: this.optimizationHistory });
        } catch (e) {
            console.warn('保存优化历史失败:', e);
        }
    }

    getHistory() {
        return this.optimizationHistory;
    }

    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['optimizationHistory']);
            if (result.optimizationHistory) {
                this.optimizationHistory = result.optimizationHistory;
            }
        } catch (e) {
            console.warn('加载优化历史失败:', e);
        }
    }
}

window.resumeOptimizer = new ResumeOptimizer();
window.resumeOptimizer.loadHistory();