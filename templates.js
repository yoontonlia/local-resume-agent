/**
 * 模板管理页面逻辑 - 完整版
 * 支持模板的增删改查、导入导出、Skills管理
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('模板管理页面加载...');
    
    // 获取DOM元素
    const builtInGrid = document.getElementById('builtInGrid');
    const userGrid = document.getElementById('userGrid');
    const importedSkillsGrid = document.getElementById('importedSkillsGrid');
    const currentName = document.getElementById('currentName');
    const currentDesc = document.getElementById('currentDesc');
    const currentIcon = document.getElementById('currentIcon');
    const createBtn = document.getElementById('createBtn');
    const backBtn = document.getElementById('backBtn');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    const templateName = document.getElementById('templateName');
    const templateIcon = document.getElementById('templateIcon');
    const templateDesc = document.getElementById('templateDesc');
    const systemPrompt = document.getElementById('systemPrompt');
    const userPromptTemplate = document.getElementById('userPromptTemplate');
    
    let currentEditingTemplate = null;
    
    // 返回按钮
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            chrome.tabs.getCurrent((tab) => {
                if (tab && tab.id) {
                    chrome.tabs.remove(tab.id);
                }
            });
        });
    }
    
    // 刷新当前模板显示
    function refreshCurrentTemplate() {
        const current = window.templateManager.getCurrentTemplate();
        if (current) {
            currentName.textContent = current.name;
            currentDesc.textContent = current.description || (current.isBuiltIn ? '系统内置模板' : '用户自定义模板');
            currentIcon.textContent = current.icon || (current.isBuiltIn ? '📌' : '📝');
        }
    }
    
    // 刷新模板列表
    async function refreshTemplates() {
        const allTemplates = window.templateManager.getAllTemplates();
        const builtIn = allTemplates.filter(t => t.isBuiltIn);
        const user = allTemplates.filter(t => !t.isBuiltIn);
        const currentId = window.templateManager.getCurrentTemplateId();
        
        // 渲染系统模板
        if (builtIn.length === 0) {
            builtInGrid.innerHTML = '<div class="empty-state">暂无系统模板</div>';
        } else {
            builtInGrid.innerHTML = builtIn.map(template => `
                <div class="template-card ${currentId === template.id ? 'active' : ''}" data-id="${template.id}">
                    <div class="template-header">
                        <div class="template-title">
                            <span class="template-icon">${template.icon || '📌'}</span>
                            <span class="template-name">${escapeHtml(template.name)}</span>
                        </div>
                        <span class="template-badge badge-builtin">系统</span>
                    </div>
                    <div class="template-description">${escapeHtml(template.description || '系统内置模板')}</div>
                    <div class="template-actions">
                        <button class="btn-use" data-id="${template.id}">使用</button>
                        <button class="btn-export-skill" data-id="${template.id}">📦 导出</button>
                    </div>
                </div>
            `).join('');
        }
        
        // 渲染用户模板
        if (user.length === 0) {
            userGrid.innerHTML = '<div class="empty-state">暂无自定义模板，点击"新建模板"开始创建</div>';
        } else {
            userGrid.innerHTML = user.map(template => `
                <div class="template-card ${currentId === template.id ? 'active' : ''}" data-id="${template.id}">
                    <div class="template-header">
                        <div class="template-title">
                            <span class="template-icon">${template.icon || '📝'}</span>
                            <span class="template-name">${escapeHtml(template.name)}</span>
                        </div>
                        <span class="template-badge badge-user">自定义</span>
                    </div>
                    <div class="template-description">${escapeHtml(template.description || '用户自定义模板')}</div>
                    <div class="template-actions">
                        <button class="btn-use" data-id="${template.id}">使用</button>
                        <button class="btn-edit" data-id="${template.id}">编辑</button>
                        <button class="btn-delete" data-id="${template.id}">删除</button>
                        <button class="btn-export-json" data-id="${template.id}">📄 JSON</button>
                        <button class="btn-export-skill" data-id="${template.id}">📦 Skill</button>
                    </div>
                </div>
            `).join('');
        }
        
        // 绑定使用按钮
        document.querySelectorAll('.btn-use').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await window.templateManager.setCurrentTemplate(id);
                refreshCurrentTemplate();
                refreshTemplates();
                console.log(`已切换到模板: ${id}`);
            });
        });
        
        // 绑定编辑按钮
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const template = window.templateManager.getTemplate(id);
                if (template && !template.isBuiltIn) {
                    openEditModal(template);
                }
            });
        });
        
        // 绑定删除按钮
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const template = window.templateManager.getTemplate(id);
                if (template && confirm(`确定要删除模板"${template.name}"吗？`)) {
                    await window.templateManager.deleteTemplate(id);
                    refreshTemplates();
                    refreshCurrentTemplate();
                }
            });
        });
        
        // 导出为JSON
        document.querySelectorAll('.btn-export-json').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const template = window.templateManager.getTemplate(id);
                if (template) {
                    const exportData = {
                        name: template.name,
                        icon: template.icon,
                        description: template.description,
                        systemPrompt: template.systemPrompt,
                        userPromptTemplate: template.userPromptTemplate
                    };
                    downloadFile(JSON.stringify(exportData, null, 2), `${template.name.replace(/[\\/:*?"<>|]/g, '_')}.json`, 'application/json');
                }
            });
        });
        
        // 导出为Skill文件
        document.querySelectorAll('.btn-export-skill').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const template = window.templateManager.getTemplate(id);
                if (template && window.skillLoader) {
                    window.skillLoader.downloadSkillFile(template);
                }
            });
        });
        
        // 刷新已导入的Skills列表
        await refreshImportedSkills();
    }
    
    // 刷新已导入的Skills列表
    async function refreshImportedSkills() {
        if (!importedSkillsGrid) return;
        
        if (!window.skillLoader) {
            importedSkillsGrid.innerHTML = '<div class="empty-state">Skill加载器未加载</div>';
            return;
        }
        
        const importedSkills = window.skillLoader.getImportedSkills();
        
        if (importedSkills.length === 0) {
            importedSkillsGrid.innerHTML = '<div class="empty-state">暂无导入的Skill，点击"导入Skill"添加</div>';
            return;
        }
        
        importedSkillsGrid.innerHTML = importedSkills.map(skill => `
            <div class="template-card" data-skill-name="${skill.name}">
                <div class="template-header">
                    <div class="template-title">
                        <span class="template-icon">${skill.icon || '📦'}</span>
                        <span class="template-name">${escapeHtml(skill.name)}</span>
                    </div>
                    <span class="template-badge badge-user">Skill</span>
                </div>
                <div class="template-description">
                    ${escapeHtml(skill.description || '无描述')}<br>
                    <span style="font-size: 11px; color: rgba(255,255,255,0.5);">版本: ${skill.version || '1.0.0'} | 作者: ${skill.author || '未知'}</span>
                </div>
                <div class="template-actions">
                    <button class="btn-use-skill" data-name="${skill.name}">使用</button>
                    <button class="btn-delete-skill" data-name="${skill.name}">删除</button>
                </div>
            </div>
        `).join('');
        
        // 绑定使用Skill按钮
        document.querySelectorAll('.btn-use-skill').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const skillName = btn.dataset.name;
                const skill = importedSkills.find(s => s.name === skillName);
                if (skill && window.templateManager) {
                    let template = window.templateManager.getAllTemplates().find(t => t.name === skillName && !t.isBuiltIn);
                    if (!template) {
                        template = await window.templateManager.createTemplate(
                            skill.name,
                            skill.description,
                            skill.systemPrompt,
                            skill.userPromptTemplate,
                            skill.icon
                        );
                    }
                    await window.templateManager.setCurrentTemplate(template.id);
                    refreshCurrentTemplate();
                    refreshTemplates();
                    alert(`已切换到模板: ${skill.name}`);
                }
            });
        });
        
        // 绑定删除Skill按钮
        document.querySelectorAll('.btn-delete-skill').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const skillName = btn.dataset.name;
                if (confirm(`确定要删除Skill "${skillName}" 吗？`)) {
                    await window.skillLoader.deleteImportedSkill(skillName);
                    await refreshImportedSkills();
                    await refreshTemplates();
                    refreshCurrentTemplate();
                    alert(`已删除Skill: ${skillName}`);
                }
            });
        });
    }
    
    // 打开新建模态框
    function openCreateModal() {
        currentEditingTemplate = null;
        modalTitle.textContent = '新建模板';
        templateName.value = '';
        templateIcon.value = '📝';
        templateDesc.value = '';
        systemPrompt.value = '';
        userPromptTemplate.value = '## 分析结果\n\n【简历内容】\n{resumeText}';
        modal.style.display = 'flex';
    }
    
    // 打开编辑模态框
    function openEditModal(template) {
        currentEditingTemplate = template;
        modalTitle.textContent = `编辑模板: ${template.name}`;
        templateName.value = template.name;
        templateIcon.value = template.icon || '📝';
        templateDesc.value = template.description || '';
        systemPrompt.value = template.systemPrompt;
        userPromptTemplate.value = template.userPromptTemplate;
        modal.style.display = 'flex';
    }
    
    // 保存模板
    async function saveTemplate() {
        const name = templateName.value.trim();
        const icon = templateIcon.value.trim() || '📝';
        const description = templateDesc.value.trim();
        const sysPrompt = systemPrompt.value.trim();
        const userPrompt = userPromptTemplate.value.trim();
        
        if (!name) {
            alert('请输入模板名称');
            return;
        }
        if (!sysPrompt) {
            alert('请输入系统提示词');
            return;
        }
        if (!userPrompt) {
            alert('请输入用户提示词模板');
            return;
        }
        if (!userPrompt.includes('{resumeText}')) {
            alert('用户提示词模板必须包含 {resumeText} 作为简历内容占位符');
            return;
        }
        
        try {
            if (currentEditingTemplate) {
                await window.templateManager.updateTemplate(currentEditingTemplate.id, {
                    name: name,
                    icon: icon,
                    description: description,
                    systemPrompt: sysPrompt,
                    userPromptTemplate: userPrompt
                });
                console.log('模板已更新');
            } else {
                await window.templateManager.createTemplate(name, description, sysPrompt, userPrompt, icon);
                console.log('模板已创建');
            }
            closeModal();
            await refreshTemplates();
            refreshCurrentTemplate();
        } catch (error) {
            alert(`保存失败: ${error.message}`);
        }
    }
    
    // 关闭模态框
    function closeModal() {
        modal.style.display = 'none';
        currentEditingTemplate = null;
    }
    
    // 下载文件
    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // HTML转义
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    // 事件绑定
    if (createBtn) createBtn.addEventListener('click', openCreateModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (saveBtn) saveBtn.addEventListener('click', saveTemplate);
    
    // 点击模态框外部关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    // ========== Skill导入/导出功能 ==========
    const importSkillBtn = document.getElementById('importSkillBtn');
    const importUrlBtn = document.getElementById('importUrlBtn');
    const urlModal = document.getElementById('urlModal');
    const closeUrlModalBtn = document.getElementById('closeUrlModalBtn');
    const cancelUrlBtn = document.getElementById('cancelUrlBtn');
    const confirmUrlBtn = document.getElementById('confirmUrlBtn');
    const skillUrlInput = document.getElementById('skillUrl');
    
    // 创建隐藏的文件输入框（动态创建）
    let skillFileInput = null;
    
    function createFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md';
        input.style.display = 'none';
        input.id = 'skillFileInput';
        document.body.appendChild(input);
        return input;
    }
    
    function getSkillFileInput() {
        if (!skillFileInput || !document.body.contains(skillFileInput)) {
            skillFileInput = createFileInput();
        }
        return skillFileInput;
    }
    
    // 导入Skill按钮
    if (importSkillBtn) {
        importSkillBtn.addEventListener('click', () => {
            console.log('导入按钮被点击');
            if (!window.skillLoader) {
                alert('Skill加载器未就绪，请刷新页面后重试');
                return;
            }
            getSkillFileInput().click();
        });
    }
    
    // 使用事件委托监听文件选择
    document.body.addEventListener('change', async (e) => {
        const target = e.target;
        if (target.id !== 'skillFileInput' && target.getAttribute('id') !== 'skillFileInput') {
            return;
        }
        
        const file = target.files[0];
        if (!file) return;
        
        console.log('选择的文件:', file.name);
        
        if (!window.skillLoader) {
            alert('Skill加载器未就绪，请刷新页面后重试');
            target.value = '';
            return;
        }
        
        if (!file.name.endsWith('.md')) {
            alert('请上传 .md 格式的Skill文件');
            target.value = '';
            return;
        }
        
        console.log('开始导入Skill:', file.name);
        
        try {
            const skill = await window.skillLoader.importSkillFromFile(file);
            console.log('导入成功:', skill);
            alert(`✅ 导入成功！\n\nSkill名称: ${skill.name}\n描述: ${skill.description}`);
            
            await refreshTemplates();
            refreshCurrentTemplate();
            
        } catch (error) {
            console.error('导入失败:', error);
            alert(`导入失败: ${error.message}`);
        } finally {
            target.value = '';
        }
    });
    
    // 远程导入模态框
    if (importUrlBtn) {
        importUrlBtn.addEventListener('click', () => {
            if (!window.skillLoader) {
                alert('Skill加载器未就绪，请刷新页面后重试');
                return;
            }
            if (skillUrlInput) skillUrlInput.value = '';
            urlModal.style.display = 'flex';
        });
    }
    
    function closeUrlModal() {
        urlModal.style.display = 'none';
    }
    
    if (closeUrlModalBtn) closeUrlModalBtn.addEventListener('click', closeUrlModal);
    if (cancelUrlBtn) cancelUrlBtn.addEventListener('click', closeUrlModal);
    
    if (confirmUrlBtn) {
        confirmUrlBtn.addEventListener('click', async () => {
            const url = skillUrlInput.value.trim();
            if (!url) {
                alert('请输入Skill文件URL');
                return;
            }
            
            if (!url.endsWith('.md')) {
                alert('请提供 .md 格式的Skill文件URL');
                return;
            }
            
            confirmUrlBtn.disabled = true;
            confirmUrlBtn.textContent = '导入中...';
            
            try {
                const skill = await window.skillLoader.importSkillFromUrl(url);
                alert(`✅ 导入成功！\n\nSkill名称: ${skill.name}\n描述: ${skill.description}`);
                
                await refreshTemplates();
                refreshCurrentTemplate();
                closeUrlModal();
                
            } catch (error) {
                console.error('导入失败:', error);
                alert(`导入失败: ${error.message}`);
            } finally {
                confirmUrlBtn.disabled = false;
                confirmUrlBtn.textContent = '导入';
            }
        });
    }
    
    if (urlModal) {
        urlModal.addEventListener('click', (e) => {
            if (e.target === urlModal) closeUrlModal();
        });
    }
    
    // 初始化
    await window.templateManager.init();
    refreshCurrentTemplate();
    await refreshTemplates();
    console.log('模板管理页面初始化完成');
});