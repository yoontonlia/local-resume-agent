/**
 * Agent规划器 v2.0 - 任务分解和决策优化
 */

class AgentPlanner {
    constructor() {
        this.plans = [];
        this.executionHistory = [];
    }

    /**
     * 根据用户目标生成执行计划
     */
    async generatePlan(goal, collectedData, userProfile = {}) {
        const hasResume = !!collectedData.resumeText;
        const hasJobDesc = !!collectedData.jobDescription;
        
        const prompt = `你是一个任务规划专家。用户目标：${goal}

【已有信息】
- 简历: ${hasResume ? '已上传' : '未上传'}
- 职位描述: ${hasJobDesc ? '已提供' : '未提供'}
- 用户画像: ${JSON.stringify(userProfile)}

【可用技能】
- resume-analyzer: 分析简历内容，提取技能、工作经历
- job-matcher: 对比简历与职位描述，计算匹配度
- resume-optimizer: 生成简历优化建议

【任务分解规则】
1. 如果没有简历，第一步必须是询问/引导上传简历
2. 如果有简历但没有分析，第二步调用 resume-analyzer
3. 如果有职位描述，第三步调用 job-matcher
4. 最后调用 resume-optimizer 生成建议
5. 每个步骤完成后询问用户是否继续

请输出JSON格式的计划：
{
    "steps": [
        {"order": 1, "action": "ask", "question": "要问的问题", "condition": "执行条件"},
        {"order": 2, "action": "call_skill", "skill": "skill_name", "params": {}}
    ],
    "estimatedSteps": 3,
    "explanation": "计划说明"
}`;

        try {
            const result = await window.aiCore.prompt(prompt);
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const plan = JSON.parse(jsonMatch[0]);
                this.plans = plan.steps || [];
                console.log('[Planner] 生成计划:', plan.explanation);
                return plan;
            }
        } catch (error) {
            console.error('生成计划失败:', error);
        }
        
        // 默认计划
        const steps = [];
        if (!hasResume) {
            steps.push({ order: 1, action: 'ask', question: '请上传您的简历文件（PDF格式），或者直接粘贴简历内容。' });
        }
        steps.push({ order: steps.length + 1, action: 'call_skill', skill: 'resume-analyzer' });
        steps.push({ order: steps.length + 1, action: 'ask', question: '是否需要进行岗位匹配分析？如需，请粘贴职位描述。' });
        
        this.plans = steps;
        return { steps, estimatedSteps: steps.length, explanation: '默认计划' };
    }

    /**
     * 获取下一步行动
     */
    getNextAction() {
        if (this.plans.length === 0) return null;
        const next = this.plans[0];
        
        // 检查条件
        if (next.condition && !this._evaluateCondition(next.condition)) {
            this.plans.shift();
            return this.getNextAction();
        }
        
        return next;
    }

    /**
     * 标记当前步骤完成
     */
    completeCurrentStep() {
        if (this.plans.length > 0) {
            const completed = this.plans.shift();
            this.executionHistory.push({
                ...completed,
                completedAt: Date.now()
            });
            console.log('[Planner] 步骤完成:', completed.action);
        }
    }

    /**
     * 根据执行结果调整计划
     */
    async adjustPlan(result, context = {}) {
        const prompt = `根据执行结果调整计划：

当前计划：${JSON.stringify(this.plans)}
执行结果：${result}
上下文：${JSON.stringify(context)}

如果需要调整，输出新的步骤列表；如果不需要，输出 {"adjusted": false}`;

        try {
            const response = await window.aiCore.prompt(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const adjustment = JSON.parse(jsonMatch[0]);
                if (adjustment.steps && adjustment.steps.length > 0) {
                    this.plans = adjustment.steps;
                    console.log('[Planner] 计划已调整');
                }
            }
        } catch (error) {
            console.error('调整计划失败:', error);
        }
    }

    /**
     * 评估条件
     */
    _evaluateCondition(condition) {
        // 简单条件评估
        if (condition === 'has_resume') {
            return !!window.currentResumeText;
        }
        if (condition === 'has_job') {
            const jobDesc = document.getElementById('jobDescription');
            return jobDesc && jobDesc.value.trim().length > 50;
        }
        return true;
    }

    /**
     * 获取计划摘要
     */
    getPlanSummary() {
        if (this.plans.length === 0) return '无计划';
        return this.plans.map(p => `${p.order}. ${p.action}${p.skill ? ` (${p.skill})` : ''}`).join(' → ');
    }

    /**
     * 重置规划器
     */
    reset() {
        this.plans = [];
        this.executionHistory = [];
    }

    /**
     * 获取执行历史
     */
    getHistory() {
        return this.executionHistory;
    }
}

window.agentPlanner = new AgentPlanner();