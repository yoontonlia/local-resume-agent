/**
 * 报告导出模块
 * 功能：将分析结果导出为 Markdown 或 TXT 文件
 */

class ReportExporter {
    
    /**
     * 导出简历分析报告
     * @param {string} analysisResult - 分析结果文本
     * @param {string} fileName - 原始简历文件名
     * @param {string} format - 导出格式: 'txt' 或 'md'
     */
    exportResumeReport(analysisResult, fileName, format = 'md') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const baseName = fileName.replace(/\.pdf$/i, '');
        
        let content = '';
        let extension = '';
        
        if (format === 'md') {
            content = this._formatAsMarkdown(analysisResult, baseName, timestamp);
            extension = 'md';
        } else {
            content = this._formatAsText(analysisResult, baseName, timestamp);
            extension = 'txt';
        }
        
        this._downloadFile(content, `${baseName}_分析报告_${timestamp}.${extension}`);
        return true;
    }
    
    /**
     * 导出职位匹配报告
     * @param {string} matchResult - 匹配结果文本
     * @param {string} jobTitle - 职位名称
     */
    exportMatchReport(matchResult, jobTitle) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const safeTitle = jobTitle.replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
        
        const content = this._formatAsMarkdown(matchResult, safeTitle, timestamp, '职位匹配');
        this._downloadFile(content, `${safeTitle}_匹配报告_${timestamp}.md`);
        return true;
    }
    
    /**
     * 格式化为 Markdown
     * @private
     */
    _formatAsMarkdown(content, title, timestamp, type = '简历分析') {
        return `# ${title} - ${type}报告

**生成时间**: ${new Date().toLocaleString()}
**工具**: 本地简历智能分析助手
**隐私**: 所有数据本地处理，未上传任何服务器

---

${content}

---

*报告由本地AI生成，仅供参考*
`;
    }
    
    /**
     * 格式化为纯文本
     * @private
     */
    _formatAsText(content, title, timestamp) {
        return `========================================
${title} - 简历分析报告
生成时间: ${new Date().toLocaleString()}
========================================

${content}

========================================
报告由本地AI生成，仅供参考
========================================`;
    }
    
    /**
     * 下载文件
     * @private
     */
    _downloadFile(content, fileName) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

window.reportExporter = new ReportExporter();