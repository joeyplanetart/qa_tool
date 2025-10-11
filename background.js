// Background script for CP Product Info
console.log('CP Product Info background script loaded');

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
