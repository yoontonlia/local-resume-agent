/**
 * 配置页面逻辑 - 完整修复版
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('配置页面加载...');
    
    // 获取DOM元素
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
    
    // ========== MCP配置元素 ==========
    const mcpModeRadios = document.querySelectorAll('input[name="mcpMode"]');
    const mcpServersGroup = document.getElementById('mcpServersGroup');
    const chromeMcpUrl = document.getElementById('chromeMcpUrl');
    const hrMcpUrl = document.getElementById('hrMcpUrl');
    const testMcpBtn = document.getElementById('testMcpBtn');
    const saveMcpBtn = document.getElementById('saveMcpBtn');
    const mcpStatus = document.getElementById('mcpStatus');
    
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
    
    // 提供商切换时，更新帮助文本和显示自定义URL
    if (providerSelect) {
        providerSelect.addEventListener('change', () => {
            const provider = providerSelect.value;
            
            if (provider === 'custom') {
                if (apiUrlGroup) apiUrlGroup.style.display = 'block';
                if (apiKeyHelp) apiKeyHelp.textContent = '填写您的API Key';
            } else {
                if (apiUrlGroup) apiUrlGroup.style.display = 'none';
                if (provider === 'deepseek') {
                    if (apiKeyHelp) apiKeyHelp.innerHTML = 'DeepSeek Key 获取：<a href="https://platform.deepseek.com/api_keys" target="_blank">https://platform.deepseek.com/api_keys</a>';
                } else if (provider === 'openai') {
                    if (apiKeyHelp) apiKeyHelp.innerHTML = 'OpenAI Key 获取：<a href="https://platform.openai.com/api-keys" target="_blank">https://platform.openai.com/api-keys</a>';
                }
            }
        });
    }
    
    // 加载已保存的配置
    async function loadConfig() {
        const result = await chrome.storage.local.get(['llmConfig']);
        if (result.llmConfig && providerSelect) {
            const config = result.llmConfig;
            providerSelect.value = config.provider || 'deepseek';
            if (apiUrl) apiUrl.value = config.apiUrl || '';
            if (apiKey) apiKey.value = config.apiKey || '';
            if (model) model.value = config.model || '';
            
            if (providerSelect) providerSelect.dispatchEvent(new Event('change'));
        }
    }
    
    // 显示状态
    function showStatus(message, type) {
        if (!statusDiv) return;
        statusDiv.textContent = message;
        statusDiv.className = 'status';
        if (type === 'success') {
            statusDiv.classList.add('status-success');
        } else if (type === 'error') {
            statusDiv.classList.add('status-error');
        }
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
    
    // 保存API配置
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!providerSelect) return;
            
            const provider = providerSelect.value;
            const newConfig = {
                provider: provider,
                apiKey: apiKey ? apiKey.value.trim() : ''
            };
            
            if (provider === 'custom') {
                if (!apiUrl || !apiUrl.value.trim()) {
                    showStatus('请填写API地址', 'error');
                    return;
                }
                newConfig.apiUrl = apiUrl.value.trim();
            }
            
            if (model && model.value.trim()) {
                newConfig.model = model.value.trim();
            }
            
            if (!newConfig.apiKey) {
                showStatus('请填写API Key', 'error');
                return;
            }
            
            await window.llmService.saveConfig(newConfig);
            
            if (window.aiCore && window.aiCore.switchToLLM) {
                await window.aiCore.switchToLLM();
            }
            
            showStatus('配置保存成功！', 'success');
            
            setTimeout(() => {
                window.close();
            }, 1500);
        });
    }
    
    // 测试API连接
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            if (!providerSelect) return;
            
            const provider = providerSelect.value;
            const testConfig = {
                provider: provider,
                apiKey: apiKey ? apiKey.value.trim() : ''
            };
            
            if (provider === 'custom') {
                if (!apiUrl || !apiUrl.value.trim()) {
                    showStatus('请先填写API地址', 'error');
                    return;
                }
                testConfig.apiUrl = apiUrl.value.trim();
            }
            
            if (model && model.value.trim()) {
                testConfig.model = model.value.trim();
            }
            
            if (!testConfig.apiKey) {
                showStatus('请先填写API Key', 'error');
                return;
            }
            
            showStatus('测试中...', 'info');
            
            await window.llmService.saveConfig(testConfig);
            const result = await window.llmService.testConnection();
            
            if (result.success) {
                showStatus(`✅ ${result.message}`, 'success');
            } else {
                showStatus(`❌ 连接失败: ${result.message}`, 'error');
            }
        });
    }
    
    // ========== MCP配置功能 ==========
    
    // 显示MCP状态
    function showMcpStatus(message, type) {
        if (!mcpStatus) return;
        mcpStatus.textContent = message;
        mcpStatus.className = 'status';
        if (type === 'success') {
            mcpStatus.classList.add('status-success');
        } else if (type === 'error') {
            mcpStatus.classList.add('status-error');
        }
        mcpStatus.style.display = 'block';
        
        setTimeout(() => {
            mcpStatus.style.display = 'none';
        }, 3000);
    }
    
    // 加载MCP配置
    async function loadMcpConfig() {
        const result = await chrome.storage.local.get(['mcpConfig']);
        if (result.mcpConfig && mcpModeRadios.length > 0) {
            const config = result.mcpConfig;
            const radio = document.querySelector(`input[name="mcpMode"][value="${config.enabled ? 'on' : 'off'}"]`);
            if (radio) radio.checked = true;
            
            if (chromeMcpUrl) chromeMcpUrl.value = config.chromeMcpUrl || 'http://localhost:9999';
            if (hrMcpUrl) hrMcpUrl.value = config.hrMcpUrl || 'http://localhost:3000/api/mcp';
            
            if (mcpServersGroup) {
                mcpServersGroup.style.display = config.enabled ? 'block' : 'none';
            }
        }
    }
    
    // 监听模式切换
    if (mcpModeRadios.length > 0) {
        mcpModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const isEnabled = document.querySelector('input[name="mcpMode"]:checked')?.value === 'on';
                if (mcpServersGroup) {
                    mcpServersGroup.style.display = isEnabled ? 'block' : 'none';
                }
            });
        });
    }
    
    // 测试MCP连接
    if (testMcpBtn) {
        testMcpBtn.addEventListener('click', async () => {
            const isEnabled = document.querySelector('input[name="mcpMode"]:checked')?.value === 'on';
            if (!isEnabled) {
                showMcpStatus('请先开启MCP扩展', 'error');
                return;
            }
            
            const chromeUrl = chromeMcpUrl ? chromeMcpUrl.value.trim() : '';
            const hrUrl = hrMcpUrl ? hrMcpUrl.value.trim() : '';
            
            showMcpStatus('测试中...', 'info');
            
            let chromeOk = false;
            let hrOk = false;
            
            // 测试Chrome MCP
            if (chromeUrl) {
                try {
                    const response = await fetch(chromeUrl, { method: 'HEAD', mode: 'no-cors' });
                    chromeOk = true;
                } catch {
                    chromeOk = false;
                }
            }
            
            // 测试HR MCP
            if (hrUrl) {
                try {
                    const response = await fetch(hrUrl, { method: 'HEAD' });
                    hrOk = response.ok;
                } catch {
                    hrOk = false;
                }
            }
            
            if (chromeOk && hrOk) {
                showMcpStatus('✅ MCP连接成功！Chrome DevTools和HR Toolkit均可用', 'success');
            } else if (chromeOk) {
                showMcpStatus('⚠️ 仅Chrome DevTools MCP可用，HR Toolkit不可用', 'error');
            } else if (hrOk) {
                showMcpStatus('⚠️ 仅HR Toolkit MCP可用，Chrome DevTools不可用', 'error');
            } else {
                showMcpStatus('❌ MCP连接失败，请确认服务器已启动', 'error');
            }
        });
    }
    
    // 保存MCP配置
    if (saveMcpBtn) {
        saveMcpBtn.addEventListener('click', async () => {
            const isEnabled = document.querySelector('input[name="mcpMode"]:checked')?.value === 'on';
            const config = {
                enabled: isEnabled,
                chromeMcpUrl: chromeMcpUrl ? chromeMcpUrl.value.trim() : 'http://localhost:9999',
                hrMcpUrl: hrMcpUrl ? hrMcpUrl.value.trim() : 'http://localhost:3000/api/mcp'
            };
            
            await chrome.storage.local.set({ mcpConfig: config });
            showMcpStatus('✅ MCP配置已保存', 'success');
            
            // 通知background重新初始化（可选）
            try {
                chrome.runtime.sendMessage({ type: 'MCP_CONFIG_UPDATED' });
            } catch(e) {
                console.log('发送消息失败', e);
            }
        });
    }
    // 测试HR Toolkit按钮
    const testHRToolkitBtn = document.getElementById('testHRToolkitBtn');
    if (testHRToolkitBtn) {
        testHRToolkitBtn.addEventListener('click', async () => {
            const isEnabled = document.querySelector('input[name="mcpMode"]:checked')?.value === 'on';
            if (!isEnabled) {
                showMcpStatus('请先开启MCP扩展', 'error');
                return;
            }
            
            showMcpStatus('测试中，请稍候...', 'info');
            
            if (!window.mcpClient) {
                showMcpStatus('MCP客户端未加载，请刷新页面', 'error');
                return;
            }
            
            const result = await window.mcpClient.testHRToolkit();
            
            if (result.success) {
                let msg = `✅ HR Toolkit测试通过！\n`;
                msg += `- 连接: ${result.connection ? '✓' : '✗'}\n`;
                msg += `- 技能提取: ${result.extractSkills ? '✓' : '✗'}\n`;
                msg += `- 匹配计算: ${result.matchScore ? '✓' : '✗'}`;
                showMcpStatus(msg.replace(/\n/g, ' '), 'success');
            } else {
                let msg = `❌ HR Toolkit测试失败\n`;
                msg += result.errors.join('\n');
                showMcpStatus(msg, 'error');
            }
        });
    }
    // 加载配置
    await loadConfig();
    await loadMcpConfig();
    console.log('配置页面初始化完成');
});