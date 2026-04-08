/**
 * Agent记忆系统 v2.0 - 短期记忆 + 长期记忆 + 语义检索
 */

class AgentMemory {
    constructor() {
        this.shortTerm = [];      // 短期记忆（当前会话）
        this.longTerm = [];       // 长期记忆（跨会话）
        this.userProfile = {};    // 用户画像
        this._initialized = false;
    }

    /**
     * 初始化记忆系统
     */
    async init() {
        try {
            // 加载长期记忆
            const result = await chrome.storage.local.get(['agentLongTermMemory', 'agentUserProfile']);
            if (result.agentLongTermMemory) {
                this.longTerm = result.agentLongTermMemory;
                console.log(`[Memory] 加载了 ${this.longTerm.length} 条长期记忆`);
            }
            if (result.agentUserProfile) {
                this.userProfile = result.agentUserProfile;
                console.log('[Memory] 加载了用户画像');
            }
            this._initialized = true;
        } catch (e) {
            console.error('加载记忆失败:', e);
            this._initialized = true;
        }
    }

    /**
     * 添加短期记忆
     */
    addShortTerm(role, content, type = 'conversation') {
        this.shortTerm.push({
            role,
            content,
            type,
            timestamp: Date.now()
        });
        
        // 限制短期记忆长度（保留最近50条）
        if (this.shortTerm.length > 50) {
            this.shortTerm = this.shortTerm.slice(-50);
        }
    }

    /**
     * 获取短期记忆（用于上下文构建）
     */
    getShortTermContext(limit = 10) {
        return this.shortTerm.slice(-limit);
    }

    /**
     * 获取格式化的短期记忆（用于提示词）
     */
    getFormattedShortTerm(limit = 10) {
        const recent = this.shortTerm.slice(-limit);
        return recent.map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n');
    }

    /**
     * 保存长期记忆
     */
    async saveLongTerm(content, category = 'conversation', importance = 'normal') {
        const memory = {
            id: Date.now(),
            content: content.substring(0, 500),
            category,  // preference, skill, goal, fact, conversation
            importance,
            timestamp: new Date().toISOString()
        };
        
        this.longTerm.push(memory);
        
        // 限制长期记忆数量（保留最近200条）
        if (this.longTerm.length > 200) {
            this.longTerm = this.longTerm.slice(-200);
        }
        
        await chrome.storage.local.set({ agentLongTermMemory: this.longTerm });
        console.log(`[Memory] 保存长期记忆 [${category}]: ${content.substring(0, 50)}...`);
    }

    /**
     * 更新用户画像
     */
    async updateUserProfile(key, value) {
        this.userProfile[key] = value;
        await chrome.storage.local.set({ agentUserProfile: this.userProfile });
        console.log(`[Memory] 更新用户画像: ${key} = ${value}`);
    }

    /**
     * 获取用户画像
     */
    getUserProfile() {
        return this.userProfile;
    }

    /**
     * 检索相关长期记忆（关键词匹配）
     */
    async retrieveRelevantMemories(query, limit = 5, category = null) {
        if (this.longTerm.length === 0) return [];
        
        const keywords = query.toLowerCase().split(/\s+/);
        let relevant = this.longTerm.filter(memory => {
            const content = memory.content.toLowerCase();
            const keywordMatch = keywords.some(kw => content.includes(kw));
            const categoryMatch = category ? memory.category === category : true;
            return keywordMatch && categoryMatch;
        });
        
        // 按重要性排序
        const importanceOrder = { high: 3, normal: 2, low: 1 };
        relevant.sort((a, b) => (importanceOrder[b.importance] || 0) - (importanceOrder[a.importance] || 0));
        
        return relevant.slice(0, limit);
    }

    /**
     * 检索格式化的长期记忆（用于提示词）
     */
    async getFormattedLongTerm(query, limit = 5) {
        const memories = await this.retrieveRelevantMemories(query, limit);
        if (memories.length === 0) return '';
        return memories.map(m => `- [${m.category}] ${m.content}`).join('\n');
    }

    /**
     * 从对话中提取可保存的记忆
     */
    async extractMemorableInfo(messages) {
        const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        
        const prompt = `从以下对话中提取需要长期记住的用户信息，输出JSON数组：

对话：
${conversation}

提取规则：
1. 用户提到的职业、技能、工作经验 → category: "skill"
2. 用户提到的职业目标、求职意向 → category: "goal"  
3. 用户提到的个人偏好、习惯 → category: "preference"
4. 用户提到的重要事实（如姓名、年龄、地点）→ category: "fact"

输出格式：[{"content": "记住的内容", "category": "skill/goal/preference/fact", "importance": "high/normal/low"}]
如果没有需要记住的，输出 []`;

        try {
            const result = await window.aiCore.prompt(prompt);
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const memories = JSON.parse(jsonMatch[0]);
                for (const memory of memories) {
                    await this.saveLongTerm(memory.content, memory.category, memory.importance || 'normal');
                    
                    // 更新用户画像
                    if (memory.category === 'skill') {
                        if (!this.userProfile.skills) this.userProfile.skills = [];
                        if (!this.userProfile.skills.includes(memory.content)) {
                            this.userProfile.skills.push(memory.content);
                        }
                    } else if (memory.category === 'goal') {
                        this.userProfile.goal = memory.content;
                    }
                }
                await chrome.storage.local.set({ agentUserProfile: this.userProfile });
            }
        } catch (error) {
            console.error('提取记忆失败:', error);
        }
    }

    /**
     * 清空短期记忆
     */
    clearShortTerm() {
        this.shortTerm = [];
    }

    /**
     * 清空长期记忆
     */
    async clearLongTerm() {
        this.longTerm = [];
        this.userProfile = {};
        await chrome.storage.local.remove(['agentLongTermMemory', 'agentUserProfile']);
        console.log('[Memory] 已清空所有长期记忆');
    }

    /**
     * 获取记忆统计
     */
    getStats() {
        return {
            shortTermCount: this.shortTerm.length,
            longTermCount: this.longTerm.length,
            profileKeys: Object.keys(this.userProfile).length,
            categories: {
                skill: this.longTerm.filter(m => m.category === 'skill').length,
                goal: this.longTerm.filter(m => m.category === 'goal').length,
                preference: this.longTerm.filter(m => m.category === 'preference').length,
                fact: this.longTerm.filter(m => m.category === 'fact').length
            }
        };
    }
}

window.agentMemory = new AgentMemory();