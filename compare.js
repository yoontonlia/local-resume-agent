/**
 * 报告对比页面逻辑
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('报告对比页面加载...');
    
    // 获取DOM元素
    const reportACard = document.getElementById('reportACard');
    const reportBCard = document.getElementById('reportBCard');
    const reportAFile = document.getElementById('reportAFile');
    const reportBFile = document.getElementById('reportBFile');
    const reportATime = document.getElementById('reportATime');
    const reportBTime = document.getElementById('reportBTime');
    const reportAPreview = document.getElementById('reportAPreview');
    const reportBPreview = document.getElementById('reportBPreview');
    const compareBtn = document.getElementById('compareBtn');
    const thinking = document.getElementById('thinking');
    const resultArea = document.getElementById('resultArea');
    const resultTime = document.getElementById('resultTime');
    const resultContent = document.getElementById('resultContent');
    const exportButtons = document.getElementById('exportButtons');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const historyList = document.getElementById('historyList');
    const historyItems = document.getElementById('historyItems');
    const backBtn = document.getElementById('backBtn');
    
    let analysisHistory = [];
    let selectedReportA = null;
    let selectedReportB = null;
    let lastComparisonResult = '';
    
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
        if (!window.aiCore) {
            console.error('❌ aiCore 未加载，请检查 compare.html 中的脚本顺序');
            console.log('请确保脚本顺序为: llm-service.js → ai-core.js → report-comparer.js → compare.js');
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
                console.log('✅ AI初始化成功');
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
            } else {
                console.log('⚠️ 暂无分析记录');
                alert('暂无分析记录，请先在主界面分析简历');
            }
        } catch (error) {
            console.error('❌ 加载分析历史失败:', error);
        }
    }
    
    // 显示报告选择器
    function showReportSelector(target) {
        if (analysisHistory.length === 0) {
            alert('暂无分析记录，请先在主界面分析简历');
            return;
        }
        
        // 构建选项列表
        let optionsText = '';
        analysisHistory.forEach((record, index) => {
            optionsText += `${index + 1}. ${record.fileName || '未知文件'} (${record.localTime || '未知时间'})\n`;
        });
        
        const choice = prompt(`请选择要作为报告${target}的记录：\n\n${optionsText}\n\n输入序号(1-${analysisHistory.length}):`);
        
        if (choice) {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < analysisHistory.length) {
                const record = analysisHistory[index];
                if (target === 'A') {
                    selectedReportA = record;
                    reportAFile.textContent = record.fileName || '未知文件';
                    reportATime.textContent = record.localTime || '未知时间';
                    reportAPreview.textContent = (record.resultPreview || record.result || '').substring(0, 150) + '...';
                    reportACard.classList.add('selected');
                    console.log('✅ 已选择报告A:', record.fileName);
                } else {
                    selectedReportB = record;
                    reportBFile.textContent = record.fileName || '未知文件';
                    reportBTime.textContent = record.localTime || '未知时间';
                    reportBPreview.textContent = (record.resultPreview || record.result || '').substring(0, 150) + '...';
                    reportBCard.classList.add('selected');
                    console.log('✅ 已选择报告B:', record.fileName);
                }
                
                // 启用对比按钮
                compareBtn.disabled = !(selectedReportA && selectedReportB);
            } else {
                alert('无效的序号');
            }
        }
    }
    
    // 选择报告A
    if (reportACard) {
        reportACard.addEventListener('click', () => {
            showReportSelector('A');
        });
    }
    
    // 选择报告B
    if (reportBCard) {
        reportBCard.addEventListener('click', () => {
            showReportSelector('B');
        });
    }
    
    // 对比按钮
    if (compareBtn) {
        compareBtn.addEventListener('click', async () => {
            if (!selectedReportA || !selectedReportB) {
                alert('请先选择两份报告');
                return;
            }
            
            if (!window.reportComparer) {
                alert('报告对比模块未加载');
                return;
            }
            
            thinking.style.display = 'flex';
            resultArea.style.display = 'none';
            exportButtons.style.display = 'none';
            
            try {
                console.log('开始对比报告...');
                const result = await window.reportComparer.compareReports(
                    selectedReportA,
                    selectedReportB
                );
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                lastComparisonResult = result.comparison;
                resultContent.innerHTML = result.comparison.replace(/\n/g, '<br>');
                resultTime.textContent = new Date().toLocaleString();
                resultArea.style.display = 'block';
                exportButtons.style.display = 'flex';
                
                console.log('✅ 对比完成');
                
            } catch (error) {
                console.error('❌ 对比失败:', error);
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
            if (!lastComparisonResult) return;
            
            const content = `# 简历报告对比分析

**生成时间**: ${new Date().toLocaleString()}
**报告A**: ${selectedReportA?.fileName || '未知'}
**报告B**: ${selectedReportB?.fileName || '未知'}

---

${lastComparisonResult}

---

*对比报告由本地AI生成，仅供参考*`;
            
            downloadFile(content, `comparison_${Date.now()}.md`, 'text/markdown');
        });
    }
    
    // 导出TXT
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            if (!lastComparisonResult) return;
            
            const content = `简历报告对比分析
生成时间: ${new Date().toLocaleString()}
报告A: ${selectedReportA?.fileName || '未知'}
报告B: ${selectedReportB?.fileName || '未知'}

${lastComparisonResult}`;
            
            downloadFile(content, `comparison_${Date.now()}.txt`, 'text/plain');
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
    console.log('报告对比页面初始化完成');
});