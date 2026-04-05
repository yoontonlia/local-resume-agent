/**
 * 大模型服务 - 统一接口
 * 支持 DeepSeek、OpenAI 及兼容接口
 */

class LLMService {
    constructor() {
        this.config = null;
        this.isReady = false;
    }

    /**
     * 初始化/更新配置
     */
    async init() {
        try {
            const result = await chrome.storage.local.get(['llmConfig']);
            if (result.llmConfig) {
                this.config = result.llmConfig;
                this.isReady = true;
                console.log('LLM服务已配置:', this.config.provider);
                return true;
            } else {
                console.log('LLM服务未配置');
                this.isReady = false;
                return false;
            }
        } catch (error) {
            console.error('加载LLM配置失败:', error);
            this.isReady = false;
            return false;
        }
    }

    /**
     * 保存配置
     */
    async saveConfig(config) {
        this.config = config;
        this.isReady = true;
        await chrome.storage.local.set({ llmConfig: config });
        console.log('LLM配置已保存:', config.provider);
    }

    /**
     * 检查是否已配置
     */
    isConfigured() {
        return this.isReady && this.config && this.config.apiKey;
    }

    /**
     * 获取当前配置
     */
    getConfig() {
        return this.config;
    }

    /**
     * 调用大模型
     * @param {string} prompt - 用户提示词
     * @param {Object} options - 可选参数
     * @returns {Promise<string>}
     */
    async prompt(prompt, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('请先在设置中配置API Key');
        }

        const messages = [];
        
        // 添加系统提示词
        if (options.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt
            });
        }
        
        // 添加用户提示词
        messages.push({
            role: 'user',
            content: prompt
        });

        return await this._callAPI(messages, options);
    }

    /**
     * 多轮对话
     * @param {Array} messages - 消息历史
     * @returns {Promise<string>}
     */
    async chat(messages) {
        if (!this.isConfigured()) {
            throw new Error('请先在设置中配置API Key');
        }
        return await this._callAPI(messages);
    }

    /**
     * 调用API
     */
    async _callAPI(messages, options = {}) {
        const provider = this.config.provider;
        
        if (provider === 'deepseek') {
            return await this._callDeepSeek(messages, options);
        } else if (provider === 'openai') {
            return await this._callOpenAI(messages, options);
        } else if (provider === 'custom') {
            return await this._callCustom(messages, options);
        } else {
            throw new Error(`不支持的模型提供商: ${provider}`);
        }
    }

    /**
     * DeepSeek API 调用
     */
    async _callDeepSeek(messages, options) {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model || 'deepseek-chat',
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4096
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`DeepSeek API错误: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * OpenAI API 调用
     */
    async _callOpenAI(messages, options) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model || 'gpt-3.5-turbo',
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4096
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API错误: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * 自定义兼容接口（OpenAI兼容格式）
     */
    async _callCustom(messages, options) {
        const response = await fetch(this.config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model || 'default',
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4096
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`自定义API错误: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * 测试连接
     */
    async testConnection() {
        if (!this.isConfigured()) {
            return { success: false, message: '请先配置API Key' };
        }

        try {
            const result = await this.prompt('请回复"连接成功"', { maxTokens: 50 });
            if (result.includes('连接成功')) {
                return { success: true, message: '连接成功' };
            } else {
                return { success: true, message: 'API正常响应' };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// 创建全局实例
window.llmService = new LLMService();