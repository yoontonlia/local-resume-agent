/**
 * 网页内容提取模块
 * 功能：从当前浏览器标签页提取招聘信息
 */

class WebExtractor {
    constructor() {
        this.lastExtracted = null;
    }

    /**
     * 从当前标签页提取内容
     * @returns {Promise<{success: boolean, content: string, source: string, error?: string}>}
     */
    async extractFromCurrentTab() {
        try {
            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('无法获取当前标签页');
            }

            console.log('当前标签页:', tab.url);

            // 检查是否可以访问该页面
            const isInternalPage = !tab.url || 
                tab.url.startsWith('chrome://') || 
                tab.url.startsWith('edge://') ||
                tab.url.startsWith('about:') ||
                tab.url.startsWith('chrome-extension://');
            
            if (isInternalPage) {
                console.log('内部页面，使用演示模式');
                return this._getDemoContent('当前为浏览器内部页面，无法提取。这是演示数据。');
            }

            // 注入脚本提取页面内容 - 使用函数字符串方式
            const extractFunction = this._getExtractFunctionString();
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: new Function(extractFunction)
            });

            if (!results || !results[0] || !results[0].result) {
                throw new Error('页面内容提取失败：无返回结果');
            }

            const extracted = results[0].result;
            console.log('提取结果:', extracted);
            
            if (!extracted.content || extracted.content.length < 50) {
                console.log('提取内容过少，使用演示模式');
                return this._getDemoContent('当前页面未检测到职位描述信息。这是演示数据。');
            }
            
            this.lastExtracted = extracted;
            
            return {
                success: true,
                content: extracted.content,
                source: extracted.source,
                url: tab.url,
                title: tab.title
            };

        } catch (error) {
            console.error('网页提取失败:', error);
            return this._getDemoContent(`提取失败: ${error.message}`);
        }
    }

    /**
     * 获取提取函数的字符串表示（用于注入）
     * @private
     */
        _getExtractFunctionString() {
        return `
            (function() {
                try {
                    const url = window.location.href;
                    let content = '';
                    let source = 'unknown';
                    
                    console.log('开始提取页面内容, URL:', url);
                    
                    // ========== 智能通用提取（不依赖特定选择器） ==========
                    
                    // 1. 尝试获取页面标题作为职位名称
                    const title = document.title;
                    if (title && title.length > 0) {
                        content += '职位名称：' + title.replace(/[-|].*$/, '').trim() + '\\n';
                    }
                    
                    // 2. 查找包含"薪资"、"要求"、"职责"等关键词的区域
                    const keywords = ['薪资', '待遇', '要求', '职责', '描述', '任职', '岗位', '工作内容', '职位描述'];
                    const allTextNodes = [];
                    
                    // 遍历所有元素，找到包含关键词的父容器
                    const allElements = document.querySelectorAll('div, section, article, .content, .main');
                    let bestContainer = null;
                    let maxKeywordCount = 0;
                    
                    for (const el of allElements) {
                        const text = el.textContent;
                        if (text.length > 200 && text.length < 10000) {
                            let keywordCount = 0;
                            for (const kw of keywords) {
                                if (text.includes(kw)) keywordCount++;
                            }
                            if (keywordCount > maxKeywordCount) {
                                maxKeywordCount = keywordCount;
                                bestContainer = el;
                            }
                        }
                    }
                    
                    // 3. 如果找到了包含关键词的容器，提取其内容
                    if (bestContainer && maxKeywordCount >= 2) {
                        source = 'smart_extract';
                        let extractedText = bestContainer.textContent.trim();
                        // 清理多余空白
                        extractedText = extractedText.replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n');
                        content += '\\n职位描述：\\n' + extractedText;
                    } else {
                        // 4. 降级方案：获取页面主体内容
                        source = 'body_extract';
                        let bodyText = document.body.textContent.trim();
                        // 移除脚本和样式内容
                        bodyText = bodyText.replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '');
                        bodyText = bodyText.replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '');
                        // 清理多余空白
                        bodyText = bodyText.replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n');
                        // 限制长度
                        if (bodyText.length > 6000) {
                            bodyText = bodyText.substring(0, 6000);
                        }
                        content += '\\n页面内容：\\n' + bodyText;
                    }
                    
                    // 5. 如果内容仍然太少，尝试获取所有可见文本
                    if (content.length < 200) {
                        source = 'fallback';
                        const walker = document.createTreeWalker(
                            document.body,
                            NodeFilter.SHOW_TEXT,
                            {
                                acceptNode: function(node) {
                                    if (node.parentElement && 
                                        window.getComputedStyle(node.parentElement).display !== 'none' &&
                                        node.textContent.trim().length > 0) {
                                        return NodeFilter.FILTER_ACCEPT;
                                    }
                                    return NodeFilter.FILTER_REJECT;
                                }
                            }
                        );
                        
                        let texts = [];
                        while (walker.nextNode()) {
                            const text = walker.currentNode.textContent.trim();
                            if (text.length > 20) {
                                texts.push(text);
                            }
                        }
                        content = texts.join('\\n\\n');
                    }
                    
                    // 清理最终内容
                    content = content.replace(/\\n{3,}/g, '\\n\\n');
                    if (content.length > 8000) {
                        content = content.substring(0, 8000) + '\\n... (内容已截断)';
                    }
                    
                    console.log('提取完成, 来源:', source, '内容长度:', content.length);
                    
                    return { content: content, source: source };
                    
                } catch(e) {
                    console.error('提取函数内部错误:', e);
                    return { content: '提取失败: ' + e.message, source: 'error' };
                }
            })();
        `;
    }

    /**
     * 获取演示模式内容
     * @private
     */
    _getDemoContent(hint = '') {
        return {
            success: true,
            content: `【演示模式 - 职位描述示例】

职位名称：资深前端开发工程师

公司：某知名互联网科技公司

工作职责：
1. 负责公司核心产品的前端架构设计与开发
2. 参与技术方案评审，带领前端团队技术攻关
3. 优化前端性能，提升用户体验
4. 与产品、设计、后端团队紧密协作

任职要求：
1. 5年以上前端开发经验，2年以上架构设计经验
2. 精通 React/Vue 框架及其生态
3. 熟悉 TypeScript、Webpack、Node.js
4. 有大型项目性能优化经验
5. 计算机相关专业本科及以上学历

薪资范围：30-50K·15薪
工作地点：北京市朝阳区

${hint ? `\n[提示] ${hint}` : '\n[提示] 点击"从当前网页提取"按钮可从招聘网站获取真实职位信息。'}`,
            source: 'demo',
            url: '',
            title: '演示模式'
        };
    }

    /**
     * 获取最后提取的内容
     */
    getLastExtracted() {
        return this.lastExtracted;
    }

    /**
     * 将提取的内容填充到职位描述框
     * @param {HTMLTextAreaElement} textarea - 目标文本框
     */
    async fillToTextarea(textarea) {
        const result = await this.extractFromCurrentTab();
        
        if (result.success && result.content) {
            textarea.value = result.content;
            // 触发input事件，更新按钮状态
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            return { success: true, source: result.source };
        } else {
            return { success: false, error: result.error };
        }
    }
}

// 创建全局实例
window.webExtractor = new WebExtractor();