// Background script for Cafepress QA Tools
// Import unified configuration
importScripts('config.js');

console.log('Cafepress QA Tools background script loaded');

// Handle order fetch requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        const environment = request.environment || 'pre'; // Default to pre
        const statusNo = action === 'approve' ? 1 : -1; // 1 for approve, -1 for block
        
        // Determine Admin API URL based on environment using unified config
        const apiUrl = CONFIG.getAdminApiUrl(environment, CONFIG.API_ENDPOINTS.APPROVE_IMAGE);
        
        console.log(`Environment: ${environment}`);
        console.log(`API URL: ${apiUrl}`);
        
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
        
        fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
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
            
            sendResponse({
                success: true,
                data: data,
                action: action,
                imageId: imageId
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
    
    if (request.type === 'SEARCH_STORE') {
        console.log('🔍 Background: Search Store request:', request);
        
        const email = request.email || '';
        const swCustomerId = request.swCustomerId || '';
        const environment = request.environment || 'pre';
        
        // Determine Admin API URL based on environment using unified config
        const apiUrl = CONFIG.getAdminApiUrl(environment, CONFIG.API_ENDPOINTS.SELLER_STORE);
        
        console.log(`Environment: ${environment}`);
        console.log(`API URL: ${apiUrl}`);
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
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
    
    // Check if we're on a supported domain using unified config
    function isSupportedUrl(url) {
        if (!url) return false;
        
        try {
            const hostname = new URL(url).hostname;
            return CONFIG.isSupportedHostname(hostname);
        } catch (e) {
            console.error('Error parsing URL:', e);
            return false;
        }
    }
    
    const isSupported = isSupportedUrl(tab.url);
    
    if (isSupported) {
        console.log('Supported domain detected:', tab.url);
        // Send message to content script to show floating window
        chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_FLOATING_WINDOW'
        }).catch((error) => {
            console.log('Error sending message to content script:', error);
        });
    } else {
        console.log('Not on supported page:', tab.url);
    }
});
