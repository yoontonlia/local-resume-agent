/**
 * AI智能体编排器 v4.2 - 完整功能版
 * 功能：多轮对话引导、自主规划任务、调用技能、生成报告
 * 支持：模板切换、自然语言理解、自定义请求、记忆系统
 * 修复：岗位匹配调用真实技能、优化建议结合匹配结果、长内容折叠显示
 */

class AgentOrchestrator {
    constructor() {
        this.session = {
            id: null,
            stage: 'init',
            goal: '',
            messages: [],
            collectedData: {},
            analysisResults: {},
            currentPlan: null,
            currentTemplateId: null,
            currentTemplateName: null,
            optimizationCount: 0,
            optimizationHistory: []
        };
        
        this.availableSkills = {
            'resume-analyzer': {
                name: '简历深度分析',
                description: '分析简历内容，提取技能、工作经历、教育背景，给出综合评分',
                params: { resumeText: '简历文本' }
            },
            'job-matcher': {
                name: '岗位匹配分析',
                description: '对比简历与职位描述，计算匹配度，分析差距',
                params: { resumeText: '简历文本', jobDescription: '职位描述' }
            },
            'resume-optimizer': {
                name: '简历优化建议',
                description: '基于分析结果生成简历优化建议',
                params: { resumeText: '简历文本', analysisResult: '分析结果' }
            }
        };
        
        this.isActive = false;
        
        // 记忆系统
        if (window.agentMemory) {
            this.memory = window.agentMemory;
        }
    }

    /**
     * 启动新的智能会话
     */
    async startSession(userGoal) {
        // 初始化记忆系统
        if (this.memory && !this.memory._initialized) {
            await this.memory.init();
            this.memory._initialized = true;
        }
        
        this.session = {
            id: Date.now(),
            stage: 'init',
            goal: userGoal,
            messages: [],
            collectedData: {},
            analysisResults: {},
            currentPlan: null,
            currentTemplateId: null,
            currentTemplateName: null,
            optimizationCount: 0,
            optimizationHistory: []
        };
        
        this.isActive = true;
        
        // 获取当前全局模板
        if (window.templateManager) {
            const current = window.templateManager.getCurrentTemplate();
            if (current) {
                this.session.currentTemplateId = current.id;
                this.session.currentTemplateName = current.name;
                console.log(`[Agent] 当前模板: ${current.name}`);
            }
        }
        
        // 检查简历状态
        let hasResume = false;
        let resumeInfo = '';
        
        if (window.currentResumeText && window.currentResumeText.length > 50) {
            hasResume = true;
            this.session.collectedData.resumeText = window.currentResumeText;
            this.session.collectedData.resumeFileName = window.currentFileName || '已上传简历';
            resumeInfo = `\n📄 检测到您已上传简历：${this.session.collectedData.resumeFileName}`;
        }
        
        // 生成开场白
        const opening = await this._generateOpening(hasResume, resumeInfo);
        
        this._addMessage('assistant', opening);
        this._addMessage('system', `会话开始，目标：${userGoal}`);
        
        return opening;
    }

    /**
     * 处理用户输入
     */
    async processInput(userInput) {
        if (!this.isActive) {
            return "会话已结束，请开始新会话。";
        }
        
        // 记录用户输入
        this._addMessage('user', userInput);
        
        // 每5轮对话后提取记忆
        if (this.memory && this.session.messages.length % 5 === 0 && this.session.messages.length > 0) {
            try {
                await this.memory.extractMemorableInfo(this.session.messages.slice(-10));
                console.log('[Agent] 已提取记忆');
            } catch (error) {
                console.error('[Agent] 记忆提取失败:', error);
            }
        }
        
        // 特殊指令处理
        if (userInput === '/help' || userInput === '帮助' || userInput === '?') {
            return this._getFullHelpMessage();
        }
        
        if (userInput === '/status') {
            return this._getStatusMessage();
        }
        
        if (userInput === '/clear') {
            this.session.messages = [];
            return "✅ 对话历史已清空，您可以重新开始。";
        }
        
                // ========== 自动检测职位描述（用户粘贴JD） ==========
                // ========== 自动检测职位描述（用户粘贴JD） ==========
        const isJobDescription = userInput.length > 30 && (
            userInput.includes('职位') || userInput.includes('要求') || 
            userInput.includes('职责') || userInput.includes('岗位') || 
            userInput.includes('描述') || userInput.includes('招聘') ||
            userInput.includes('任职') || userInput.includes('资格')
        );
        
        const isLongText = userInput.length > 100 && !userInput.includes('分析') && !userInput.includes('优化');
        
        if (isJobDescription || isLongText) {
            // ========== 检测到新JD，清空旧的匹配结果 ==========
            const oldJD = this.session.collectedData.jobDescription;
            if (oldJD && oldJD !== userInput && this.session.analysisResults.jobMatch) {
                console.log('[Agent] 检测到新JD，清空旧的匹配结果');
                this.session.analysisResults.jobMatch = null;
                this.session.collectedData.lastMatchedJD = null;
            }
            // ===================================================
            
            this.session.collectedData.jobDescription = userInput;
            console.log('[Agent] 已保存职位描述，长度:', userInput.length);
            return `📋 已收到职位描述（${userInput.length}字符）。\n\n说"匹配"开始分析匹配度。`;
        }
        // ===================================================
        
        // 意图识别
        const intent = await this._recognizeIntent(userInput);
        console.log('[Agent] 识别意图:', intent);
        
        // 处理模板相关指令
        if (intent.action === 'list_templates') {
            return this._listTemplates();
        }
        
        if (intent.action === 'current_template') {
            const templateName = this.session.currentTemplateName || 
                (window.templateManager?.getCurrentTemplate()?.name || '深度分析');
            return `📋 当前使用的模板是：**${templateName}**\n\n说"有哪些模板"查看所有可用模板，说"使用模板 [名称]"切换模板。`;
        }
        
        if (intent.action === 'switch_template') {
            if (intent.templateName) {
                return await this._switchTemplateByName(intent.templateName);
            } else if (intent.needName) {
                return "请告诉我要使用哪个模板，例如：'使用快速分析模板'";
            }
            return this._listTemplates();
        }
        
        // 处理自定义请求（用户自由输入）
        if (intent.action === 'custom' || intent.action === 'custom_optimize') {
            return await this._handleCustomRequest(userInput, intent);
        }
        
        // 处理帮助
        if (intent.action === 'help') {
            return this._getFullHelpMessage();
        }
        
        // ========== 分析指令 ==========
        if (intent.action === 'analyze') {
            if (!this.session.analysisResults.resumeAnalysis) {
                if (!this.session.collectedData.resumeText && !window.currentResumeText) {
                    return "请先上传简历文件，或粘贴简历内容。";
                }
                return await this._callSkill('resume-analyzer');
            }
            return "简历已经分析过了。说'匹配'进行岗位匹配，或说'优化'生成优化建议。";
        }
        
                // ========== 匹配指令 - 调用真正的岗位匹配技能 ==========
        if (intent.action === 'match') {
            console.log('[Agent] 处理匹配指令，当前状态:', {
                hasAnalysis: !!this.session.analysisResults.resumeAnalysis,
                hasJobDesc: !!this.session.collectedData.jobDescription,
                jobDescLength: this.session.collectedData.jobDescription?.length || 0,
                hasMatchResult: !!this.session.analysisResults.jobMatch
            });
            
            if (!this.session.analysisResults.resumeAnalysis) {
                return "请先完成简历分析，然后进行岗位匹配。";
            }
            
            // 获取职位描述
            let jobDescription = this.session.collectedData.jobDescription;
            if (!jobDescription || jobDescription.length < 30) {
                const jobDescElement = document.getElementById('jobDescription');
                if (jobDescElement && jobDescElement.value.trim().length > 30) {
                    jobDescription = jobDescElement.value.trim();
                    this.session.collectedData.jobDescription = jobDescription;
                    console.log('[Agent] 从页面输入框获取职位描述，长度:', jobDescription.length);
                }
            }
            
            if (!jobDescription || jobDescription.length < 30) {
                return "请先粘贴职位描述（JD）（至少30字符），然后说'匹配'。\n\n💡 提示：您可以直接粘贴JD到输入框，系统会自动识别。";
            }
            
            // ========== 简化判断：直接调用匹配，让匹配函数内部处理覆盖逻辑 ==========
            return await this._callSkill('job-matcher');
            // ===================================================
        }
        
        // ========== 优化指令 - 支持多次优化和结合岗位匹配 ==========
        if (intent.action === 'optimize') {
            if (!this.session.analysisResults.resumeAnalysis) {
                return "请先完成简历分析，然后我可以为您生成优化建议。";
            }
            // 传递优化方向和是否结合岗位匹配
            return await this._callSkill('resume-optimizer', { 
                direction: intent.direction || '',
                useMatchContext: intent.useMatchContext || false
            });
        }
        
        if (intent.action === 'report') {
            return await this._finalize();
        }
        
        // 继续指令
        if (intent.action === 'continue') {
            return await this._handleContinue();
        }
        
        // 提取信息
        await this._extractInfo(userInput);
        
        // 检查是否有职位描述（备用）
        if (userInput.length > 100 && (userInput.includes('职位') || userInput.includes('要求') || userInput.includes('职责'))) {
            this.session.collectedData.jobDescription = userInput;
            console.log('[Agent] 已保存职位描述，长度:', userInput.length);
        }
        
        // 决策
        const decision = await this._think();
        console.log('[Agent] 决策:', decision);
        
        // 执行
        const response = await this._act(decision);
        
        this._addMessage('assistant', response);
        
        return response;
    }

    /**
     * 处理继续指令
     */
    async _handleContinue() {
        console.log('[Agent] 继续指令 - 状态:', {
            hasAnalysis: !!this.session.analysisResults.resumeAnalysis,
            hasMatch: !!this.session.analysisResults.jobMatch,
            hasJobDesc: !!this.session.collectedData.jobDescription,
            hasOptimization: !!this.session.analysisResults.optimization
        });
        
        if (!this.session.analysisResults.resumeAnalysis) {
            return await this._callSkill('resume-analyzer');
        }
        
        if (this.session.collectedData.jobDescription && !this.session.analysisResults.jobMatch) {
            return await this._callSkill('job-matcher');
        }
        
        if (!this.session.analysisResults.optimization) {
            return await this._callSkill('resume-optimizer');
        }
        
        return await this._finalize();
    }

    /**
     * 思考：决定下一步行动
     */
    async _think() {
        const hasResume = !!this.session.collectedData.resumeText;
        const resumeStatus = hasResume ? '✅ 用户已上传简历' : '⚠️ 用户尚未上传简历';
        
        // 检索相关长期记忆
        let relevantMemories = '';
        if (this.memory && this.session.messages.length > 0) {
            const lastMessage = this.session.messages[this.session.messages.length - 1]?.content || '';
            relevantMemories = await this.memory.getFormattedLongTerm(lastMessage, 3);
        }
        
        const systemPrompt = `你是一个智能职业顾问Agent。目标：${this.session.goal}

【状态】${resumeStatus}
【已收集信息】${JSON.stringify(this.session.collectedData)}
【已有分析结果】${JSON.stringify(this.session.analysisResults)}
【相关记忆】${relevantMemories || '无'}
【当前模板】${this.session.currentTemplateName || '深度分析'}

【可用技能】${Object.keys(this.availableSkills).join(', ')}

输出JSON格式：
{
    "action": "ask | call_skill | finalize",
    "question": "如果要提问，写问题内容",
    "skillName": "如果要调用技能，写技能名称",
    "reason": "决策原因"
}`;

        try {
            const result = await window.aiCore.prompt('请根据当前状态决定下一步', { systemPrompt });
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('决策失败:', error);
        }
        
        // 降级决策
        if (hasResume && !this.session.analysisResults.resumeAnalysis) {
            return { action: 'call_skill', skillName: 'resume-analyzer', reason: '已有简历，开始分析' };
        }
        
        return { action: 'ask', question: '请告诉我更多关于您的职业背景的信息。' };
    }

    /**
     * 行动：执行决策
     */
    async _act(decision) {
        if (decision.action === 'ask') {
            return decision.question;
        }
        
        if (decision.action === 'call_skill') {
            return await this._callSkill(decision.skillName, decision);
        }
        
        if (decision.action === 'finalize') {
            return await this._finalize();
        }
        
        return `我不确定下一步该做什么。`;
    }

    /**
     * 调用技能
     */
    async _callSkill(skillName, options = {}) {
        console.log(`[Agent] 调用技能: ${skillName}`, options);
        
        // 获取简历文本
        let resumeText = this.session.collectedData.resumeText;
        if (!resumeText && window.currentResumeText) {
            resumeText = window.currentResumeText;
            this.session.collectedData.resumeText = resumeText;
            console.log('[Agent] 从全局获取简历文本，长度:', resumeText?.length);
        }
        
        // 获取模板信息
        const templateInfo = this.session.currentTemplateName ? 
            `\n📋 使用模板：${this.session.currentTemplateName}\n` : '';
        
        switch (skillName) {
            // ========== 简历分析 ==========
            case 'resume-analyzer':
                if (!resumeText || resumeText.length < 50) {
                    return `⚠️ 请先上传简历。您可以：
1. 点击弹窗上方的"上传简历"区域选择PDF文件
2. 或在手动输入框中粘贴简历内容（至少50字符）
3. 然后重新开始对话`;
                }
                
                if (!window.resumeAnalyzer) {
                    return `❌ 简历分析模块未加载，请刷新页面重试。`;
                }
                
                try {
                    this._addMessage('system', '📊 正在分析简历，请稍候（约10-20秒）...');
                    
                    const analysis = await window.resumeAnalyzer.analyze(resumeText);
                    
                    if (analysis && analysis.success) {
                        this.session.analysisResults.resumeAnalysis = analysis.result;
                        this.session.stage = 'analyzing';
                        
                        await this._extractKeyInfo(analysis.result);
                        
                        if (window.resumeAnalyzer.saveRecord) {
                            await window.resumeAnalyzer.saveRecord({
                                fileName: this.session.collectedData.resumeFileName || '智能分析',
                                analysisDepth: 'detailed',
                                result: analysis.result,
                                resumeText: resumeText
                            });
                        }
                        
                        // 格式化长内容
                        const formattedResult = this._formatLongContent(analysis.result, '简历分析结果');
                        return `✅ 简历分析完成！${templateInfo}\n\n${formattedResult}\n\n${this._getNextStepPrompt()}`;
                    } else {
                        return `❌ 分析失败：${analysis?.error || '未知错误'}`;
                    }
                } catch (error) {
                    console.error('简历分析错误:', error);
                    return `❌ 分析出错：${error.message}`;
                }
                
            // ========== 岗位匹配 - 调用真实的 jobMatcher ==========
            case 'job-matcher':
                if (!resumeText || resumeText.length < 50) {
                    return `请先上传简历并完成分析。`;
                }
                
                let jobDescription = this.session.collectedData.jobDescription;
                if (!jobDescription || jobDescription.length < 30) {
                    const jobDescElement = document.getElementById('jobDescription');
                    if (jobDescElement && jobDescElement.value.trim().length > 30) {
                        jobDescription = jobDescElement.value.trim();
                        this.session.collectedData.jobDescription = jobDescription;
                        console.log('[Agent] job-matcher: 从页面获取职位描述');
                    }
                }
                
                if (!jobDescription || jobDescription.length < 30) {
                    return `请粘贴职位描述（JD）到岗位匹配页面的输入框，然后说"匹配"。\n\n💡 提示：JD至少需要30个字符。`;
                }
                
                // ========== 检查是否需要重新匹配 ==========
                const isNewJD = this.session.collectedData.lastMatchedJD !== jobDescription;
                if (isNewJD && this.session.analysisResults.jobMatch) {
                    console.log('[Agent] 检测到新JD，清空旧匹配结果');
                    this.session.analysisResults.jobMatch = null;
                }
                // ===========================================
                
                if (!window.jobMatcher) {
                    return `❌ 岗位匹配模块未加载，请刷新页面重试。`;
                }
                
                try {
                    this._addMessage('system', '🎯 正在进行岗位匹配分析...');
                    console.log('[Agent] 调用 jobMatcher.match, JD长度:', jobDescription.length);
                    
                    const match = await window.jobMatcher.match(resumeText, jobDescription);
                    console.log('[Agent] 匹配结果:', match ? 'success' : 'failed');
                    
                    if (match && match.success) {
                        this.session.analysisResults.jobMatch = match.result;
                        this.session.stage = 'matching';
                        // 记录本次匹配的JD
                        this.session.collectedData.lastMatchedJD = jobDescription;
                        
                        const formattedResult = this._formatLongContent(match.result, '岗位匹配分析结果');
                        return `✅ 岗位匹配分析完成！${templateInfo}\n\n${formattedResult}\n\n${this._getNextStepPrompt()}`;
                    } else {
                        return `❌ 匹配失败：${match?.error || '未知错误'}`;
                    }
                } catch (error) {
                    console.error('匹配错误:', error);
                    return `❌ 匹配出错：${error.message}`;
                }
                
            // ========== 简历优化 - 结合岗位匹配结果 ==========
            case 'resume-optimizer':
                if (!resumeText || resumeText.length < 50) {
                    return `请先上传简历。`;
                }
                
                const analysisResult = this.session.analysisResults.resumeAnalysis;
                if (!analysisResult) {
                    return `请先完成简历分析。`;
                }
                
                // 获取岗位匹配结果作为上下文
                const matchResult = this.session.analysisResults.jobMatch;
                const jobDescriptionText = this.session.collectedData.jobDescription;
                
                // 获取优化方向和是否结合岗位匹配
                const optimizationDirection = options.direction || '';
                const shouldUseMatchContext = options.useMatchContext || 
                    (optimizationDirection && (optimizationDirection.includes('岗位') || optimizationDirection.includes('匹配') || optimizationDirection.includes('JD')));
                
                // 更新优化次数
                const optimizationCount = (this.session.optimizationCount || 0) + 1;
                this.session.optimizationCount = optimizationCount;
                
                if (!window.resumeOptimizer) {
                    return `❌ 简历优化模块未加载，请刷新页面重试。`;
                }
                
                try {
                    let statusMsg = `✏️ 正在生成第${optimizationCount}次优化建议`;
                    if (shouldUseMatchContext && matchResult) {
                        statusMsg += '（结合岗位匹配结果）';
                    }
                    this._addMessage('system', statusMsg);
                    
                    // 构建增强的优化上下文
                    let enhancedContext = '';
                    
                    if (shouldUseMatchContext && matchResult) {
                        enhancedContext = `\n\n【重要】用户要求结合岗位匹配结果进行优化。\n\n【岗位匹配分析结果】\n${matchResult}\n\n请仔细分析以上岗位匹配结果，找出简历与目标岗位的差距，针对性地优化简历内容，提高匹配度。`;
                    } else if (jobDescriptionText) {
                        enhancedContext = `\n\n【目标职位描述】\n${jobDescriptionText}\n\n请针对这个职位优化简历。`;
                    }
                    
                    // 如果是多次优化，添加提示
                    let optimizationHint = '';
                    if (optimizationCount > 1) {
                        optimizationHint = `\n\n这是第 ${optimizationCount} 次优化请求。用户可能对之前的优化结果不满意，请尝试不同的优化方向或提供更具体、更有针对性的建议。`;
                    }
                    
                    // 如果有具体方向，添加到提示中
                    if (optimizationDirection && !optimizationDirection.includes('岗位') && !optimizationDirection.includes('匹配')) {
                        optimizationHint += `\n\n用户的具体要求：${optimizationDirection}`;
                    }
                    
                    // 如果有历史优化记录，避免重复
                    if (this.session.optimizationHistory && this.session.optimizationHistory.length > 0) {
                        const lastOptimization = this.session.optimizationHistory[this.session.optimizationHistory.length - 1];
                        if (lastOptimization) {
                            optimizationHint += `\n\n之前的优化建议方向：${lastOptimization.direction || '通用'}。请提供不同角度的建议。`;
                        }
                    }
                    
                    // 构建完整的优化提示词
                    let fullContext = analysisResult;
                    if (enhancedContext) {
                        fullContext = analysisResult + enhancedContext;
                    }
                    if (optimizationHint) {
                        fullContext = fullContext + optimizationHint;
                    }
                    
                    const optimization = await window.resumeOptimizer.generateSuggestions(
                        resumeText,
                        fullContext,
                        this.session.goal
                    );
                    
                    if (optimization && optimization.success) {
                        // 保存优化历史
                        if (!this.session.optimizationHistory) {
                            this.session.optimizationHistory = [];
                        }
                        this.session.optimizationHistory.push({
                            content: optimization.suggestions,
                            timestamp: Date.now(),
                            direction: optimizationDirection || (shouldUseMatchContext ? '结合岗位匹配' : 'general'),
                            count: optimizationCount,
                            usedMatchContext: shouldUseMatchContext
                        });
                        this.session.analysisResults.optimization = optimization.suggestions;
                        this.session.stage = 'optimizing';
                        
                        const hasMatchContext = (shouldUseMatchContext && matchResult) ? '（已结合岗位匹配结果）' : 
                                                (jobDescriptionText ? '（已参考职位描述）' : '');
                        
                        // 格式化长内容
                        const formattedResult = this._formatLongContent(optimization.suggestions, `第${optimizationCount}次优化建议${hasMatchContext}`);
                        
                        let nextPrompt = '';
                        if (optimizationCount === 1) {
                            nextPrompt = `\n\n📌 说"再次优化"可以生成不同方向的优化建议，说"完成"生成报告。`;
                        } else {
                            nextPrompt = `\n\n📌 第${optimizationCount}次优化完成。说"再次优化"继续优化，说"完成"生成报告。`;
                        }
                        
                        return `✅ ${formattedResult}\n\n${nextPrompt}`;
                    } else {
                        return `❌ 优化失败：${optimization?.error || '未知错误'}`;
                    }
                } catch (error) {
                    console.error('优化错误:', error);
                    return `❌ 优化出错：${error.message}`;
                }
                
            default:
                return `技能 ${skillName} 暂不可用。可用的技能：resume-analyzer, job-matcher, resume-optimizer`;
        }
    }

    /**
     * 格式化长内容（添加折叠按钮）
     */
    _formatLongContent(content, title) {
        if (!content) return '无内容';
        
        const maxLength = 800;
        if (content.length <= maxLength) {
            return content;
        }
        
        const id = `content_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const preview = content.substring(0, maxLength);
        const remaining = content.substring(maxLength);
        
        return `${title}\n\n${preview}...\n\n<details><summary>📖 点击展开完整内容（${content.length}字符）</summary>\n\n${remaining}\n\n</details>`;
    }

    /**
     * 处理自定义请求（用户自由输入）
     */
    async _handleCustomRequest(userInput, intent) {
        // 检查是否是优化相关的请求
        if (userInput.includes('优化') || userInput.includes('改写') || userInput.includes('修改')) {
            return await this._callSkill('resume-optimizer', { direction: userInput });
        }
        
        // 构建上下文让AI理解用户意图
        const contextPrompt = `用户说："${userInput}"

当前状态：
- 已分析简历：${!!this.session.analysisResults.resumeAnalysis}
- 已岗位匹配：${!!this.session.analysisResults.jobMatch}
- 已生成优化：${!!this.session.analysisResults.optimization}

请理解用户需求并给出友好回应。用户可以：
1. 要求分析简历
2. 要求岗位匹配
3. 要求优化简历（可指定方向）
4. 询问帮助
5. 其他自定义问题

请用自然、友好的方式回应。`;

        try {
            const response = await window.aiCore.prompt(contextPrompt);
            return response;
        } catch (error) {
            return `我理解您的问题：${userInput}\n\n您可以说：
- "分析" - 分析简历
- "匹配" - 岗位匹配
- "优化" - 优化简历
- "帮助" - 查看完整帮助

💡 您也可以自由提问，我会尽力回答。`;
        }
    }

    /**
     * 结束会话，生成报告
     */
    async _finalize() {
        this.session.stage = 'reporting';
        
        const reportHtml = await this._generateReport();
        
        this.session.analysisResults.report = reportHtml;
        
        if (window.pdfExporter) {
            try {
                const fileName = `career_report_${Date.now()}.pdf`;
                await window.pdfExporter.exportToPDF(reportHtml, fileName);
                
                this.isActive = false;
                
                const summary = this._generateSummary();
                
                return `✅ 职业发展报告已生成并下载！\n\n${summary}\n\n📁 文件名：${fileName}\n\n感谢使用AI职业顾问，祝您求职顺利！`;
            } catch (error) {
                console.error('PDF导出失败:', error);
                return `报告已生成，但PDF导出失败：${error.message}\n\n您可以在控制台中查看报告内容。`;
            }
        }
        
        this.isActive = false;
        return `✅ 分析完成！\n\n${this._generateSummary()}\n\n（PDF导出功能需要配置）`;
    }

    /**
     * 生成综合报告HTML
     */
    async _generateReport() {
        const now = new Date().toLocaleString('zh-CN');
        const goal = this.session.goal;
        const collectedData = this.session.collectedData;
        const analysisResults = this.session.analysisResults;
        
        const skillsHtml = collectedData.skills && collectedData.skills.length > 0 
            ? collectedData.skills.map(s => `<span class="skill-tag">${this._escapeHtml(s)}</span>`).join('')
            : '<span>暂未提取到技能信息</span>';
        
        const hasAnalysis = !!analysisResults.resumeAnalysis;
        const hasMatch = !!analysisResults.jobMatch;
        const hasOptimization = !!analysisResults.optimization;
        
        // 如果有多次优化，显示所有优化历史
        let optimizationHistoryHtml = '';
        if (this.session.optimizationHistory && this.session.optimizationHistory.length > 1) {
            optimizationHistoryHtml = `<div class="section"><div class="section-title">📚 优化历史记录</div><div class="analysis-content">`;
            this.session.optimizationHistory.forEach((opt, idx) => {
                optimizationHistoryHtml += `<details><summary>第${idx+1}次优化 (${opt.direction || '通用'})</summary><pre style="white-space: pre-wrap; margin-top: 8px;">${this._escapeHtml(opt.content.substring(0, 300))}...</pre></details>`;
            });
            optimizationHistoryHtml += `</div></div>`;
        }
        
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>职业发展分析报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif; background: #f0f2f5; padding: 40px 20px; }
        .report-container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }
        .report-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 40px; text-align: center; }
        .report-header h1 { font-size: 28px; margin-bottom: 8px; }
        .report-header .subtitle { opacity: 0.8; font-size: 14px; }
        .report-header .date { margin-top: 16px; font-size: 12px; opacity: 0.6; }
        .report-body { padding: 40px; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 20px; font-weight: 600; color: #1a1a2e; border-left: 4px solid #667eea; padding-left: 16px; margin-bottom: 20px; }
        .info-card { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .info-row { display: flex; margin-bottom: 12px; }
        .info-label { width: 100px; font-weight: 600; color: #666; }
        .info-value { flex: 1; color: #333; }
        .skill-tag { display: inline-block; background: #e9ecef; padding: 6px 14px; border-radius: 20px; margin: 4px; font-size: 13px; color: #333; }
        .analysis-content { background: #f8f9fa; border-radius: 12px; padding: 20px; line-height: 1.8; font-size: 14px; color: #333; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
        .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; }
        details { margin-top: 12px; }
        summary { cursor: pointer; color: #667eea; font-weight: 500; }
        @media print { body { background: white; padding: 0; } .report-container { box-shadow: none; } }
    </style>
</head>
<body>
<div class="report-container">
    <div class="report-header">
        <h1>📊 职业发展分析报告</h1>
        <div class="subtitle">AI智能职业顾问 · 个性化分析</div>
        <div class="date">生成时间：${now}</div>
    </div>
    <div class="report-body">
        <div class="section">
            <div class="section-title">🎯 分析目标</div>
            <div class="info-card"><div class="info-row"><div class="info-label">用户目标：</div><div class="info-value">${this._escapeHtml(goal)}</div></div></div>
        </div>
        <div class="section">
            <div class="section-title">📋 用户信息摘要</div>
            <div class="info-card">
                ${collectedData.resumeFileName ? `<div class="info-row"><div class="info-label">简历文件：</div><div class="info-value">${this._escapeHtml(collectedData.resumeFileName)}</div></div>` : ''}
                ${collectedData.currentRole ? `<div class="info-row"><div class="info-label">当前职位：</div><div class="info-value">${this._escapeHtml(collectedData.currentRole)}</div></div>` : ''}
                ${collectedData.experience ? `<div class="info-row"><div class="info-label">工作经验：</div><div class="info-value">${this._escapeHtml(collectedData.experience)}年</div></div>` : ''}
                <div class="info-row"><div class="info-label">核心技能：</div><div class="info-value">${skillsHtml}</div></div>
            </div>
        </div>
        ${hasAnalysis ? `<div class="section"><div class="section-title">📄 简历分析</div><div class="analysis-content">${this._formatAnalysisContent(analysisResults.resumeAnalysis)}</div></div>` : ''}
        ${hasMatch ? `<div class="section"><div class="section-title">🎯 岗位匹配分析</div><div class="analysis-content">${this._formatAnalysisContent(analysisResults.jobMatch)}</div></div>` : ''}
        ${hasOptimization ? `<div class="section"><div class="section-title">✏️ 简历优化建议</div><div class="analysis-content">${this._formatAnalysisContent(analysisResults.optimization)}</div></div>` : ''}
        ${optimizationHistoryHtml}
        <div class="section"><div class="section-title">💡 综合建议</div><div class="analysis-content">${this._generateRecommendations()}</div></div>
    </div>
    <div class="footer"><p>本报告由 AI 智能职业顾问生成</p><p>基于您的简历和职业目标定制 · 仅供参考</p></div>
</div>
</body>
</html>`;
    }

    /**
     * 获取下一步提示
     */
    _getNextStepPrompt() {
        const hasMatch = !!this.session.analysisResults.jobMatch;
        const hasOptimization = !!this.session.analysisResults.optimization;
        
        if (!hasMatch) {
            return `\n📌 下一步：您可以：
- 说"匹配"进行岗位匹配分析
- 粘贴职位描述（JD）后说"匹配"`;
        }
        if (!hasOptimization) {
            return `\n📌 下一步：您可以：
- 说"优化"生成简历优化建议
- 说"结合岗位优化"生成针对性建议
- 说"再次优化"生成不同方向的建议
- 说"完成"生成最终报告`;
        }
        return `\n📌 下一步：说"再次优化"继续优化，或说"完成"生成报告，或输入任何问题自由提问。`;
    }

    /**
     * 获取完整帮助信息
     */
    _getFullHelpMessage() {
        return `📖 **完整帮助手册**

## 🎯 基础指令

| 指令 | 功能 |
|------|------|
| 分析 / 帮我分析 | 分析简历 |
| 匹配 / 岗位匹配 | 进行岗位匹配（需先提供JD） |
| 优化 / 帮我优化 | 生成简历优化建议 |
| 结合岗位优化 | 结合岗位匹配结果优化 |
| 再次优化 | 生成不同方向的优化建议 |
| 完成 / 生成报告 | 导出PDF报告 |
| 帮助 / /help | 显示本帮助 |
| /status | 查看当前状态 |
| /clear | 清空对话历史 |

## 💡 自定义输入示例

您可以直接输入任何问题，例如：
- "帮我突出管理经验"
- "针对技术岗位优化简历"
- "我的简历有哪些不足"
- "这个岗位适合我吗"
- "把工作经历写得更详细"

AI会理解您的意图并给出回应。

## 📋 使用流程

1. 上传简历 → 说"分析"
2. 粘贴职位描述 → 说"匹配"
3. 说"结合岗位优化" → 获得针对性建议
4. 说"完成" → 导出PDF报告

💡 **提示**：您不需要按固定顺序，直接说出需求即可！`;
    }

    /**
     * 获取状态信息
     */
    _getStatusMessage() {
        return `📊 **当前状态**
- 会话状态：${this.isActive ? '活跃' : '已结束'}
- 当前阶段：${this.session.stage}
- 分析目标：${this.session.goal}
- 对话轮次：${this.session.messages.length}
- 当前模板：${this.session.currentTemplateName || '深度分析'}
- 简历分析：${this.session.analysisResults.resumeAnalysis ? '✅ 已完成' : '❌ 未开始'}
- 岗位匹配：${this.session.analysisResults.jobMatch ? '✅ 已完成' : '❌ 未开始'}
- 优化建议：${this.session.analysisResults.optimization ? '✅ 已生成' : '❌ 未生成'}
- 优化次数：${this.session.optimizationCount || 0}`;
    }

    /**
     * 提取用户信息
     */
    async _extractInfo(userInput) {
        const prompt = `从以下用户输入中提取关键职业信息，输出JSON格式：
用户输入：${userInput}

提取字段：skills（技能）、experience（经验年数）、jobTarget（目标岗位）、preferences（偏好）

只输出JSON，不要其他内容。`;

        try {
            const result = await window.aiCore.prompt(prompt);
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[0]);
                this.session.collectedData = { ...this.session.collectedData, ...extracted };
            }
        } catch (error) {
            console.error('信息提取失败:', error);
        }
    }

    /**
     * 从分析结果中提取关键信息
     */
    async _extractKeyInfo(analysisResult) {
        const prompt = `从以下简历分析结果中提取关键信息，输出JSON：

分析结果：${analysisResult.substring(0, 2000)}

提取字段：
- skills: 核心技能列表
- experience: 工作经验年数
- currentRole: 当前职位
- strengths: 优势列表

只输出JSON，不要其他内容。`;

        try {
            const result = await window.aiCore.prompt(prompt);
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const info = JSON.parse(jsonMatch[0]);
                if (info.skills) this.session.collectedData.skills = info.skills;
                if (info.experience) this.session.collectedData.experience = info.experience;
                if (info.currentRole) this.session.collectedData.currentRole = info.currentRole;
                console.log('[Agent] 提取关键信息:', info);
            }
        } catch (error) {
            console.error('提取关键信息失败:', error);
        }
    }

    /**
     * 生成开场白
     */
    async _generateOpening(hasResume = false, resumeInfo = '') {
        let opening = `👋 您好！我是您的AI职业顾问。

我将帮助您完成：**${this.session.goal}**`;

        if (hasResume) {
            opening += `${resumeInfo}\n\n我可以直接分析这份简历。您可以说：
- "分析" - 开始分析简历
- "优化" - 生成优化建议
- "结合岗位优化" - 根据JD针对性优化
- "再次优化" - 生成不同方向的建议
- "匹配" - 进行岗位匹配（需提供JD）
- "有哪些模板" - 查看可用模板
- "帮助" - 查看完整帮助手册`;
        } else {
            opening += `\n\n📌 开始前，请先上传您的简历（PDF格式）：
1. 点击弹窗上方的"上传简历"区域
2. 选择您的PDF简历文件
3. 上传成功后，回来告诉我"继续"`;
        }
        
        opening += `\n\n💡 提示：您也可以用自然语言告诉我您的需求，我会理解并执行。`;
        
        return opening;
    }

    /**
     * 添加消息到历史
     */
    _addMessage(role, content) {
        this.session.messages.push({ role, content, timestamp: Date.now() });
    }

    /**
     * 获取会话状态
     */
    getStatus() {
        return {
            isActive: this.isActive,
            stage: this.session.stage,
            goal: this.session.goal,
            messageCount: this.session.messages.length,
            currentTemplate: this.session.currentTemplateName,
            optimizationCount: this.session.optimizationCount
        };
    }

    /**
     * 结束会话
     */
    endSession() {
        this.isActive = false;
        return "会话已结束。感谢使用！";
    }

    // ========== 模板管理方法 ==========

    /**
     * 列出所有可用模板
     */
    _listTemplates() {
        if (!window.templateManager) return '模板管理器未加载';
        
        const allTemplates = window.templateManager.getAllTemplates();
        const builtIn = allTemplates.filter(t => t.isBuiltIn);
        const user = allTemplates.filter(t => !t.isBuiltIn);
        
        const currentId = this.session.currentTemplateId || window.templateManager.getCurrentTemplateId();
        
        let message = '📋 **可用模板**\n\n';
        message += '**系统模板：**\n';
        builtIn.forEach(t => {
            const current = currentId === t.id ? ' ✅ (当前)' : '';
            message += `- ${t.icon || '📌'} ${t.name}${current}\n`;
        });
        
        if (user.length > 0) {
            message += '\n**我的模板：**\n';
            user.forEach(t => {
                const current = currentId === t.id ? ' ✅ (当前)' : '';
                message += `- ${t.icon || '📝'} ${t.name}${current}\n`;
            });
        }
        
        message += '\n💡 说"使用模板 [名称]"来切换模板，如"使用快速分析模板"';
        return message;
    }

    /**
     * 按名称切换模板
     */
    async _switchTemplateByName(templateName) {
        if (!window.templateManager) {
            return "❌ 模板管理器未加载";
        }
        
        let cleanName = templateName
            .replace(/模板$/, '')
            .replace(/^用/, '')
            .replace(/^切换到/, '')
            .replace(/^改成/, '')
            .trim();
        
        console.log(`[Agent] 查找模板: "${cleanName}" (原始: "${templateName}")`);
        
        const allTemplates = window.templateManager.getAllTemplates();
        
        let target = allTemplates.find(t => t.name === cleanName);
        
        if (!target) {
            target = allTemplates.find(t => 
                t.name.toLowerCase().includes(cleanName.toLowerCase()) ||
                cleanName.toLowerCase().includes(t.name.toLowerCase())
            );
        }
        
        if (!target) {
            return `❌ 未找到名为「${templateName}」的模板。\n\n可用的模板有：\n${allTemplates.map(t => `- ${t.name}`).join('\n')}`;
        }
        
        const success = await window.templateManager.setCurrentTemplate(target.id);
        if (success) {
            // 切换模板时清空分析结果
            this.session.analysisResults = {};
            this.session.optimizationCount = 0;
            this.session.optimizationHistory = [];
            this.session.stage = 'init';
            
            this.session.currentTemplateId = target.id;
            this.session.currentTemplateName = target.name;
            
            return `✅ 已切换到模板：「${target.name}」\n\n${target.description || '可以使用此模板进行分析。'}\n\n之前的分析结果已清空，请说"分析"重新分析简历。`;
        }
        
        return `❌ 切换失败`;
    }

    // ========== 意图识别方法 ==========

    /**
     * 识别用户意图
     */
    async _recognizeIntent(userInput) {
        const input = userInput.toLowerCase();
        
        // 特殊指令
        if (input === '帮助' || input === 'help' || input === '/help') {
            return { action: 'help' };
        }
        
        if (input === '/status') {
            return { action: 'status' };
        }
        
        if (input === '/clear') {
            return { action: 'clear' };
        }
        
        // 模板相关指令
        if (input.includes('模板') || input.includes('template')) {
            if (input.includes('列表') || input.includes('查看') || input.includes('有哪些')) {
                return { action: 'list_templates' };
            }
            if (input.includes('当前模板') || input.includes('什么模板') || input === '模板') {
                return { action: 'current_template' };
            }
            if (input.includes('使用') || input.includes('切换') || input.includes('改成')) {
                let templateName = '';
                const patterns = [
                    /使用\s*([^，,。]+?)\s*模板/,
                    /切换到\s*([^，,。]+?)\s*模板/,
                    /改成\s*([^，,。]+?)\s*模板/,
                    /用\s*([^，,。]+?)\s*模板/
                ];
                for (const pattern of patterns) {
                    const match = userInput.match(pattern);
                    if (match) {
                        templateName = match[1].trim();
                        break;
                    }
                }
                if (templateName) {
                    return { action: 'switch_template', templateName: templateName };
                }
                return { action: 'switch_template', needName: true };
            }
        }
        
        // 分析指令
        if (input.includes('分析') || input.includes('解析') || input === '分析简历') {
            return { action: 'analyze' };
        }
        
        // 匹配指令
        if (input.includes('匹配') || input.includes('岗位匹配') || input.includes('对比')) {
            return { action: 'match' };
        }
        
        // ========== 优化指令 ==========
        if (input.includes('优化') || input.includes('改写') || input.includes('修改') || input.includes('润色') ||
            input.includes('再次优化') || input.includes('再优化') || input.includes('重新优化') ||
            input.includes('换个方向') || input.includes('不同角度') || input.includes('重新生成')) {
            
            let direction = '';
            let shouldUseMatchContext = false;
            
            // 检测是否要求结合岗位匹配
            if (input.includes('结合岗位') || input.includes('根据岗位') || 
                input.includes('针对岗位') || input.includes('匹配结果') ||
                input.includes('结合JD') || input.includes('根据JD') ||
                input.includes('结合职位') || input.includes('根据职位')) {
                shouldUseMatchContext = true;
                direction = '根据岗位匹配结果优化';
                console.log('[Agent] 检测到要求结合岗位匹配结果进行优化');
            }
            
            // 检测是否有具体方向
            try {
                const tuchuMatch = userInput.match(/突出([^，,。]+)/);
                if (tuchuMatch) direction = `突出${tuchuMatch[1]}`;
                
                const qiangdiaoMatch = userInput.match(/强调([^，,。]+)/);
                if (qiangdiaoMatch) direction = `强调${qiangdiaoMatch[1]}`;
                
                const ruohuaMatch = userInput.match(/弱化([^，,。]+)/);
                if (ruohuaMatch) direction = `弱化${ruohuaMatch[1]}`;
                
                const zengjiaMatch = userInput.match(/增加([^，,。]+)/);
                if (zengjiaMatch) direction = `增加${zengjiaMatch[1]}`;
                
                const zhenduiMatch = userInput.match(/针对([^，,。]+)/);
                if (zhenduiMatch) direction = `针对${zhenduiMatch[1]}优化`;
            } catch (e) {
                console.warn('提取优化方向失败:', e);
            }
            
            console.log('[Agent] 识别为优化指令, 方向:', direction, '结合岗位匹配:', shouldUseMatchContext);
            return { action: 'optimize', direction: direction, useMatchContext: shouldUseMatchContext };
        }
        // ===========================================
        
        // 报告指令
        if (input === '完成' || input === '生成报告' || input === '导出报告') {
            return { action: 'report' };
        }
        
        // 继续指令
        if (input === '继续' || input === '下一步') {
            return { action: 'continue' };
        }
        
        // 默认：自定义请求
        return { action: 'custom' };
    }

    // ========== 辅助方法 ==========

    /**
     * HTML转义
     */
    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 格式化分析内容
     */
    _formatAnalysisContent(content) {
        if (!content) return '暂无内容';
        return String(content)
            .replace(/^#+\s+/gm, '')
            .replace(/\*\*/g, '')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }

    /**
     * 生成综合建议
     */
    _generateRecommendations() {
        const hasAnalysis = !!this.session.analysisResults.resumeAnalysis;
        const hasMatch = !!this.session.analysisResults.jobMatch;
        const hasOptimization = !!this.session.analysisResults.optimization;
        const optimizationCount = this.session.optimizationCount || 0;
        
        let recommendations = '';
        
        if (hasAnalysis && hasMatch) {
            recommendations += '根据您的简历分析和岗位匹配结果，您的整体竞争力处于良好水平。';
        } else if (hasAnalysis) {
            recommendations += '您的简历整体结构清晰，建议进一步突出量化成果和核心技能。';
        } else {
            recommendations += '建议完善简历内容，突出工作成果和技能优势。';
        }
        
        if (hasOptimization) {
            if (optimizationCount > 1) {
                recommendations += ` 经过${optimizationCount}次优化，您的简历已得到多角度改进。请参考上方的优化建议，选择最适合的方向进行调整。`;
            } else {
                recommendations += ' 请参考上方的优化建议，有针对性地调整简历内容。';
            }
        }
        
        recommendations += ' 祝您求职顺利！';
        
        return recommendations;
    }

    /**
     * 生成摘要
     */
    _generateSummary() {
        const hasAnalysis = !!this.session.analysisResults.resumeAnalysis;
        const hasMatch = !!this.session.analysisResults.jobMatch;
        const hasOptimization = !!this.session.analysisResults.optimization;
        const optimizationCount = this.session.optimizationCount || 0;
        
        let summary = `【分析目标】${this.session.goal}\n`;
        if (hasAnalysis) summary += `【简历分析】已完成\n`;
        if (hasMatch) summary += `【岗位匹配】已完成\n`;
        if (hasOptimization) summary += `【优化建议】已生成${optimizationCount > 1 ? `（${optimizationCount}次）` : ''}\n`;
        summary += `\n报告已包含完整的分析内容和建议。`;
        
        return summary;
    }
}

// 创建全局实例
window.agentOrchestrator = new AgentOrchestrator();
console.log('[Agent] 编排器已加载 v4.2');