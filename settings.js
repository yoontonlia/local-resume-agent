/**
 * 配置页面逻辑
 */

document.addEventListener('DOMContentLoaded', async () => {
    const providerSelect = document.getElementById('provider');
    const apiUrlGroup = document.getElementById('apiUrlGroup');
    const apiUrl = document.getElementById('apiUrl');
    const apiKey = document.getElementById('apiKey');
    const model = document.getElementById('model');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDiv = document.getElementById('status');
    const backBtn = document.getElementById('backBtn');
    const apiKeyHelp = document.getElementById('apiKeyHelp');
    
    // 返回按钮
    backBtn.addEventListener('click', () => {
        window.close();
    });
    
    // 提供商切换时，更新帮助文本和显示自定义URL
    providerSelect.addEventListener('change', () => {
        const provider = providerSelect.value;
        
        if (provider === 'custom') {
            apiUrlGroup.style.display = 'block';
            apiKeyHelp.textContent = '填写您的API Key';
        } else {
            apiUrlGroup.style.display = 'none';
            if (provider === 'deepseek') {
                apiKeyHelp.innerHTML = 'DeepSeek Key 获取：<a href="https://platform.deepseek.com/api_keys" target="_blank">https://platform.deepseek.com/api_keys</a>';
            } else if (provider === 'openai') {
                apiKeyHelp.innerHTML = 'OpenAI Key 获取：<a href="https://platform.openai.com/api-keys" target="_blank">https://platform.openai.com/api-keys</a>';
            }
        }
    });
    
    // 加载已保存的配置
    await loadConfig();
    
    async function loadConfig() {
        const result = await chrome.storage.local.get(['llmConfig']);
        if (result.llmConfig) {
            const config = result.llmConfig;
            providerSelect.value = config.provider || 'deepseek';
            if (config.apiUrl) apiUrl.value = config.apiUrl;
            apiKey.value = config.apiKey || '';
            model.value = config.model || '';
            
            // 触发change事件更新UI
            providerSelect.dispatchEvent(new Event('change'));
        }
    }
    
    // 保存配置
    saveBtn.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const newConfig = {
            provider: provider,
            apiKey: apiKey.value.trim()
        };
        
        if (provider === 'custom') {
            if (!apiUrl.value.trim()) {
                showStatus('请填写API地址', 'error');
                return;
            }
            newConfig.apiUrl = apiUrl.value.trim();
        }
        
        if (model.value.trim()) {
            newConfig.model = model.value.trim();
        }
        
        if (!newConfig.apiKey) {
            showStatus('请填写API Key', 'error');
            return;
        }
        
        // 保存配置
        await window.llmService.saveConfig(newConfig);
        
        // 重新初始化AI核心
        if (window.aiCore && window.aiCore.switchToLLM) {
            await window.aiCore.switchToLLM();
        }
        
        showStatus('配置保存成功！', 'success');
        
        // 1秒后自动关闭
        setTimeout(() => {
            window.close();
        }, 1500);
    });
    
    // 测试连接
    testBtn.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const testConfig = {
            provider: provider,
            apiKey: apiKey.value.trim()
        };
        
        if (provider === 'custom') {
            if (!apiUrl.value.trim()) {
                showStatus('请先填写API地址', 'error');
                return;
            }
            testConfig.apiUrl = apiUrl.value.trim();
        }
        
        if (model.value.trim()) {
            testConfig.model = model.value.trim();
        }
        
        if (!testConfig.apiKey) {
            showStatus('请先填写API Key', 'error');
            return;
        }
        
        showStatus('测试中...', 'info');
        
        // 临时保存配置用于测试
        await window.llmService.saveConfig(testConfig);
        
        const result = await window.llmService.testConnection();
        
        if (result.success) {
            showStatus(`✅ ${result.message}`, 'success');
        } else {
            showStatus(`❌ 连接失败: ${result.message}`, 'error');
        }
    });
    
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status';
        if (type === 'success') {
            statusDiv.classList.add('status-success');
        } else if (type === 'error') {
            statusDiv.classList.add('status-error');
        } else {
            statusDiv.style.display = 'block';
        }
    }
});