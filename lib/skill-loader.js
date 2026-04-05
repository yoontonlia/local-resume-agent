/**
 * Skill加载器 v2.0
 * 实现动态Skills发现和加载，支持从文件、URL导入Skill
 * 与模板管理器同步
 */

class SkillLoader {
    constructor() {
        this.importedSkills = [];  // 已导入的Skill元数据
    }

    /**
     * 初始化：从存储加载已导入的Skills
     */
    async init() {
        try {
            const result = await chrome.storage.local.get(['importedSkills']);
            if (result.importedSkills && Array.isArray(result.importedSkills)) {
                this.importedSkills = result.importedSkills;
                console.log(`📦 SkillLoader: 加载了 ${this.importedSkills.length} 个已导入的Skill`);
            }
            return true;
        } catch (error) {
            console.error('❌ SkillLoader初始化失败:', error);
            return false;
        }
    }

    /**
     * 解析 SKILL.md 文件内容
     * @param {string} content - 文件内容
     * @param {string} fileName - 文件名（可选）
     * @returns {object} 解析后的Skill对象
     */
    parseSkillFile(content, fileName = '') {
        try {
            // 解析 YAML frontmatter (格式: ---\n...\n---)
            let frontmatter = {};
            let body = content;
            
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
            if (frontmatterMatch) {
                frontmatter = this._parseYaml(frontmatterMatch[1]);
                body = content.substring(frontmatterMatch[0].length);
            }
            
            // 验证必要字段
            if (!frontmatter.name) {
                throw new Error('SKILL.md 缺少 name 字段');
            }
            
            // 构建模板数据
            const skill = {
                name: frontmatter.name,
                icon: frontmatter.icon || '📦',
                description: frontmatter.description || `从 ${fileName || '文件'} 导入的Skill`,
                version: frontmatter.version || '1.0.0',
                author: frontmatter.author || '未知',
                tags: frontmatter.tags || [],
                systemPrompt: frontmatter.systemPrompt || '你是专业的简历分析专家。',
                userPromptTemplate: this._buildUserPromptTemplate(body),
                sourceFile: fileName,
                importedAt: new Date().toISOString()
            };
            
            return skill;
        } catch (error) {
            console.error('解析SKILL.md失败:', error);
            throw new Error(`解析失败: ${error.message}`);
        }
    }

    /**
     * 从文件导入Skill
     * @param {File} file - SKILL.md 文件
     * @returns {Promise<object>} 导入的Skill对象
     */
    async importSkillFromFile(file) {
        // 验证文件类型
        if (!file.name.endsWith('.md')) {
            throw new Error('请上传 .md 格式的文件');
        }
        
        // 读取文件内容
        const content = await this._readFileAsText(file);
        
        // 解析Skill
        const skill = this.parseSkillFile(content, file.name);
        
        // 检查是否已存在同名Skill
        const existing = this.importedSkills.find(s => s.name === skill.name);
        if (existing) {
            const confirm = window.confirm(`Skill "${skill.name}" 已存在，是否覆盖？`);
            if (!confirm) {
                throw new Error('用户取消导入');
            }
            // 删除旧的
            await this.deleteImportedSkill(skill.name);
        }
        
        // 保存到存储
        this.importedSkills.push(skill);
        await this._saveImportedSkills();
        
        // 同步到模板管理器
        await this._syncToTemplateManager(skill);
        
        console.log(`✅ 导入Skill成功: ${skill.name}`);
        return skill;
    }

    /**
     * 从URL导入Skill
     * @param {string} url - Skill文件的URL
     * @returns {Promise<object>} 导入的Skill对象
     */
    async importSkillFromUrl(url) {
        try {
            console.log('开始从URL导入:', url);
            
            // 获取远程文件内容
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            
            // 解析Skill
            const skill = this.parseSkillFile(content, url.split('/').pop());
            
            // 检查是否已存在
            const existing = this.importedSkills.find(s => s.name === skill.name);
            if (existing) {
                const confirm = window.confirm(`Skill "${skill.name}" 已存在，是否覆盖？`);
                if (!confirm) {
                    throw new Error('用户取消导入');
                }
                await this.deleteImportedSkill(skill.name);
            }
            
            // 保存
            this.importedSkills.push(skill);
            await this._saveImportedSkills();
            await this._syncToTemplateManager(skill);
            
            console.log(`✅ 从URL导入Skill成功: ${skill.name}`);
            return skill;
        } catch (error) {
            console.error('从URL导入失败:', error);
            throw new Error(`从URL导入失败: ${error.message}`);
        }
    }

    /**
     * 获取所有已导入的Skills
     */
    getImportedSkills() {
        return [...this.importedSkills];
    }

    /**
     * 删除已导入的Skill
     * @param {string} skillName - Skill名称
     */
    async deleteImportedSkill(skillName) {
        const index = this.importedSkills.findIndex(s => s.name === skillName);
        if (index === -1) return false;
        
        this.importedSkills.splice(index, 1);
        await this._saveImportedSkills();
        
        // 同步删除模板管理器中的模板
        if (window.templateManager) {
            const allTemplates = window.templateManager.getAllTemplates();
            const template = allTemplates.find(t => t.name === skillName && !t.isBuiltIn);
            if (template) {
                await window.templateManager.deleteTemplate(template.id);
            }
        }
        
        console.log(`✅ 删除Skill成功: ${skillName}`);
        return true;
    }

    /**
     * 导出Skill为SKILL.md文件
     * @param {object} skill - Skill对象
     * @returns {string} SKILL.md文件内容
     */
    exportToSkillFile(skill) {
        const frontmatter = `---
name: ${skill.name}
icon: ${skill.icon || '📦'}
description: ${skill.description || ''}
version: ${skill.version || '1.0.0'}
author: ${skill.author || '用户'}
tags: ${Array.isArray(skill.tags) ? skill.tags.join(', ') : ''}
systemPrompt: ${(skill.systemPrompt || '你是专业的简历分析专家。').replace(/\n/g, ' ')}
---

${this._extractUserPromptTemplate(skill.userPromptTemplate)}`;
        
        return frontmatter;
    }

    /**
     * 导出Skill并下载
     * @param {object} skill - Skill对象
     */
    downloadSkillFile(skill) {
        const content = this.exportToSkillFile(skill);
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${skill.name.replace(/[\\/:*?"<>|]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 验证SKILL.md文件格式是否正确
     * @param {string} content - 文件内容
     * @returns {object} 验证结果
     */
    validateSkillFile(content) {
        try {
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
            if (!frontmatterMatch) {
                return { valid: false, error: '缺少YAML frontmatter (--- ... ---)' };
            }
            
            const frontmatter = this._parseYaml(frontmatterMatch[1]);
            
            if (!frontmatter.name) {
                return { valid: false, error: '缺少必填字段: name' };
            }
            
            const body = content.substring(frontmatterMatch[0].length);
            if (!body.trim()) {
                return { valid: false, error: 'Skill内容不能为空' };
            }
            
            return { valid: true, error: null, frontmatter, bodyLength: body.length };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * 获取Skill市场列表（预留接口）
     * @returns {Promise<Array>} 可用的Skills列表
     */
    async fetchSkillMarketList() {
        // 预留接口，后续可以对接远程Skill市场API
        // 例如: const response = await fetch('https://api.yourserver.com/skills');
        // return await response.json();
        
        // 当前返回示例数据
        return [
            {
                name: '技术岗深度分析',
                icon: '💻',
                description: '针对技术岗位的深度能力评估，包含技术栈、项目复杂度、代码质量分析',
                author: '社区贡献',
                version: '1.0.0',
                downloadUrl: 'https://example.com/skills/tech-analyzer.md'
            },
            {
                name: '产品岗深度分析',
                icon: '📱',
                description: '针对产品经理岗位的全面评估，包含用户洞察、数据分析、项目管理',
                author: '社区贡献',
                version: '1.0.0',
                downloadUrl: 'https://example.com/skills/product-analyzer.md'
            },
            {
                name: '管理岗深度分析',
                icon: '👥',
                description: '针对管理岗位的领导力评估，包含团队管理、决策能力、人才培养',
                author: '社区贡献',
                version: '1.0.0',
                downloadUrl: 'https://example.com/skills/management-analyzer.md'
            }
        ];
    }

    /**
     * 同步Skill到模板管理器
     * @private
     */
    async _syncToTemplateManager(skill) {
        if (!window.templateManager) {
            console.warn('模板管理器未加载，跳过同步');
            return;
        }
        
        // 检查是否已存在同名模板
        const allTemplates = window.templateManager.getAllTemplates();
        const existing = allTemplates.find(t => t.name === skill.name && !t.isBuiltIn);
        
        if (existing) {
            // 更新现有模板
            await window.templateManager.updateTemplate(existing.id, {
                name: skill.name,
                icon: skill.icon,
                description: skill.description,
                systemPrompt: skill.systemPrompt,
                userPromptTemplate: skill.userPromptTemplate
            });
        } else {
            // 创建新模板
            await window.templateManager.createTemplate(
                skill.name,
                skill.description,
                skill.systemPrompt,
                skill.userPromptTemplate,
                skill.icon
            );
        }
    }

    /**
     * 保存已导入Skills到存储
     * @private
     */
    async _saveImportedSkills() {
        await chrome.storage.local.set({ importedSkills: this.importedSkills });
    }

    /**
     * 读取文件为文本
     * @private
     */
    _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 解析YAML字符串
     * @private
     */
    _parseYaml(yamlStr) {
        const result = {};
        const lines = yamlStr.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed.startsWith('#')) continue;
            
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                let key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                // 移除引号
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                
                // 处理数组（tags）
                if (key === 'tags' && value.includes(',')) {
                    value = value.split(',').map(t => t.trim());
                }
                
                result[key] = value;
            }
        }
        return result;
    }

    /**
     * 构建用户提示词模板
     * @private
     */
    _buildUserPromptTemplate(body) {
        // 清理正文
        let cleanedBody = body.trim();
        // 确保包含 {resumeText} 占位符
        if (!cleanedBody.includes('{resumeText}')) {
            cleanedBody = cleanedBody + '\n\n【简历内容】\n{resumeText}';
        }
        return cleanedBody;
    }

    /**
     * 从用户提示词模板提取正文
     * @private
     */
    _extractUserPromptTemplate(userPrompt) {
        // 移除 {resumeText} 占位符及相关行
        let content = userPrompt.replace(/\n?\【简历内容】\n?\{resumeText\}/g, '');
        content = content.replace(/\n?【简历内容】\n?\{resumeText\}/g, '');
        return content.trim();
    }
}

// 创建全局实例
window.skillLoader = new SkillLoader();

// 自动初始化
window.skillLoader.init().catch(console.error);

console.log('✅ skill-loader.js 已加载');