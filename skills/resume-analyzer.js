/**
 * 简历分析技能模块 - 使用模板管理器 + MCP增强
 * 负责：技能提取、经历分析、评分、面试建议
 * 支持 HR Toolkit MCP 增强（可选）
 */

class ResumeAnalyzer {
    constructor() {
        this.analysisHistory = [];  // 分析历史记录
        this.currentFileName = null; // 当前分析的文件名
    }

    /**
     * 分析简历主入口
     * @param {string} resumeText - 简历文本内容
     * @param {string} templateId - 模板ID（可选，不传则使用当前模板）
     * @returns {Promise<{success: boolean, result: string, error?: string}>}
     */
    async analyze(resumeText, templateId = null) {
        // 从全局获取文件名
        if (window.currentFileName) {
            this.currentFileName = window.currentFileName;
            console.log('分析简历，文件名:', this.currentFileName);
        } else if (!this.currentFileName) {
            this.currentFileName = '手动输入';
        }

        // 验证输入
        if (!resumeText || resumeText.length < 20) {
            return {
                success: false,
                result: '',
                error: '简历内容过少或无法识别，请确保PDF包含可提取的文字内容'
            };
        }

        // 清理文本
        const cleanedText = this._cleanResumeText(resumeText);
        
        // ========== MCP增强：尝试使用 HR Toolkit 提取结构化数据 ==========
        let mcpSkillsData = null;
        let mcpExperienceData = null;
        
        if (window.mcpClient && window.mcpClient.isMcpAvailable) {
            try {
                console.log('🔌 尝试使用 HR Toolkit 提取技能...');
                mcpSkillsData = await window.mcpClient.extractSkillsStructured(cleanedText);
                if (mcpSkillsData) {
                    console.log('✅ HR Toolkit 技能提取成功，分类数:', Object.keys(mcpSkillsData).length);
                }
            } catch (mcpError) {
                console.warn('⚠️ HR Toolkit 技能提取失败，使用 AI 分析:', mcpError);
            }
            
            try {
                console.log('🔌 尝试使用 HR Toolkit 提取工作经历...');
                mcpExperienceData = await window.mcpClient.extractExperienceStructured(cleanedText);
                if (mcpExperienceData) {
                    console.log('✅ HR Toolkit 经历提取成功，条数:', mcpExperienceData.length);
                }
            } catch (mcpError) {
                console.warn('⚠️ HR Toolkit 经历提取失败，使用 AI 分析:', mcpError);
            }
        } else {
            console.log('⚡ MCP不可用，使用基础AI分析');
        }
        // ================================================================

        try {
            let analysisResult = '';
            
            // 确定使用的模板ID
            const useTemplateId = templateId || (window.templateManager ? window.templateManager.getCurrentTemplateId() : 'detailed');
            
            // ========== 构建增强提示词（如果MCP数据可用） ==========
            let enhancedPrompt = '';
            if (mcpSkillsData || mcpExperienceData) {
                enhancedPrompt = '【HR Toolkit 结构化数据】\n以下数据来自HR Toolkit的专业分析，请优先参考：\n\n';
                if (mcpSkillsData) {
                    enhancedPrompt += `### 技能分类\n\`\`\`json\n${JSON.stringify(mcpSkillsData, null, 2)}\n\`\`\`\n\n`;
                }
                if (mcpExperienceData) {
                    enhancedPrompt += `### 工作经历时间线\n\`\`\`json\n${JSON.stringify(mcpExperienceData, null, 2)}\n\`\`\`\n\n`;
                }
                enhancedPrompt += '请结合以上结构化数据，进行更精准的简历分析。\n\n';
            }
            // ========================================================
            
            if (window.templateManager) {
                // 使用模板管理器构建提示词
                const { systemPrompt, userPrompt } = window.templateManager.buildPrompt(useTemplateId, cleanedText);
                
                // 如果存在增强数据，添加到提示词前面
                const finalUserPrompt = enhancedPrompt ? enhancedPrompt + userPrompt : userPrompt;
                
                console.log('使用模板:', useTemplateId, '增强模式:', !!enhancedPrompt);
                analysisResult = await window.aiCore.prompt(finalUserPrompt, { systemPrompt });
            } else {
                // 降级：模板管理器不可用时使用默认分析
                console.warn('模板管理器未加载，使用默认分析');
                analysisResult = await this._defaultAnalysis(cleanedText, enhancedPrompt);
            }

            // 保存到历史
            await this._saveToHistory(cleanedText, analysisResult, useTemplateId);

            return {
                success: true,
                result: analysisResult,
                error: null
            };

        } catch (error) {
            console.error('简历分析失败:', error);
            return {
                success: false,
                result: '',
                error: `分析失败: ${error.message}`
            };
        }
    }

    /**
     * 默认分析（降级方案，当模板管理器不可用时使用）
     * @private
     */
    async _defaultAnalysis(resumeText, enhancedPrompt = '') {
        let prompt = `请分析以下简历内容，提取关键信息：

【简历内容】
${resumeText.substring(0, 5000)}

请输出：
1. 核心技能
2. 工作经历总结
3. 综合评分(1-10分)
4. 简短建议`;

        if (enhancedPrompt) {
            prompt = enhancedPrompt + prompt;
        }

        const systemPrompt = '你是专业的简历分析专家。';
        return await window.aiCore.prompt(prompt, { systemPrompt });
    }

    /**
     * 清理简历文本
     * @private
     */
    _cleanResumeText(text) {
        return text
            // 移除多余空行
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // 移除特殊字符
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\-\.,;:!?()\n]/g, '')
            // 限制长度
            .substring(0, 10000);
    }

    /**
     * 保存分析历史
     * @private
     */
    async _saveToHistory(resumeText, result, templateId) {
        try {
            // 获取模板名称
            let templateName = templateId;
            if (window.templateManager) {
                const template = window.templateManager.getTemplate(templateId);
                if (template) templateName = template.name;
            }
            
            const record = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                localTime: new Date().toLocaleString(),
                fileName: this.currentFileName || '未知文件',
                templateId: templateId,
                templateName: templateName,
                result: result,
                resultPreview: result.substring(0, 300),
                resumeText: resumeText,
                resumePreview: resumeText.substring(0, 200)
            };
            
            console.log('保存历史记录:', {
                fileName: record.fileName,
                templateName: record.templateName,
                resumeTextLength: record.resumeText.length
            });
            
            this.analysisHistory.unshift(record);
            
            // 保留最近20条
            if (this.analysisHistory.length > 20) {
                this.analysisHistory = this.analysisHistory.slice(0, 20);
            }
            
            await chrome.storage.local.set({ analysisHistory: this.analysisHistory });
            console.log('简历分析历史已保存');
        } catch (e) {
            console.warn('保存分析历史失败:', e);
        }
    }

    /**
     * 获取分析历史
     */
    getHistory() {
        return this.analysisHistory;
    }

    /**
     * 清除历史
     */
    async clearHistory() {
        this.analysisHistory = [];
        try {
            await chrome.storage.local.remove(['analysisHistory']);
        } catch (e) {
            console.warn('清除历史失败:', e);
        }
    }

    /**
     * 从存储加载历史
     */
    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['analysisHistory']);
            if (result.analysisHistory) {
                this.analysisHistory = result.analysisHistory;
                console.log(`加载了 ${this.analysisHistory.length} 条分析历史`);
            }
        } catch (e) {
            console.warn('加载历史失败:', e);
        }
    }
}

// 创建全局实例
window.resumeAnalyzer = new ResumeAnalyzer();

// 自动加载历史
window.resumeAnalyzer.loadHistory();