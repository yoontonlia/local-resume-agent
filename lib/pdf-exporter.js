/**
 * PDF导出模块 v3.0 - 优化版
 * 功能：将HTML简历转换为PDF并下载
 * 使用浏览器原生打印API，支持高质量PDF输出
 */

class PDFExporter {
    constructor() {
        this.exportHistory = [];
    }

    /**
     * 导出HTML为PDF（使用浏览器打印）
     * @param {string} html - HTML字符串
     * @param {string} fileName - 文件名
     * @returns {Promise<{success: boolean, error: string}>}
     */
    async exportToPDF(html, fileName = 'resume.pdf') {
        try {
            // 创建新窗口
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                alert('请允许弹出窗口，或手动点击"打印"按钮\n\n如果被拦截，请点击地址栏旁边的拦截图标选择"始终允许"');
                return { success: false, error: '弹出窗口被拦截' };
            }
            
            // 写入HTML内容
            printWindow.document.write(html);
            printWindow.document.close();
            
            // 等待内容加载完成
            await this._sleep(800);
            
            // 聚焦新窗口
            printWindow.focus();
            
            // 调用打印
            printWindow.print();
            
            // 打印完成后关闭窗口（用户点击取消或保存后）
            printWindow.onafterprint = () => {
                setTimeout(() => {
                    printWindow.close();
                }, 500);
            };
            
            // 保存历史
            this._saveToHistory(fileName);
            
            return { success: true, error: null };
            
        } catch (error) {
            console.error('PDF导出失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 导出为HTML文件（备用方案）
     * @param {string} html - HTML字符串
     * @param {string} fileName - 文件名
     */
    async exportAsHTML(html, fileName = 'resume.html') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, error: null };
    }

    /**
     * 导出结构化数据为PDF
     * @param {object} data - 结构化简历数据
     * @param {string} fileName - 文件名
     */
    async exportStructuredDataToPDF(data, fileName = 'resume.pdf') {
        if (!window.resumeTemplate) {
            throw new Error('简历模板模块未加载');
        }
        
        const html = window.resumeTemplate.generateHTML(data);
        return await this.exportToPDF(html, fileName);
    }

    /**
     * 导出重写后的文本为PDF
     * @param {string} rewrittenText - 重写后的简历文本
     * @param {string} fileName - 文件名
     */
    async exportRewrittenTextToPDF(rewrittenText, fileName = 'optimized_resume.pdf') {
        const html = this._textToHTML(rewrittenText);
        return await this.exportToPDF(html, fileName);
    }

    /**
     * 将纯文本转换为HTML格式（优化版）
     * @private
     */
    _textToHTML(text) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>优化版简历</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei', Roboto, sans-serif;
            padding: 40px;
            background: #e8ecf2;
            color: #1e293b;
        }
        
        .resume-container {
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .resume-content {
            padding: 40px;
        }
        
        /* 打印提示 */
        .print-tip {
            text-align: center;
            margin-bottom: 20px;
            padding: 12px;
            background: #f1f5f9;
            border-radius: 8px;
            color: #475569;
            font-size: 13px;
            border: 1px solid #e2e8f0;
        }
        
        /* 标题样式 */
        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #0f1722;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        
        .subtitle {
            font-size: 16px;
            color: #3b82f6;
            margin-bottom: 16px;
            font-weight: 500;
        }
        
        .contact {
            color: #475569;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 13px;
        }
        
        /* 章节样式 */
        .section {
            margin-bottom: 28px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e2a3a;
            border-left: 4px solid #3b82f6;
            padding-left: 12px;
            margin-bottom: 16px;
        }
        
        /* 工作经历样式 */
        .job-item, .edu-item {
            margin-bottom: 24px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .job-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            flex-wrap: wrap;
            margin-bottom: 8px;
        }
        
        .job-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
        }
        
        .company {
            color: #3b82f6;
            font-weight: 600;
        }
        
        .date {
            font-size: 12px;
            color: #64748b;
        }
        
        .responsibilities {
            padding-left: 20px;
            margin-top: 8px;
        }
        
        .responsibilities li {
            margin-bottom: 6px;
            line-height: 1.6;
            color: #334155;
        }
        
        /* 技能标签 */
        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 8px;
        }
        
        .skill-tag {
            background: #f1f5f9;
            padding: 6px 16px;
            border-radius: 24px;
            font-size: 13px;
            color: #1e293b;
            border: 1px solid #e2e8f0;
        }
        
        /* 纯文本区域 */
        .plain-text {
            white-space: pre-wrap;
            font-family: inherit;
            line-height: 1.7;
            color: #1e293b;
        }
        
        /* 打印样式 */
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .resume-container {
                box-shadow: none;
                border-radius: 0;
                max-width: 100%;
            }
            .resume-content {
                padding: 20px;
            }
            .print-tip {
                display: none;
            }
            .section {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .job-item {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .skill-tag {
                background: #f1f5f9;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="resume-container">
        <div class="resume-content">
            <div class="print-tip">
                💡 提示：按 <strong>Ctrl + P</strong> (Mac: <strong>Cmd + P</strong>) 打开打印对话框<br>
                然后选择「另存为PDF」即可保存为PDF文件
            </div>
            <div class="plain-text">${this._escapeHtml(text)}</div>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * HTML转义
     * @private
     */
    _escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 延迟函数
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 保存导出历史
     * @private
     */
    async _saveToHistory(fileName) {
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString(),
            fileName: fileName
        };
        
        this.exportHistory.unshift(record);
        
        if (this.exportHistory.length > 20) {
            this.exportHistory = this.exportHistory.slice(0, 20);
        }
        
        try {
            await chrome.storage.local.set({ pdfExportHistory: this.exportHistory });
        } catch (e) {
            console.warn('保存导出历史失败:', e);
        }
    }

    /**
     * 获取导出历史
     */
    getHistory() {
        return this.exportHistory;
    }

    /**
     * 加载历史
     */
    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['pdfExportHistory']);
            if (result.pdfExportHistory) {
                this.exportHistory = result.pdfExportHistory;
                console.log(`加载了 ${this.exportHistory.length} 条导出历史`);
            }
        } catch (e) {
            console.warn('加载导出历史失败:', e);
        }
    }

    /**
     * 清除历史
     */
    async clearHistory() {
        this.exportHistory = [];
        await chrome.storage.local.remove(['pdfExportHistory']);
    }
}

// 创建全局实例
window.pdfExporter = new PDFExporter();
window.pdfExporter.loadHistory();