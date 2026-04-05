/**
 * 历史记录页面逻辑 - 支持简历分析、岗位匹配、简历优化
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('历史记录页面加载...');
    
    // 获取DOM元素
    const historyList = document.getElementById('historyList');
    const recordCountSpan = document.getElementById('recordCount');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const detailModal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeModal = document.getElementById('closeModal');
    
    let currentRecords = [];
    
    // 加载所有类型的历史记录
    async function loadAllHistory() {
        console.log('开始加载所有历史记录...');
        
        try {
            // 获取三种历史数据
            const analysisResult = await chrome.storage.local.get(['analysisHistory']);
            const matchResult = await chrome.storage.local.get(['jobMatchHistory']);
            const optimizeResult = await chrome.storage.local.get(['optimizationHistory']);
            
            console.log('analysisHistory:', analysisResult.analysisHistory?.length || 0);
            console.log('jobMatchHistory:', matchResult.jobMatchHistory?.length || 0);
            console.log('optimizationHistory:', optimizeResult.optimizationHistory?.length || 0);
            
            // 处理简历分析记录
            const analysisRecords = (analysisResult.analysisHistory || []).map(r => ({
                id: r.id,
                type: 'analysis',
                typeName: '简历分析',
                typeIcon: '📄',
                displayName: r.fileName || '未知文件',
                time: r.localTime || new Date(r.timestamp).toLocaleString(),
                timestamp: r.timestamp || Date.now(),
                preview: (r.resultPreview || r.result || '').substring(0, 200),
                fullContent: r.result || '',
                depth: r.analysisDepth
            }));
            
            // 处理岗位匹配记录
            const matchRecords = (matchResult.jobMatchHistory || []).map(r => ({
                id: r.id,
                type: 'match',
                typeName: '岗位匹配',
                typeIcon: '🎯',
                displayName: r.jobTitle || '职位匹配',
                time: r.localTime || new Date(r.timestamp).toLocaleString(),
                timestamp: r.timestamp || Date.now(),
                preview: (r.resultPreview || '').substring(0, 200),
                fullContent: r.fullResult || '',
                score: r.score
            }));
            
            // 处理简历优化记录
            const optimizeRecords = (optimizeResult.optimizationHistory || []).map(r => ({
                id: r.id,
                type: 'optimize',
                typeName: '简历优化',
                typeIcon: '✏️',
                displayName: r.targetRole || '简历优化建议',
                time: r.localTime || new Date(r.timestamp).toLocaleString(),
                timestamp: r.timestamp || Date.now(),
                preview: (r.suggestionsPreview || '').substring(0, 200),
                fullContent: r.suggestions || ''
            }));
            
            // 合并所有记录
            let allRecords = [...analysisRecords, ...matchRecords, ...optimizeRecords];
            
            // 按时间倒序排序（最新的在前）
            allRecords.sort((a, b) => b.timestamp - a.timestamp);
            
            currentRecords = allRecords;
            renderHistoryList(allRecords);
            
        } catch (error) {
            console.error('加载历史记录失败:', error);
            if (historyList) {
                historyList.innerHTML = '<div class="empty-state">加载失败，请刷新重试</div>';
            }
        }
    }
    
    // 渲染历史列表
    function renderHistoryList(records) {
        console.log('渲染历史列表，共', records.length, '条记录');
        
        if (!historyList) return;
        
        if (records.length === 0) {
            historyList.innerHTML = '<div class="empty-state">暂无任何记录<br>请先使用简历分析、岗位匹配或简历优化功能</div>';
            if (recordCountSpan) recordCountSpan.textContent = '0';
            return;
        }
        
        if (recordCountSpan) recordCountSpan.textContent = records.length;
        
        historyList.innerHTML = records.map(record => `
            <div class="history-item ${record.type}" data-id="${record.id}" data-type="${record.type}">
                <div class="history-item-header">
                    <span class="history-file">${record.typeIcon} ${escapeHtml(record.displayName)}</span>
                    <span class="history-type ${record.type}">${record.typeName}</span>
                </div>
                <div class="history-item-header" style="justify-content: space-between; margin-bottom: 0;">
                    <span class="history-time">${escapeHtml(record.time)}</span>
                    ${record.score ? `<span class="history-score">匹配度: ${record.score}%</span>` : ''}
                    ${record.depth ? `<span class="history-depth">${record.depth === 'basic' ? '快速分析' : record.depth === 'detailed' ? '深度分析' : '面试准备'}</span>` : ''}
                </div>
                <div class="history-preview">
                    ${escapeHtml(record.preview).replace(/\n/g, '<br>')}...
                </div>
                <div class="history-actions">
                    <button class="btn-view" data-id="${record.id}" data-type="${record.type}">查看详情</button>
                    <button class="btn-delete" data-id="${record.id}" data-type="${record.type}">删除</button>
                </div>
            </div>
        `).join('');
        
        // 绑定查看按钮事件
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                const record = currentRecords.find(r => r.id === id && r.type === type);
                if (record) {
                    showDetail(record);
                }
            });
        });
        
        // 绑定删除按钮事件
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                if (confirm('确定要删除这条记录吗？')) {
                    await deleteRecord(id, type);
                    await loadAllHistory();
                }
            });
        });
        
        // 点击整条记录也可以查看详情
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-view') && 
                    !e.target.classList.contains('btn-delete')) {
                    const id = parseInt(item.dataset.id);
                    const type = item.dataset.type;
                    const record = currentRecords.find(r => r.id === id && r.type === type);
                    if (record) {
                        showDetail(record);
                    }
                }
            });
        });
    }
    
    // 显示详情弹窗
    function showDetail(record) {
        if (!record) return;
        
        if (modalTitle) {
            modalTitle.textContent = `${record.typeIcon} ${record.displayName} - ${record.typeName}详情`;
        }
        
        let extraInfo = '';
        if (record.score) {
            extraInfo += `<div style="margin-bottom: 8px;"><strong>匹配度:</strong> ${record.score}%</div>`;
        }
        if (record.depth) {
            const depthName = record.depth === 'basic' ? '快速分析' : (record.depth === 'detailed' ? '深度分析' : '面试准备');
            extraInfo += `<div style="margin-bottom: 8px;"><strong>分析深度:</strong> ${depthName}</div>`;
        }
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="margin-bottom: 12px; color: #666; font-size: 12px;">
                    ${extraInfo}
                    <div><strong>时间:</strong> ${escapeHtml(record.time)}</div>
                    <div><strong>类型:</strong> ${record.typeName}</div>
                </div>
                <div style="border-top: 1px solid #eee; padding-top: 12px; max-height: 400px; overflow-y: auto;">
                    ${(record.fullContent || record.preview || '').replace(/\n/g, '<br>')}
                </div>
            `;
        }
        
        if (detailModal) {
            detailModal.style.display = 'flex';
        }
    }
    
    // 删除记录
    async function deleteRecord(id, type) {
        try {
            let storageKey = '';
            if (type === 'analysis') {
                storageKey = 'analysisHistory';
            } else if (type === 'match') {
                storageKey = 'jobMatchHistory';
            } else if (type === 'optimize') {
                storageKey = 'optimizationHistory';
            } else {
                return;
            }
            
            const result = await chrome.storage.local.get([storageKey]);
            let history = result[storageKey] || [];
            history = history.filter(r => r.id !== id);
            await chrome.storage.local.set({ [storageKey]: history });
            console.log('删除成功:', storageKey);
        } catch (error) {
            console.error('删除失败:', error);
        }
    }
    
    // 导出JSON
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            const data = {
                exportTime: new Date().toISOString(),
                totalCount: currentRecords.length,
                records: currentRecords.map(r => ({
                    type: r.typeName,
                    name: r.displayName,
                    time: r.time,
                    content: r.fullContent || r.preview
                }))
            };
            const json = JSON.stringify(data, null, 2);
            downloadFile(json, `history_${Date.now()}.json`, 'application/json');
        });
    }
    
    // 导出Markdown
    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', () => {
            let md = '# 历史记录汇总\n\n';
            md += `导出时间: ${new Date().toLocaleString()}\n`;
            md += `记录总数: ${currentRecords.length}\n\n`;
            md += '---\n\n';
            
            for (const record of currentRecords) {
                md += `## ${record.typeIcon} ${record.displayName}\n`;
                md += `**类型**: ${record.typeName}\n`;
                md += `**时间**: ${record.time}\n`;
                if (record.score) md += `**匹配度**: ${record.score}%\n`;
                md += `\n### 内容\n\n${record.fullContent || record.preview}\n\n`;
                md += '---\n\n';
            }
            
            downloadFile(md, `history_${Date.now()}.md`, 'text/markdown');
        });
    }
    
    // 清空全部
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            if (confirm('⚠️ 确定要清空所有历史记录吗？此操作不可恢复！\n\n将清除：\n- 所有简历分析记录\n- 所有岗位匹配记录\n- 所有简历优化记录')) {
                await chrome.storage.local.remove([
                    'analysisHistory',
                    'jobMatchHistory',
                    'optimizationHistory'
                ]);
                await loadAllHistory();
                alert('所有历史记录已清除');
            }
        });
    }
    
    // 返回按钮 - 关闭当前标签页
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // 方法1: 尝试关闭标签页
            chrome.tabs.getCurrent((tab) => {
                if (tab && tab.id) {
                    chrome.tabs.remove(tab.id);
                }
            });
        });
    }
    
    // 关闭弹窗
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (detailModal) detailModal.style.display = 'none';
        });
    }
    
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                detailModal.style.display = 'none';
            }
        });
    }
    
    // HTML转义函数
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
    await loadAllHistory();
    console.log('历史记录页面初始化完成');
});