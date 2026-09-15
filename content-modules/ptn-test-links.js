// Test Links 面板 + PTN CSV 检索（浮窗内使用）。
window.CpqaTestLinks = (function () {
    'use strict';

    // PTN Data cache for content script
    let ptnDataCacheContent = null;
    
    // Load PTN CSV data
    async function loadPTNDataFromCSV() {
        if (ptnDataCacheContent) {
            return ptnDataCacheContent;
        }
        
        try {
            const response = await fetch(chrome.runtime.getURL('cpdata/cafepress_product_types.csv'));
            const csvText = await response.text();
            
            // Parse CSV
            const lines = csvText.split('\n');
            const data = [];
            
            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const fields = CpqaCsv.parseCSVLine(line);
                if (fields.length >= 4) {
                    data.push({
                        ptn: fields[0],
                        caption: fields[1],
                        stockMessage: fields[2],
                        active: fields[3]
                    });
                }
            }
            
            ptnDataCacheContent = data;
            console.log('PTN data loaded in content script:', data.length, 'records');
            return data;
        } catch (error) {
            console.error('Error loading PTN data in content script:', error);
            throw error;
        }
    }
    
    // Display PTN search results
    function displayPTNSearchResults(results, searchTerm, ptnSearchPanel, navLinksCard, ptnResultsView) {
        // Hide search panel and nav links
        if (ptnSearchPanel) ptnSearchPanel.style.display = 'none';
        if (navLinksCard) navLinksCard.style.display = 'none';
        
        // Show results view
        if (ptnResultsView) ptnResultsView.style.display = 'block';
        
        // Update search term display
        const ptnSearchTermEl = ptnResultsView.querySelector('#ptnSearchTerm');
        const ptnResultsCountEl = ptnResultsView.querySelector('#ptnResultsCount');
        const ptnSearchResultsEl = ptnResultsView.querySelector('#ptnSearchResults');
        
        if (ptnSearchTermEl) ptnSearchTermEl.textContent = searchTerm;
        
        if (!results || results.length === 0) {
            if (ptnResultsCountEl) {
                ptnResultsCountEl.textContent = 'No results found';
                ptnResultsCountEl.style.color = '#ff9800';
            }
            if (ptnSearchResultsEl) {
                ptnSearchResultsEl.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6); font-size: 12px;">
                        No PTN records found
                    </div>
                `;
            }
            return;
        }
        
        // Update count
        if (ptnResultsCountEl) {
            ptnResultsCountEl.textContent = `Found ${results.length} record${results.length > 1 ? 's' : ''}`;
            ptnResultsCountEl.style.color = '#27ae60';
        }
        
        // Generate results HTML
        let resultsHtml = '';
        results.forEach((item, index) => {
            const activeColor = item.active === 'TRUE' ? '#27ae60' : '#f44336';
            const activeText = item.active === 'TRUE' ? 'Yes' : 'No';
            
            let stockColor = '#fff';
            if (item.stockMessage.includes('In Stock')) {
                stockColor = '#27ae60';
            } else if (item.stockMessage.includes('Out of Stock')) {
                stockColor = '#f44336';
            } else if (item.stockMessage.includes('Temporarily')) {
                stockColor = '#ff9800';
            }
            
            resultsHtml += `
                <div style="
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 10px;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255,255,255,0.12)'; this.style.borderColor='#ffeb3b';" 
                   onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.15)';">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 11px;">PTN No:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 13px;">${item.ptn}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 11px;">PTN Caption:</span>
                        <span style="color: #fff; font-size: 11px; text-align: right; max-width: 200px;">${item.caption}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 11px;">Stock Status:</span>
                        <span style="color: ${stockColor}; font-size: 11px; font-weight: bold;">${item.stockMessage}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: rgba(255,255,255,0.7); font-size: 11px;">Active:</span>
                        <span style="color: ${activeColor}; font-weight: bold; font-size: 11px;">${activeText}</span>
                    </div>
                </div>
            `;
        });
        
        if (ptnSearchResultsEl) {
            ptnSearchResultsEl.innerHTML = resultsHtml;
        }
    }
    
    // Show PTN search panel (hide results)
    function showPTNSearchPanel(ptnSearchPanel, navLinksCard, ptnResultsView) {
        if (ptnSearchPanel) ptnSearchPanel.style.display = 'block';
        if (navLinksCard) navLinksCard.style.display = 'block';
        if (ptnResultsView) ptnResultsView.style.display = 'none';
    }
    
    // Create Test Links Panel with categories
    function createTestLinksPanel() {
        const currentUrl = window.location.href;
        const hostname = window.location.hostname;
        const region = CONFIG.detectRegion(currentUrl);
        const detectedBranch = CONFIG.autoDetectBranch(hostname);
        const branch = detectedBranch || CONFIG.BRANCH.CURRENT;
        
        // Helper function to generate URLs for all environments
        function generateEnvUrls(path, isAdmin = false) {
            const liveBase = isAdmin ? CONFIG.ADMIN.LIVE : (CONFIG.getSiteConfig(region)?.LIVE || '');
            const preBase = isAdmin ? 
                CONFIG.buildAdminDomain('pre', branch) : 
                CONFIG.buildDomain(region, 'pre', branch);
            const stageBase = isAdmin ? 
                CONFIG.buildAdminDomain('stage', branch) : 
                CONFIG.buildDomain(region, 'stage', branch);
            
            return {
                live: liveBase ? `https://${liveBase}${path}` : null,
                pre: preBase ? `https://${preBase}${path}` : null,
                stage: stageBase ? `https://${stageBase}${path}` : null
            };
        }
        
        // Get link categories from config (editable in config.js)
        const linkCategories = CONFIG.TEST_LINKS.categories;
        
        // Generate HTML for each category
        let categoriesHtml = '';
        linkCategories.forEach(category => {
            let linksHtml = '';
            category.links.forEach(link => {
                // Link title
                linksHtml += `
                    <div style="margin-bottom: 10px;">
                        <div style="
                            color: #fff;
                            font-size: 12px;
                            font-weight: 600;
                            margin-bottom: 6px;
                        ">${link.title}</div>
                `;
                
                // Generate each environment URL
                const environments = [
                    { name: 'Live', key: 'live', color: '#ff9800' },
                    { name: 'Pre', key: 'pre', color: '#2196f3' },
                    { name: 'Stage', key: 'stage', color: '#9c27b0' }
                ];
                
                environments.forEach(env => {
                    const url = link.urls[env.key];
                    if (url && url !== 'null') {
                        linksHtml += `
                            <div style="
                                display: flex;
                                align-items: center;
                                padding: 6px 8px;
                                background: rgba(255,255,255,0.03);
                                border-radius: 4px;
                                margin-bottom: 4px;
                                transition: background 0.2s ease;
                            " onmouseover="this.style.background='rgba(255,255,255,0.06)';"
                               onmouseout="this.style.background='rgba(255,255,255,0.03)';">
                                <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;">
                                    <div style="
                                        color: #fff;
                                        font-size: 10px;
                                        font-weight: bold;
                                        white-space: nowrap;
                                        padding: 2px 6px;
                                        background: ${env.color};
                                        border-radius: 3px;
                                    ">${env.name}</div>
                                    <div style="
                                        color: rgba(255,255,255,0.7);
                                        font-size: 10px;
                                        overflow: hidden;
                                        text-overflow: ellipsis;
                                        white-space: nowrap;
                                        flex: 1;
                                    " title="${url}">${url}</div>
                                </div>
                                <div style="display: flex; gap: 4px; margin-left: 8px;">
                                    <button class="test-link-copy-btn" data-url="${url}" style="
                                        background: rgba(33, 150, 243, 0.2);
                                        border: 1px solid rgba(33, 150, 243, 0.4);
                                        color: #64b5f6;
                                        padding: 3px 8px;
                                        border-radius: 3px;
                                        cursor: pointer;
                                        font-size: 9px;
                                        font-weight: bold;
                                        white-space: nowrap;
                                        transition: all 0.2s ease;
                                    " onmouseover="this.style.background='rgba(33, 150, 243, 0.3)';"
                                       onmouseout="this.style.background='rgba(33, 150, 243, 0.2)';"
                                    >Copy</button>
                                    <button class="test-link-open-btn" data-url="${url}" style="
                                        background: rgba(76, 175, 80, 0.2);
                                        border: 1px solid rgba(76, 175, 80, 0.4);
                                        color: #81c784;
                                        padding: 3px 8px;
                                        border-radius: 3px;
                                        cursor: pointer;
                                        font-size: 9px;
                                        font-weight: bold;
                                        white-space: nowrap;
                                        transition: all 0.2s ease;
                                    " onmouseover="this.style.background='rgba(76, 175, 80, 0.3)';"
                                       onmouseout="this.style.background='rgba(76, 175, 80, 0.2)';"
                                    >Open</button>
                                </div>
                            </div>
                        `;
                    }
                });
                
                linksHtml += `</div>`;
            });
            
            categoriesHtml += `
                <div style="margin-bottom: 16px;">
                    <div style="
                        color: #ffeb3b;
                        font-size: 13px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid rgba(255,235,59,0.2);
                    ">${category.name}</div>
                    ${linksHtml}
                </div>
            `;
        });
        
        return `
            <div style="
                padding: 12px;
                background: rgba(255,255,255,0.0);
                border-top: 1px solid rgba(255,255,255,0.1);
                max-height: 500px;
                overflow-y: auto;
            ">
                <!-- PTN Search Panel -->
                <div id="ptnSearchPanel" style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.0); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; backdrop-filter: blur(10px);">
                    <div style="
                        color: #ffeb3b;
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 12px;
                    ">Search PTN</div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input 
                            type="text" 
                            id="ptnSearchInput" 
                            placeholder="PTN No or Caption" 
                            autocomplete="off"
                            style="
                                flex: 1;
                                padding: 8px 12px;
                                border: none;
                                border-radius: 6px;
                                background: rgba(0, 0, 0, 0.4);
                                color: #fff;
                                font-size: 12px;
                                font-weight: 500;
                                outline: none;
                                transition: background 0.2s ease;
                            "
                        />
                        <style>
                            #ptnSearchInput::placeholder {
                                color: rgba(255, 255, 255, 0.6);
                                opacity: 1;
                            }
                        </style>
                        <button 
                            id="ptnSearchButton" 
                            style="
                                background: #ffeb3b;
                                color: #333;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 5px;
                                cursor: pointer;
                                font-size: 12px;
                                font-weight: bold;
                                white-space: nowrap;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            "
                            onmouseover="this.style.background='#fff'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(255,255,255,0.1)';"
                            onmouseout="this.style.background='#ffeb3b'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                        >Search</button>
                    </div>
                </div>
                
                <!-- PTN Results View -->
                <div id="ptnResultsView" style="display: none;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                        <div style="
                            color: #ffeb3b;
                            font-size: 14px;
                            font-weight: bold;
                        ">PTN Search Results</div>
                        <button 
                            id="ptnBackButton" 
                            style="
                                background: rgba(255,255,255,0.1);
                                border: 1px solid rgba(255,255,255,0.2);
                                color: white;
                                padding: 8px 16px;
                                border-radius: 5px;
                                cursor: pointer;
                                font-size: 12px;
                                font-weight: bold;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            "
                            onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='translateY(-1px)';"
                            onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(0)';"
                        >← Back</button>
                    </div>
                    <div style="
                        background: rgba(255,255,255,0.08);
                        border: 1px solid rgba(255,255,255,0.15);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        backdrop-filter: blur(10px);
                    ">
                    <div style="font-size: 12px; color: rgba(255,255,255,0.9);">
                        Search Term: <span id="ptnSearchTerm" style="color: #ffeb3b; font-weight: bold;"></span>
                    </div>
                    <div id="ptnResultsCount" style="font-size: 12px; color: #27ae60; font-weight: bold; margin-top: 6px;"></div>
                </div>
                    <div id="ptnSearchResults" style="max-height: 350px; overflow-y: auto;"></div>
                </div>
                
                <!-- Navigation Links Card -->
                <div id="navLinksCard" style="
                    background: rgba(255, 255, 255, 0.0);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 15px;
                    backdrop-filter: blur(10px);
                ">
                    <div style="
                        color: #ffeb3b;
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid rgba(255,255,255,0.15);
                    ">Navigation Links</div>
                    ${categoriesHtml}
                </div>
            </div>
        `;
    }

    return { createTestLinksPanel, loadPTNDataFromCSV, displayPTNSearchResults, showPTNSearchPanel };
})();
