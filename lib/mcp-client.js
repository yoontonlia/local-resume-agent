/**
 * MCP客户端模块 - 支持Chrome DevTools MCP和HR Toolkit MCP
 * 功能：连接MCP服务器，调用MCP工具
 * 设计：如果MCP未配置或不可用，自动降级到基础功能
 */

class MCPClient {
    constructor() {
        this.config = null;
        this.isAvailable = false;
        this.isInitialized = false;
        this.serverStatus = {
            chromeDevTools: false,
            hrToolkit: false
        };
    }

    /**
     * 初始化MCP客户端
     */
    async init() {
        try {
            // 加载配置
            const result = await chrome.storage.local.get(['mcpConfig']);
            this.config = result.mcpConfig || { enabled: false };
            
            if (!this.config.enabled) {
                console.log('📌 MCP扩展未启用，使用基础功能');
                this.isAvailable = false;
                this.isInitialized = true;
                return false;
            }
            
            // 测试两个MCP服务器的连接
            await this._testAllConnections();
            
            this.isAvailable = this.serverStatus.chromeDevTools || this.serverStatus.hrToolkit;
            
            if (this.isAvailable) {
                console.log('✅ MCP扩展已启用', {
                    chromeDevTools: this.serverStatus.chromeDevTools,
                    hrToolkit: this.serverStatus.hrToolkit
                });
            } else {
                console.warn('⚠️ MCP已启用但所有服务器连接失败，使用基础功能');
            }
            
            this.isInitialized = true;
            return this.isAvailable;
            
        } catch (error) {
            console.error('MCP初始化失败:', error);
            this.isAvailable = false;
            this.isInitialized = true;
            return false;
        }
    }

    /**
     * 测试所有MCP服务器连接
     */
    async _testAllConnections() {
        // 测试Chrome DevTools MCP
        if (this.config.chromeMcpUrl) {
            this.serverStatus.chromeDevTools = await this._testConnection(this.config.chromeMcpUrl);
            console.log(`Chrome DevTools MCP: ${this.serverStatus.chromeDevTools ? '✅ 已连接' : '❌ 连接失败'}`);
        }
        
        // 测试HR Toolkit MCP
        if (this.config.hrMcpUrl) {
            this.serverStatus.hrToolkit = await this._testConnection(this.config.hrMcpUrl);
            console.log(`HR Toolkit MCP: ${this.serverStatus.hrToolkit ? '✅ 已连接' : '❌ 连接失败'}`);
        }
    }

    /**
     * 测试单个MCP服务器连接
     */
    async _testConnection(url) {
        if (!url) return false;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(url, { 
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok || response.status === 404; // 某些MCP服务器可能返回404但实际可用
        } catch (error) {
            console.log(`MCP连接测试失败 (${url}):`, error.message);
            return false;
        }
    }

    /**
     * 调用MCP工具（自动选择服务器）
     */
    async callTool(server, toolName, params) {
        if (!this.config?.enabled) {
            return null;
        }
        
        let endpoint = '';
        if (server === 'chrome-devtools') {
            if (!this.serverStatus.chromeDevTools) return null;
            endpoint = this.config.chromeMcpUrl;
        } else if (server === 'hr-toolkit') {
            if (!this.serverStatus.hrToolkit) return null;
            endpoint = this.config.hrMcpUrl;
        } else {
            return null;
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(`${endpoint}/tools/${toolName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`调用MCP工具失败 ${toolName}:`, error);
            return null;
        }
    }

    /**
     * 使用Chrome DevTools MCP增强网页提取
     */
    async enhancedWebExtract(url) {
        if (!this.config?.enabled || !this.serverStatus.chromeDevTools) {
            console.log('Chrome DevTools MCP不可用，使用基础提取');
            return null;
        }
        
        console.log('🔌 尝试使用Chrome DevTools MCP提取:', url);
        
        try {
            // 方法1：通过HTTP API获取页面快照
            const chromeUrl = this.config.chromeMcpUrl;
            
            // 尝试获取当前打开的页面列表
            const tabsResponse = await fetch(`${chromeUrl}/json/list`);
            if (tabsResponse.ok) {
                const tabs = await tabsResponse.json();
                const targetTab = tabs.find(tab => tab.url === url);
                
                if (targetTab && targetTab.webSocketDebuggerUrl) {
                    console.log('找到目标页面，可通过WebSocket连接');
                    // 这里可以建立WebSocket连接获取详细内容
                    // 简化版本：返回基本信息
                    return {
                        success: true,
                        title: targetTab.title,
                        url: targetTab.url,
                        description: `页面标题: ${targetTab.title}\nURL: ${targetTab.url}`,
                        method: 'chrome-devtools'
                    };
                }
            }
            
            // 方法2：如果找不到，返回提示
            return {
                success: false,
                error: '未找到目标页面，请确保Chrome以远程调试模式启动',
                tip: '启动命令: chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\\chrome-mcp-profile"'
            };
            
        } catch (error) {
            console.error('Chrome DevTools MCP提取失败:', error);
            return null;
        }
    }

    /**
     * 使用HR Toolkit解析简历
     */
    async parseResumeWithHRToolkit(file) {
        if (!this.config?.enabled || !this.serverStatus.hrToolkit) {
            console.log('HR Toolkit不可用，使用基础解析');
            return null;
        }
        
        try {
            const base64 = await this._fileToBase64(file);
            
            const result = await this.callTool('hr-toolkit', 'parse_resume', {
                file: base64,
                fileName: file.name
            });
            
            if (result) {
                console.log('HR Toolkit解析成功');
                return result;
            }
            return null;
        } catch (error) {
            console.warn('HR Toolkit解析失败:', error);
            return null;
        }
    }

    /**
     * 使用HR Toolkit提取结构化技能
     */
    async extractSkillsStructured(text) {
        if (!this.config?.enabled || !this.serverStatus.hrToolkit) {
            return null;
        }
        
        try {
            const result = await this.callTool('hr-toolkit', 'extract_skills_structured', {
                text: text.substring(0, 5000)
            });
            
            return result;
        } catch (error) {
            console.warn('技能提取失败:', error);
            return null;
        }
    }

    /**
     * 使用HR Toolkit计算匹配度
     */
    async computeMatchScore(resumeText, jobDescription) {
        if (!this.config?.enabled || !this.serverStatus.hrToolkit) {
            return null;
        }
        
        try {
            const result = await this.callTool('hr-toolkit', 'compute_similarity', {
                resumeText: resumeText.substring(0, 5000),
                jobDescription: jobDescription.substring(0, 3000)
            });
            
            return result;
        } catch (error) {
            console.warn('匹配计算失败:', error);
            return null;
        }
    }

    /**
     * 文件转base64
     */
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 获取MCP状态
     */
    getStatus() {
        return {
            enabled: this.config?.enabled || false,
            chromeDevTools: this.serverStatus.chromeDevTools,
            hrToolkit: this.serverStatus.hrToolkit,
            isAvailable: this.isAvailable
        };
    }
}

// 创建全局实例
window.mcpClient = new MCPClient();