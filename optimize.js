/**
 * 简历优化页面逻辑
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('简历优化页面加载...');
    
    // 获取DOM元素
    const reportSelect = document.getElementById('reportSelect');
    const targetRole = document.getElementById('targetRole');
    const optimizeBtn = document.getElementById('optimizeBtn');
    const thinking = document.getElementById('thinking');
    const resultArea = document.getElementById('resultArea');
    const resultTime = document.getElementById('resultTime');
    const resultContent = document.getElementById('resultContent');
    const exportButtons = document.getElementById('exportButtons');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const backBtn = document.getElementById('backBtn');
    const rewriteInput = document.getElementById('rewriteInput');
    const rewriteInstruction = document.getElementById('rewriteInstruction');
    const rewriteBtn = document.getElementById('rewriteBtn');
    const rewriteResult = document.getElementById('rewriteResult');
    
    let analysisHistory = [];
    let selectedReport = null;
    let lastSuggestions = '';
    
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
    
    // 检查 aiCore 是否存在
    if (!window.aiCore) {
        console.error('aiCore 未加载！请检查 optimize.html 中的脚本顺序');
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'background: #ffebee; color: #c62828; padding: 12px; margin: 12px; border-radius: 8px;';
        statusDiv.innerHTML = '❌ AI核心模块加载失败，请刷新页面重试';
        document.querySelector('.content')?.prepend(statusDiv);
        return;
    }
    
    // 初始化AI
    console.log('初始化AI...');
    const initSuccess = await window.aiCore.init();
    if (initSuccess) {
        console.log('AI初始化成功，模式:', window.aiCore.getMode?.() || 'unknown');
    } else {
        console.warn('AI初始化失败，将使用模拟模式');
    }
    
    // 加载分析历史
    async function loadAnalysisHistory() {
        try {
            console.log('加载分析历史...');
            const result = await chrome.storage.local.get(['analysisHistory']);
            if (result.analysisHistory && result.analysisHistory.length > 0) {
                analysisHistory = result.analysisHistory;
                console.log(`加载了 ${analysisHistory.length} 条分析记录`);
                
                // 填充下拉框
                reportSelect.innerHTML = '<option value="">-- 请选择一份已分析的简历 --</option>' +
                    analysisHistory.map((record, index) => {
                        const depthName = record.analysisDepth === 'basic' ? '快速' : (record.analysisDepth === 'detailed' ? '深度' : '面试');
                        const fileName = record.fileName || '未知文件';
                        return `<option value="${index}">${fileName} [${depthName}] (${record.localTime})</option>`;
                    }).join('');
            } else {
                console.log('暂无分析记录');
                reportSelect.innerHTML = '<option value="">暂无分析记录，请先分析简历</option>';
            }
        } catch (error) {
            console.error('加载分析历史失败:', error);
            reportSelect.innerHTML = '<option value="">加载失败，请刷新重试</option>';
        }
    }
    
    // 选择报告
    if (reportSelect) {
        reportSelect.addEventListener('change', () => {
            const index = reportSelect.value;
            if (index && analysisHistory[index]) {
                selectedReport = analysisHistory[index];
                optimizeBtn.disabled = false;
                console.log('已选择简历:', selectedReport.fileName);
            } else {
                selectedReport = null;
                optimizeBtn.disabled = true;
            }
        });
    }
    
        if (optimizeBtn) {
        optimizeBtn.addEventListener('click', async () => {
            if (!selectedReport) {
                alert('请选择一份简历');
                return;
            }
            
            // 调试：打印选中的报告内容
            console.log('选中的报告:', {
                fileName: selectedReport.fileName,
                hasResumeText: !!selectedReport.resumeText,
                resumeTextLength: selectedReport.resumeText?.length,
                hasResult: !!selectedReport.result,
                resultLength: selectedReport.result?.length
            });
            
            // 如果没有 resumeText，尝试从其他地方获取
            let resumeText = selectedReport.resumeText;
            if (!resumeText || resumeText.length < 50) {
                console.warn('selectedReport.resumeText 为空或过短');
                
                // 提示用户重新分析
                alert('当前选择的简历缺少原始文本数据。\n\n请返回主界面重新分析这份简历，然后再试。');
                return;
            }
            
            if (!window.resumeOptimizer) {
                alert('简历优化模块未加载');
                return;
            }
            
            thinking.style.display = 'flex';
            resultArea.style.display = 'none';
            exportButtons.style.display = 'none';
            
            try {
                console.log('开始生成优化建议，简历文本长度:', resumeText.length);
                
                const result = await window.resumeOptimizer.generateSuggestions(
                    resumeText,
                    selectedReport.result,
                    targetRole.value
                );
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                lastSuggestions = result.suggestions;
                resultContent.innerHTML = result.suggestions.replace(/\n/g, '<br>');
                resultTime.textContent = new Date().toLocaleString();
                resultArea.style.display = 'block';
                exportButtons.style.display = 'flex';
                
            } catch (error) {
                console.error('生成优化建议失败:', error);
                resultContent.innerHTML = `<div style="color: #d32f2f;">❌ ${error.message}</div>`;
                resultArea.style.display = 'block';
            } finally {
                thinking.style.display = 'none';
            }
        });
    }
    
    // 导出功能
    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', () => {
            if (!lastSuggestions) return;
            
            const content = `# 简历优化建议报告

**生成时间**: ${new Date().toLocaleString()}
**简历文件**: ${selectedReport?.fileName || '未知'}
**目标职位**: ${targetRole.value || '未指定'}

---

${lastSuggestions}

---

*优化建议由AI生成，仅供参考*`;
            
            downloadFile(content, `optimization_${Date.now()}.md`, 'text/markdown');
        });
    }
    
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            if (!lastSuggestions) return;
            
            const content = `简历优化建议报告
生成时间: ${new Date().toLocaleString()}
简历文件: ${selectedReport?.fileName || '未知'}
目标职位: ${targetRole.value || '未指定'}

${lastSuggestions}`;
            
            downloadFile(content, `optimization_${Date.now()}.txt`, 'text/plain');
        });
    }
    
    // 智能改写
    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', async () => {
            const originalText = rewriteInput.value.trim();
            const instruction = rewriteInstruction.value.trim();
            
            if (!originalText) {
                alert('请粘贴需要改写的简历内容');
                return;
            }
            
            if (!instruction) {
                alert('请输入改写指令');
                return;
            }
            
            rewriteBtn.disabled = true;
            rewriteBtn.textContent = '改写中...';
            rewriteResult.style.display = 'none';
            
            try {
                const rewritten = await window.resumeOptimizer.rewriteSection(originalText, instruction);
                rewriteResult.innerHTML = `<strong>✨ 改写结果：</strong><br><br>${rewritten.replace(/\n/g, '<br>')}`;
                rewriteResult.style.display = 'block';
            } catch (error) {
                rewriteResult.innerHTML = `<div style="color: #d32f2f;">❌ 改写失败: ${error.message}</div>`;
                rewriteResult.style.display = 'block';
            } finally {
                rewriteBtn.disabled = false;
                rewriteBtn.textContent = '✨ 智能改写';
            }
        });
    }
    
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
    
    // 初始加载
    await loadAnalysisHistory();
    console.log('简历优化页面初始化完成');
});