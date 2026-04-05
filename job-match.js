/**
 * 岗位匹配页面逻辑 - 完整修复版
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('岗位匹配页面加载...');
    
    // 获取DOM元素
    const reportSelect = document.getElementById('reportSelect');
    const jobUrl = document.getElementById('jobUrl');
    const jobDescription = document.getElementById('jobDescription');
    const extractFromWebBtn = document.getElementById('extractFromWebBtn');
    const matchBtn = document.getElementById('matchBtn');
    const thinking = document.getElementById('thinking');
    const resultArea = document.getElementById('resultArea');
    const resultTime = document.getElementById('resultTime');
    const resultContent = document.getElementById('resultContent');
    const scoreBadge = document.getElementById('scoreBadge');
    const exportButtons = document.getElementById('exportButtons');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const backBtn = document.getElementById('backBtn');
    
    let analysisHistory = [];
    let selectedReport = null;
    let lastMatchResult = '';
    let lastScore = 0;
    
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
    
    // 初始化AI（带错误处理）
    async function initAI() {
        // 检查依赖是否存在
        if (!window.aiCore) {
            console.error('❌ aiCore 未加载，请检查 job-match.html 中的脚本顺序');
            console.log('请确保脚本顺序为: llm-service.js → ai-core.js → ... → job-match.js');
            return false;
        }
        
        if (!window.llmService) {
            console.error('❌ llmService 未加载');
            return false;
        }
        
        try {
            console.log('正在初始化AI...');
            const success = await window.aiCore.init();
            if (success) {
                console.log('✅ AI初始化成功，模式:', window.aiCore.getMode?.() || 'unknown');
            } else {
                console.warn('⚠️ AI初始化失败，将使用模拟模式');
            }
            return success;
        } catch (error) {
            console.error('❌ AI初始化出错:', error);
            return false;
        }
    }
    
    // 加载分析历史
    async function loadAnalysisHistory() {
        try {
            console.log('加载分析历史...');
            const result = await chrome.storage.local.get(['analysisHistory']);
            if (result.analysisHistory && result.analysisHistory.length > 0) {
                analysisHistory = result.analysisHistory;
                console.log(`✅ 加载了 ${analysisHistory.length} 条分析记录`);
                
                // 打印每条记录
                analysisHistory.forEach((record, i) => {
                    console.log(`  记录 ${i + 1}: ${record.fileName || '未知文件'} (${record.localTime || '未知时间'})`);
                });
                
                // 填充下拉框
                if (reportSelect) {
                    reportSelect.innerHTML = '<option value="">-- 请选择一份已分析的简历 --</option>' +
                        analysisHistory.map((record, index) => {
                            const depthName = record.analysisDepth === 'basic' ? '快速' : (record.analysisDepth === 'detailed' ? '深度' : '面试');
                            const fileName = record.fileName || '未知文件';
                            return `<option value="${index}">${fileName} [${depthName}] (${record.localTime})</option>`;
                        }).join('');
                }
            } else {
                console.log('⚠️ 暂无分析记录');
                if (reportSelect) {
                    reportSelect.innerHTML = '<option value="">暂无分析记录，请先分析简历</option>';
                }
                alert('暂无分析记录，请先在主界面分析简历');
            }
        } catch (error) {
            console.error('❌ 加载分析历史失败:', error);
            if (reportSelect) {
                reportSelect.innerHTML = '<option value="">加载失败，请刷新重试</option>';
            }
        }
    }
    
    // 选择报告
    if (reportSelect) {
        reportSelect.addEventListener('change', () => {
            const index = reportSelect.value;
            if (index && analysisHistory[index]) {
                selectedReport = analysisHistory[index];
                matchBtn.disabled = false;
                console.log('已选择简历:', selectedReport.fileName);
            } else {
                selectedReport = null;
                matchBtn.disabled = true;
            }
        });
    }
    
    // 从网页提取
    if (extractFromWebBtn) {
        extractFromWebBtn.addEventListener('click', async () => {
            if (!window.webExtractor) {
                alert('网页提取模块未加载');
                return;
            }
            
            extractFromWebBtn.disabled = true;
            extractFromWebBtn.textContent = '⏳ 提取中...';
            
            try {
                const result = await window.webExtractor.fillToTextarea(jobDescription);
                if (result.success) {
                    console.log('提取成功，内容长度:', jobDescription.value.length);
                    // 触发input事件，更新按钮状态
                    jobDescription.dispatchEvent(new Event('input'));
                    alert(`✅ 提取成功！已填充 ${jobDescription.value.length} 字符`);
                } else {
                    alert(`提取失败: ${result.error}`);
                }
            } catch (error) {
                console.error('提取失败:', error);
                alert(`提取失败: ${error.message}`);
            } finally {
                extractFromWebBtn.disabled = false;
                extractFromWebBtn.textContent = '🌐 从当前网页提取';
            }
        });
    }
    
    // 职位描述输入时检查按钮状态
    if (jobDescription) {
        jobDescription.addEventListener('input', () => {
            const hasJD = jobDescription.value.trim().length >= 50;
            const hasResume = selectedReport !== null;
            if (matchBtn) {
                matchBtn.disabled = !(hasJD && hasResume);
            }
        });
    }
    
    // 匹配按钮
    if (matchBtn) {
        matchBtn.addEventListener('click', async () => {
            if (!selectedReport) {
                alert('请先选择一份简历');
                return;
            }
            
            const jd = jobDescription.value.trim();
            if (!jd || jd.length < 50) {
                alert('请粘贴完整的职位描述（至少50字符）');
                return;
            }
            
            // 获取简历文本
            let resumeText = selectedReport.resumeText;
            if (!resumeText || resumeText.length < 50) {
                console.warn('selectedReport.resumeText 为空或过短', {
                    hasResumeText: !!resumeText,
                    length: resumeText?.length
                });
                alert('当前选择的简历缺少原始文本数据。\n\n请返回主界面重新分析这份简历，然后再试。');
                return;
            }
            
            if (!window.jobMatcherEnhanced) {
                alert('岗位匹配模块未加载');
                return;
            }
            
            thinking.style.display = 'flex';
            resultArea.style.display = 'none';
            exportButtons.style.display = 'none';
            
            try {
                console.log('开始岗位匹配分析...');
                const result = await window.jobMatcherEnhanced.matchJob(
                    resumeText,
                    jd,
                    jobUrl.value.trim()
                );
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                lastMatchResult = result.analysis;
                lastScore = result.score;
                
                resultContent.innerHTML = result.analysis.replace(/\n/g, '<br>');
                resultTime.textContent = new Date().toLocaleString();
                if (scoreBadge) scoreBadge.textContent = `${result.score}%`;
                resultArea.style.display = 'block';
                exportButtons.style.display = 'flex';
                
                console.log('✅ 匹配分析完成，匹配度:', result.score);
                
            } catch (error) {
                console.error('匹配失败:', error);
                resultContent.innerHTML = `<div style="color: #d32f2f;">❌ ${error.message}</div>`;
                resultArea.style.display = 'block';
            } finally {
                thinking.style.display = 'none';
            }
        });
    }
    
    // 导出Markdown
    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', () => {
            if (!lastMatchResult) return;
            
            const content = `# 岗位匹配分析报告

**生成时间**: ${new Date().toLocaleString()}
**简历文件**: ${selectedReport?.fileName || '未知'}
**职位链接**: ${jobUrl?.value?.trim() || '未提供'}

**综合匹配度**: ${lastScore}%

---

${lastMatchResult}

---

*匹配分析报告由AI生成，仅供参考*`;
            
            downloadFile(content, `job_match_${Date.now()}.md`, 'text/markdown');
        });
    }
    
    // 导出TXT
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            if (!lastMatchResult) return;
            
            const content = `岗位匹配分析报告
生成时间: ${new Date().toLocaleString()}
简历文件: ${selectedReport?.fileName || '未知'}
职位链接: ${jobUrl?.value?.trim() || '未提供'}
综合匹配度: ${lastScore}%

${lastMatchResult}`;
            
            downloadFile(content, `job_match_${Date.now()}.txt`, 'text/plain');
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
    
    // 初始化AI并加载数据
    await initAI();
    await loadAnalysisHistory();
    console.log('岗位匹配页面初始化完成');
});