// 浮窗顶部的站点 / 环境 / 分支信息行。
window.CpqaEnvSwitcher = (function () {
    'use strict';

    function createEnvironmentSwitcher() {
        const currentUrl = window.location.href;
        const hostname = window.location.hostname;
        
        // 检测当前站点、环境和分支信息（独立于 Product Info）
        const region = CONFIG.detectRegion(currentUrl);
        const siteName = CONFIG.getSiteName(region);
        const siteId = region ? CONFIG.getSiteId(region) : 'N/A';
        const detectedBranch = CONFIG.autoDetectBranch(hostname);
        
        // 检测当前环境
        let currentEnv = 'Live';
        if (hostname.includes('.pre.planetart.com')) {
            currentEnv = 'Pre';
        } else if (hostname.includes('.stage.planetart.com')) {
            currentEnv = 'Stage';
        }
        
        // PHPSESSID 将在 DOM 创建后异步加载
        
        // 站点信息显示（始终显示，不依赖 Product Info）- 固定2行布局
        const siteInfoContent = `
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                <!-- 第1行：站点名称 + ID + 分支 + 环境标签 -->
                <div style="display: flex; align-items: center; gap: 10px;">
                    <!-- 站点名称 - 突出显示 -->
                    <div style="
                        font-size: 16px;
                        color: #fff;
                        font-weight: bold;
                        letter-spacing: 0.5px;
                        white-space: nowrap;
                    ">${siteName}</div>
                    
                    <!-- 站点 ID -->
                    <div style="
                        font-size: 12px;
                        color: #fff;
                        padding: 2px 0;
                        white-space: nowrap;
                    ">ID: ${siteId}</div>
                    
                    <!-- 分支名称（如果有） -->
                    ${detectedBranch ? `
                        <div style="
                            font-size: 12px;
                            color: #fff;
                            padding: 2px 0;
                            white-space: nowrap;
                            max-width: 150px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        " title="${detectedBranch}">${detectedBranch}</div>
                    ` : ''}
                    
                    <!-- 环境标签 -->
                    <div style="
                        font-size: 11px;
                        color: #fff;
                        padding: 3px 10px;
                        background: ${currentEnv === 'Live' ? '#ff9800' : currentEnv === 'Stage' ? '#9c27b0' : '#2196f3'};
                        border-radius: 4px;
                        font-weight: bold;
                        white-space: nowrap;
                    ">${currentEnv}</div>
                </div>
                
                <!-- 第2行：PHPSESSID 容器（动态加载） -->
                <div id="phpsessid-container"></div>
                
                <!-- 第3行：cart_id 容器（动态加载） -->
                <div id="cart-id-container"></div>
            </div>
        `;
        
        return `
            <div id="environment-info-panel" style="
                margin-top: 2px;
                margin-bottom: 8px;
                padding: 8px 12px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
            ">
                <!-- Left: 站点信息（始终显示） -->
                ${siteInfoContent}
                
                <!-- Right: Back Button (always show) -->
                <button 
                    id="floating-pdp-btn"
                    style="
                        background: rgba(255,255,255,0.2);
                        color: #fff;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 6px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: bold;
                        transition: all 0.2s ease;
                        white-space: nowrap;
                    "
                >← Back</button>
            </div>
        `;
    }

    return { createEnvironmentSwitcher };
})();
