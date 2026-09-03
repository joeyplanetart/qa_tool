// Background script for Cafepress QA Tools
// Import unified configuration
importScripts(
    'config.js',
    'services/storage.js',
    'services/token-utils.js',
    'services/rag-indexer.js',
    'services/rag-retriever.js',
    'services/llm-providers.js'
);

console.log('Cafepress QA Tools background script loaded');

function isSupportedTabUrl(url) {
    if (!url) return false;
    try {
        return CONFIG.isSupportedHostname(new URL(url).hostname);
    } catch (e) {
        return false;
    }
}

function getSidePanelStorageKey() {
    return CONFIG.SIDE_PANEL?.STORAGE_KEY || 'sidePanelEnabled';
}

async function isSidePanelEnabled() {
    const key = getSidePanelStorageKey();
    const result = await chrome.storage.local.get([key]);
    const defaultEnabled = CONFIG.SIDE_PANEL?.DEFAULT_ENABLED !== false;
    if (result[key] === undefined) return defaultEnabled;
    return result[key] !== false;
}

async function showMinimizedFloatingPanel(tabId) {
    if (!tabId) return;

    try {
        await chrome.tabs.sendMessage(tabId, { type: 'SHOW_FLOATING_MINIMIZED' });
        return;
    } catch (error) {
        const message = error?.message || '';
        const needsInject = message.includes('Receiving end does not exist')
            || message.includes('Could not establish connection');
        if (!needsInject) {
            console.log('SHOW_FLOATING_MINIMIZED failed:', message);
            return;
        }
    }

    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['config.js', 'content.js']
        });
        await new Promise((resolve) => setTimeout(resolve, 300));
        await chrome.tabs.sendMessage(tabId, { type: 'SHOW_FLOATING_MINIMIZED' });
    } catch (injectError) {
        console.log('Could not inject content script for floating panel:', injectError);
    }
}

function showFloatingPanelForWindow(windowId, tabId) {
    if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
            if (!chrome.runtime.lastError && tab?.id && isSupportedTabUrl(tab.url)) {
                showMinimizedFloatingPanel(tab.id);
            }
        });
        return;
    }

    chrome.tabs.query({ active: true, windowId }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id && isSupportedTabUrl(tab.url)) {
            showMinimizedFloatingPanel(tab.id);
        }
    });
}

async function applySidePanelBehavior() {
    const enabled = await isSidePanelEnabled();
    try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: enabled });
        console.log('Side panel openPanelOnActionClick:', enabled);
    } catch (error) {
        console.log('setPanelBehavior failed:', error);
    }
    return enabled;
}

applySidePanelBehavior();

chrome.storage.onChanged.addListener((changes, areaName) => {
    const key = getSidePanelStorageKey();
    if (areaName === 'local' && changes[key]) {
        applySidePanelBehavior();
    }
});

chrome.runtime.onInstalled.addListener(() => {
    applySidePanelBehavior();
});

// When side panel auto-opens (setting enabled), show minimized floating ball
if (chrome.sidePanel.onOpened) {
    chrome.sidePanel.onOpened.addListener((info) => {
        showFloatingPanelForWindow(info.windowId, info.tabId);
    });
}

// When side panel disabled, icon click only shows minimized floating ball
chrome.action.onClicked.addListener(async (tab) => {
    const enabled = await isSidePanelEnabled();
    if (enabled) return;

    if (isSupportedTabUrl(tab.url) && tab.id) {
        showMinimizedFloatingPanel(tab.id);
    }
});

// LLM streaming via long-lived port
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'llm-stream') return;

    port.onMessage.addListener(async (request) => {
        if (request.type === 'LLM_CHAT_STREAM') {
            handleChatStream(port, request);
        } else if (request.type === 'LLM_TRANSLATE') {
            handleTranslateStream(port, request);
        }
    });
});

async function handleChatStream(port, request) {
    const { providerId, model, messages, kbMode, userQuestion } = request;
    let chatMessages = [...messages];
    let sources = null;

    try {
        if (kbMode) {
            const chunks = await RAGRetriever.retrieve(userQuestion);
            if (!chunks.length) {
                port.postMessage({
                    type: 'chunk',
                    content: '知识库中未找到相关内容。请先在「知识库」Tab 导入文档。'
                });
                port.postMessage({ type: 'done', usage: null, sources: [] });
                return;
            }
            sources = RAGRetriever.formatSources(chunks);
            const rag = RAGRetriever.buildRAGPrompt(chunks, userQuestion);
            chatMessages = [
                { role: 'system', content: rag.system },
                { role: 'user', content: rag.userMessage }
            ];
        }

        await LLMProviders.streamChat({
            providerId,
            model,
            messages: chatMessages,
            onChunk: (content) => port.postMessage({ type: 'chunk', content }),
            onDone: ({ usage }) => port.postMessage({ type: 'done', usage, sources }),
            onError: (err) => port.postMessage({ type: 'error', error: err.message })
        });
    } catch (err) {
        port.postMessage({ type: 'error', error: err.message });
    }
}

async function handleTranslateStream(port, request) {
    const { text, sourceLang, targetLang, providerId, model } = request;

    try {
        await LLMProviders.translate({
            text,
            sourceLang,
            targetLang,
            providerId,
            model,
            onChunk: (content) => port.postMessage({ type: 'chunk', content }),
            onDone: ({ usage }) => port.postMessage({ type: 'done', usage }),
            onError: (err) => port.postMessage({ type: 'error', error: err.message })
        });
    } catch (err) {
        port.postMessage({ type: 'error', error: err.message });
    }
}

// Handle order fetch requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PHPSESSID') {
        console.log('🔍 Background: Getting PHPSESSID cookie');
        
        const url = request.url || sender.url;
        
        chrome.cookies.getAll({ url: url }, (cookies) => {
            const phpSessionCookie = cookies.find(cookie => cookie.name === 'PHPSESSID');
            
            if (phpSessionCookie) {
                console.log('✅ Background: PHPSESSID found:', phpSessionCookie.value);
                sendResponse({
                    success: true,
                    value: phpSessionCookie.value
                });
            } else {
                console.log('ℹ️ Background: No PHPSESSID cookie found');
                sendResponse({
                    success: false,
                    value: null
                });
            }
        });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'GET_CART_ID') {
        console.log('🔍 Background: Getting cart_id cookie');
        
        const url = request.url || sender.url;
        
        chrome.cookies.getAll({ url: url }, (cookies) => {
            const cartIdCookie = cookies.find(cookie => cookie.name === 'cart_id');
            
            if (cartIdCookie) {
                console.log('✅ Background: cart_id found:', cartIdCookie.value);
                sendResponse({
                    success: true,
                    value: cartIdCookie.value
                });
            } else {
                console.log('ℹ️ Background: No cart_id cookie found');
                sendResponse({
                    success: false,
                    value: null
                });
            }
        });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'GET_NO_TRACKING') {
        console.log('🔍 Background: Getting NO_TRACKING cookie');
        
        const url = request.url || sender.url;
        
        chrome.cookies.getAll({ url: url }, (cookies) => {
            const noTrackingCookie = cookies.find(cookie => cookie.name === 'NO_TRACKING');
            
            if (noTrackingCookie) {
                console.log('✅ Background: NO_TRACKING found:', noTrackingCookie.value);
                sendResponse({
                    success: true,
                    value: noTrackingCookie.value
                });
            } else {
                console.log('ℹ️ Background: No NO_TRACKING cookie found');
                sendResponse({
                    success: false,
                    value: null
                });
            }
        });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'FETCH_ORDER_FROM_ADMIN') {
        console.log('🔍 Background: Fetching order from Admin:', request.orderId);
        
        // Use custom URL if provided, otherwise default to order_tab_overview.php
        const adminUrl = request.url || `${CONFIG.ADMIN.LIVE}${CONFIG.API_ENDPOINTS.ORDER_TAB_OVERVIEW}?order_id=${request.orderId}`;
        console.log('Background: Admin URL:', adminUrl);
        
        fetch(adminUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'text/html',
            }
        })
        .then(response => {
            console.log('Background: Response status:', response.status);
            console.log('Background: Response ok:', response.ok);
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Unauthorized - Please login via SSO first');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.text();
        })
        .then(html => {
            console.log('Background: HTML received, length:', html.length);
            console.log('Background: HTML preview (first 500 chars):', html.substring(0, 500));
            
            // Send HTML back to content script
            sendResponse({
                success: true,
                html: html
            });
        })
        .catch(error => {
            console.error('Background: Error fetching order:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'APPROVE_BLOCK_IMAGE') {
        console.log('🔍 Background: Approve/Block image request:', request);
        
        const imageId = request.imageId;
        const action = request.action; // 'approve' or 'block'
        const environment = request.environment || 'pre'; // Default to pre (will switch to live when deployed)
        const branch = request.branch || CONFIG.BRANCH.CURRENT;
        const statusNo = action === 'approve' ? 1 : -1; // 1 for approve, -1 for block
        
        // Temporarily set the branch for this request
        const originalBranch = CONFIG.BRANCH.CURRENT;
        CONFIG.BRANCH.CURRENT = branch;
        
        // Determine Admin API URL based on environment using unified config
        const apiUrl = CONFIG.getAdminApiUrl(environment, CONFIG.API_ENDPOINTS.APPROVE_IMAGE);
        const adminBaseUrl = CONFIG.getAdminBaseUrl(environment);
        
        // Restore original branch
        CONFIG.BRANCH.CURRENT = originalBranch;
        
        console.log('========== APPROVE/BLOCK REQUEST DEBUG ==========');
        console.log(`Environment: ${environment}`);
        console.log(`Branch: ${branch}`);
        console.log(`API URL: ${apiUrl}`);
        console.log(`Admin Base URL: ${adminBaseUrl}`);
        console.log(`Action: ${action}`);
        console.log(`Image ID: ${imageId}`);
        
        // Construct form data
        const formData = new URLSearchParams();
        formData.append('image_ids[]', imageId);
        formData.append('status_no', statusNo);
        
        // Add reason_no for block action
        if (action === 'block') {
            formData.append('reason_no', 1);
        }
        
        formData.append('channel', 'MP');
        
        console.log(`Background: ${action === 'approve' ? 'Approving' : 'Blocking'} image ${imageId}`);
        console.log('FormData:', {
            'image_ids[]': imageId,
            'status_no': statusNo,
            'reason_no': action === 'block' ? 1 : undefined,
            'channel': 'MP'
        });
        console.log('FormData string:', formData.toString());
        console.log('Request headers:', {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': adminBaseUrl,
            'Referer': `${adminBaseUrl}/cstools/cp/cup_tool.php`
        });
        
        fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': adminBaseUrl,
                'Referer': `${adminBaseUrl}/cstools/cp/cup_tool.php`
            },
            body: formData.toString()
        })
        .then(async response => {
            console.log('========== APPROVE/BLOCK RESPONSE DEBUG ==========');
            console.log('Background: Response status:', response.status);
            console.log('Background: Response statusText:', response.statusText);
            console.log('Background: Response ok:', response.ok);
            console.log('Background: Response content-type:', response.headers.get('content-type'));
            console.log('Background: Response headers:', {
                'content-type': response.headers.get('content-type'),
                'content-length': response.headers.get('content-length'),
                'set-cookie': response.headers.get('set-cookie')
            });
            
            if (!response.ok) {
                // Get response body for debugging
                const responseText = await response.text();
                console.error('Background: Error response body (first 1000 chars):', responseText.substring(0, 1000));
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Unauthorized (${response.status}) - Please login via SSO first. Response: ${responseText.substring(0, 200)}`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}. Body: ${responseText.substring(0, 200)}`);
            }
            
            // This API returns text/html, not JSON
            const contentType = response.headers.get('content-type');
            console.log('Background: Content-Type:', contentType);
            
            // Get response as text
            const responseText = await response.text();
            console.log('Background: Response body:', responseText);
            
            // The API returns "true" or "false" as plain text
            // or may return HTML if there's an error
            if (responseText.trim().toLowerCase() === 'false') {
                throw new Error('API returned false - Approval/Block failed. Check permissions or image ID.');
            }
            
            if (responseText.trim().toLowerCase() === 'true') {
                return { success: true, result: responseText };
            }
            
            // If response contains HTML tags, it's likely an error page
            if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
                console.error('Background: Received HTML page instead of result:', responseText.substring(0, 500));
                throw new Error('Not logged in or session expired. Please login via SSO first');
            }
            
            // Return the text as-is if it's some other format
            return { success: true, result: responseText };
        })
        .then(data => {
            console.log('Background: API response data:', JSON.stringify(data, null, 2));
            
            // Check if API returned an error
            if (data.error || data.success === false) {
                console.error('Background: API returned error:', data);
                throw new Error(data.message || data.error || JSON.stringify(data));
            }
            
            console.log('✅ Approve/Block success!');
            sendResponse({
                success: true,
                data: data,
                action: action,
                imageId: imageId
            });
        })
        .catch(error => {
            console.error('========== APPROVE/BLOCK ERROR ==========');
            console.error('Background: Error type:', error.name);
            console.error('Background: Error message:', error.message);
            console.error('Background: Error stack:', error.stack);
            
            // Improve error message
            let errorMessage = error.message;
            if (errorMessage.includes('Unexpected token')) {
                errorMessage = 'Not logged in or session expired. Response is not valid JSON. Please login via SSO first';
            }
            
            sendResponse({
                success: false,
                error: errorMessage
            });
        });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'SEARCH_STORE') {
        console.log('🔍 Background: Search Store request:', request);
        
        const email = request.email || '';
        const swCustomerId = request.swCustomerId || '';
        const environment = request.environment || 'pre'; // Default to pre (Live API not available yet)
        const branch = request.branch || CONFIG.BRANCH.CURRENT;
        
        // Temporarily set the branch for this request
        const originalBranch = CONFIG.BRANCH.CURRENT;
        CONFIG.BRANCH.CURRENT = branch;
        
        // Determine Admin API URL based on environment using unified config
        const apiUrl = CONFIG.getAdminApiUrl(environment, CONFIG.API_ENDPOINTS.SELLER_STORE);
        const adminBaseUrl = CONFIG.getAdminBaseUrl(environment);
        
        // Restore original branch
        CONFIG.BRANCH.CURRENT = originalBranch;
        
        console.log(`Environment: ${environment}`);
        console.log(`Branch: ${branch}`);
        console.log(`API URL: ${apiUrl}`);
        console.log(`Admin Base URL: ${adminBaseUrl}`);
        console.log(`Search params: email=${email}, sw_customer_id=${swCustomerId}`);
        
        // Construct form data
        const formData = new URLSearchParams();
        if (email) formData.append('email', email);
        if (swCustomerId) formData.append('sw_customer_id', swCustomerId);
        
        fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': adminBaseUrl,
                'Referer': `${adminBaseUrl}/cstools/cp/cup_tool.php`
            },
            body: formData.toString()
        })
        .then(response => {
            console.log('Background: Response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Unauthorized - Please login via SSO first');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Background: API response data:', data);
            
            // Parse the response data
            let stores = [];
            
            if (data && data.stores && Array.isArray(data.stores)) {
                stores = data.stores.map(store => ({
                    email: store.email || email,
                    storeName: store.store_name || store.storeName || 'N/A',
                    storeId: store.store_id || store.storeId || 'N/A',
                    cpMemberNo: store.cp_member_no || store.cpMemberNo || 'N/A',
                    swCustomerId: store.customer_id || store.sw_customer_id || store.swCustomerId || swCustomerId || 'N/A'
                }));
            } else if (Array.isArray(data)) {
                // If data is directly an array
                stores = data.map(store => ({
                    email: store.email || email,
                    storeName: store.store_name || store.storeName || 'N/A',
                    storeId: store.store_id || store.storeId || 'N/A',
                    cpMemberNo: store.cp_member_no || store.cpMemberNo || 'N/A',
                    swCustomerId: store.customer_id || store.sw_customer_id || store.swCustomerId || swCustomerId || 'N/A'
                }));
            }
            
            sendResponse({
                success: true,
                data: stores
            });
        })
        .catch(error => {
            console.error('Background: Error:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'CANCEL_ORDER') {
        console.log('🔍 Background: Cancel Order request:', request);
        
        const orderId = request.orderId;
        const environment = request.environment || 'pre';
        const branch = request.branch || CONFIG.BRANCH.CURRENT;
        
        // Temporarily set the branch for this request
        const originalBranch = CONFIG.BRANCH.CURRENT;
        CONFIG.BRANCH.CURRENT = branch;
        
        // Determine Admin API URL based on environment using unified config
        const apiUrl = CONFIG.getAdminApiUrl(environment, CONFIG.API_ENDPOINTS.EDIT_ORDER_AJAX);
        const adminBaseUrl = CONFIG.getAdminBaseUrl(environment);
        
        // Restore original branch
        CONFIG.BRANCH.CURRENT = originalBranch;
        
        console.log('========== CANCEL ORDER REQUEST DEBUG ==========');
        console.log(`Environment: ${environment}`);
        console.log(`Branch: ${branch}`);
        console.log(`API URL: ${apiUrl}`);
        console.log(`Admin Base URL: ${adminBaseUrl}`);
        console.log(`Order ID: ${orderId}`);
        
        // Construct form data
        const formData = new URLSearchParams();
        formData.append('action', 'cancel_order_complete');
        formData.append('order_id', orderId);
        formData.append('reason_code', '101');
        formData.append('reason_comment', '');
        formData.append('need_email', '0');
        formData.append('cancel_cost', '0');
        formData.append('cancel_with_vendor', '0');
        
        console.log('FormData:', {
            'action': 'cancel_order_complete',
            'order_id': orderId,
            'reason_code': '101',
            'reason_comment': '',
            'need_email': '0',
            'cancel_cost': '0',
            'cancel_with_vendor': '0'
        });
        console.log('FormData string:', formData.toString());
        
        fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': adminBaseUrl,
                'Referer': `${adminBaseUrl}/orders/order_tab_index.php?order_id=${orderId}`
            },
            body: formData.toString()
        })
        .then(async response => {
            console.log('========== CANCEL ORDER RESPONSE DEBUG ==========');
            console.log('Background: Response status:', response.status);
            console.log('Background: Response statusText:', response.statusText);
            console.log('Background: Response ok:', response.ok);
            console.log('Background: Response content-type:', response.headers.get('content-type'));
            
            if (!response.ok) {
                // Get response body for debugging
                const responseText = await response.text();
                console.error('Background: Error response body (first 1000 chars):', responseText.substring(0, 1000));
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Unauthorized (${response.status}) - Please login via SSO first`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Get response as text
            const responseText = await response.text();
            console.log('Background: Response body:', responseText);
            
            return { success: true, result: responseText };
        })
        .then(data => {
            console.log('Background: Cancel order response:', JSON.stringify(data, null, 2));
            console.log('✅ Cancel order success!');
            
            sendResponse({
                success: true,
                data: data
            });
        })
        .catch(error => {
            console.error('========== CANCEL ORDER ERROR ==========');
            console.error('Background: Error type:', error.name);
            console.error('Background: Error message:', error.message);
            console.error('Background: Error stack:', error.stack);
            
            sendResponse({
                success: false,
                error: error.message
            });
        });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'GEN_GIFTCERTS') {
        console.log('🎁 Background: Generate Gift Certificates request:', request);
        
        const { gcNumber, gcAmount, notes, siteIds, environment } = request;
        const env = environment || 'stage'; // 使用传递的环境，默认 stage
        const branch = CONFIG.BRANCH.CURRENT;
        
        console.log('========== GEN GIFTCERTS REQUEST DEBUG ==========');
        console.log(`Environment: ${env}`);
        console.log(`Branch: ${branch}`);
        console.log(`GC Number: ${gcNumber}`);
        console.log(`GC Amount: ${gcAmount}`);
        console.log(`Notes: ${notes}`);
        console.log(`Site IDs: ${siteIds.join(', ')}`);
        
        // Temporarily set the branch for this request
        const originalBranch = CONFIG.BRANCH.CURRENT;
        CONFIG.BRANCH.CURRENT = branch;
        
        const adminBaseUrl = CONFIG.getAdminBaseUrl(env);
        
        // Restore original branch
        CONFIG.BRANCH.CURRENT = originalBranch;
        
        // Generate gift certificates for all site IDs
        const promises = siteIds.map(async (siteId) => {
            const url = `${adminBaseUrl}/catalog/promos/giftcerts.php?site_id=${siteId}`;
            
            console.log(`📤 Generating for Site ${siteId}: ${url}`);
            
            // Construct form data
            const formData = new URLSearchParams();
            formData.append('gc_number', gcNumber);
            formData.append('emails', '');
            formData.append('gc_amount', gcAmount);
            formData.append('notes', notes);
            formData.append('site_id', siteId);
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Origin': adminBaseUrl,
                        'Referer': url
                    },
                    body: formData.toString()
                });
                
                console.log(`Site ${siteId} Response status:`, response.status);
                
                if (!response.ok) {
                    const responseText = await response.text();
                    console.error(`Site ${siteId} Error response:`, responseText.substring(0, 500));
                    
                    if (response.status === 401 || response.status === 403) {
                        throw new Error('Unauthorized - Please login via SSO first');
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const responseText = await response.text();
                console.log(`✅ Site ${siteId} success, response length:`, responseText.length);
                
                return {
                    siteId,
                    success: true,
                    response: responseText.substring(0, 200)
                };
            } catch (error) {
                console.error(`❌ Site ${siteId} error:`, error.message);
                return {
                    siteId,
                    success: false,
                    error: error.message
                };
            }
        });
        
        // Wait for all requests to complete
        Promise.all(promises)
            .then(results => {
                console.log('========== GEN GIFTCERTS RESULTS ==========');
                results.forEach(result => {
                    if (result.success) {
                        console.log(`✅ Site ${result.siteId}: Success`);
                    } else {
                        console.log(`❌ Site ${result.siteId}: ${result.error}`);
                    }
                });
                
                sendResponse({
                    success: true,
                    results: results
                });
            })
            .catch(error => {
                console.error('========== GEN GIFTCERTS ERROR ==========');
                console.error('Error:', error);
                
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        
        // Return true to indicate async response
        return true;
    }
    
    if (request.type === 'GEN_PROMOCODE') {
        console.log('🎟️ Background: Generate Promo Code request:', request);
        
        const { pcId, salePercent, voucherMaxValue, dateStr, description, siteIds, environment } = request;
        const env = environment || 'stage';
        const branch = CONFIG.BRANCH.CURRENT;
        
        console.log('========== GEN PROMOCODE REQUEST DEBUG ==========');
        console.log(`Environment: ${env}`);
        console.log(`Branch: ${branch}`);
        console.log(`Promo Code ID: ${pcId}`);
        console.log(`Sale Percent: ${salePercent}%`);
        console.log(`Voucher Max Value: $${voucherMaxValue}`);
        console.log(`Date: ${dateStr}`);
        console.log(`Description: ${description}`);
        console.log(`Site IDs: ${siteIds.join(', ')}`);
        
        // Temporarily set the branch for this request
        const originalBranch = CONFIG.BRANCH.CURRENT;
        CONFIG.BRANCH.CURRENT = branch;
        
        const adminBaseUrl = CONFIG.getAdminBaseUrl(env);
        
        // Restore original branch
        CONFIG.BRANCH.CURRENT = originalBranch;
        
        const apiUrl = `${adminBaseUrl}/catalog/promos/promos_edit.php`;
        
        // Generate promo codes for all site IDs
        const promises = siteIds.map(async (siteId) => {
            console.log(`📤 Generating Promo Code for Site ${siteId}`);
            
            // Construct form data
            const formData = new URLSearchParams();
            formData.append('single_use', '1');
            formData.append('auto_apply_gen', '0');
            formData.append('action', 'create_promo_code');
            formData.append('id', pcId);
            formData.append('site_id', siteId);
            formData.append('start_day', dateStr);
            formData.append('start_hour', '01');
            formData.append('start_min', '00');
            formData.append('start_sec', '00');
            formData.append('end_day', dateStr);
            formData.append('end_hour', '23');
            formData.append('end_min', '59');
            formData.append('end_sec', '59');
            formData.append('sale_percent', salePercent);
            formData.append('min_subtotal', '1');
            formData.append('voucher_max_value', voucherMaxValue);
            formData.append('shipping_discount', 'free_2day_shipping');
            formData.append('description', description);
            formData.append('allow_shopping_cart_description_override', 'on');
            formData.append('shopping_cart_description_override', description);
            
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Accept': '*/*',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Origin': adminBaseUrl,
                        'Referer': `${adminBaseUrl}/catalog/promos/promos.php?single_use=1&site_id=${siteId}&filter=`
                    },
                    body: formData.toString()
                });
                
                console.log(`Site ${siteId} Response status:`, response.status);
                
                if (!response.ok) {
                    const responseText = await response.text();
                    console.error(`Site ${siteId} Error response:`, responseText.substring(0, 500));
                    
                    if (response.status === 401 || response.status === 403) {
                        throw new Error('Unauthorized - Please login via SSO first');
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const responseText = await response.text();
                console.log(`✅ Site ${siteId} success, response length:`, responseText.length);
                
                return {
                    siteId,
                    success: true,
                    response: responseText.substring(0, 200)
                };
            } catch (error) {
                console.error(`❌ Site ${siteId} error:`, error.message);
                return {
                    siteId,
                    success: false,
                    error: error.message
                };
            }
        });
        
        // Wait for all requests to complete
        Promise.all(promises)
            .then(results => {
                console.log('========== GEN PROMOCODE RESULTS ==========');
                results.forEach(result => {
                    if (result.success) {
                        console.log(`✅ Site ${result.siteId}: Success`);
                    } else {
                        console.log(`❌ Site ${result.siteId}: ${result.error}`);
                    }
                });
                
                sendResponse({
                    success: true,
                    results: results
                });
            })
            .catch(error => {
                console.error('========== GEN PROMOCODE ERROR ==========');
                console.error('Error:', error);
                
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        
        // Return true to indicate async response
        return true;
    }
    
    // Handle GET_COOKIES request
    if (request.type === 'GET_COOKIES') {
        console.log('🍪 Background: Getting cookies for URL:', request.url);
        
        const url = request.url;
        
        chrome.cookies.getAll({ url: url }, (cookies) => {
            console.log(`✅ Background: Found ${cookies.length} cookies`);
            if (cookies.length > 0) {
                console.log('Cookie names:', cookies.map(c => c.name).join(', '));
            }
            sendResponse(cookies);
        });
        
        // Return true to indicate async response
        return true;
    }
    
    // Handle CLEAR_COOKIES request
    if (request.type === 'CLEAR_COOKIES') {
        console.log('🗑️ Background: Clearing cookies for URL:', request.url);
        
        const url = request.url;
        
        chrome.cookies.getAll({ url: url }, async (cookies) => {
            console.log(`Found ${cookies.length} cookies to clear`);
            
            let cleared = 0;
            let failed = 0;
            
            for (const cookie of cookies) {
                try {
                    const cookieUrl = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
                    await chrome.cookies.remove({
                        url: cookieUrl,
                        name: cookie.name
                    });
                    cleared++;
                    console.log(`✅ Cleared cookie: ${cookie.name}`);
                } catch (error) {
                    failed++;
                    console.error(`❌ Failed to clear cookie ${cookie.name}:`, error);
                }
            }
            
            console.log(`🍪 Cookie clearing complete: ${cleared} cleared, ${failed} failed`);
            
            sendResponse({
                success: true,
                cleared: cleared,
                failed: failed,
                total: cookies.length
            });
        });
        
        // Return true to indicate async response
        return true;
    }
    
    // Handle SET_COOKIE request
    if (request.type === 'SET_COOKIE') {
        console.log('🍪 Background: Setting cookie:', request.name);
        console.log('Request details:', JSON.stringify(request, null, 2));
        
        const { name, value, domain, url } = request;
        
        try {
            // Get current URL to determine protocol
            const urlObj = new URL(url);
            const protocol = urlObj.protocol;
            const path = '/'; // Default path
            
            // For same-origin cookies, Chrome cookies API automatically handles the domain
            // We should NOT set the domain property for same-origin cookies
            // Only set domain if we explicitly want to share across subdomains
            const cookieDetails = {
                url: url,  // Chrome API uses URL to determine the correct domain automatically
                name: name,
                value: value,
                path: path,
                httpOnly: false,
                sameSite: 'lax',  // Must be lowercase: 'lax', 'strict', 'no_restriction', or 'unspecified'
                expirationDate: Date.now() / 1000 + 365 * 24 * 60 * 60 // 1 year from now
            };
            
            // Only set secure flag if the page is using HTTPS
            // Don't force secure on HTTP pages as it will fail
            if (protocol === 'https:') {
                cookieDetails.secure = true;
            }
            // If HTTP, don't set secure (Chrome API default is false for HTTP)
            
            // Don't set domain for same-origin cookies - Chrome API handles this automatically
            // Only add domain if we want to share cookie across subdomains (not needed for basic use case)
            
            console.log('Setting cookie with details:', JSON.stringify(cookieDetails, null, 2));
            
            // Set cookie
            chrome.cookies.set(cookieDetails, (cookie) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Error setting cookie:', chrome.runtime.lastError);
                    console.error('Failed cookie details:', cookieDetails);
                    sendResponse({
                        success: false,
                        error: chrome.runtime.lastError.message
                    });
                } else {
                    console.log('✅ Cookie set successfully:', cookie);
                    console.log('Cookie domain:', cookie.domain);
                    console.log('Cookie path:', cookie.path);
                    sendResponse({
                        success: true,
                        cookie: cookie
                    });
                }
            });
            
            // Return true to indicate async response
            return true;
        } catch (error) {
            console.error('❌ Error in SET_COOKIE:', error);
            sendResponse({
                success: false,
                error: error.message
            });
            return false;
        }
    }
    
    // Handle DELETE_COOKIE request
    if (request.type === 'DELETE_COOKIE') {
        console.log('🗑️ Background: Deleting cookie:', request.name);
        
        const { name, domain, path, url } = request;
        
        try {
            // Construct cookie URL
            const urlObj = new URL(url);
            const protocol = urlObj.protocol;
            const cookieUrl = `${protocol}//${domain}${path}`;
            
            chrome.cookies.remove({
                url: cookieUrl,
                name: name
            }, (details) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Error deleting cookie:', chrome.runtime.lastError);
                    sendResponse({
                        success: false,
                        error: chrome.runtime.lastError.message
                    });
                } else {
                    console.log('✅ Cookie deleted successfully:', name);
                    sendResponse({
                        success: true,
                        name: name
                    });
                }
            });
            
            // Return true to indicate async response
            return true;
        } catch (error) {
            console.error('❌ Error in DELETE_COOKIE:', error);
            sendResponse({
                success: false,
                error: error.message
            });
            return false;
        }
    }

    if (request.type === 'RAG_INDEX_DOC') {
        (async () => {
            try {
                const doc = await RAGIndexer.indexDocument(
                    request.name,
                    request.content,
                    request.fileType
                );
                sendResponse({ success: true, doc });
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true;
    }

    if (request.type === 'RAG_DELETE_DOC') {
        (async () => {
            try {
                await AIStorage.deleteDocument(request.docId);
                sendResponse({ success: true });
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true;
    }

    if (request.type === 'OPEN_SIDE_PANEL') {
        const tabName = request.tab || 'chat';
        const tabId = sender.tab?.id;
        const windowId = sender.tab?.windowId;
        chrome.storage.local.set({ sidePanelTab: tabName }, () => {
            if (tabId) {
                chrome.sidePanel.open({ tabId }).catch(() => {
                    if (windowId) chrome.sidePanel.open({ windowId });
                });
            } else if (windowId) {
                chrome.sidePanel.open({ windowId });
            }
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.type === 'OPEN_QA_PANEL') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab?.id) {
                chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_FLOATING_WINDOW' }).catch(() => {
                    sendResponse({ success: false, error: '请在支持的 Cafepress 页面上使用' });
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: '未找到活动标签页' });
            }
        });
        return true;
    }

    if (request.type === 'OPEN_KNOWLEDGE_BASE') {
        const filePath = request.filePath || CONFIG.KNOWLEDGE_BASE.DEFAULT_PATH;

        function pathToFileUrl(localPath) {
            if (!localPath) return '';
            if (/^file:\/\//i.test(localPath)) return localPath;

            const normalized = localPath.replace(/\\/g, '/');
            const encoded = normalized.split('/').map((segment, index) => {
                if (index === 0 && segment === '') return '';
                return encodeURIComponent(segment);
            }).join('/');

            return normalized.startsWith('/')
                ? `file://${encoded}`
                : `file:///${encoded}`;
        }

        const fileUrl = pathToFileUrl(filePath);
        console.log('📚 Opening knowledge base:', fileUrl);

        chrome.tabs.create({ url: fileUrl }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error('❌ Failed to open knowledge base:', chrome.runtime.lastError);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }

            sendResponse({
                success: true,
                tabId: tab?.id,
                url: fileUrl
            });
        });

        return true;
    }
});
