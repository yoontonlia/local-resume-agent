/**
 * 批量简历分析模块
 * 功能：支持多文件上传、批量AI分析、进度跟踪、结果汇总
 */

class BatchAnalyzer {
    constructor() {
        this.isProcessing = false;
        this.currentBatch = [];
        this.results = [];
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * 设置回调函数
     */
    setCallbacks(progressCallback, completeCallback, errorCallback) {
        this.onProgress = progressCallback;
        this.onComplete = completeCallback;
        this.onError = errorCallback;
    }

    /**
     * 批量分析简历
     * @param {Array} files - PDF文件数组
     * @param {string} depth - 分析深度
     */
    async analyzeBatch(files, depth = 'detailed') {
        if (this.isProcessing) {
            throw new Error('已有分析任务进行中，请等待完成');
        }

        this.isProcessing = true;
        this.currentBatch = files;
        this.results = [];
        
        const total = files.length;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // 更新进度
                if (this.onProgress) {
                    this.onProgress({
                        current: i + 1,
                        total: total,
                        fileName: file.name,
                        status: 'processing'
                    });
                }
                
                try {
                    // ========== 关键：设置全局文件名（用于历史记录） ==========
                    window.currentFileName = file.name;
                    console.log('批量分析设置文件名:', window.currentFileName);
                    
                    // 提取PDF文本
                    const extractResult = await window.pdfReader.extractText(file);
                    
                    if (!extractResult.success || !extractResult.text || extractResult.text.length < 20) {
                        this.results.push({
                            fileName: file.name,
                            success: false,
                            error: extractResult.error || 'PDF内容过少',
                            result: null
                        });
                        
                        if (this.onProgress) {
                            this.onProgress({
                                current: i + 1,
                                total: total,
                                fileName: file.name,
                                status: 'failed',
                                error: extractResult.error
                            });
                        }
                        continue;
                    }
                    
                    // AI分析
                    const analysisResult = await window.resumeAnalyzer.analyze(extractResult.text, depth);
                    
                    if (!analysisResult.success) {
                        this.results.push({
                            fileName: file.name,
                            success: false,
                            error: analysisResult.error,
                            result: null
                        });
                        
                        if (this.onProgress) {
                            this.onProgress({
                                current: i + 1,
                                total: total,
                                fileName: file.name,
                                status: 'failed',
                                error: analysisResult.error
                            });
                        }
                        continue;
                    }
                    
                    // 保存成功结果
                    this.results.push({
                        fileName: file.name,
                        success: true,
                        error: null,
                        result: analysisResult.result,
                        textPreview: extractResult.text.substring(0, 200)
                    });
                    
                    if (this.onProgress) {
                        this.onProgress({
                            current: i + 1,
                            total: total,
                            fileName: file.name,
                            status: 'completed'
                        });
                    }
                    
                } catch (error) {
                    this.results.push({
                        fileName: file.name,
                        success: false,
                        error: error.message,
                        result: null
                    });
                    
                    if (this.onProgress) {
                        this.onProgress({
                            current: i + 1,
                            total: total,
                            fileName: file.name,
                            status: 'failed',
                            error: error.message
                        });
                    }
                }
                
                // 添加小延迟，避免过载
                await this._delay(500);
            }
            
            // 完成回调
            if (this.onComplete) {
                this.onComplete({
                    total: total,
                    successCount: this.results.filter(r => r.success).length,
                    failCount: this.results.filter(r => !r.success).length,
                    results: this.results
                });
            }
            
            // 清除全局文件名
            window.currentFileName = null;
            
            return this.results;
            
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 取消批量分析
     */
    cancel() {
        this.isProcessing = false;
        this.currentBatch = [];
    }

    /**
     * 导出批量分析结果
     * @param {string} format - 导出格式: 'json' 或 'md'
     */
    exportResults(format = 'json') {
        if (this.results.length === 0) {
            throw new Error('没有可导出的结果');
        }
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        if (format === 'json') {
            const data = {
                exportTime: new Date().toISOString(),
                totalCount: this.results.length,
                successCount: this.results.filter(r => r.success).length,
                failCount: this.results.filter(r => !r.success).length,
                results: this.results.map(r => ({
                    fileName: r.fileName,
                    success: r.success,
                    error: r.error,
                    result: r.result ? r.result.substring(0, 2000) : null
                }))
            };
            this._downloadFile(JSON.stringify(data, null, 2), `batch_results_${timestamp}.json`, 'application/json');
        } else {
            let md = '# 批量简历分析报告\n\n';
            md += `生成时间: ${new Date().toLocaleString()}\n`;
            md += `总数: ${this.results.length}\n`;
            md += `成功: ${this.results.filter(r => r.success).length}\n`;
            md += `失败: ${this.results.filter(r => !r.success).length}\n\n`;
            md += '---\n\n';
            
            for (let i = 0; i < this.results.length; i++) {
                const r = this.results[i];
                md += `## ${i + 1}. ${r.fileName}\n\n`;
                if (r.success) {
                    md += `**状态**: ✅ 成功\n\n`;
                    md += `### 分析结果\n\n`;
                    md += `${r.result}\n\n`;
                } else {
                    md += `**状态**: ❌ 失败\n\n`;
                    md += `**错误**: ${r.error}\n\n`;
                }
                md += '---\n\n';
            }
            
            this._downloadFile(md, `batch_results_${timestamp}.md`, 'text/markdown');
        }
    }

    _downloadFile(content, fileName, mimeType) {
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

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getResults() {
        return this.results;
    }
}

window.batchAnalyzer = new BatchAnalyzer();