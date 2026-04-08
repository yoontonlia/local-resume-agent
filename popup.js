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
        // 初始化MCP客户端（可选增强）
    if (window.mcpClient && typeof window.mcpClient.init === 'function') {
        try {
            await window.mcpClient.init();
            const mcpStatus = window.mcpClient.getStatus();
            
            const mcpStatusBadge = document.getElementById('mcpStatusBadge');
            if (mcpStatusBadge) {
                if (mcpStatus.chromeDevTools || mcpStatus.hrToolkit) {
                    let statusText = [];
                    if (mcpStatus.chromeDevTools) statusText.push('🌐CDP');
                    if (mcpStatus.hrToolkit) statusText.push('📄HR');
                    mcpStatusBadge.textContent = `🔌 ${statusText.join('+')}`;
                    mcpStatusBadge.style.background = '#4caf50';
                    mcpStatusBadge.style.color = 'white';
                    console.log('🚀 MCP增强模式已激活:', statusText);
                } else {
                    mcpStatusBadge.textContent = '⚡ 基础模式';
                    mcpStatusBadge.style.background = 'rgba(255,255,255,0.15)';
                }
            }
        } catch (e) {
            console.warn('MCP初始化失败:', e);
        }
    } else {
        console.log('MCP客户端未加载');
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
        // 导出优化版简历PDF
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async () => {
            if (!lastAnalysisResult || !lastFileName) {
                showError('没有可导出的分析结果，请先分析简历');
                return;
            }
            
            let originalResumeText = currentResumeText;
            if (!originalResumeText) {
                showError('没有找到原始简历内容，请重新分析');
                return;
            }
            
            exportPdfBtn.disabled = true;
            exportPdfBtn.textContent = '⏳ AI正在优化简历(可能需要30秒)...';
            
            // 显示进度提示
            const progressDiv = document.createElement('div');
            progressDiv.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #1a1a2e; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
            progressDiv.innerHTML = '🔄 AI正在重写简历...<br>⏱️ 预计需要20-30秒';
            document.body.appendChild(progressDiv);
            
            try {
                // 1. AI重写简历
                console.log('开始AI重写简历...');
                progressDiv.innerHTML = '📝 正在优化工作经历...<br>⏱️ 请稍候...';
                
                const rewriteResult = await window.resumeRewriter.rewriteResume(
                    originalResumeText,
                    lastAnalysisResult,
                    ''
                );
                
                if (!rewriteResult.success) {
                    throw new Error(rewriteResult.error);
                }
                
                console.log('AI重写完成，长度:', rewriteResult.rewrittenText.length);
                
                // 2. 提取结构化数据
                progressDiv.innerHTML = '📊 正在整理简历格式...';
                
                const structuredData = await window.resumeRewriter.extractStructuredData(rewriteResult.rewrittenText);
                
                let finalHtml;
                
                if (structuredData && structuredData.name) {
                    console.log('使用结构化数据生成简历');
                    // 确保数据完整
                    if (!structuredData.workExperience) structuredData.workExperience = [];
                    if (!structuredData.education) structuredData.education = [];
                    if (!structuredData.skills) structuredData.skills = [];
                    
                    finalHtml = window.resumeTemplate.generateHTML(structuredData);
                } else {
                    console.log('使用文本转换生成简历');
                    finalHtml = window.pdfExporter._textToHTML(rewriteResult.rewrittenText);
                }
                
                // 3. 导出PDF
                progressDiv.innerHTML = '📄 正在生成PDF文件...';
                
                const fileName = lastFileName.replace(/\.pdf$/i, '') + '_优化版';
                const exportResult = await window.pdfExporter.exportToPDF(finalHtml, fileName + '.pdf');
                
                if (exportResult.success) {
                    progressDiv.style.background = '#4caf50';
                    progressDiv.innerHTML = '✅ 简历优化完成！<br>📑 新窗口已打开，请按 Ctrl+P 保存为PDF';
                    setTimeout(() => progressDiv.remove(), 5000);
                } else {
                    throw new Error(exportResult.error);
                }
                
            } catch (error) {
                console.error('导出优化简历失败:', error);
                progressDiv.style.background = '#f44336';
                progressDiv.innerHTML = `❌ 导出失败: ${error.message}`;
                setTimeout(() => progressDiv.remove(), 4000);
                showError(`导出失败: ${error.message}`);
            } finally {
                exportPdfBtn.disabled = false;
                exportPdfBtn.textContent = '📑 导出优化版简历';
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
            // ========== 新增：暴露到全局，供智能顾问使用 ==========
                window.currentResumeText = resumeText;
                window.currentFileName = currentFile ? currentFile.name : '手动输入';
                console.log('[全局] 简历数据已同步，文件名:', window.currentFileName);
                // ==================================================
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
    
        // 从网页提取按钮（支持Chrome DevTools MCP）
    if (extractFromWebBtn) {
        extractFromWebBtn.addEventListener('click', async () => {
            extractFromWebBtn.disabled = true;
            extractFromWebBtn.textContent = '⏳ 提取中...';
            
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                console.log('当前标签页URL:', tab.url);
                
                let success = false;
                let jdText = '';
                
                // 检查是否是内部页面
                if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
                    showMatchResult('<div style="color: #d32f2f;">⚠️ 无法从浏览器内部页面提取内容</div>');
                    return;
                }
                
                // 方法1：尝试使用Chrome DevTools MCP增强提取
                if (window.mcpClient && window.mcpClient.getStatus().chromeDevTools) {
                    console.log('🔌 尝试使用Chrome DevTools MCP提取...');
                    const enhancedResult = await window.mcpClient.enhancedWebExtract(tab.url);
                    if (enhancedResult && enhancedResult.success) {
                        jdText = enhancedResult.description || enhancedResult.title;
                        success = true;
                        console.log('Chrome DevTools MCP提取成功');
                    }
                }
                
                // 方法2：使用现有web-extractor（基础提取）
                if (!success && window.webExtractor) {
                    console.log('使用基础提取...');
                    const result = await window.webExtractor.fillToTextarea(jobDescription);
                    if (result.success && jobDescription.value.length > 50) {
                        jdText = jobDescription.value;
                        success = true;
                    }
                }
                
                // 方法3：直接注入脚本提取
                if (!success) {
                    console.log('使用脚本注入提取...');
                    const [result] = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const selectors = [
                                '.job-description', '.description', '.job-detail',
                                '.job-sec-text', '.detail-content', 'article', 'main'
                            ];
                            for (const selector of selectors) {
                                const elem = document.querySelector(selector);
                                if (elem && elem.innerText.length > 100) {
                                    return elem.innerText;
                                }
                            }
                            return document.body.innerText.substring(0, 3000);
                        }
                    });
                    if (result.result && result.result.length > 100) {
                        jdText = result.result;
                        success = true;
                    }
                }
                
                if (success && jdText.length > 50) {
                    jobDescription.value = jdText;
                    jobDescription.dispatchEvent(new Event('input'));
                    matchStatus.textContent = `✅ 提取成功 (${jdText.length}字符)`;
                } else {
                    throw new Error('未能提取到有效内容');
                }
                
            } catch (error) {
                console.error('提取失败:', error);
                showMatchResult(`<div style="color: #d32f2f;">❌ 提取失败: ${error.message}<br><br>💡 建议手动复制粘贴</div>`);
            } finally {
                extractFromWebBtn.disabled = false;
                extractFromWebBtn.textContent = '🌐 从当前网页提取招聘信息';
            }
        });
    }
    // ========== 智能顾问模式 ==========
    const startAdvisorBtn = document.getElementById('startAdvisorBtn');
    const advisorChatArea = document.getElementById('advisorChatArea');
    const advisorMessages = document.getElementById('advisorMessages');
    const advisorInput = document.getElementById('advisorInput');
    const advisorSendBtn = document.getElementById('advisorSendBtn');
    
    let isAdvisorMode = false;
    
    function addAdvisorMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `advisor-message ${role}`;
        messageDiv.style.cssText = `
            margin-bottom: 12px;
            padding: 10px 14px;
            border-radius: 12px;
            max-width: 85%;
            ${role === 'user' ? 
                'background: #667eea; margin-left: auto;' : 
                'background: rgba(255,255,255,0.1); margin-right: auto;'
            }
        `;
        messageDiv.innerHTML = `<div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">${role === 'user' ? '您' : 'AI顾问'}</div>${content.replace(/\n/g, '<br>')}`;
        advisorMessages.appendChild(messageDiv);
        advisorMessages.scrollTop = advisorMessages.scrollHeight;
    }
    
    if (startAdvisorBtn) {
        startAdvisorBtn.addEventListener('click', async () => {
            if (!window.agentOrchestrator) {
                alert('AI顾问模块未加载，请刷新页面重试');
                return;
            }
            
            startAdvisorBtn.style.display = 'none';
            advisorChatArea.style.display = 'block';
            isAdvisorMode = true;
            
            // 清空旧消息
            advisorMessages.innerHTML = '';
            
            // 获取用户目标
            const goal = prompt('请告诉我您今天想完成什么目标？\n\n例如：\n- 分析我的简历\n- 帮我匹配岗位\n- 生成职业发展报告', '分析我的简历');
            
            if (!goal) {
                startAdvisorBtn.style.display = 'block';
                advisorChatArea.style.display = 'none';
                return;
            }
            
            addAdvisorMessage('system', `🎯 目标：${goal}\n\n正在启动AI顾问...`);
            
            const response = await window.agentOrchestrator.startSession(goal);
            addAdvisorMessage('assistant', response);
        });
    }
    
    if (advisorSendBtn && advisorInput) {
        advisorSendBtn.addEventListener('click', async () => {
            const message = advisorInput.value.trim();
            if (!message || !isAdvisorMode) return;
            
            addAdvisorMessage('user', message);
            advisorInput.value = '';
            
            // 显示思考状态
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'advisor-message assistant';
            thinkingDiv.style.cssText = 'background: rgba(255,255,255,0.1); padding: 10px 14px; border-radius: 12px; margin-bottom: 12px; width: fit-content;';
            thinkingDiv.innerHTML = '<span style="opacity: 0.7;">🤔 AI正在思考...</span>';
            advisorMessages.appendChild(thinkingDiv);
            advisorMessages.scrollTop = advisorMessages.scrollHeight;
            
            try {
                const response = await window.agentOrchestrator.processInput(message);
                thinkingDiv.remove();
                addAdvisorMessage('assistant', response);
            } catch (error) {
                thinkingDiv.remove();
                addAdvisorMessage('assistant', `抱歉，处理出错了：${error.message}`);
            }
        });
        
        advisorInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                advisorSendBtn.click();
            }
        });
    }
    // 初始检查
    checkAndEnableAnalyzeBtn();
    console.log('界面初始化完成');
});