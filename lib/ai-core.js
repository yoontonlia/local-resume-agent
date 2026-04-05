/**
 * AI核心模块 - 支持LLM API和Chrome本地AI双模式
 */

class AICore {
    constructor() {
        this.mode = 'llm';  // 'llm' 或 'local'
        this.isReady = false;
        this._useMock = false;
    }

    /**
     * 初始化
     */
    async init() {
        // 优先使用LLM模式
        const llmConfigured = await window.llmService.init();
        
        if (llmConfigured) {
            this.mode = 'llm';
            this.isReady = true;
            this._useMock = false;
            console.log('✅ 使用LLM API模式');
            return true;
        }
        
        // 降级：尝试Chrome本地AI
        const localAvailable = await this._tryLocalAI();
        if (localAvailable) {
            this.mode = 'local';
            this.isReady = true;
            this._useMock = false;
            console.log('✅ 使用Chrome本地AI模式');
            return true;
        }
        
        // 最终降级：模拟模式
        this.mode = 'mock';
        this.isReady = true;
        this._useMock = true;
        console.log('⚠️ 使用模拟模式（请配置API Key或Chrome本地AI）');
        return true;
    }

    /**
     * 尝试Chrome本地AI
     */
    async _tryLocalAI() {
        try {
            if (window.ai && window.ai.languageModel) {
                const caps = await window.ai.languageModel.capabilities();
                if (caps.available === 'readily') {
                    this.localSession = await window.ai.languageModel.create({
                        temperature: 0.7,
                        topK: 40
                    });
                    return true;
                }
            }
        } catch (e) {
            console.log('Chrome本地AI不可用:', e.message);
        }
        return false;
    }

    /**
     * 调用AI
     */
    async prompt(prompt, options = {}) {
        if (!this.isReady) {
            throw new Error('AI模型未就绪');
        }
        
        // LLM模式
        if (this.mode === 'llm' && window.llmService.isConfigured()) {
            return await window.llmService.prompt(prompt, options);
        }
        
        // 本地AI模式
        if (this.mode === 'local' && this.localSession) {
            let fullPrompt = prompt;
            if (options.systemPrompt) {
                fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
            }
            return await this.localSession.prompt(fullPrompt);
        }
        
        // 模拟模式
        return this._mockResponse(prompt);
    }

    /**
     * 模拟回复
     */
    _mockResponse(prompt) {
        if (prompt.includes('简历') || prompt.includes('核心技能')) {
            return `【简历分析模拟结果】

📊 核心技能
• JavaScript/TypeScript - 5年经验
• React/Vue前端框架 - 4年经验
• Node.js后端开发 - 3年经验

💼 工作经历总结
最近任职于某科技公司前端负责人，主导了3个大型项目重构。

📈 综合评分: 8.2/10

---
🔧 请配置API Key获取真实分析`;
        }
        
        return `[模拟回复] 收到请求: "${prompt.substring(0, 100)}..."

请点击右上角设置图标配置API Key。`;
    }

    /**
     * 切换到LLM模式
     */
    async switchToLLM() {
        const configured = await window.llmService.init();
        if (configured) {
            this.mode = 'llm';
            this.isReady = true;
            console.log('已切换到LLM模式');
            return true;
        }
        return false;
    }

    isMockMode() {
        return this.mode === 'mock';
    }

    getMode() {
        return this.mode;
    }

    destroy() {
        if (this.localSession) {
            this.localSession.destroy();
            this.localSession = null;
        }
    }
}

window.aiCore = new AICore();