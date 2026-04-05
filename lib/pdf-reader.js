/**
 * PDF读取模块 - 使用本地pdf.js实现可靠提取
 */

class PDFReader {
    constructor() {
        this.isLoading = false;
        this.lastError = null;
        this.pdfJsLoaded = false;
    }

    /**
     * 加载pdf.js库
     */
    async _loadPdfJs() {
        if (this.pdfJsLoaded) return true;
        
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (typeof pdfjsLib !== 'undefined') {
                this.pdfJsLoaded = true;
                // 配置worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
                resolve(true);
                return;
            }
            
            // 动态加载pdf.js
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('lib/pdf.min.js');
            script.onload = () => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
                this.pdfJsLoaded = true;
                resolve(true);
            };
            script.onerror = () => reject(new Error('pdf.js加载失败'));
            document.head.appendChild(script);
        });
    }

    /**
     * 从PDF文件提取文本
     */
    async extractText(file) {
        // 验证文件
        if (!file || file.type !== 'application/pdf') {
            return {
                success: false,
                text: '',
                pageCount: 0,
                error: '请上传有效的PDF文件'
            };
        }

        if (file.size === 0) {
            return {
                success: false,
                text: '',
                pageCount: 0,
                error: 'PDF文件为空'
            };
        }

        this.isLoading = true;
        this.lastError = null;

        try {
            // 加载pdf.js
            await this._loadPdfJs();
            
            // 读取文件
            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            
            // 使用pdf.js解析
            const result = await this._extractWithPdfJs(arrayBuffer, file);
            
            if (result.success && result.text && result.text.length > 20) {
                return result;
            }
            
            // 降级：尝试二进制提取
            const fallbackResult = await this._extractWithBinarySearch(arrayBuffer, file);
            if (fallbackResult.success && fallbackResult.text && fallbackResult.text.length > 20) {
                return fallbackResult;
            }
            
            // 完全失败
            return {
                success: false,
                text: '',
                pageCount: 0,
                error: `无法从PDF中提取文字内容。

文件: ${file.name}
大小: ${(file.size / 1024).toFixed(2)} KB

可能原因：
1. PDF是扫描件/图片（没有文字层）
2. PDF文件损坏或加密
3. 文件格式异常

建议方案：
✅ 使用"手动粘贴简历内容"文本框
✅ 将PDF内容复制粘贴到输入框
✅ 使用文字版PDF（从Word正常导出）`
            };
            
        } catch (error) {
            this.lastError = error.message;
            return {
                success: false,
                text: '',
                pageCount: 0,
                error: `解析异常: ${error.message}`
            };
        } finally {
            this.isLoading = false;
        }
    }

    async _readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 使用pdf.js提取文本
     */
    async _extractWithPdfJs(arrayBuffer, file) {
        try {
            const loadingTask = pdfjsLib.getDocument({ 
                data: arrayBuffer,
                useSystemFonts: true,
                disableFontFace: false
            });
            const pdf = await loadingTask.promise;
            const pageCount = pdf.numPages;
            let fullText = '';
            
            // 限制最多提取前20页
            const pagesToExtract = Math.min(pageCount, 20);
            
            for (let i = 1; i <= pagesToExtract; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                
                if (pageText.trim()) {
                    fullText += pageText + '\n\n';
                }
            }
            
            const cleanedText = this.cleanText(fullText);
            
            if (cleanedText && cleanedText.length > 20) {
                return {
                    success: true,
                    text: cleanedText,
                    pageCount: pageCount,
                    error: null
                };
            }
            
            return { success: false, text: '', pageCount: 0, error: 'pdf.js未提取到文字' };
            
        } catch (error) {
            console.log('pdf.js解析失败:', error.message);
            return { success: false, text: '', pageCount: 0, error: error.message };
        }
    }

    /**
     * 二进制搜索提取（降级方案）
     */
    async _extractWithBinarySearch(arrayBuffer, file) {
        try {
            const bytes = new Uint8Array(arrayBuffer.slice(0, 200000));
            let text = '';
            let currentChunk = '';
            
            for (let i = 0; i < bytes.length; i++) {
                const code = bytes[i];
                // 可打印ASCII和中文范围
                if ((code >= 32 && code <= 126) || code >= 128) {
                    currentChunk += String.fromCharCode(code);
                } else if (currentChunk.length > 0) {
                    if (currentChunk.length > 3 && /[a-zA-Z\u4e00-\u9fa5]{2,}/.test(currentChunk)) {
                        text += currentChunk + ' ';
                    }
                    currentChunk = '';
                }
            }
            
            // 清理文本
            text = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\.\-\,\;\(\)\:]/g, '');
            text = text.replace(/\s+/g, ' ').trim();
            
            if (text.length > 50) {
                return {
                    success: true,
                    text: text.substring(0, 10000),
                    pageCount: 0,
                    error: null
                };
            }
        } catch (e) {
            console.log('二进制提取失败:', e.message);
        }
        
        return { success: false, text: '', pageCount: 0, error: null };
    }

    /**
     * 清理文本
     */
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            .substring(0, 15000);
    }
}

window.pdfReader = new PDFReader();