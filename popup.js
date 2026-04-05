/**
 * 主界面逻辑 - 完整修复版
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('界面已加载，开始初始化...');
    
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const fileInfo = document.getElementById('fileInfo');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const resultArea = document.getElementById('resultArea');
    const thinkingDiv = document.getElementById('thinking');
    const depthSelect = document.getElementById('analysisDepth');
    const historyBtn = document.getElementById('historyBtn');
    const manualResumeText = document.getElementById('manualResumeText');
    const manualCharCount = document.getElementById('manualCharCount');
    const exportButtons = document.getElementById('exportButtons');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    
    let currentFile = null;
    let currentResumeText = null;
    let lastAnalysisResult = '';
    let lastFileName = '';
    
    // 更新状态
    function updateStatus(message, isReady = false) {
        statusText.textContent = message;
        if (isReady) {
            statusDot.classList.add('ready');
        } else {
            statusDot.classList.remove('ready');
        }
    }
    
    // 显示结果
    function showResult(html, rawText = '', fileName = '') {
        resultArea.innerHTML = html;
        resultArea.style.display = 'block';
        
        if (rawText) {
            lastAnalysisResult = rawText;
        }
        if (fileName) {
            lastFileName = fileName;
        }
        
        if (exportButtons && lastAnalysisResult && lastFileName) {
            exportButtons.style.display = 'flex';
        }
    }
    
    function hideResult() {
        resultArea.style.display = 'none';
        resultArea.innerHTML = '';
        if (exportButtons) {
            exportButtons.style.display = 'none';
        }
    }
    
    function setThinking(show) {
        thinkingDiv.style.display = show ? 'flex' : 'none';
        analyzeBtn.disabled = show;
    }
    
    function showError(message) {
        showResult(`<div style="color: #d32f2f; padding: 12px;">❌ ${message}</div>`);
    }
    
    // 检查是否有有效输入，启用/禁用分析按钮
    function checkAndEnableAnalyzeBtn() {
        const manualText = manualResumeText?.value.trim() || '';
        const hasManualInput = manualText.length >= 20;
        const hasFile = currentFile !== null;
        
        analyzeBtn.disabled = !(hasManualInput || hasFile);
        
        if (hasManualInput) {
            console.log('手动输入有效，长度:', manualText.length);
        } else if (hasFile) {
            console.log('有上传文件:', currentFile.name);
        }
    }
    
    // 手动输入框字符计数
    if (manualResumeText && manualCharCount) {
        manualResumeText.addEventListener('input', () => {
            const len = manualResumeText.value.trim().length;
            manualCharCount.textContent = `${len} 字符 (至少需要20字符)`;
            if (len >= 20) {
                manualCharCount.style.color = '#4caf50';
            } else {
                manualCharCount.style.color = '#999';
            }
            checkAndEnableAnalyzeBtn();
        });
    }
    
    // 初始化AI
    updateStatus('正在初始化AI模型...', false);
    const initSuccess = await window.aiCore.init();
    
    if (initSuccess) {
        updateStatus('✅ AI已就绪', true);
        console.log('AI初始化成功');
    } else {
        updateStatus('❌ AI初始化失败', false);
    }
        // 加载模板列表到下拉框
    async function loadTemplatesToSelect() {
        const templateSelect = document.getElementById('templateSelect');
        if (!templateSelect) return;
        
        if (!window.templateManager) {
            templateSelect.innerHTML = '<option value="">模板管理器未加载</option>';
            return;
        }
        
        const allTemplates = window.templateManager.getAllTemplates();
        const currentId = window.templateManager.getCurrentTemplateId();
        
        if (allTemplates.length === 0) {
            templateSelect.innerHTML = '<option value="">暂无模板</option>';
            return;
        }
        
        // 分组显示
        const builtIn = allTemplates.filter(t => t.isBuiltIn);
        const user = allTemplates.filter(t => !t.isBuiltIn);
        
        let html = '';
        
        if (builtIn.length > 0) {
            html += '<optgroup label="📌 系统模板">';
            builtIn.forEach(t => {
                const selected = currentId === t.id ? 'selected' : '';
                html += `<option value="${t.id}" ${selected}>${t.icon || '📌'} ${t.name}</option>`;
            });
            html += '</optgroup>';
        }
        
        if (user.length > 0) {
            html += '<optgroup label="✨ 我的模板">';
            user.forEach(t => {
                const selected = currentId === t.id ? 'selected' : '';
                html += `<option value="${t.id}" ${selected}>${t.icon || '📝'} ${t.name}</option>`;
            });
            html += '</optgroup>';
        }
        
        templateSelect.innerHTML = html;
    }
    
    // 监听模板切换
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
        templateSelect.addEventListener('change', async () => {
            const selectedId = templateSelect.value;
            if (selectedId && window.templateManager) {
                await window.templateManager.setCurrentTemplate(selectedId);
                console.log(`模板已切换为: ${selectedId}`);
            }
        });
    }
    
    // 加载模板列表
    await loadTemplatesToSelect();


    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
        });
    }
    // 数据看板按钮
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
        });
    }
    // 岗位匹配按钮
    const jobMatchBtn = document.getElementById('jobMatchBtn');
    if (jobMatchBtn) {
        jobMatchBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('job-match.html') });
        });
    }
    // 简历优化按钮
    const optimizeBtn = document.getElementById('optimizeBtn');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('optimize.html') });
        });
    }
    // 报告对比按钮
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('compare.html') });
        });
    }
    
    // 历史记录按钮
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
        });
    }
    // 批量分析按钮
    const batchBtn = document.getElementById('batchBtn');
    if (batchBtn) {
        batchBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('batch.html') });
        });
    }
    // 模板管理按钮
    const templatesBtn = document.getElementById('templatesBtn');
    if (templatesBtn) {
        templatesBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('templates.html') });
        });
    }
    // 导出按钮
    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', () => {
            if (lastAnalysisResult && lastFileName) {
                window.reportExporter?.exportResumeReport(lastAnalysisResult, lastFileName, 'md');
            } else {
                showError('没有可导出的结果');
            }
        });
    }
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            if (lastAnalysisResult && lastFileName) {
                window.reportExporter?.exportResumeReport(lastAnalysisResult, lastFileName, 'txt');
            } else {
                showError('没有可导出的结果');
            }
        });
    }
    
    // 上传文件
    uploadArea.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'application/pdf') {
                currentFile = file;
                fileInfo.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                fileInfo.style.display = 'block';
                checkAndEnableAnalyzeBtn();
                hideResult();
                console.log('文件已选择:', file.name);
            } else {
                showError('请选择PDF文件');
            }
        };
        input.click();
    });
    
    // 分析按钮
    analyzeBtn.addEventListener('click', async () => {
        console.log('分析按钮被点击');
        
        if (!window.aiCore.isReady) {
            showError('AI模型未就绪，请刷新页面重试');
            return;
        }
        
        // 获取选中的模板ID
        const templateSelect = document.getElementById('templateSelect');
        const selectedTemplateId = templateSelect ? templateSelect.value : null;
        
        setThinking(true);
        hideResult();
        
        try {
            let resumeText = '';
            let usedMethod = '';
            let usedFileName = '';
            
            // 优先使用手动输入的文本
            const manualText = manualResumeText?.value.trim() || '';
            
            if (manualText.length >= 20) {
                resumeText = manualText;
                usedMethod = '手动输入';
                usedFileName = '手动输入内容';
                window.currentFileName = '手动输入';
                console.log('使用手动输入的简历文本，长度:', resumeText.length);
            } 
            else if (currentFile) {
                window.currentFileName = currentFile.name;
                console.log('设置文件名(PDF):', window.currentFileName);
                
                console.log('开始提取PDF...');
                const extractResult = await window.pdfReader.extractText(currentFile);
                
                if (!extractResult.success || !extractResult.text || extractResult.text.length < 20) {
                    showResult(`
                        <div style="padding: 12px; background: #fff3e0;">
                            <strong>⚠️ PDF提取失败</strong><br>
                            ${extractResult.error || '提取到的内容过少'}<br><br>
                            💡 提示：请在上方的"手动粘贴简历内容"文本框中输入简历信息
                        </div>
                    `);
                    setThinking(false);
                    return;
                }
                
                resumeText = extractResult.text;
                usedMethod = 'PDF文件';
                usedFileName = currentFile.name;
                console.log(`PDF提取成功，长度: ${resumeText.length} 字符`);
            } 
            else {
                showResult(`
                    <div style="padding: 12px; background: #fff3e0;">
                        <strong>⚠️ 请提供简历内容</strong><br>
                        请选择以下任一方式：<br>
                        1. 上传PDF简历文件<br>
                        2. 在"手动粘贴简历内容"文本框中输入简历信息（至少20字符）
                    </div>
                `);
                setThinking(false);
                return;
            }

            // 保存简历文本供职位匹配使用
            currentResumeText = resumeText;
            
            // AI分析 - 使用选中的模板
            console.log('开始AI分析，使用模板:', selectedTemplateId);
            const analysisResult = await window.resumeAnalyzer.analyze(resumeText, selectedTemplateId);
            console.log('分析结果:', analysisResult);
            
            if (!analysisResult.success) {
                throw new Error(analysisResult.error || '分析失败');
            }
            
            // 显示结果
            const escapeHtml = (str) => {
                if (!str) return '';
                return str.replace(/[&<>]/g, function(m) {
                    if (m === '&') return '&amp;';
                    if (m === '<') return '&lt;';
                    if (m === '>') return '&gt;';
                    return m;
                });
            };
            
            const depthText = selectedTemplateId ? (window.templateManager?.getTemplate(selectedTemplateId)?.name || '自定义模板') : '深度分析';
            const safeContent = escapeHtml(analysisResult.result);
            const contentWithLineBreaks = safeContent.replace(/\n/g, '<br>');
            
            const resultHtml = `
                <div style="padding: 12px;">
                    <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
                        <strong>📊 ${depthText}结果</strong>
                        <span style="float: right; font-size: 11px; color: #999;">${new Date().toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                        来源: ${usedMethod} | 文件: ${usedFileName}
                    </div>
                    <div style="font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; background: #f9f9f9; padding: 12px; border-radius: 6px;">
                        ${contentWithLineBreaks}
                    </div>
                </div>
            `;
            
            showResult(resultHtml, analysisResult.result, usedFileName);
            console.log('结果已显示');
            
            // 启用匹配按钮
            const jobDescriptionElem = document.getElementById('jobDescription');
            const matchBtnElem = document.getElementById('matchBtn');
            const matchStatusElem = document.getElementById('matchStatus');
            if (jobDescriptionElem && jobDescriptionElem.value.trim().length > 50 && matchBtnElem) {
                matchBtnElem.disabled = false;
                if (matchStatusElem) matchStatusElem.textContent = '✅ 可以分析';
            }
            
        } catch (error) {
            console.error('分析失败:', error);
            showError(error.message || '分析过程中出现错误，请重试');
        } finally {
            setThinking(false);
        }
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2196f3';
    });
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ccc';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ccc';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            currentFile = file;
            fileInfo.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            fileInfo.style.display = 'block';
            checkAndEnableAnalyzeBtn();
            hideResult();
        } else {
            showError('请拖拽PDF文件');
        }
    });
    
    // 职位匹配相关元素
    const jobDescriptionElem = document.getElementById('jobDescription');
    const matchBtnElem = document.getElementById('matchBtn');
    const matchResultArea = document.getElementById('matchResultArea');
    const matchStatusElem = document.getElementById('matchStatus');
    const extractFromWebBtn = document.getElementById('extractFromWebBtn');
    
    function showMatchResult(html) {
        matchResultArea.innerHTML = html;
        matchResultArea.style.display = 'block';
    }
    
    function setMatchThinking(show) {
        if (show) {
            matchBtnElem.disabled = true;
            matchBtnElem.textContent = '🤔 AI分析中...';
            if (matchStatusElem) matchStatusElem.textContent = '分析中...';
        } else {
            matchBtnElem.disabled = false;
            matchBtnElem.textContent = '🔍 分析匹配度';
            if (matchStatusElem) matchStatusElem.textContent = '';
        }
    }
    
    if (jobDescriptionElem) {
        jobDescriptionElem.addEventListener('input', () => {
            const hasJD = jobDescriptionElem.value.trim().length > 50;
            const hasResume = currentResumeText !== null;
            if (matchBtnElem) matchBtnElem.disabled = !(hasJD && hasResume);
            if (matchStatusElem) matchStatusElem.textContent = hasJD && hasResume ? '✅ 可以分析' : (hasJD ? '请先分析简历' : '请粘贴职位描述');
        });
    }
    
    if (matchBtnElem) {
        matchBtnElem.addEventListener('click', async () => {
            const jd = jobDescriptionElem.value.trim();
            if (!jd || jd.length < 50) {
                showMatchResult('<div style="color: #d32f2f;">❌ 请粘贴完整的职位描述（至少50字符）</div>');
                return;
            }
            if (!currentResumeText) {
                showMatchResult('<div style="color: #d32f2f;">❌ 请先分析简历</div>');
                return;
            }
            
            setMatchThinking(true);
            matchResultArea.style.display = 'none';
            
            try {
                const matchResult = await window.jobMatcher.match(currentResumeText, jd);
                if (!matchResult.success) throw new Error(matchResult.error);
                
                const resultHtml = `
                    <div style="padding: 12px;">
                        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
                            <strong>🎯 匹配度分析</strong>
                            <span style="float: right; font-size: 11px; color: #999;">${new Date().toLocaleTimeString()}</span>
                        </div>
                        <div style="font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${matchResult.result.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
                showMatchResult(resultHtml);
            } catch (error) {
                showMatchResult(`<div style="color: #d32f2f;">❌ ${error.message}</div>`);
            } finally {
                setMatchThinking(false);
            }
        });
    }
    
    if (extractFromWebBtn) {
        extractFromWebBtn.addEventListener('click', async () => {
            extractFromWebBtn.disabled = true;
            extractFromWebBtn.textContent = '⏳ 提取中...';
            try {
                const result = await window.webExtractor.fillToTextarea(jobDescriptionElem);
                if (result.success) {
                    if (matchStatusElem) matchStatusElem.textContent = '✅ 提取成功';
                    if (jobDescriptionElem.value.trim().length > 50 && currentResumeText && matchBtnElem) {
                        matchBtnElem.disabled = false;
                    }
                } else {
                    showMatchResult(`<div style="color: #d32f2f;">❌ 提取失败: ${result.error}</div>`);
                }
            } catch (error) {
                showMatchResult(`<div style="color: #d32f2f;">❌ 提取失败: ${error.message}</div>`);
            } finally {
                extractFromWebBtn.disabled = false;
                extractFromWebBtn.textContent = '🌐 从当前网页提取招聘信息';
            }
        });
    }
    
    // 初始检查
    checkAndEnableAnalyzeBtn();
    console.log('界面初始化完成');
});