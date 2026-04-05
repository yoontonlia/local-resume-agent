/**
 * 模板管理器 v2.0
 * 功能：管理简历分析模板，支持系统内置模板和用户自定义模板
 * 存储：使用 chrome.storage.local 保存用户模板和当前选择
 */

class TemplateManager {
    constructor() {
        // 系统内置模板（不可删除、不可编辑）
        this.builtInTemplates = [
            {
                id: 'basic',
                name: '快速分析',
                icon: '⚡',
                isBuiltIn: true,
                editable: false,
                deletable: false,
                description: '快速提取核心技能和综合评分',
                systemPrompt: '你是专业的简历分析专家，输出要简洁、准确、结构化。',
                userPromptTemplate: `## 📊 核心技能
（列出3-5项最突出的技能）

## 💼 当前职位
（最近的职位名称和所在行业）

## 📈 综合评分
（满分10分，基于技能匹配度和经验深度）

【简历内容】
{resumeText}`
            },
            {
                id: 'detailed',
                name: '深度分析',
                icon: '🔍',
                isBuiltIn: true,
                editable: false,
                deletable: false,
                description: '全面分析技能、经历、优势、待提升领域',
                systemPrompt: '你是资深招聘专家，擅长从简历中发现亮点和潜力。输出要结构化、专业、有洞察。',
                userPromptTemplate: `## 📊 核心技能矩阵
| 技能类别 | 具体技能 | 熟练度评估 |
|----------|----------|------------|
| 技术技能 | xxx | 高/中/初 |
| 软技能 | xxx | 高/中/初 |

## 💼 工作经历分析
**最近经历**：
- 公司/职位：
- 核心职责：
- 主要成就：

**职业发展轨迹**：
（分析职业路径的合理性和上升趋势）

## 🎯 优势亮点
1. （具体优势）
2. （具体优势）
3. （具体优势）

## ⚠️ 待提升领域
1. （可改进的方向）
2. （可改进的方向）

## 📈 综合评估
| 维度 | 评分(1-10) | 说明 |
|------|-------------|------|
| 技术能力 | X/10 | 简要说明 |
| 项目经验 | X/10 | 简要说明 |
| 沟通协作 | X/10 | 简要说明 |
| 发展潜力 | X/10 | 简要说明 |

**总分：X/10**

## 💡 求职建议
（适合的职位类型、行业方向）

【简历内容】
{resumeText}`
            },
            {
                id: 'interview',
                name: '面试准备',
                icon: '🎤',
                isBuiltIn: true,
                editable: false,
                deletable: false,
                description: '生成面试问题和准备指南',
                systemPrompt: '你是有经验的面试官，擅长设计有针对性的面试问题。问题要具体、有深度。',
                userPromptTemplate: `## 📋 候选人画像
（一句话总结候选人的核心特点）

## 🔍 必须追问的领域
1. **领域名称**：（为什么需要追问）
2. **领域名称**：（为什么需要追问）

## ❓ 推荐面试问题

### 技术能力类
1. （具体问题）
2. （具体问题）
3. （具体问题）

### 项目经验类
1. （具体问题）
2. （具体问题）

### 行为问题类
1. （具体问题）
2. （具体问题）

## ⭐ 考察重点
（面试时需要特别关注的2-3个要点）

【简历内容】
{resumeText}`
            }
        ];
        
        this.userTemplates = [];      // 用户自定义模板
        this.currentTemplateId = 'detailed';  // 当前选中的模板ID
    }

    /**
     * 初始化：从存储加载用户模板和当前选择
     */
    async init() {
        try {
            // 加载用户模板
            const result = await chrome.storage.local.get(['userTemplates', 'currentTemplateId']);
            
            if (result.userTemplates && Array.isArray(result.userTemplates)) {
                this.userTemplates = result.userTemplates;
                console.log(`📦 加载了 ${this.userTemplates.length} 个用户模板`);
            }
            
            if (result.currentTemplateId) {
                this.currentTemplateId = result.currentTemplateId;
                console.log(`🎯 当前模板: ${this.currentTemplateId}`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ 模板管理器初始化失败:', error);
            return false;
        }
    }

    /**
     * 获取所有模板（内置 + 用户）
     */
    getAllTemplates() {
        return [...this.builtInTemplates, ...this.userTemplates];
    }

    /**
     * 获取内置模板
     */
    getBuiltInTemplates() {
        return [...this.builtInTemplates];
    }

    /**
     * 获取用户模板
     */
    getUserTemplates() {
        return [...this.userTemplates];
    }

    /**
     * 获取当前使用的模板
     */
    getCurrentTemplate() {
        const all = this.getAllTemplates();
        const current = all.find(t => t.id === this.currentTemplateId);
        return current || all[0];
    }

    /**
     * 获取当前模板ID
     */
    getCurrentTemplateId() {
        return this.currentTemplateId;
    }

    /**
     * 获取模板详情
     * @param {string} templateId - 模板ID
     */
    getTemplate(templateId) {
        const all = this.getAllTemplates();
        return all.find(t => t.id === templateId);
    }

    /**
     * 设置当前模板
     * @param {string} templateId - 模板ID
     */
    async setCurrentTemplate(templateId) {
        const template = this.getTemplate(templateId);
        if (!template) {
            console.error(`❌ 模板不存在: ${templateId}`);
            return false;
        }
        
        this.currentTemplateId = templateId;
        await chrome.storage.local.set({ currentTemplateId: templateId });
        console.log(`✅ 当前模板已切换为: ${template.name}`);
        return true;
    }

    /**
     * 创建用户模板
     * @param {string} name - 模板名称
     * @param {string} description - 模板描述
     * @param {string} systemPrompt - 系统提示词
     * @param {string} userPromptTemplate - 用户提示词模板
     * @param {string} icon - 图标（emoji）
     */
    async createTemplate(name, description, systemPrompt, userPromptTemplate, icon = '📝') {
        // 验证必填字段
        if (!name || name.trim() === '') {
            throw new Error('模板名称不能为空');
        }
        if (!systemPrompt || systemPrompt.trim() === '') {
            throw new Error('系统提示词不能为空');
        }
        if (!userPromptTemplate || userPromptTemplate.trim() === '') {
            throw new Error('用户提示词模板不能为空');
        }
        
        // 检查名称是否重复
        const existing = this.getAllTemplates().find(t => t.name === name.trim());
        if (existing) {
            throw new Error(`模板名称 "${name}" 已存在`);
        }
        
        const newTemplate = {
            id: `user_${Date.now()}`,
            name: name.trim(),
            icon: icon,
            description: description || '',
            isBuiltIn: false,
            editable: true,
            deletable: true,
            systemPrompt: systemPrompt,
            userPromptTemplate: userPromptTemplate,
            createdAt: new Date().toISOString()
        };
        
        this.userTemplates.push(newTemplate);
        await this._saveUserTemplates();
        console.log(`✅ 创建模板成功: ${name}`);
        return newTemplate;
    }

    /**
     * 更新用户模板
     * @param {string} templateId - 模板ID
     * @param {object} updates - 更新的字段
     */
    async updateTemplate(templateId, updates) {
        const index = this.userTemplates.findIndex(t => t.id === templateId);
        if (index === -1) {
            throw new Error(`模板不存在: ${templateId}`);
        }
        
        // 不允许修改的字段
        delete updates.id;
        delete updates.isBuiltIn;
        delete updates.createdAt;
        
        this.userTemplates[index] = { ...this.userTemplates[index], ...updates };
        await this._saveUserTemplates();
        console.log(`✅ 更新模板成功: ${this.userTemplates[index].name}`);
        return true;
    }

    /**
     * 删除用户模板
     * @param {string} templateId - 模板ID
     */
    async deleteTemplate(templateId) {
        const template = this.userTemplates.find(t => t.id === templateId);
        if (!template) {
            throw new Error(`模板不存在: ${templateId}`);
        }
        
        this.userTemplates = this.userTemplates.filter(t => t.id !== templateId);
        await this._saveUserTemplates();
        
        // 如果删除的是当前模板，切换到默认模板（深度分析）
        if (this.currentTemplateId === templateId) {
            await this.setCurrentTemplate('detailed');
        }
        
        console.log(`✅ 删除模板成功: ${template.name}`);
        return true;
    }

    /**
     * 保存用户模板到存储
     */
    async _saveUserTemplates() {
        await chrome.storage.local.set({ userTemplates: this.userTemplates });
    }

    /**
     * 构建完整的分析提示词
     * @param {string} templateId - 模板ID
     * @param {string} resumeText - 简历文本
     */
    buildPrompt(templateId, resumeText) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`模板不存在: ${templateId}`);
        }
        
        // 替换模板中的变量 {resumeText}
        const userPrompt = template.userPromptTemplate.replace(/\{resumeText\}/g, resumeText);
        
        return {
            systemPrompt: template.systemPrompt,
            userPrompt: userPrompt
        };
    }

    /**
     * 导出模板为JSON（用于备份或分享）
     * @param {string} templateId - 模板ID
     */
    exportTemplate(templateId) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`模板不存在: ${templateId}`);
        }
        
        // 导出时排除内部字段
        return {
            name: template.name,
            icon: template.icon,
            description: template.description,
            systemPrompt: template.systemPrompt,
            userPromptTemplate: template.userPromptTemplate,
            exportVersion: '1.0',
            exportTime: new Date().toISOString()
        };
    }

    /**
     * 导入模板（从JSON文件）
     * @param {object} templateData - 模板数据
     */
    async importTemplate(templateData) {
        // 验证必要字段
        if (!templateData.name || !templateData.systemPrompt || !templateData.userPromptTemplate) {
            throw new Error('导入数据格式不正确：缺少必要字段');
        }
        
        // 检查名称是否重复
        const existing = this.getAllTemplates().find(t => t.name === templateData.name);
        if (existing) {
            throw new Error(`模板名称 "${templateData.name}" 已存在`);
        }
        
        const newTemplate = {
            id: `user_${Date.now()}`,
            name: templateData.name,
            icon: templateData.icon || '📥',
            description: templateData.description || '',
            isBuiltIn: false,
            editable: true,
            deletable: true,
            systemPrompt: templateData.systemPrompt,
            userPromptTemplate: templateData.userPromptTemplate,
            createdAt: new Date().toISOString()
        };
        
        this.userTemplates.push(newTemplate);
        await this._saveUserTemplates();
        console.log(`✅ 导入模板成功: ${newTemplate.name}`);
        return newTemplate;
    }

    /**
     * 重置所有用户模板（清空）
     */
    async resetUserTemplates() {
        this.userTemplates = [];
        await this._saveUserTemplates();
        await this.setCurrentTemplate('detailed');
        console.log('✅ 所有用户模板已清空');
    }

    /**
     * 获取模板统计信息
     */
    getStats() {
        return {
            builtInCount: this.builtInTemplates.length,
            userCount: this.userTemplates.length,
            totalCount: this.builtInTemplates.length + this.userTemplates.length,
            currentTemplateId: this.currentTemplateId
        };
    }
}

// 创建全局实例
window.templateManager = new TemplateManager();

// 自动初始化
window.templateManager.init().catch(console.error);