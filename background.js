// Background script for Cafepress QA Tools
console.log('Cafepress QA Tools background script loaded');

// Handle order fetch requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FETCH_ORDER_FROM_ADMIN') {
        console.log('🔍 Background: Fetching order from Admin:', request.orderId);
        
        // Use custom URL if provided, otherwise default to order_tab_overview.php
        const adminUrl = request.url || `https://admin.planetart.com/orders/order_tab_overview.php?order_id=${request.orderId}`;
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
        const statusNo = action === 'approve' ? 1 : 0; // 1 for approve, 0 for block
        
        // Construct form data
        const formData = new URLSearchParams();
        formData.append('image_ids[]', imageId);
        formData.append('status_no', statusNo);
        formData.append('channel', 'MP');
        
        const apiUrl = 'https://admin-cpsw-web.pre.planetart.com/ajax/ajax_cp_cup_tool_approve.php';
        
        console.log(`Background: ${action === 'approve' ? 'Approving' : 'Blocking'} image ${imageId}, status_no: ${statusNo}`);
        
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
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
    
    // Check if we're on a supported domain
    const supportedDomains = [
        // US sites
        'cafus-cpsw-web.pre.planetart.com',
        'cafus-cpsw-web.stage.planetart.com', 
        'www.cafepress.com',
        'cafepress.com',
        // CA sites
        'cafca-cpsw-web.pre.planetart.com',
        'cafca-cpsw-web.stage.planetart.com',
        'www.cafepress.ca',
        'cafepress.ca',
        // UK sites
        'cafuk-cpsw-web.pre.planetart.com',
        'cafuk-cpsw-web.stage.planetart.com',
        'www.cafepress.co.uk',
        'cafepress.co.uk',
        // AU sites
        'cafau-cpsw-web.pre.planetart.com',
        'cafau-cpsw-web.stage.planetart.com',
        'www.cafepress.com.au',
        'cafepress.com.au'
    ];
    
    const isSupported = supportedDomains.some(domain => tab.url && tab.url.includes(domain));
    
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
