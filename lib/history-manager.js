/**
 * 历史记录管理模块
 * 功能：保存、查看、删除简历分析历史
 */

class HistoryManager {
    constructor() {
        this.history = [];
        this.maxRecords = 20; // 最多保存20条记录
    }

    /**
     * 初始化：从存储加载历史
     */
    async init() {
        try {
            const result = await chrome.storage.local.get(['analysisHistory']);
            if (result.analysisHistory && Array.isArray(result.analysisHistory)) {
                this.history = result.analysisHistory;
                console.log(`加载了 ${this.history.length} 条历史记录`);
            }
            return true;
        } catch (error) {
            console.error('加载历史记录失败:', error);
            return false;
        }
    }

    /**
     * 保存一条新记录
     * @param {Object} record - 记录对象
     */
    async saveRecord(record) {
        const newRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString(),
            fileName: record.fileName || '未知文件',
            analysisDepth: record.analysisDepth || 'detailed',
            result: record.result || '',
            resultPreview: (record.result || '').substring(0, 200),
            resumePreview: (record.resumeText || '').substring(0, 100)
        };
        
        this.history.unshift(newRecord);
        
        // 限制数量
        if (this.history.length > this.maxRecords) {
            this.history = this.history.slice(0, this.maxRecords);
        }
        
        await this._saveToStorage();
        console.log('历史记录已保存');
        return newRecord;
    }

    /**
     * 获取所有历史记录
     */
    getAllRecords() {
        return this.history;
    }

    /**
     * 获取单条记录
     * @param {number} id - 记录ID
     */
    getRecord(id) {
        return this.history.find(r => r.id === id);
    }

    /**
     * 删除单条记录
     * @param {number} id - 记录ID
     */
    async deleteRecord(id) {
        this.history = this.history.filter(r => r.id !== id);
        await this._saveToStorage();
        console.log('历史记录已删除');
    }

    /**
     * 清空所有历史
     */
    async clearAll() {
        this.history = [];
        await this._saveToStorage();
        console.log('所有历史记录已清空');
    }

    /**
     * 导出所有历史为JSON
     */
    exportToJSON() {
        const data = {
            exportTime: new Date().toISOString(),
            version: '1.0',
            count: this.history.length,
            records: this.history
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * 导出为Markdown格式
     */
    exportToMarkdown() {
        let md = '# 简历分析历史记录\n\n';
        md += `生成时间: ${new Date().toLocaleString()}\n`;
        md += `记录总数: ${this.history.length}\n\n`;
        md += '---\n\n';
        
        for (const record of this.history) {
            md += `## ${record.fileName}\n`;
            md += `**分析时间**: ${record.localTime}\n`;
            md += `**分析深度**: ${this._getDepthName(record.analysisDepth)}\n\n`;
            md += `### 分析结果摘要\n`;
            md += `${record.resultPreview}\n\n`;
            md += `---\n\n`;
        }
        
        return md;
    }

    /**
     * 获取深度名称
     */
    _getDepthName(depth) {
        const names = {
            'basic': '快速分析',
            'detailed': '深度分析',
            'interview': '面试准备'
        };
        return names[depth] || depth;
    }

    /**
     * 保存到存储
     */
    async _saveToStorage() {
        try {
            await chrome.storage.local.set({ analysisHistory: this.history });
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    }
}

// 创建全局实例
window.historyManager = new HistoryManager();