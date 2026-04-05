// 后台服务 - 处理插件生命周期

// 当插件安装或更新时触发
chrome.runtime.onInstalled.addListener(() => {
    console.log('本地简历智能分析助手已安装');
    
    // 初始化存储，记录安装状态
    chrome.storage.local.set({ 
        installed: true,
        version: '1.0.0'
    });
});

// 监听来自弹窗的消息（为后续扩展预留）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'PING') {
        sendResponse({ status: 'ok' });
    }
    return true;
});