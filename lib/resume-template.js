/**
 * 简历模板系统 v2.0 - 优化版
 * 功能：根据结构化数据生成格式化的HTML简历
 * 支持多种模板风格，优化打印样式和颜色对比度
 */

class ResumeTemplate {
    constructor() {
        // 内置模板风格
        this.templates = {
            professional: '专业商务',
            modern: '现代简约',
            creative: '创意设计'
        };
        
        // 当前使用的模板
        this.currentTemplate = 'professional';
    }

    /**
     * 设置模板风格
     * @param {string} style - professional / modern / creative
     */
    setTemplate(style) {
        if (this.templates[style]) {
            this.currentTemplate = style;
            return true;
        }
        return false;
    }

    /**
     * 生成完整HTML简历
     * @param {object} data - 结构化简历数据
     * @returns {string} HTML字符串
     */
    generateHTML(data) {
        const style = this.getStyleCSS();
        const content = this.buildContent(data);
        
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(data.name || '简历')} - 优化版</title>
    <style>
        ${style}
    </style>
</head>
<body>
    <div class="resume-container">
        ${content}
    </div>
</body>
</html>`;
    }

    /**
     * 获取当前模板的CSS样式
     */
    getStyleCSS() {
        // 基础样式（所有模板共用）
        const baseStyle = `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif;
                background-color: #e8ecf2;
                padding: 40px 20px;
            }
            
            .resume-container {
                max-width: 900px;
                margin: 0 auto;
                background: #ffffff;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                border-radius: 12px;
                overflow: hidden;
            }
            
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
                .section {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .job-item, .edu-item {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            }
        `;
        
        // 专业商务模板样式（优化版 - 深色文字，高对比度）
        const professionalStyle = `
            /* 头部区域 - 深色背景，白色文字 */
            .resume-header {
                background: linear-gradient(135deg, #1e2a3a 0%, #0f1722 100%);
                color: #ffffff;
                padding: 35px 40px;
            }
            
            .resume-header h1 {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: 1px;
                color: #ffffff;
            }
            
            .resume-header .title {
                font-size: 18px;
                font-weight: 500;
                opacity: 0.9;
                margin-bottom: 16px;
                color: #e2e8f0;
            }
            
            .resume-header .contact {
                display: flex;
                flex-wrap: wrap;
                gap: 24px;
                font-size: 13px;
                opacity: 0.85;
                color: #cbd5e1;
            }
            
            .resume-header .contact span {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            
            /* 主体区域 */
            .resume-body {
                padding: 35px 40px;
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
                letter-spacing: 0.5px;
            }
            
            /* 工作经历项 */
            .job-item, .edu-item {
                margin-bottom: 24px;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .job-header, .edu-header {
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
                font-size: 14px;
            }
            
            .date {
                font-size: 12px;
                color: #64748b;
                font-weight: normal;
            }
            
            .responsibilities {
                padding-left: 20px;
                margin-top: 10px;
            }
            
            .responsibilities li {
                margin-bottom: 8px;
                line-height: 1.65;
                color: #334155;
                font-size: 14px;
            }
            
            /* 教育背景 */
            .edu-degree {
                font-weight: 700;
                color: #1e293b;
            }
            
            .edu-school {
                color: #3b82f6;
                font-weight: 500;
            }
            
            .edu-major {
                color: #475569;
                font-size: 13px;
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
                font-weight: 500;
                color: #1e293b;
                border: 1px solid #e2e8f0;
            }
            
            /* 证书标签 */
            .certificates {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 8px;
            }
            
            .cert-tag {
                background: #fef3c7;
                padding: 6px 16px;
                border-radius: 24px;
                font-size: 13px;
                font-weight: 500;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            
            /* 个人简介 */
            .summary {
                line-height: 1.7;
                color: #334155;
                font-size: 14px;
                background: #f8fafc;
                padding: 16px 20px;
                border-radius: 12px;
            }
        `;
        
        // 根据当前模板返回样式
        switch (this.currentTemplate) {
            case 'professional':
                return baseStyle + professionalStyle;
            case 'modern':
                return baseStyle + this.getModernStyle();
            case 'creative':
                return baseStyle + this.getCreativeStyle();
            default:
                return baseStyle + professionalStyle;
        }
    }

    /**
     * 现代简约模板样式
     */
    getModernStyle() {
        return `
            .resume-header {
                background: #ffffff;
                padding: 35px 40px;
                border-bottom: 3px solid #3b82f6;
            }
            
            .resume-header h1 {
                font-size: 28px;
                color: #1e293b;
                margin-bottom: 6px;
            }
            
            .resume-header .title {
                font-size: 16px;
                color: #3b82f6;
                margin-bottom: 14px;
                font-weight: 500;
            }
            
            .resume-header .contact {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                font-size: 13px;
                color: #64748b;
            }
            
            .resume-body {
                padding: 35px 40px;
            }
            
            .section {
                margin-bottom: 28px;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: 700;
                color: #3b82f6;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
            }
            
            .job-item, .edu-item {
                margin-bottom: 22px;
            }
            
            .job-header {
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }
            
            .job-title {
                font-weight: 700;
                color: #1e293b;
                font-size: 15px;
            }
            
            .company {
                color: #3b82f6;
                font-weight: 500;
            }
            
            .date {
                font-size: 12px;
                color: #94a3b8;
            }
            
            .responsibilities {
                padding-left: 20px;
                margin-top: 8px;
            }
            
            .responsibilities li {
                margin-bottom: 6px;
                color: #475569;
                line-height: 1.6;
            }
            
            .skills {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .skill-tag {
                background: #f1f5f9;
                padding: 5px 14px;
                border-radius: 20px;
                font-size: 12px;
                color: #1e293b;
            }
            
            .summary {
                line-height: 1.7;
                color: #475569;
            }
        `;
    }

    /**
     * 创意设计模板样式
     */
    getCreativeStyle() {
        return `
            .resume-header {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                padding: 45px 40px;
                text-align: center;
            }
            
            .resume-header h1 {
                font-size: 36px;
                margin-bottom: 8px;
                font-weight: 700;
            }
            
            .resume-header .title {
                font-size: 16px;
                opacity: 0.9;
                margin-bottom: 16px;
            }
            
            .resume-header .contact {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 20px;
                font-size: 12px;
                opacity: 0.85;
            }
            
            .resume-body {
                padding: 35px 40px;
                background: #faf5ff;
            }
            
            .section {
                margin-bottom: 28px;
                background: white;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            
            .section-title {
                font-size: 18px;
                font-weight: 700;
                color: #7c3aed;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e9d5ff;
            }
            
            .job-title {
                font-weight: 700;
                color: #1e293b;
            }
            
            .company {
                color: #7c3aed;
                font-weight: 500;
            }
            
            .date {
                font-size: 12px;
                color: #94a3b8;
                float: right;
            }
            
            .responsibilities {
                margin-top: 10px;
                padding-left: 20px;
            }
            
            .responsibilities li {
                margin-bottom: 6px;
                color: #475569;
            }
            
            .skills {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .skill-tag {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                padding: 6px 16px;
                border-radius: 24px;
                font-size: 12px;
            }
        `;
    }

    /**
     * 构建HTML内容
     * @param {object} data - 结构化数据
     * @returns {string} HTML内容
     */
    buildContent(data) {
        let html = '';
        
        // 头部信息
        html += `
            <div class="resume-header">
                <h1>${this.escapeHtml(data.name || '您的姓名')}</h1>
                <div class="title">${this.escapeHtml(data.title || data.jobTitle || data.currentTitle || '求职意向')}</div>
                <div class="contact">
                    ${data.phone ? `<span>📞 ${this.escapeHtml(data.phone)}</span>` : ''}
                    ${data.email ? `<span>✉️ ${this.escapeHtml(data.email)}</span>` : ''}
                    ${data.location ? `<span>📍 ${this.escapeHtml(data.location)}</span>` : ''}
                    ${data.wechat ? `<span>💬 ${this.escapeHtml(data.wechat)}</span>` : ''}
                    ${data.years ? `<span>📅 ${this.escapeHtml(data.years)}年经验</span>` : ''}
                </div>
            </div>
        `;
        
        html += `<div class="resume-body">`;
        
        // 个人简介
        if (data.summary) {
            html += `
                <div class="section">
                    <div class="section-title">📋 个人简介</div>
                    <div class="summary">${this.escapeHtml(data.summary).replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }
        
        // 工作经历
        if (data.workExperience && data.workExperience.length > 0) {
            html += `<div class="section"><div class="section-title">💼 工作经历</div>`;
            for (const job of data.workExperience) {
                html += `
                    <div class="job-item">
                        <div class="job-header">
                            <div>
                                <span class="job-title">${this.escapeHtml(job.title || '职位')}</span>
                                ${job.company ? `<span class="company"> @ ${this.escapeHtml(job.company)}</span>` : ''}
                            </div>
                            <div class="date">${this.escapeHtml(job.date || '')}</div>
                        </div>
                        ${job.responsibilities && job.responsibilities.length > 0 ? `
                            <ul class="responsibilities">
                                ${job.responsibilities.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        // 项目经历
        if (data.projects && data.projects.length > 0) {
            html += `<div class="section"><div class="section-title">🚀 项目经历</div>`;
            for (const project of data.projects) {
                html += `
                    <div class="job-item">
                        <div class="job-header">
                            <div>
                                <span class="job-title">${this.escapeHtml(project.name || '项目名称')}</span>
                                ${project.role ? `<span class="company"> | ${this.escapeHtml(project.role)}</span>` : ''}
                            </div>
                            <div class="date">${this.escapeHtml(project.date || '')}</div>
                        </div>
                        ${project.description ? `<div style="margin-top: 6px; color: #475569;">${this.escapeHtml(project.description)}</div>` : ''}
                        ${project.techStack ? `<div style="margin-top: 6px; font-size: 12px; color: #64748b;"><strong>技术栈：</strong>${this.escapeHtml(project.techStack)}</div>` : ''}
                        ${project.responsibilities && project.responsibilities.length > 0 ? `
                            <ul class="responsibilities" style="margin-top: 8px;">
                                ${project.responsibilities.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        // 教育背景
        if (data.education && data.education.length > 0) {
            html += `<div class="section"><div class="section-title">🎓 教育背景</div>`;
            for (const edu of data.education) {
                html += `
                    <div class="edu-item">
                        <div class="job-header">
                            <div>
                                <span class="edu-degree">${this.escapeHtml(edu.degree || '学位')}</span>
                                ${edu.school ? `<span class="edu-school"> @ ${this.escapeHtml(edu.school)}</span>` : ''}
                            </div>
                            <div class="date">${this.escapeHtml(edu.date || '')}</div>
                        </div>
                        ${edu.major ? `<div class="edu-major">专业：${this.escapeHtml(edu.major)}</div>` : ''}
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        // 专业技能
        if (data.skills && data.skills.length > 0) {
            html += `
                <div class="section">
                    <div class="section-title">🔧 专业技能</div>
                    <div class="skills">
                        ${data.skills.map(skill => `<span class="skill-tag">${this.escapeHtml(skill)}</span>`).join('')}
                    </div>
                </div>
            `;
        }
        
        // 证书/语言
        if (data.certificates && data.certificates.length > 0) {
            html += `
                <div class="section">
                    <div class="section-title">📜 证书与语言</div>
                    <div class="certificates">
                        ${data.certificates.map(cert => `<span class="cert-tag">${this.escapeHtml(cert)}</span>`).join('')}
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        
        return html;
    }

    /**
     * HTML转义
     */
    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 从原简历提取样式信息（用于保持原格式）
     */
    extractStyleFromPDF(pdfText) {
        return {
            fontFamily: 'Arial',
            fontSize: 12,
            templateStyle: this.currentTemplate
        };
    }
}

// 创建全局实例
window.resumeTemplate = new ResumeTemplate();