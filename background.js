// Background script for CP Product Info
console.log('CP Product Info background script loaded');

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
    
    if (request.type === 'CHECK_LOGIN_STATUS') {
        console.log('🔍 Background: Checking login status...');
        
        // Check cookies from admin.planetart.com and login.planetart.com
        Promise.all([
            chrome.cookies.get({ url: 'https://admin.planetart.com', name: 'attntv_mstore_email' }),
            chrome.cookies.get({ url: 'https://admin.planetart.com', name: 'stiadmin_user_id' }),
            chrome.cookies.get({ url: 'https://login.planetart.com', name: 'attntv_mstore_email' }),
            chrome.cookies.get({ url: 'https://login.planetart.com', name: 'stiadmin_user_id' })
        ])
        .then(([adminEmailCookie, adminUserIdCookie, loginEmailCookie, loginUserIdCookie]) => {
            console.log('Background: Admin email cookie:', adminEmailCookie);
            console.log('Background: Admin userId cookie:', adminUserIdCookie);
            console.log('Background: Login email cookie:', loginEmailCookie);
            console.log('Background: Login userId cookie:', loginUserIdCookie);
            
            // Try admin domain first, then login domain
            let emailCookie = adminEmailCookie || loginEmailCookie;
            let userIdCookie = adminUserIdCookie || loginUserIdCookie;
            
            if (emailCookie && emailCookie.value) {
                // Remove :0 suffix if present
                let emailValue = emailCookie.value;
                const colonIndex = emailValue.lastIndexOf(':');
                if (colonIndex !== -1) {
                    emailValue = emailValue.substring(0, colonIndex);
                }
                
                const userId = userIdCookie && userIdCookie.value ? userIdCookie.value : 'N/A';
                
                console.log('✅ Background: User logged in:', emailValue, userId);
                
                sendResponse({
                    isLoggedIn: true,
                    email: emailValue,
                    userId: userId
                });
            } else {
                console.log('❌ Background: User not logged in');
                
                sendResponse({
                    isLoggedIn: false,
                    email: null,
                    userId: null
                });
            }
        })
        .catch(error => {
            console.error('❌ Background: Error checking cookies:', error);
            sendResponse({
                isLoggedIn: false,
                email: null,
                userId: null,
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
