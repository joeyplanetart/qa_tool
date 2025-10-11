// Popup script
console.log('=== POPUP SCRIPT STARTING ===');
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    const loadingDiv = document.getElementById('loading');
    const contentDiv = document.getElementById('content');
    const noDataDiv = document.getElementById('noData');
    const designerDisplay = document.getElementById('designerDisplay');
    const designIdDisplay = document.getElementById('designIdDisplay');
    const categoryIdDisplay = document.getElementById('categoryIdDisplay');
    const stockStatusDisplay = document.getElementById('stockStatusDisplay');
    const cpProductIdDisplay = document.getElementById('cpProductIdDisplay');
    const cpProductTypeDisplay = document.getElementById('cpProductTypeDisplay');
    const urlDisplay = document.getElementById('urlDisplay');
    const timestampDisplay = document.getElementById('timestampDisplay');
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshBtn2 = document.getElementById('refreshBtn2');
    
    // Format timestamp
    function formatTimestamp(isoString) {
        if (!isoString) return 'Unknown';
        
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} min ago`;
        } else if (diffMinutes < 1440) {
            const hours = Math.floor(diffMinutes / 60);
            return `${hours} hr ago`;
        } else {
            return date.toLocaleString('en-US');
        }
    }
    
    // Display data
    function displayData(data) {
        if (data && (data.designerName || data.designId || data.cpProductId || data.productsData)) {
            
            // Display Designer information
            if (data.designerName) {
                if (data.designerLink) {
                    designerDisplay.innerHTML = `<span class="label">Designer:</span><span class="value"><a href="${data.designerLink}" target="_blank" class="designer-link">${data.designerName}</a></span>`;
                } else {
                    designerDisplay.innerHTML = `<span class="label">Designer:</span><span class="value">${data.designerName}</span>`;
                }
            } else {
                designerDisplay.innerHTML = `<span class="label">Designer:</span><span class="value">Not found</span>`;
            }
            
            // Display DesignId information
            if (data.designId) {
                designIdDisplay.innerHTML = `<span class="label">DesignId:</span><span class="value">${data.designId}</span>`;
            } else {
                designIdDisplay.innerHTML = `<span class="label">DesignId:</span><span class="value">Not found</span>`;
            }
            
            // Display Category ID
            if (data.productsData && data.productsData.category_id !== undefined) {
                const categoryIdValue = (data.productsData.category_id !== null) ? data.productsData.category_id : 'N/A';
                categoryIdDisplay.innerHTML = `<span class="label">Category ID:</span><span class="value">${categoryIdValue}</span>`;
            } else {
                categoryIdDisplay.innerHTML = `<span class="label">Category ID:</span><span class="value">Not found</span>`;
            }
            
            // Display Stock Status
            if (data.productsData && data.productsData.is_out_of_stock !== undefined) {
                const stockStatus = data.productsData.is_out_of_stock ? 'Out of Stock' : 'In Stock';
                const stockColor = data.productsData.is_out_of_stock ? '#e74c3c' : '#27ae60';
                stockStatusDisplay.innerHTML = `<span class="label">Stock:</span><span class="value" style="color: ${stockColor};">${stockStatus}</span>`;
            } else {
                stockStatusDisplay.innerHTML = `<span class="label">Stock:</span><span class="value">Not found</span>`;
            }
            
            // Display CP Product ID - prioritize URL extraction over JavaScript object
            if (data.cpProductId) {
                cpProductIdDisplay.innerHTML = `<span class="label">CP Product ID:</span><span class="value">${data.cpProductId}</span>`;
                console.log('POPUP: Using CP Product ID from URL:', data.cpProductId);
            } else if (data.productsData && data.productsData.cp_product_id !== undefined) {
                const cpProductIdValue = (data.productsData.cp_product_id !== null) ? data.productsData.cp_product_id : 'N/A';
                cpProductIdDisplay.innerHTML = `<span class="label">CP Product ID:</span><span class="value">${cpProductIdValue}</span>`;
                console.log('POPUP: Using CP Product ID from JavaScript object:', data.productsData.cp_product_id);
            } else {
                cpProductIdDisplay.innerHTML = `<span class="label">CP Product ID:</span><span class="value">Not found</span>`;
                console.log('POPUP: CP Product ID not found');
            }
            
            // CP Product Type - ONLY from default_design path
            let cpProductType = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.default_design && 
                data.productsData.full_object.default_design.cp_product_type_no !== undefined) {
                cpProductType = (data.productsData.full_object.default_design.cp_product_type_no !== null) ? 
                               data.productsData.full_object.default_design.cp_product_type_no : 'N/A';
                console.log('POPUP: ✅ Found CP Product Type from default_design:', cpProductType);
            }
            
            cpProductTypeDisplay.innerHTML = `<span class="label">CP Product Type:</span><span class="value">${cpProductType}</span>`;
            
            // Default Overlay ID - ONLY from default_design path
            let defaultOverlayId = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.default_design && 
                data.productsData.full_object.default_design.default_overlay_id !== undefined) {
                defaultOverlayId = (data.productsData.full_object.default_design.default_overlay_id !== null) ? 
                                  data.productsData.full_object.default_design.default_overlay_id : 'N/A';
                console.log('POPUP: ✅ Found Default Overlay ID from default_design:', defaultOverlayId);
            }
            
            // Need to create display element for Default Overlay ID
            let defaultOverlayIdDisplay = document.getElementById('defaultOverlayIdDisplay');
            if (!defaultOverlayIdDisplay) {
                defaultOverlayIdDisplay = document.createElement('div');
                defaultOverlayIdDisplay.id = 'defaultOverlayIdDisplay';
                defaultOverlayIdDisplay.className = 'info-item';
                cpProductTypeDisplay.parentNode.insertBefore(defaultOverlayIdDisplay, cpProductTypeDisplay.nextSibling);
            }
            defaultOverlayIdDisplay.innerHTML = `<span class="label">Default Overlay ID:</span><span class="value">${defaultOverlayId}</span>`;
            
            // Option ID - ONLY from default_sku path
            let optionId = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.default_sku && 
                data.productsData.full_object.default_sku.option_id !== undefined) {
                optionId = (data.productsData.full_object.default_sku.option_id !== null) ? 
                          data.productsData.full_object.default_sku.option_id : 'N/A';
                console.log('POPUP: ✅ Found Option ID from default_sku:', optionId);
            }
            
            let optionIdDisplay = document.getElementById('optionIdDisplay');
            if (!optionIdDisplay) {
                optionIdDisplay = document.createElement('div');
                optionIdDisplay.id = 'optionIdDisplay';
                optionIdDisplay.className = 'info-item';
                defaultOverlayIdDisplay.parentNode.insertBefore(optionIdDisplay, defaultOverlayIdDisplay.nextSibling);
            }
            optionIdDisplay.innerHTML = `<span class="label">Option ID:</span><span class="value">${optionId}</span>`;
            
            // Site ID - Hardcoded based on site type
            let siteId = 'Not found';
            
            // Get current tab URL to determine site type and return hardcoded Site ID
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                const currentUrl = tabs[0].url;
                let calculatedSiteId = 'Not found';
                
                if (currentUrl.includes('cafus-cpsw-web') || 
                    (currentUrl.includes('cafepress.com') && !currentUrl.includes('cafepress.ca') && !currentUrl.includes('cafepress.co.uk') && !currentUrl.includes('cafepress.com.au'))) {
                    calculatedSiteId = '170'; // US site
                    console.log('POPUP: ✅ Hardcoded Site ID for US site:', calculatedSiteId);
                }
                else if (currentUrl.includes('cafca-cpsw-web') || currentUrl.includes('cafepress.ca')) {
                    calculatedSiteId = '173'; // CA site  
                    console.log('POPUP: ✅ Hardcoded Site ID for CA site:', calculatedSiteId);
                }
                else if (currentUrl.includes('cafuk-cpsw-web') || currentUrl.includes('cafepress.co.uk')) {
                    calculatedSiteId = '172'; // UK site
                    console.log('POPUP: ✅ Hardcoded Site ID for UK site:', calculatedSiteId);
                }
                else if (currentUrl.includes('cafau-cpsw-web') || currentUrl.includes('cafepress.com.au')) {
                    calculatedSiteId = '171'; // AU site
                    console.log('POPUP: ✅ Hardcoded Site ID for AU site:', calculatedSiteId);
                }
                
                // Update display element for Site ID
                let siteIdDisplay = document.getElementById('siteIdDisplay');
                if (!siteIdDisplay) {
                    siteIdDisplay = document.createElement('div');
                    siteIdDisplay.id = 'siteIdDisplay';
                    siteIdDisplay.className = 'info-item';
                    optionIdDisplay.parentNode.insertBefore(siteIdDisplay, optionIdDisplay.nextSibling);
                }
                siteIdDisplay.innerHTML = `<span class="label">Site ID:</span><span class="value">${calculatedSiteId}</span>`;
            });
            
            // SKU ID - ONLY from default_sku path
            let skuId = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.default_sku && 
                data.productsData.full_object.default_sku.sku_id !== undefined) {
                skuId = (data.productsData.full_object.default_sku.sku_id !== null) ? 
                       data.productsData.full_object.default_sku.sku_id : 'N/A';
                console.log('POPUP: ✅ Found SKU ID from default_sku:', skuId);
            }
            
            let skuIdDisplay = document.getElementById('skuIdDisplay');
            if (!skuIdDisplay) {
                skuIdDisplay = document.createElement('div');
                skuIdDisplay.id = 'skuIdDisplay';
                skuIdDisplay.className = 'info-item';
                // Insert after the last created element (siteIdDisplay)
                siteIdDisplay.parentNode.insertBefore(skuIdDisplay, siteIdDisplay.nextSibling);
            }
            skuIdDisplay.innerHTML = `<span class="label">SKU ID:</span><span class="value">${skuId}</span>`;
            
            // Vendor ID - ONLY from default_sku path
            let vendorId = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.default_sku && 
                data.productsData.full_object.default_sku.vendor_id !== undefined) {
                vendorId = (data.productsData.full_object.default_sku.vendor_id !== null) ? 
                          data.productsData.full_object.default_sku.vendor_id : 'N/A';
                console.log('POPUP: ✅ Found Vendor ID from default_sku:', vendorId);
            }
            
            let vendorIdDisplay = document.getElementById('vendorIdDisplay');
            if (!vendorIdDisplay) {
                vendorIdDisplay = document.createElement('div');
                vendorIdDisplay.id = 'vendorIdDisplay';
                vendorIdDisplay.className = 'info-item';
                skuIdDisplay.parentNode.insertBefore(vendorIdDisplay, skuIdDisplay.nextSibling);
            }
            vendorIdDisplay.innerHTML = `<span class="label">Vendor ID:</span><span class="value">${vendorId}</span>`;
            
            // Seller ID (Customer ID) - from product_design_objects[designId]
            let sellerId = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.product_design_objects && 
                data.designId) {
                
                const designObjects = data.productsData.full_object.product_design_objects;
                if (designObjects[data.designId] && designObjects[data.designId].seller_id !== undefined) {
                    sellerId = (designObjects[data.designId].seller_id !== null) ? 
                              designObjects[data.designId].seller_id : 'N/A';
                    console.log('POPUP: ✅ Found Seller ID from product_design_objects[' + data.designId + ']:', sellerId);
                }
            }
            
            let sellerIdDisplay = document.getElementById('sellerIdDisplay');
            if (!sellerIdDisplay) {
                sellerIdDisplay = document.createElement('div');
                sellerIdDisplay.id = 'sellerIdDisplay';
                sellerIdDisplay.className = 'info-item';
                // Insert after the last created element (vendorIdDisplay)
                vendorIdDisplay.parentNode.insertBefore(sellerIdDisplay, vendorIdDisplay.nextSibling);
            }
            sellerIdDisplay.innerHTML = `<span class="label">Seller ID (Customer ID):</span><span class="value">${sellerId}</span>`;
            
            // Store ID - from product_design_objects[designId]
            let storeId = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.product_design_objects && 
                data.designId) {
                
                const designObjects = data.productsData.full_object.product_design_objects;
                if (designObjects[data.designId] && designObjects[data.designId].store_id !== undefined) {
                    storeId = (designObjects[data.designId].store_id !== null) ? 
                             designObjects[data.designId].store_id : 'N/A';
                    console.log('POPUP: ✅ Found Store ID from product_design_objects[' + data.designId + ']:', storeId);
                }
            }
            
            let storeIdDisplay = document.getElementById('storeIdDisplay');
            if (!storeIdDisplay) {
                storeIdDisplay = document.createElement('div');
                storeIdDisplay.id = 'storeIdDisplay';
                storeIdDisplay.className = 'info-item';
                sellerIdDisplay.parentNode.insertBefore(storeIdDisplay, sellerIdDisplay.nextSibling);
            }
            storeIdDisplay.innerHTML = `<span class="label">Store ID:</span><span class="value">${storeId}</span>`;
            
            // SW Product ID - from full_object.product_id
            let swProductId = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.product_id !== undefined) {
                swProductId = (data.productsData.full_object.product_id !== null) ? 
                             data.productsData.full_object.product_id : 'N/A';
                console.log('POPUP: ✅ Found SW Product ID from full_object:', swProductId);
            }
            
            let swProductIdDisplay = document.getElementById('swProductIdDisplay');
            if (!swProductIdDisplay) {
                swProductIdDisplay = document.createElement('div');
                swProductIdDisplay.id = 'swProductIdDisplay';
                swProductIdDisplay.className = 'info-item';
                // Insert after the last created element (storeIdDisplay)
                storeIdDisplay.parentNode.insertBefore(swProductIdDisplay, storeIdDisplay.nextSibling);
            }
            swProductIdDisplay.innerHTML = `<span class="label">SW Product ID:</span><span class="value">${swProductId}</span>`;
            
            // Is Virtual - from full_object.is_virtual (convert 0/1 to False/True)
            let isVirtual = 'Not found';
            
            if (data.productsData && 
                data.productsData.full_object && 
                data.productsData.full_object.is_virtual !== undefined) {
                const virtualValue = data.productsData.full_object.is_virtual;
                if (virtualValue === 0) {
                    isVirtual = 'False';
                } else if (virtualValue === 1) {
                    isVirtual = 'True';
                } else {
                    isVirtual = (virtualValue !== null) ? virtualValue : 'N/A';
                }
                console.log('POPUP: ✅ Found Is Virtual from full_object:', virtualValue, '→ displaying as:', isVirtual);
            }
            
            let isVirtualDisplay = document.getElementById('isVirtualDisplay');
            if (!isVirtualDisplay) {
                isVirtualDisplay = document.createElement('div');
                isVirtualDisplay.id = 'isVirtualDisplay';
                isVirtualDisplay.className = 'info-item';
                swProductIdDisplay.parentNode.insertBefore(isVirtualDisplay, swProductIdDisplay.nextSibling);
            }
            isVirtualDisplay.innerHTML = `<span class="label">Is Virtual:</span><span class="value">${isVirtual}</span>`;
            
            // Product Image ID - extracted from page HTML /dd/number pattern
            console.log('POPUP: Checking productImageId in data:', data.productImageId);
            console.log('POPUP: Full data object keys:', Object.keys(data));
            
            let productImageIdDisplay = document.getElementById('productImageIdDisplay');
            if (!productImageIdDisplay) {
                productImageIdDisplay = document.createElement('div');
                productImageIdDisplay.id = 'productImageIdDisplay';
                productImageIdDisplay.className = 'info-item';
                // Insert after the last created element (isVirtualDisplay)
                isVirtualDisplay.parentNode.insertBefore(productImageIdDisplay, isVirtualDisplay.nextSibling);
            }
            
            if (data.productImageId) {
                productImageIdDisplay.innerHTML = `<span class="label">Product Image ID:</span><span class="value">${data.productImageId}</span>`;
                console.log('POPUP: Displaying Product Image ID from HTML extraction:', data.productImageId);
            } else {
                productImageIdDisplay.innerHTML = `<span class="label">Product Image ID:</span><span class="value">Not found</span>`;
                console.log('POPUP: Product Image ID not found in data object');
            }
            
            console.log('=== POPUP: Displaying Product Options ===');
            console.log('data.productsData:', data.productsData);
            if (data.productsData) {
                console.log('✓ POPUP: Displayed extracted fields:', {
                    category_id: data.productsData.category_id,
                    is_out_of_stock: data.productsData.is_out_of_stock,
                    cp_product_id: data.productsData.cp_product_id,
                    cp_product_type_no: data.productsData.cp_product_type_no
                });
            }
            
            urlDisplay.textContent = data.url || 'Unknown';
            timestampDisplay.textContent = formatTimestamp(data.timestamp);
            
            loadingDiv.style.display = 'none';
            noDataDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        } else {
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'none';
            noDataDiv.style.display = 'block';
        }
    }
    
    // Load data from storage
    function loadData() {
        chrome.storage.local.get(['url', 'timestamp', 'designerName', 'designerLink', 'designId', 'cpProductId', 'productImageId', 'productsData'], function(result) {
            console.log('=== POPUP: Data loaded from storage ===');
            console.log('Full result object:', result);
            console.log('cpProductId from URL:', result.cpProductId);
            console.log('productImageId from storage:', result.productImageId);
            console.log('productsData exists:', !!result.productsData);
            console.log('productsData type:', typeof result.productsData);
            console.log('productsData value:', result.productsData);
            displayData(result);
        });
    }
    
    // Refresh current tab data
    function refreshCurrentTab() {
        loadingDiv.style.display = 'block';
        contentDiv.style.display = 'none';
        noDataDiv.style.display = 'none';
        
        // Get current active tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                // Inject script to re-extract productId
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    function: function() {
                        // Re-execute extraction logic
                        const currentUrl = window.location.href;
                        
                        const extractedData = {
                            url: currentUrl,
                            timestamp: new Date().toISOString(),
                            designerName: null,
                            designerLink: null,
                            designId: null,
                            cpProductId: null,
                            productsData: null
                        };
                        
                        // Extract CP Product ID from URL (the number after the comma)
                        const cpProductIdRegex = /,(\d+)/;
                        const cpProductIdMatch = currentUrl.match(cpProductIdRegex);
                        
                        if (cpProductIdMatch) {
                            extractedData.cpProductId = cpProductIdMatch[1];
                            console.log('REFRESH: Extracted CP Product ID from URL:', extractedData.cpProductId);
                        } else {
                            console.log('REFRESH: CP Product ID not found in URL');
                        }
                        
                        // Extract Designer information - look for specific structure
                        const designerElements = document.querySelectorAll('.designer-info, .designer-card-wrapper, [class*="designer"]');
                        let foundDesigner = false;
                        
                        // First try: look for specific designer classes
                        for (let element of designerElements) {
                            const links = element.querySelectorAll('a[href]');
                            if (links.length > 0) {
                                const designerLink = links[0];
                                const href = designerLink.getAttribute('href');
                                const linkText = designerLink.textContent.trim();
                                
                                if (href && linkText) {
                                    extractedData.designerName = linkText;
                                    // Convert relative URL to absolute URL
                                    try {
                                        extractedData.designerLink = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
                                    } catch (e) {
                                        extractedData.designerLink = href; // Use original href if URL construction fails
                                    }
                                    foundDesigner = true;
                                    break;
                                }
                            }
                        }
                        
                        // Second try: look for "Designed by" text if not found by class
                        if (!foundDesigner) {
                            const allElements = document.querySelectorAll('*');
                            for (let element of allElements) {
                                const text = element.textContent || '';
                                if (text.includes('Designed by') && text.length < 100) {
                                    const links = element.querySelectorAll('a[href]');
                                    if (links.length > 0) {
                                        const designerLink = links[0];
                                        const href = designerLink.getAttribute('href');
                                        const linkText = designerLink.textContent.trim();
                                        
                                        if (href && linkText) {
                                            extractedData.designerName = linkText;
                                            extractedData.designerLink = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
                                            foundDesigner = true;
                                            break;
                                        }
                                    }
                                    
                                    if (!foundDesigner) {
                                        const parentElement = element.parentElement;
                                        if (parentElement) {
                                            const parentLinks = parentElement.querySelectorAll('a[href]');
                                            for (let link of parentLinks) {
                                                const href = link.getAttribute('href');
                                                const linkText = link.textContent.trim();
                                                
                                                if (href && linkText && !href.includes('#') && linkText.length > 2) {
                                                    extractedData.designerName = linkText;
                                                    extractedData.designerLink = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
                                                    foundDesigner = true;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    
                                    if (foundDesigner) break;
                                }
                            }
                        }
                        
                        // Extract DesignId from image URLs
                        const images = document.querySelectorAll('img');
                        for (let img of images) {
                            const src = img.getAttribute('src') || '';
                            const ref = img.getAttribute('ref') || '';
                            const urlToCheck = src + ' ' + ref; // Check both src and ref attributes
                            
                            // Look for /designs/[numbers] pattern
                            const designIdMatch = urlToCheck.match(/\/designs\/(\d+)/);
                            if (designIdMatch) {
                                extractedData.designId = designIdMatch[1];
                                break; // Take the first match
                            }
                        }
                        
                        // Extract product_options JavaScript object with enhanced search
                        function searchForProductOptions() {
                            try {
                                // Method 1: Check productDetail.getCurrDesignObject() first (simplest method)
                                if (window.productDetail && typeof window.productDetail.getCurrDesignObject === 'function') {
                                    console.log('🎉 FOUND productDetail.getCurrDesignObject() method!');
                                    
                                    try {
                                        const currDesignObject = window.productDetail.getCurrDesignObject();
                                        console.log('Current design object (manual search):', currDesignObject);
                                        
                                        if (currDesignObject && typeof currDesignObject === 'object') {
                                            const extractedFields = {
                                                category_id: null,
                                                is_out_of_stock: null,
                                                cp_product_id: currDesignObject.cp_product_id,
                                                cp_product_type_no: currDesignObject.cp_product_type_no,
                                                full_object: currDesignObject
                                            };
                                            
                                            // Also try to get category_id and stock info from productDetail.options
                                            if (window.productDetail.options) {
                                                extractedFields.category_id = window.productDetail.options.category_id;
                                                extractedFields.is_out_of_stock = window.productDetail.options.is_out_of_stock;
                                            }
                                            
                                            console.log('✅ Extracted from getCurrDesignObject() (manual):', extractedFields);
                                            
                                            // Save and update display
                                            const newData = {
                                                ...extractedData,
                                                productsData: extractedFields,
                                                timestamp: Date.now()
                                            };
                                            
                                            chrome.storage.local.set(newData, function() {
                                                console.log('✓ Manual search data saved (getCurrDesignObject)');
                                                // Update the popup display
                                                displayData(newData);
                                            });
                                            
                                            return;
                                        }
                                    } catch (e) {
                                        console.log('❌ Error calling getCurrDesignObject() (manual):', e);
                                    }
                                }
                                
                                // Method 2: Check productDetail.options as fallback (preferred source)
                                if (window.productDetail && window.productDetail.options) {
                                    const options = window.productDetail.options;
                                        const extractedFields = {
                                            category_id: options.category_id,
                                            is_out_of_stock: options.is_out_of_stock,
                                            cp_product_id: null,
                                            cp_product_type_no: null,
                                            full_object: options
                                        };
                                    
                                    // Extract from product_design_objects using DesignId as key
                                    try {
                                        if (options.product_design_objects && typeof options.product_design_objects === 'object') {
                                            // Get the designId from current extraction
                                            const designId = extractedData.designId;
                                            console.log('Using designId as key (refresh):', designId);
                                            
                                            if (designId && options.product_design_objects[designId]) {
                                                const designObject = options.product_design_objects[designId];
                                                extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                console.log('✓ Found fields via designId (refresh):', {
                                                    cp_product_id: extractedFields.cp_product_id,
                                                    cp_product_type_no: extractedFields.cp_product_type_no
                                                });
                                            } else {
                                                // Fallback: try to get the first object
                                                const firstKey = Object.keys(options.product_design_objects)[0];
                                                if (firstKey) {
                                                    console.log('Using first available key (refresh):', firstKey);
                                                    const designObject = options.product_design_objects[firstKey];
                                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                    extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        console.log('Error extracting from product_design_objects in refresh:', e);
                                    }
                                    
                                    extractedData.productsData = extractedFields;
                                    return true;
                                }
                                
                                // Method 2: Direct window access to product_options (fallback)
                                if (typeof window.product_options !== 'undefined') {
                                    const parsed = window.product_options;
                                    
                                    // Extract specific fields from product_options
                                    const extractedFields = {
                                        category_id: parsed.category_id,
                                        is_out_of_stock: parsed.is_out_of_stock,
                                        cp_product_id: null,
                                        cp_product_type_no: null,
                                        full_object: parsed
                                    };
                                    
                                    // Extract from product_design_objects using DesignId
                                    try {
                                        if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                            const designId = extractedData.designId;
                                            if (designId && parsed.product_design_objects[designId]) {
                                                const designObject = parsed.product_design_objects[designId];
                                                extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                            } else {
                                                // Fallback: use first available design object
                                                const firstKey = Object.keys(parsed.product_design_objects)[0];
                                                if (firstKey) {
                                                    const designObject = parsed.product_design_objects[firstKey];
                                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        console.log('Error extracting fields from direct window access:', e);
                                    }
                                    
                                    extractedData.productsData = extractedFields;
                                    return true;
                                }
                                
                                // Method 2: Search all window properties
                                const allKeys = Object.getOwnPropertyNames(window);
                                for (let key of allKeys) {
                                    if (key === 'product_options' || key.includes('product_options')) {
                                        try {
                                            const value = window[key];
                                            if (value && typeof value === 'object') {
                                                const parsed = value;
                                                
                                                // Extract specific fields from product_options
                                                const extractedFields = {
                                                    category_id: parsed.category_id,
                                                    is_out_of_stock: parsed.is_out_of_stock,
                                                    cp_product_id: null,
                                                    cp_product_type_no: null,
                                                    full_object: parsed
                                                };
                                                
                                                // Extract from product_design_objects using DesignId
                                                try {
                                                    if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                                        const designId = extractedData.designId;
                                                        if (designId && parsed.product_design_objects[designId]) {
                                                            const designObject = parsed.product_design_objects[designId];
                                                            extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                        } else {
                                                            // Fallback: use first available design object
                                                            const firstKey = Object.keys(parsed.product_design_objects)[0];
                                                            if (firstKey) {
                                                                const designObject = parsed.product_design_objects[firstKey];
                                                                extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                            }
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.log('Error extracting fields from window property:', e);
                                                }
                                                
                                                extractedData.productsData = extractedFields;
                                                return true;
                                            }
                                        } catch (e) {
                                            // Continue searching
                                        }
                                    }
                                }
                                
                                // Method 3: Search in common global objects (without eval)
                                const searchLocations = [
                                    { name: 'dataLayer', obj: window.dataLayer },
                                    { name: 'pageData', obj: window.pageData },
                                    { name: 'appData', obj: window.appData },
                                    { name: 'configData', obj: window.configData },
                                    { name: '_data', obj: window._data },
                                    { name: 'globalData', obj: window.globalData }
                                ];
                                
                                for (let location of searchLocations) {
                                    try {
                                        if (location.obj && typeof location.obj === 'object' && location.obj.product_options) {
                                            const parsed = location.obj.product_options;
                                            
                                            // Extract specific fields from product_options
                                            const extractedFields = {
                                                category_id: parsed.category_id,
                                                is_out_of_stock: parsed.is_out_of_stock,
                                                cp_product_id: null,
                                                cp_product_type_no: null,
                                                full_object: parsed
                                            };
                                            
                                            // Extract from product_design_objects using DesignId
                                            try {
                                                if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                                    const designId = extractedData.designId;
                                                    if (designId && parsed.product_design_objects[designId]) {
                                                        const designObject = parsed.product_design_objects[designId];
                                                        extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                    } else {
                                                        // Fallback: use first available design object
                                                        const firstKey = Object.keys(parsed.product_design_objects)[0];
                                                        if (firstKey) {
                                                            const designObject = parsed.product_design_objects[firstKey];
                                                            extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                        }
                                                    }
                                                }
                                            } catch (e) {
                                                console.log('Error extracting fields from global object:', e);
                                            }
                                            
                                            extractedData.productsData = extractedFields;
                                            return true;
                                        }
                                    } catch (e) {
                                        // Continue searching
                                    }
                                }
                                
                                // Method 4: Search in script tags
                                const scripts = document.querySelectorAll('script');
                                for (let script of scripts) {
                                    const content = script.textContent || script.innerText || '';
                                    if (content.includes('product_options')) {
                                        const jsonMatches = content.match(/product_options\s*[:=]\s*(\{[^}]*\}|\[[^\]]*\])/g);
                                        if (jsonMatches) {
                                            for (let match of jsonMatches) {
                                                try {
                                                    const jsonPart = match.split(/[:=]/)[1].trim();
                                                    const parsed = JSON.parse(jsonPart);
                                                    
                                                    // Extract specific fields from parsed product_options
                                                    const extractedFields = {
                                                        category_id: parsed.category_id,
                                                        is_out_of_stock: parsed.is_out_of_stock,
                                                        cp_product_id: null,
                                                        cp_product_type_no: null,
                                                        full_object: parsed
                                                    };
                                                    
                                                    // Extract from product_design_objects using DesignId
                                                    try {
                                                        if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                                            const designId = extractedData.designId;
                                                            if (designId && parsed.product_design_objects[designId]) {
                                                                const designObject = parsed.product_design_objects[designId];
                                                                extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                            } else {
                                                                // Fallback: use first available design object
                                                                const firstKey = Object.keys(parsed.product_design_objects)[0];
                                                                if (firstKey) {
                                                                    const designObject = parsed.product_design_objects[firstKey];
                                                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                                extractedFields.cp_product_type_no = designObject.cp_product_type_no;
                                                                }
                                                            }
                                                        }
                                                    } catch (e) {
                                                        console.log('Error extracting fields from refresh-parsed data:', e);
                                                    }
                                                    
                                                    extractedData.productsData = extractedFields;
                                                    return true;
                                                } catch (e) {
                                                    // Continue searching
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                return false;
                            } catch (e) {
                                return false;
                            }
                        }
                        
                        searchForProductOptions();
                        
                        // Store all extracted data
                        if (extractedData.designerName || extractedData.designId || extractedData.cpProductId || extractedData.productsData) {
                            chrome.storage.local.set(extractedData);
                            return extractedData;
                        } else {
                            chrome.storage.local.remove(['url', 'timestamp', 'designerName', 'designerLink', 'designId', 'cpProductId', 'productsData']);
                            return null;
                        }
                    }
                }, function(results) {
                    // Wait before loading data
                    setTimeout(loadData, 200);
                });
            } else {
                setTimeout(loadData, 200);
            }
        });
    }
    
    
    // Bind refresh button events
    console.log('Setting up event listeners...');
    console.log('refreshBtn element:', refreshBtn);
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCurrentTab);
        console.log('✓ Refresh button event listener added');
    }
    
    if (refreshBtn2) {
        refreshBtn2.addEventListener('click', refreshCurrentTab);
        console.log('✓ Refresh button 2 event listener added');
    }
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.type === 'PRODUCT_INFO_FOUND') {
            console.log('Received product info update message:', message);
            loadData(); // Reload data
        }
    });
    
    // Initial data load
    console.log('=== CALLING INITIAL LOADDATA ===');
    loadData();
    
    console.log('=== POPUP SCRIPT INITIALIZATION COMPLETE ===');
});
