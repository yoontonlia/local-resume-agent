/**
 * 数据看板页面逻辑 - 修复版
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 获取DOM元素
    const totalAnalyses = document.getElementById('totalAnalyses');
    const totalMatches = document.getElementById('totalMatches');
    const totalOptimizations = document.getElementById('totalOptimizations');
    const avgScore = document.getElementById('avgScore');
    const skillsContainer = document.getElementById('skillsContainer');
    const weekBars = document.getElementById('weekBars');
    const monthBars = document.getElementById('monthBars');
    const scoreDistribution = document.getElementById('scoreDistribution');
    const recentList = document.getElementById('recentList');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const backBtn = document.getElementById('backBtn');
    
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
    
    // 直接从存储加载数据（不依赖dataStats，避免异步问题）
    async function loadAllData() {
        console.log('开始加载数据...');
        
        try {
            // 获取各类历史数据
            const analysisResult = await chrome.storage.local.get(['analysisHistory']);
            const matchResult = await chrome.storage.local.get(['jobMatchHistoryEnhanced']);
            const optResult = await chrome.storage.local.get(['optimizationHistory']);
            
            const analysisHistory = analysisResult.analysisHistory || [];
            const matchHistory = matchResult.jobMatchHistoryEnhanced || [];
            const optHistory = optResult.optimizationHistory || [];
            
            console.log('分析记录数:', analysisHistory.length);
            console.log('匹配记录数:', matchHistory.length);
            console.log('优化记录数:', optHistory.length);
            
            // 更新统计卡片
            totalAnalyses.textContent = analysisHistory.length;
            totalMatches.textContent = matchHistory.length;
            totalOptimizations.textContent = optHistory.length;
            
            // 计算平均匹配分
            let avgScoreValue = '--';
            if (matchHistory.length > 0) {
                let totalScore = 0;
                let validCount = 0;
                for (const match of matchHistory) {
                    if (match.score && typeof match.score === 'number') {
                        totalScore += match.score;
                        validCount++;
                    } else if (match.score) {
                        totalScore += parseInt(match.score) || 70;
                        validCount++;
                    } else {
                        totalScore += 70;
                        validCount++;
                    }
                }
                if (validCount > 0) {
                    avgScoreValue = Math.round(totalScore / validCount) + '%';
                }
            }
            avgScore.textContent = avgScoreValue;
            
            // 更新技能标签
            await updateSkills(analysisHistory);
            
            // 更新周活跃度
            updateWeeklyActivity(analysisHistory);
            
            // 更新月度趋势
            updateMonthlyTrend(analysisHistory);
            
            // 更新匹配度分布
            updateScoreDistribution(matchHistory);
            
            // 更新最近活动
            await updateRecentActivities(analysisHistory, matchHistory, optHistory);
            
            console.log('数据加载完成');
            
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
    
    // 更新技能标签
    async function updateSkills(analysisHistory) {
        const skillKeywords = [
            'JavaScript', 'Python', 'Java', 'React', 'Vue', 'Angular',
            'Node.js', 'TypeScript', 'HTML', 'CSS', 'SQL', 'MongoDB',
            'AWS', 'Docker', 'Kubernetes', 'Git', '前端', '后端',
            '全栈', '数据分析', '机器学习', '产品经理', '项目管理'
        ];
        
        const skillMap = new Map();
        
        for (const record of analysisHistory) {
            const text = (record.result || '').toLowerCase();
            for (const skill of skillKeywords) {
                if (text.includes(skill.toLowerCase())) {
                    skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
                }
            }
        }
        
        const sortedSkills = Array.from(skillMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sortedSkills.length > 0) {
            skillsContainer.innerHTML = sortedSkills.map(([name, count]) => `
                <div class="skill-tag">
                    ${name}
                    <span class="skill-count">${count}次</span>
                </div>
            `).join('');
        } else {
            skillsContainer.innerHTML = '<div class="empty-state">暂无数据，请先分析简历</div>';
        }
    }
    
    // 更新周活跃度
    function updateWeeklyActivity(analysisHistory) {
        const weeks = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const activity = [0, 0, 0, 0, 0, 0, 0];
        
        for (const record of analysisHistory) {
            if (record.timestamp) {
                const date = new Date(record.timestamp);
                const dayOfWeek = date.getDay();
                const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                activity[index]++;
            } else if (record.localTime) {
                // 尝试解析本地时间字符串
                const parts = record.localTime.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
                if (parts) {
                    const date = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
                    const dayOfWeek = date.getDay();
                    const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    activity[index]++;
                }
            }
        }
        
        const maxCount = Math.max(...activity, 1);
        
        weekBars.innerHTML = weeks.map((name, index) => `
            <div class="week-item">
                <div class="week-bar">
                    <div class="week-fill" style="height: ${(activity[index] / maxCount) * 70}px;"></div>
                </div>
                <div class="week-label">${name}</div>
                <div class="week-value">${activity[index]}</div>
            </div>
        `).join('');
    }
    
    // 更新月度趋势
    function updateMonthlyTrend(analysisHistory) {
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        const trend = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        
        for (const record of analysisHistory) {
            if (record.timestamp) {
                const date = new Date(record.timestamp);
                const month = date.getMonth();
                trend[month]++;
            } else if (record.localTime) {
                const parts = record.localTime.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
                if (parts) {
                    const month = parseInt(parts[2]) - 1;
                    if (month >= 0 && month < 12) trend[month]++;
                }
            }
        }
        
        const maxCount = Math.max(...trend, 1);
        
        monthBars.innerHTML = months.map((name, index) => `
            <div class="month-item">
                <div class="month-bar">
                    <div class="month-fill" style="height: ${(trend[index] / maxCount) * 80}px;"></div>
                </div>
                <div class="month-label">${name}</div>
            </div>
        `).join('');
    }
    
    // 更新匹配度分布
    function updateScoreDistribution(matchHistory) {
        const distribution = {
            excellent: 0,  // 90-100
            good: 0,       // 75-89
            average: 0,    // 60-74
            poor: 0        // 0-59
        };
        
        for (const match of matchHistory) {
            let score = match.score || 70;
            if (typeof score === 'string') {
                score = parseInt(score) || 70;
            }
            
            if (score >= 90) distribution.excellent++;
            else if (score >= 75) distribution.good++;
            else if (score >= 60) distribution.average++;
            else distribution.poor++;
        }
        
        const total = distribution.excellent + distribution.good + distribution.average + distribution.poor;
        
        if (total > 0) {
            scoreDistribution.innerHTML = `
                <div class="score-item">
                    <div class="score-circle score-excellent">${distribution.excellent}</div>
                    <div class="score-label">优秀 (90-100)</div>
                </div>
                <div class="score-item">
                    <div class="score-circle score-good">${distribution.good}</div>
                    <div class="score-label">良好 (75-89)</div>
                </div>
                <div class="score-item">
                    <div class="score-circle score-average">${distribution.average}</div>
                    <div class="score-label">一般 (60-74)</div>
                </div>
                <div class="score-item">
                    <div class="score-circle score-poor">${distribution.poor}</div>
                    <div class="score-label">待提升 (0-59)</div>
                </div>
            `;
        } else {
            scoreDistribution.innerHTML = '<div class="empty-state" style="width:100%;">暂无匹配数据</div>';
        }
    }
    
    // 更新最近活动
    async function updateRecentActivities(analysisHistory, matchHistory, optHistory) {
        const activities = [];
        
        // 添加分析记录
        analysisHistory.forEach(record => {
            activities.push({
                type: 'analysis',
                name: record.fileName || '简历分析',
                time: record.localTime || record.timestamp || new Date().toLocaleString()
            });
        });
        
        // 添加匹配记录
        matchHistory.forEach(record => {
            activities.push({
                type: 'match',
                name: (record.jobPreview || '').substring(0, 40) + '...',
                time: record.localTime || record.timestamp || new Date().toLocaleString()
            });
        });
        
        // 添加优化记录
        optHistory.forEach(record => {
            activities.push({
                type: 'optimize',
                name: `优化建议 - ${record.targetRole || '简历'}`,
                time: record.localTime || record.timestamp || new Date().toLocaleString()
            });
        });
        
        // 按时间排序
        activities.sort((a, b) => {
            const timeA = new Date(a.time);
            const timeB = new Date(b.time);
            return timeB - timeA;
        });
        
        if (activities.length > 0) {
            recentList.innerHTML = activities.slice(0, 10).map(activity => {
                let typeClass = '';
                let typeText = '';
                if (activity.type === 'analysis') {
                    typeClass = 'type-analysis';
                    typeText = '📄 简历分析';
                } else if (activity.type === 'match') {
                    typeClass = 'type-match';
                    typeText = '🎯 岗位匹配';
                } else {
                    typeClass = 'type-optimize';
                    typeText = '✏️ 简历优化';
                }
                
                return `
                    <div class="recent-item">
                        <span class="recent-type ${typeClass}">${typeText}</span>
                        <span class="recent-name">${escapeHtml(activity.name)}</span>
                        <span class="recent-time">${activity.time}</span>
                    </div>
                `;
            }).join('');
        } else {
            recentList.innerHTML = '<div class="empty-state">暂无活动记录</div>';
        }
    }
    
    // HTML转义函数
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // 清除所有数据
    clearDataBtn.addEventListener('click', async () => {
        if (confirm('⚠️ 确定要清除所有数据吗？此操作不可恢复！\n\n将清除：\n- 所有简历分析记录\n- 所有岗位匹配记录\n- 所有优化建议记录\n- 所有对比记录')) {
            await chrome.storage.local.remove([
                'analysisHistory',
                'jobMatchHistoryEnhanced',
                'optimizationHistory',
                'comparisonHistory'
            ]);
            await loadAllData();
            alert('所有数据已清除');
        }
    });
    
    // 刷新数据
    refreshBtn.addEventListener('click', async () => {
        console.log('刷新按钮被点击');
        refreshBtn.textContent = '🔄 刷新中...';
        refreshBtn.disabled = true;
        await loadAllData();
        refreshBtn.textContent = '🔄 刷新数据';
        refreshBtn.disabled = false;
    });
    
    // 初始加载
    await loadAllData();
    console.log('页面初始化完成');
});