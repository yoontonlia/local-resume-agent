/**
 * 批量分析页面逻辑
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('批量分析页面加载...');
    
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileList = document.getElementById('fileList');
    const startBtn = document.getElementById('startBtn');
    const batchDepth = document.getElementById('batchDepth');
    const progressArea = document.getElementById('progressArea');
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const resultsArea = document.getElementById('resultsArea');
    const exportButtons = document.getElementById('exportButtons');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const backBtn = document.getElementById('backBtn');
    
    let selectedFiles = [];
    
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
            console.error('❌ aiCore 未加载，请检查 batch.html 中的脚本顺序');
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
    
    // 更新文件列表
    function updateFileList() {
        if (selectedFiles.length === 0) {
            fileList.style.display = 'none';
            startBtn.disabled = true;
            return;
        }
        
        fileList.style.display = 'block';
        fileList.innerHTML = selectedFiles.map((file, index) => `
            <div class="file-item">
                <div>
                    <div class="file-name">📄 ${escapeHtml(file.name)}</div>
                    <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button class="remove-file" data-index="${index}">✕</button>
            </div>
        `).join('');
        
        // 绑定删除按钮
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.dataset.index);
                selectedFiles.splice(index, 1);
                updateFileList();
            });
        });
        
        startBtn.disabled = selectedFiles.length === 0;
    }
    
    // 选择文件
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            console.log('点击上传区域');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.multiple = true;
            
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                console.log('选择了', files.length, '个文件');
                if (selectedFiles.length + files.length > 20) {
                    alert('最多支持20个文件');
                    return;
                }
                selectedFiles.push(...files);
                updateFileList();
            };
            
            input.click();
        });
    }
    
    // 拖拽上传
    if (uploadArea) {
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
            const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
            console.log('拖拽了', files.length, '个文件');
            if (selectedFiles.length + files.length > 20) {
                alert('最多支持20个文件');
                return;
            }
            selectedFiles.push(...files);
            updateFileList();
        });
    }
    
    // 开始批量分析
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) {
                alert('请先选择PDF文件');
                return;
            }
            
            if (!window.batchAnalyzer) {
                alert('批量分析模块未加载');
                return;
            }
            
            const depth = batchDepth.value;
            
            // 重置界面
            progressArea.style.display = 'block';
            resultsArea.style.display = 'none';
            resultsArea.innerHTML = '';
            exportButtons.style.display = 'none';
            startBtn.disabled = true;
            
            // 设置回调
            window.batchAnalyzer.setCallbacks(
                // 进度回调
                (progress) => {
                    const percent = (progress.current / progress.total) * 100;
                    progressFill.style.width = `${percent}%`;
                    
                    let statusText = `正在分析: ${progress.fileName} (${progress.current}/${progress.total})`;
                    if (progress.status === 'completed') {
                        statusText = `✅ 完成: ${progress.fileName}`;
                    } else if (progress.status === 'failed') {
                        statusText = `❌ 失败: ${progress.fileName} - ${progress.error}`;
                    }
                    progressStatus.textContent = statusText;
                },
                // 完成回调
                (summary) => {
                    progressStatus.textContent = `✅ 分析完成！成功: ${summary.successCount}, 失败: ${summary.failCount}`;
                    displayResults(summary.results);
                    startBtn.disabled = false;
                    exportButtons.style.display = 'flex';
                },
                // 错误回调
                (error) => {
                    progressStatus.textContent = `❌ 错误: ${error}`;
                    startBtn.disabled = false;
                }
            );
            
            try {
                await window.batchAnalyzer.analyzeBatch(selectedFiles, depth);
            } catch (error) {
                console.error('批量分析失败:', error);
                progressStatus.textContent = `❌ 分析失败: ${error.message}`;
                startBtn.disabled = false;
            }
        });
    }
    
        // 显示结果
    function displayResults(results) {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        let html = `
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number">${results.length}</div>
                    <div class="stat-label">总数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number" style="color: #4caf50;">${successCount}</div>
                    <div class="stat-label">成功</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number" style="color: #f44336;">${failCount}</div>
                    <div class="stat-label">失败</div>
                </div>
            </div>
        `;
        
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const resultId = `result_${i}_${Date.now()}`;
            
            html += `
                <div class="result-item ${result.success ? 'result-success' : 'result-fail'}" id="${resultId}">
                    <div class="result-header">
                        <span class="result-file">📄 ${escapeHtml(result.fileName)}</span>
                        <span class="result-status ${result.success ? 'status-success' : 'status-fail'}">
                            ${result.success ? '✅ 成功' : '❌ 失败'}
                        </span>
                    </div>
                    ${result.success ? `
                        <div class="result-preview" id="${resultId}_preview">
                            ${escapeHtml(result.result).substring(0, 300)}${result.result.length > 300 ? '...' : ''}
                        </div>
                        ${result.result.length > 300 ? `<button class="btn-toggle-full" data-target="${resultId}" style="margin-top: 8px; padding: 4px 12px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📖 查看完整内容</button>` : ''}
                        <div class="result-full" id="${resultId}_full" style="display: none; margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; max-height: 400px; overflow-y: auto; font-size: 12px; line-height: 1.5; white-space: pre-wrap;">
                            ${escapeHtml(result.result).replace(/\n/g, '<br>')}
                        </div>
                    ` : `
                        <div class="result-preview" style="color: #f44336;">
                            错误: ${escapeHtml(result.error)}
                        </div>
                    `}
                </div>
            `;
        }
        
        resultsArea.innerHTML = html;
        resultsArea.style.display = 'block';
        
        // 绑定展开/收起按钮事件
        document.querySelectorAll('.btn-toggle-full').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.dataset.target;
                const fullDiv = document.getElementById(`${targetId}_full`);
                const previewDiv = document.getElementById(`${targetId}_preview`);
                
                if (fullDiv.style.display === 'none') {
                    fullDiv.style.display = 'block';
                    btn.textContent = '📖 收起完整内容';
                } else {
                    fullDiv.style.display = 'none';
                    btn.textContent = '📖 查看完整内容';
                }
            });
        });
    }
    
    // 导出JSON
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (window.batchAnalyzer) {
                window.batchAnalyzer.exportResults('json');
            }
        });
    }
    
    // 导出Markdown
    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', () => {
            if (window.batchAnalyzer) {
                window.batchAnalyzer.exportResults('md');
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
    
    // 初始化AI
    await initAI();
    console.log('批量分析页面初始化完成');
});