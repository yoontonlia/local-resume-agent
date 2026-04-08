/**
 * AI智能体编排器 v3.0 - 完整优化版
 * 功能：多轮对话引导、自主规划任务、调用技能、生成报告
 * 支持：模板切换、自然语言理解、自定义请求、记忆系统
 * 优化：多次优化建议、结合岗位匹配结果、指定优化方向
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
                description: '分析简历内容，提取技能、工作经历、教育背景，给出综合评分'
            },
            'job-matcher': {
                name: '岗位匹配分析',
                description: '对比简历与职位描述，计算匹配度，分析差距'
            },
            'resume-optimizer': {
                name: '简历优化建议',
                description: '基于分析结果生成简历优化建议'
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
        
        // 处理自定义请求
        if (intent.action === 'custom' || intent.action === 'custom_optimize') {
            return await this._handleCustomRequest(userInput, intent);
        }
        
        // 处理帮助
        if (intent.action === 'help') {
            return this._getHelpMessage();
        }
        
        // 执行明确的指令
        if (intent.action === 'analyze' && !this.session.analysisResults.resumeAnalysis) {
            if (!this.session.collectedData.resumeText && !window.currentResumeText) {
                return "请先上传简历文件，或粘贴简历内容。";
            }
            return await this._callSkill('resume-analyzer');
        }
        
        if (intent.action === 'match' && !this.session.analysisResults.jobMatch) {
            if (!this.session.collectedData.jobDescription) {
                return "请粘贴职位描述（JD）到岗位匹配页面的输入框，然后说'继续'。";
            }
            return await this._callSkill('job-matcher');
        }
        
        // 优化指令 - 支持多次优化和结合岗位匹配
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
        
        // 提取信息
        await this._extractInfo(userInput);
        
        // 检查是否有职位描述
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
     * 思考：决定下一步行动
     */
    async _think() {
        const hasResume = !!this.session.collectedData.resumeText;
        
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
                        
                        const fullResult = analysis.result;
                        const displayResult = fullResult.length > 1500 ? fullResult.substring(0, 1500) + '...' : fullResult;
                        
                        return `✅ 简历分析完成！${templateInfo}\n\n${displayResult}\n\n📌 完整内容已保存到历史记录中。\n\n${this._getNextStepPrompt()}`;
                    } else {
                        return `❌ 分析失败：${analysis?.error || '未知错误'}`;
                    }
                } catch (error) {
                    console.error('简历分析错误:', error);
                    return `❌ 分析出错：${error.message}`;
                }
                
            case 'job-matcher':
                if (!resumeText || resumeText.length < 50) {
                    return `请先上传简历并完成分析。`;
                }
                
                let jobDescription = this.session.collectedData.jobDescription;
                if (!jobDescription) {
                    const jobDescElement = document.getElementById('jobDescription');
                    if (jobDescElement && jobDescElement.value.trim().length > 50) {
                        jobDescription = jobDescElement.value.trim();
                        this.session.collectedData.jobDescription = jobDescription;
                    }
                }
                
                if (!jobDescription || jobDescription.length < 50) {
                    return `请粘贴职位描述（JD）到岗位匹配页面的输入框，然后说"继续"。`;
                }
                
                if (!window.jobMatcher) {
                    return `❌ 岗位匹配模块未加载，请刷新页面重试。`;
                }
                
                try {
                    this._addMessage('system', '🎯 正在进行岗位匹配分析...');
                    
                    const match = await window.jobMatcher.match(resumeText, jobDescription);
                    
                    if (match && match.success) {
                        this.session.analysisResults.jobMatch = match.result;
                        this.session.stage = 'matching';
                        console.log('[Agent] 岗位匹配完成，结果已保存');
                        
                        const summary = match.result.substring(0, 600);
                        return `✅ 岗位匹配分析完成！${templateInfo}\n\n${summary}${match.result.length > 600 ? '...' : ''}\n\n${this._getNextStepPrompt()}`;
                    } else {
                        return `❌ 匹配失败：${match?.error || '未知错误'}`;
                    }
                } catch (error) {
                    console.error('匹配错误:', error);
                    return `❌ 匹配出错：${error.message}`;
                }
                
            // 优化建议 - 支持结合岗位匹配结果
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
                    (optimizationDirection && (optimizationDirection.includes('岗位匹配') || optimizationDirection.includes('结合')));
                
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
                        enhancedContext = `\n\n【重要】用户要求结合岗位匹配结果进行优化。\n\n【岗位匹配分析结果】\n${matchResult.substring(0, 2000)}\n\n请仔细分析以上岗位匹配结果，找出简历与目标岗位的差距，针对性地优化简历内容，提高匹配度。`;
                    } else if (matchResult) {
                        enhancedContext = `\n\n【岗位匹配分析结果参考】\n${matchResult.substring(0, 1500)}\n\n请参考以上匹配结果，有针对性地优化简历。`;
                    } else if (jobDescriptionText) {
                        enhancedContext = `\n\n【目标职位描述】\n${jobDescriptionText.substring(0, 1500)}\n\n请针对这个职位优化简历。`;
                    }
                    
                    // 如果是多次优化，添加提示
                    let optimizationHint = '';
                    if (optimizationCount > 1) {
                        optimizationHint = `\n\n这是第 ${optimizationCount} 次优化请求。用户可能对之前的优化结果不满意，请尝试不同的优化方向或提供更具体、更有针对性的建议。`;
                    }
                    
                    // 如果有具体方向，添加到提示中
                    if (optimizationDirection && !optimizationDirection.includes('岗位匹配') && !optimizationDirection.includes('结合')) {
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
                        
                        const summary = optimization.suggestions.substring(0, 800);
                        const hasMatchContext = (shouldUseMatchContext && matchResult) ? '（已结合岗位匹配结果）' : 
                                                (matchResult ? '（已参考岗位匹配结果）' : '');
                        
                        let nextPrompt = '';
                        if (optimizationCount === 1) {
                            nextPrompt = `\n\n📌 说"再次优化"可以生成不同方向的优化建议，说"完成"生成报告。`;
                        } else {
                            nextPrompt = `\n\n📌 第${optimizationCount}次优化完成。说"再次优化"继续优化，说"完成"生成报告。`;
                        }
                        
                        return `✅ 第${optimizationCount}次优化建议已生成${hasMatchContext}！\n\n${summary}${optimization.suggestions.length > 800 ? '...' : ''}${nextPrompt}`;
                    } else {
                        return `❌ 优化失败：${optimization?.error || '未知错误'}`;
                    }
                } catch (error) {
                    console.error('优化错误:', error);
                    return `❌ 优化出错：${error.message}`;
                }
                
            default:
                return `技能 ${skillName} 暂不可用。`;
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
- 说"继续"进行岗位匹配分析
- 粘贴职位描述（JD）后说"匹配"`;
        }
        if (!hasOptimization) {
            return `\n📌 下一步：您可以：
- 说"优化"生成简历优化建议
- 说"结合岗位匹配优化"生成针对性建议
- 说"再次优化"生成不同方向的建议
- 说"完成"生成最终报告`;
        }
        return `\n📌 下一步：说"再次优化"继续优化，或说"完成"生成报告。`;
    }

    /**
     * 处理自定义请求
     */
    async _handleCustomRequest(userInput, intent) {
        // 检查是否包含优化相关的关键词
        if (userInput.includes('优化') || userInput.includes('改写') || userInput.includes('修改')) {
            return await this._callSkill('resume-optimizer', { direction: userInput });
        }
        
        const prompt = `用户说："${userInput}"

当前已完成：
- 简历分析：${!!this.session.analysisResults.resumeAnalysis}
- 岗位匹配：${!!this.session.analysisResults.jobMatch}
- 优化建议：${!!this.session.analysisResults.optimization}

请理解用户的真实需求，并给出友好、有帮助的回应。`;

        try {
            const response = await window.aiCore.prompt(prompt);
            return response;
        } catch (error) {
            return `我理解您想要：${intent.description || userInput}\n\n请告诉我更具体的方向，我会尽力帮您实现。`;
        }
    }

    /**
     * 获取帮助信息
     */
    _getHelpMessage() {
        return `📖 我可以帮您做这些事情：

1️⃣ **分析简历**：说"分析"或"帮我分析这份简历"
2️⃣ **岗位匹配**：说"匹配"并粘贴职位描述
3️⃣ **简历优化**：说"优化"或"帮我改一下简历"
4️⃣ **结合岗位匹配优化**：说"结合岗位匹配优化简历"
5️⃣ **多次优化**：说"再次优化"或"换个角度优化"
6️⃣ **指定方向优化**：直接说出需求，如"突出管理经验"、"针对技术岗位"
7️⃣ **模板管理**：说"有哪些模板"、"使用XX模板"、"当前模板"
8️⃣ **生成报告**：说"完成"或"生成报告"

💡 您不需要按固定顺序，直接说出您的需求即可！`;
    }

    /**
     * 提取用户信息
     */
    async _extractInfo(userInput) {
        if (userInput.length > 10) {
            this.session.collectedData.lastInput = userInput;
        }
    }

    /**
     * 从分析结果中提取关键信息
     */
    async _extractKeyInfo(analysisResult) {
        try {
            if (analysisResult.includes('技能')) {
                // 简单提取，不做复杂处理
                console.log('[Agent] 已提取关键信息');
            }
        } catch(e) {
            console.error('提取关键信息失败:', e);
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
- "结合岗位匹配优化" - 根据JD针对性优化
- "再次优化" - 生成不同方向的建议
- "匹配" - 进行岗位匹配（需提供JD）
- "有哪些模板" - 查看可用模板`;
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
        
        console.log(`[Agent] 查找模板: "${cleanName}"`);
        
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
        
        // ========== 1. 最高优先级：优化指令 ==========
        if (input.includes('优化') || input.includes('改写') || input.includes('修改') || input.includes('润色') ||
            input.includes('改进') || input.includes('提升') || input.includes('调整') ||
            input.includes('再次优化') || input.includes('再优化') || input.includes('重新优化') ||
            input.includes('换个方向') || input.includes('不同角度') || input.includes('重新生成')) {
            
            let direction = '';
            let shouldUseMatchContext = false;
            
            // 检测是否要求结合岗位匹配
            if (input.includes('结合岗位匹配') || input.includes('根据岗位匹配') || 
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
        
        // ========== 2. 模板相关指令 ==========
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
        // ===================================
        
        // ========== 3. 帮助指令 ==========
        if (input.includes('帮助') || input.includes('help') || input.includes('怎么用') || input.includes('功能')) {
            return { action: 'help' };
        }
        // ================================
        
        // ========== 4. 分析指令 ==========
        if (input.includes('分析') || input.includes('解析') || input.includes('评估')) {
            if (input.includes('岗位') || input.includes('职位') || input.includes('JD')) {
                return { action: 'match', target: 'job' };
            }
            return { action: 'analyze' };
        }
        // ================================
        
        // ========== 5. 匹配指令 ==========
        if (input.includes('匹配') || input.includes('对比') || input.includes('JD') || input.includes('职位描述')) {
            return { action: 'match' };
        }
        // ================================
        
        // ========== 6. 报告指令 ==========
        if (input === '完成' || input === '生成报告' || input === '导出报告' || 
            input.includes('生成报告') || input.includes('导出报告')) {
            return { action: 'report' };
        }
        // ================================
        
        // ========== 7. 继续指令 ==========
        if (input.includes('继续') || input.includes('下一步')) {
            console.log('[Agent] 继续指令 - 当前状态:', {
                hasAnalysis: !!this.session.analysisResults.resumeAnalysis,
                hasMatch: !!this.session.analysisResults.jobMatch,
                hasJobDesc: !!this.session.collectedData.jobDescription,
                hasOptimization: !!this.session.analysisResults.optimization
            });
            
            if (!this.session.analysisResults.resumeAnalysis) {
                return { action: 'analyze' };
            }
            if (this.session.collectedData.jobDescription && !this.session.analysisResults.jobMatch) {
                return { action: 'match' };
            }
            if (!this.session.analysisResults.optimization) {
                return { action: 'optimize' };
            }
            return { action: 'report' };
        }
        // ================================
        
        // ========== 8. 自然语言理解 ==========
        const intentPrompt = `分析用户输入，判断用户想要做什么。输出JSON格式。

用户输入：${userInput}

当前状态：
- 是否已分析简历：${!!this.session.analysisResults.resumeAnalysis}
- 是否已岗位匹配：${!!this.session.analysisResults.jobMatch}
- 是否已生成优化：${!!this.session.analysisResults.optimization}

可选动作：
- optimize: 用户想要优化简历、修改内容、改进表达
- analyze: 用户想要分析简历
- match: 用户想要进行岗位匹配
- report: 用户明确要生成报告
- help: 用户需要帮助

输出格式：{"action": "动作", "description": "用户想要什么"}`;

        try {
            const result = await window.aiCore.prompt(intentPrompt);
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const intent = JSON.parse(jsonMatch[0]);
                console.log('[Agent] AI识别意图:', intent);
                return intent;
            }
        } catch (error) {
            console.error('意图识别失败:', error);
        }
        // ===================================
        
        return { action: 'help', description: '无法理解用户意图' };
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
console.log('[Agent] 编排器已加载 v3.0');