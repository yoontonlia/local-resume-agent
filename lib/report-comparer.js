/**
 * 报告对比模块
 * 功能：对比两份简历分析报告，找出差异和各自优势
 */

class ReportComparer {
    constructor() {
        this.comparisonHistory = [];
    }

    /**
     * 对比两份报告
     * @param {Object} reportA - 第一份报告 {fileName, result, timestamp}
     * @param {Object} reportB - 第二份报告 {fileName, result, timestamp}
     * @returns {Promise<{success: boolean, comparison: string, error: string}>}
     */
    async compareReports(reportA, reportB) {
        if (!reportA || !reportB) {
            return {
                success: false,
                comparison: '',
                error: '请选择两份报告进行对比'
            };
        }

        if (!reportA.result || reportA.result.length < 50) {
            return {
                success: false,
                comparison: '',
                error: `${reportA.fileName} 的报告内容过少`
            };
        }

        if (!reportB.result || reportB.result.length < 50) {
            return {
                success: false,
                comparison: '',
                error: `${reportB.fileName} 的报告内容过少`
            };
        }

        try {
            const comparison = await this._performComparison(reportA, reportB);
            
            // 保存对比历史
            this._saveToHistory(reportA, reportB, comparison);
            
            return {
                success: true,
                comparison: comparison,
                error: null
            };
        } catch (error) {
            console.error('报告对比失败:', error);
            return {
                success: false,
                comparison: '',
                error: `对比失败: ${error.message}`
            };
        }
    }

    /**
     * 执行AI对比分析
     * @private
     */
    async _performComparison(reportA, reportB) {
        const prompt = `你是一位资深招聘专家和人才评估顾问。请对以下两份简历分析报告进行全面对比。

【报告A - ${reportA.fileName}】
${reportA.result.substring(0, 4000)}

【报告B - ${reportB.fileName}】
${reportB.result.substring(0, 4000)}

请严格按照以下模板输出对比分析：

## 📊 综合对比总览

| 对比维度 | ${reportA.fileName} | ${reportB.fileName} |
|----------|---------------------|---------------------|
| 综合评分 | X/10 | X/10 |
| 核心优势数量 | X个 | X个 |
| 主要短板数量 | X个 | X个 |

## ✅ 各自核心优势

### ${reportA.fileName}
1. **优势点1**：(具体说明)
2. **优势点2**：(具体说明)
3. **优势点3**：(具体说明)

### ${reportB.fileName}
1. **优势点1**：(具体说明)
2. **优势点2**：(具体说明)
3. **优势点3**：(具体说明)

## ⚠️ 各自待提升领域

### ${reportA.fileName}
1. **短板1**：(具体说明)
2. **短板2**：(具体说明)

### ${reportB.fileName}
1. **短板1**：(具体说明)
2. **短板2**：(具体说明)

## 🎯 差异化分析

### ${reportA.fileName} 相对优势
- 具体说明A比B强的地方

### ${reportB.fileName} 相对优势
- 具体说明B比A强的地方

## 💡 综合建议

### 针对 ${reportA.fileName}
（基于对比结果的求职或发展建议）

### 针对 ${reportB.fileName}
（基于对比结果的求职或发展建议）

### 整体评价
（总结性评价，说明两人的互补性或适用场景差异）

请确保分析客观、具体、有建设性。`;

        const systemPrompt = '你是专业的人才评估专家，擅长对比分析候选人的优劣势，输出要结构化、客观、有洞察。';
        
        return await window.aiCore.prompt(prompt, { systemPrompt });
    }

    /**
     * 快速对比（仅输出核心差异）
     * @private
     */
    async _quickComparison(reportA, reportB) {
        const prompt = `请快速对比以下两份简历分析报告的核心差异：

报告A(${reportA.fileName}): ${reportA.result.substring(0, 800)}
报告B(${reportB.fileName}): ${reportB.result.substring(0, 800)}

请输出：
1. 两人最突出的差异点（1-2点）
2. 谁更适合技术岗？
3. 谁更适合管理岗？
4. 一句话总结`;

        return await window.aiCore.prompt(prompt);
    }

    /**
     * 保存对比历史
     * @private
     */
    async _saveToHistory(reportA, reportB, comparison) {
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString(),
            fileA: reportA.fileName,
            fileB: reportB.fileName,
            comparisonPreview: comparison.substring(0, 200)
        };
        
        this.comparisonHistory.unshift(record);
        
        // 保留最近20条
        if (this.comparisonHistory.length > 20) {
            this.comparisonHistory = this.comparisonHistory.slice(0, 20);
        }
        
        try {
            await chrome.storage.local.set({ comparisonHistory: this.comparisonHistory });
        } catch (e) {
            console.warn('保存对比历史失败:', e);
        }
    }

    /**
     * 获取对比历史
     */
    getHistory() {
        return this.comparisonHistory;
    }

    /**
     * 加载历史
     */
    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['comparisonHistory']);
            if (result.comparisonHistory) {
                this.comparisonHistory = result.comparisonHistory;
            }
        } catch (e) {
            console.warn('加载对比历史失败:', e);
        }
    }

    /**
     * 清除历史
     */
    async clearHistory() {
        this.comparisonHistory = [];
        try {
            await chrome.storage.local.remove(['comparisonHistory']);
        } catch (e) {
            console.warn('清除对比历史失败:', e);
        }
    }
}

window.reportComparer = new ReportComparer();
window.reportComparer.loadHistory();