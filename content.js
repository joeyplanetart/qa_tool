// CP Product Info content script  
console.log('🚀 CP Product Info content script starting...');
console.log('Script loaded at:', new Date().toISOString());
console.log('Document ready state:', document.readyState);
console.log('Current URL:', window.location.href);

// Only run on supported domains
if (typeof CONFIG !== 'undefined' && !CONFIG.isSupportedHostname(window.location.hostname)) {
    console.log('⚠️ Not a supported Cafepress domain, script will not run');
    console.log('   Current hostname:', window.location.hostname);
} else {
    console.log('✅ Supported domain detected:', window.location.hostname);
    
    // Auto-detect branch from current URL
    if (typeof CONFIG !== 'undefined') {
        console.log('📌 Configured branch:', CONFIG.BRANCH.CURRENT);
        const detectedBranch = CONFIG.detectAndSetBranch(true); // true = 自动更新配置
        if (detectedBranch) {
            console.log('✅ Using auto-detected branch:', detectedBranch);
        } else {
            console.log('📌 Using configured branch:', CONFIG.BRANCH.CURRENT);
        }
    }

    // Main script - only runs on supported domains
(function() {
    'use strict';
    
    let floatingWindow = null;
    let isWindowVisible = false;
    
    // Helper function to extract CP fields from design objects
    function extractCpFieldsFromDesigns(designsObject, designId, debugPrefix = '') {
        const extractedFields = {
            cp_product_id: null,
            cp_product_type_no: null
        };
        
        if (!designsObject || typeof designsObject !== 'object') {
            console.log(`${debugPrefix} ❌ No design data available`);
            return extractedFields;
        }
        
        console.log(`${debugPrefix} === CP Field Extraction ===`);
        console.log(`${debugPrefix} DesignId: ${designId} (type: ${typeof designId})`);
        console.log(`${debugPrefix} Available keys:`, Object.keys(designsObject));
        console.log(`${debugPrefix} Keys comparison:`);
        Object.keys(designsObject).forEach(key => {
            console.log(`${debugPrefix}   Key: "${key}" (type: ${typeof key}) === designId "${designId}"? ${key === designId}`);
            console.log(`${debugPrefix}   Key: "${key}" == designId "${designId}"? ${key == designId}`);
        });
        
        // Show design objects info
        console.log(`${debugPrefix} === DESIGN OBJECTS INFO ===`);
        console.log(`${debugPrefix} Total keys in designsObject:`, Object.keys(designsObject).length);
        
        let designObject = null;
        let matchedKey = null;
        
        if (designId) {
            console.log(`${debugPrefix} Searching for designId: ${designId}`);
            
            // 1. Exact key match
            if (designsObject[designId]) {
                designObject = designsObject[designId];
                matchedKey = designId;
                console.log(`${debugPrefix} ✓ Found by exact key match`);
            } else {
                // 2. Look for designId in design object's fields (design.id property)
                console.log(`${debugPrefix} Searching in design object fields...`);
                for (const [key, design] of Object.entries(designsObject)) {
                    console.log(`${debugPrefix} Checking key: ${key}, design:`, design);
                    
                    if (design && typeof design === 'object') {
                        // Check if design.id matches designId
                        if (design.id && design.id.toString() === designId) {
                            designObject = design;
                            matchedKey = key;
                            console.log(`${debugPrefix} ✓ Found by design.id match: ${key} (id: ${design.id})`);
                            break;
                        }
                        
                        // Check if any other field contains designId
                        for (const [fieldName, fieldValue] of Object.entries(design)) {
                            if (fieldValue && fieldValue.toString() === designId) {
                                designObject = design;
                                matchedKey = key;
                                console.log(`${debugPrefix} ✓ Found by field match: ${key}.${fieldName} = ${fieldValue}`);
                                break;
                            }
                        }
                        
                        if (designObject) break;
                    }
                }
                
                // 3. Partial key match (designId might be part of composite key)
                if (!designObject) {
                    console.log(`${debugPrefix} Trying partial key matching...`);
                    for (const key of Object.keys(designsObject)) {
                        if (key.includes(designId)) {
                            designObject = designsObject[key];
                            matchedKey = key;
                            console.log(`${debugPrefix} ✓ Found by partial key match: ${key}`);
                            break;
                        }
                    }
                }
                
                // 4. Deep search - look for designId in nested objects
                if (!designObject) {
                    console.log(`${debugPrefix} Trying deep search in nested properties...`);
                    for (const [key, design] of Object.entries(designsObject)) {
                        if (design && typeof design === 'object') {
                            // Check nested properties that might contain the designId
                            const nestedProperties = ['design_id', 'designId', 'product_design_id', 'id'];
                            
                            for (const prop of nestedProperties) {
                                if (design[prop] && design[prop].toString() === designId) {
                                    designObject = design;
                                    matchedKey = key;
                                    console.log(`${debugPrefix} ✓ Found by nested property match: ${key}.${prop} = ${design[prop]}`);
                                    break;
                                }
                            }
                            
                            if (designObject) break;
                        }
                    }
                }
            }
        }
        
        // 4. Fallback to first available
        if (!designObject) {
            const firstKey = Object.keys(designsObject)[0];
            if (firstKey) {
                designObject = designsObject[firstKey];
                matchedKey = firstKey;
                console.log(`${debugPrefix} ✓ Using first available: ${firstKey}`);
            }
        }
        
        if (designObject) {
            console.log(`${debugPrefix} ✅ FOUND DESIGN OBJECT via ${matchedKey}:`, designObject);
            console.log(`${debugPrefix} Design object type:`, typeof designObject);
            
            // Debug: log all fields FIRST to see what we have
            console.log(`${debugPrefix} === All design object fields ===`);
            const allFields = Object.entries(designObject);
            allFields.forEach(([key, value]) => {
                console.log(`${debugPrefix}   ${key}: ${value} (${typeof value})`);
                
                // Log field information
                // (removed cp_product_type_no detection)
            });
            
            console.log(`${debugPrefix} Object keys count:`, Object.keys(designObject).length);
            console.log(`${debugPrefix} === COMPLETE OBJECT DUMP ===`);
            console.log(`${debugPrefix} Full object:`, designObject);
            console.log(`${debugPrefix} Full object JSON:`, JSON.stringify(designObject, null, 2));
            
            // Extract CP fields with multiple naming conventions
            const cpFields = ['cp_product_id', 'cpProductId', 'product_id', 'productId', 'id'];
            const typeFields = ['cp_product_type_no', 'product_type_no', 'cpProductTypeNo', 'productTypeNo', 'type_no', 'type'];
            
            console.log(`${debugPrefix} === Searching for CP fields ===`);
            
            // Find cp_product_id
            console.log(`${debugPrefix} Searching for cp_product_id in fields:`, cpFields);
            for (const field of cpFields) {
                console.log(`${debugPrefix} Checking field '${field}':`, designObject[field]);
                if (designObject[field] !== undefined && designObject[field] !== null) {
                    extractedFields.cp_product_id = designObject[field];
                    console.log(`${debugPrefix} ✅ Found cp_product_id via ${field}:`, designObject[field]);
                    break;
                }
            }
            
            // Find cp_product_type_no
            console.log(`${debugPrefix} Searching for cp_product_type_no in fields:`, typeFields);
            for (const field of typeFields) {
                console.log(`${debugPrefix} Checking field '${field}':`, designObject[field]);
                if (designObject[field] !== undefined && designObject[field] !== null) {
                    extractedFields.cp_product_type_no = designObject[field];
                    console.log(`${debugPrefix} ✅ Found cp_product_type_no via ${field}:`, designObject[field]);
                    break;
                }
            }
            
        } else {
            console.log(`${debugPrefix} ❌ No design object found`);
        }
        
        console.log(`${debugPrefix} === Final CP extraction results ===`);
        console.log(`${debugPrefix} cp_product_id:`, extractedFields.cp_product_id);
        console.log(`${debugPrefix} cp_product_type_no:`, extractedFields.cp_product_type_no);
        
        return extractedFields;
    }
    
    function extractProductInfo() {
        const currentUrl = window.location.href;
        console.log('Current URL:', currentUrl);
        
        const extractedData = {
            url: currentUrl,
            timestamp: new Date().toISOString(),
            designerName: null,
            designerLink: null,
            designId: null,
            cpProductId: null,
            productImageId: null,
            productsData: null
        };
        
        // Extract CP Product ID from URL (the number after the comma)
        const cpProductIdRegex = /,(\d+)/;
        const cpProductIdMatch = currentUrl.match(cpProductIdRegex);
        
        if (cpProductIdMatch) {
            extractedData.cpProductId = cpProductIdMatch[1];
            console.log('Extracted CP Product ID from URL:', extractedData.cpProductId);
        } else {
            console.log('CP Product ID not found in URL');
        }
        
        // Extract Product Image Id from page HTML (/dd/number pattern)
        // Try immediately and also with a delay for dynamic content
        function tryExtractProductImageId(isRetry = false) {
            try {
                let foundProductImageId = null;
                
                // Method 1: Try DOM selector first
                const ddLinks = document.querySelectorAll('a[href*="/dd/"]');
                console.log(`Found dd links count (${isRetry ? 'retry' : 'initial'}):`, ddLinks.length);
                
                if (ddLinks.length > 0) {
                    for (let link of ddLinks) {
                        const href = link.getAttribute('href');
                        console.log('Checking dd link href:', href);
                        const ddMatch = href.match(/\/dd\/(\d+)/);
                        if (ddMatch) {
                            foundProductImageId = ddMatch[1];
                            console.log('✅ Found Product Image ID via DOM selector:', foundProductImageId);
                            break;
                        }
                    }
                }
                
                // Method 2: Try regex on full HTML if DOM method failed
                if (!foundProductImageId) {
                    const pageHtml = document.documentElement.outerHTML;
                    console.log('Trying regex on full HTML...');
                    
                    // Try different regex patterns
                    const patterns = [
                        /href=["']\/dd\/(\d+)["']/g,  // with quotes
                        /href=\/dd\/(\d+)/g,          // without quotes
                        /\/dd\/(\d+)/g                // anywhere in HTML
                    ];
                    
                    for (let pattern of patterns) {
                        const matches = [...pageHtml.matchAll(pattern)];
                        console.log(`Pattern ${pattern} found ${matches.length} matches`);
                        
                        if (matches.length > 0) {
                            foundProductImageId = matches[0][1];
                            console.log('✅ Found Product Image ID via regex:', foundProductImageId, 'with pattern:', pattern);
                            break;
                        }
                    }
                }
                
                if (foundProductImageId) {
                    extractedData.productImageId = foundProductImageId;
                    console.log('✅ Final Product Image ID:', extractedData.productImageId);
                    
                    // Update storage with the found value
                    chrome.storage.local.set(extractedData, function() {
                        console.log('Updated Product Image ID in storage');
                    });
                } else {
                    console.log(`❌ Product Image ID not found with any method (${isRetry ? 'retry' : 'initial'})`);
                    if (!isRetry) {
                        // Let's log a sample of the HTML to see what we're working with
                        const sampleHtml = document.documentElement.outerHTML.substring(0, 2000);
                        console.log('HTML sample for debugging:', sampleHtml);
                    }
                }
                
                return foundProductImageId;
            } catch (e) {
                console.log('Error extracting Product Image ID:', e);
                return null;
            }
        }
        
        // Try extraction immediately
        tryExtractProductImageId(false);
        
        // Also try after a delay in case content loads dynamically
        setTimeout(() => {
            if (!extractedData.productImageId) {
                console.log('Retrying Product Image ID extraction after delay...');
                tryExtractProductImageId(true);
            }
        }, 2000);
        
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
                    console.log('Found designer via class selector:', element);
                    console.log('Extracted Designer Link:', extractedData.designerLink);
                    console.log('Extracted Designer Name:', extractedData.designerName);
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
                if (text.includes('Designed by') && text.length < 100) { // Avoid very long texts
                    console.log('Found designer element by text:', element);
                    
                    // Look for links within this element
                    const links = element.querySelectorAll('a[href]');
                    if (links.length > 0) {
                        const designerLink = links[0];
                        const href = designerLink.getAttribute('href');
                        const linkText = designerLink.textContent.trim();
                        
                        if (href && linkText) {
                            extractedData.designerName = linkText;
                            // Convert relative URL to absolute URL
                            extractedData.designerLink = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
                            console.log('Extracted Designer Link:', extractedData.designerLink);
                            console.log('Extracted Designer Name:', extractedData.designerName);
                            foundDesigner = true;
                            break;
                        }
                    }
                    
                    // Also check parent and sibling elements
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
                                    console.log('Extracted Designer Link (from parent):', extractedData.designerLink);
                                    console.log('Extracted Designer Name (from parent):', extractedData.designerName);
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
            const mainDesignMatch = urlToCheck.match(/\/designs\/(\d+)/);
            if (mainDesignMatch) {
                extractedData.designId = mainDesignMatch[1];
                console.log('Extracted DesignId:', extractedData.designId);
                break; // Take the first match
            }
        }
        
        // Extract product_options JavaScript object with enhanced search
        function searchForProductOptions() {
            try {
                // FIRST: Try injecting a script into the page context to access product_options
                // This is needed because content scripts run in an isolated context
                let productOptionsFromPage = null;
                
                try {
                    // Inject script to retrieve product_options from page context
                    const script = document.createElement('script');
                    script.id = 'cp-product-options-extractor';
                    script.textContent = `
                        (function() {
                            let dataFound = null;
                            
                            // Try multiple variable names and sources
                            if (typeof product_options !== 'undefined') {
                                dataFound = product_options;
                                console.log('✅ Found product_options');
                            } else if (typeof window.product_options !== 'undefined') {
                                dataFound = window.product_options;
                                console.log('✅ Found window.product_options');
                            } else if (typeof productOptions !== 'undefined') {
                                dataFound = productOptions;
                                console.log('✅ Found productOptions (camelCase)');
                            } else if (typeof window.productOptions !== 'undefined') {
                                dataFound = window.productOptions;
                                console.log('✅ Found window.productOptions');
                            }
                            
                            // Try to get from productDetail object
                            if (!dataFound && typeof productDetail !== 'undefined') {
                                console.log('🔍 Checking productDetail object...');
                                console.log('productDetail exists:', typeof productDetail);
                                
                                // Check for various method names
                                if (typeof productDetail.getCurrDesignObject === 'function') {
                                    try {
                                        const designObj = productDetail.getCurrDesignObject();
                                        console.log('✅ Got data from productDetail.getCurrDesignObject()');
                                        dataFound = designObj;
                                    } catch (e) {
                                        console.log('❌ productDetail.getCurrDesignObject() error:', e.message);
                                    }
                                } else if (typeof productDetail.getProductData === 'function') {
                                    try {
                                        dataFound = productDetail.getProductData();
                                        console.log('✅ Got data from productDetail.getProductData()');
                                    } catch (e) {
                                        console.log('❌ productDetail.getProductData() error:', e.message);
                                    }
                                } else if (typeof productDetail.data !== 'undefined') {
                                    dataFound = productDetail.data;
                                    console.log('✅ Got data from productDetail.data');
                                } else if (typeof productDetail.options !== 'undefined') {
                                    dataFound = productDetail.options;
                                    console.log('✅ Got data from productDetail.options');
                                } else {
                                    // Log productDetail properties for debugging
                                    console.log('productDetail properties:', Object.keys(productDetail));
                                    // Try to extract any object that looks like product data
                                    for (let key in productDetail) {
                                        if (typeof productDetail[key] === 'object' && productDetail[key] !== null) {
                                            console.log('Found object property:', key);
                                            dataFound = productDetail[key];
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            // Search for data in window object
                            if (!dataFound) {
                                console.log('🔍 Searching window object for product data...');
                                const possibleKeys = ['productData', 'ProductOptions', 'cpProductData', 'productInfo'];
                                for (let key of possibleKeys) {
                                    if (typeof window[key] !== 'undefined' && window[key] !== null) {
                                        dataFound = window[key];
                                        console.log('✅ Found window.' + key);
                                        break;
                                    }
                                }
                            }
                            
                            // If still not found, try to extract from script tags in page context
                            if (!dataFound) {
                                console.log('🔍 Trying to extract from script tags in page context...');
                                const scripts = document.querySelectorAll('script');
                                for (let i = 0; i < scripts.length; i++) {
                                    const scriptContent = scripts[i].textContent || scripts[i].innerText || '';
                                    
                                    // Look for product_options assignment
                                    if (scriptContent.includes('product_options') || scriptContent.includes('productOptions')) {
                                        console.log('Found script tag mentioning product_options, script index:', i);
                                        
                                        // Try to extract JSON object
                                        const patterns = [
                                            /(?:var|let|const)\\s+product_options\\s*=\\s*(\\{[\\s\\S]*?\\});/,
                                            /product_options\\s*=\\s*(\\{[\\s\\S]*?\\});/,
                                            /productOptions\\s*=\\s*(\\{[\\s\\S]*?\\});/
                                        ];
                                        
                                        for (let pattern of patterns) {
                                            const match = scriptContent.match(pattern);
                                            if (match && match[1]) {
                                                try {
                                                    // Try to parse the extracted JSON
                                                    dataFound = JSON.parse(match[1]);
                                                    console.log('✅ Successfully extracted and parsed product_options from script tag');
                                                    break;
                                                } catch (e) {
                                                    console.log('Failed to parse extracted data:', e.message);
                                                }
                                            }
                                        }
                                        
                                        if (dataFound) break;
                                    }
                                }
                            }
                            
                            if (dataFound) {
                                // Store in data attribute for content script to read
                                document.documentElement.setAttribute('data-cp-product-options', JSON.stringify(dataFound));
                                console.log('✅ Product data injected to data attribute');
                            } else {
                                console.log('❌ No product data found in page context');
                                // Log available window properties containing "product"
                                const productKeys = Object.keys(window).filter(k => k.toLowerCase().includes('product'));
                                console.log('Window properties containing "product":', productKeys);
                                
                                // Also try to log first few lines of each script for debugging
                                const scripts = document.querySelectorAll('script');
                                console.log('Total script tags:', scripts.length);
                                for (let idx = 0; idx < Math.min(5, scripts.length); idx++) {
                                    const content = (scripts[idx].textContent || scripts[idx].innerText || '').substring(0, 200);
                                    if (content.length > 0) {
                                        console.log('Script ' + idx + ': ' + content + '...');
                                    }
                                }
                            }
                        })();
                    `;
                    document.documentElement.appendChild(script);
                    script.remove();
                    
                    // Read from data attribute
                    const dataAttr = document.documentElement.getAttribute('data-cp-product-options');
                    if (dataAttr) {
                        productOptionsFromPage = JSON.parse(dataAttr);
                        console.log('✅ Successfully retrieved product_options from injected script');
                        // Clean up the attribute
                        document.documentElement.removeAttribute('data-cp-product-options');
                    }
                } catch (e) {
                    console.log('Script injection method failed:', e);
                }
                
                // If injection worked, use that data
                if (productOptionsFromPage) {
                    const parsed = productOptionsFromPage;
                    
                    // Extract specific fields from product_options
                    const extractedFields = {
                        category_id: parsed.category_id,
                        is_out_of_stock: parsed.is_out_of_stock,
                        cp_product_id: null,
                        full_object: parsed
                    };
                    
                    // Extract from product_design_objects using DesignId
                    try {
                        if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                            const designId = extractedData.designId;
                            if (designId && parsed.product_design_objects[designId]) {
                                const designObject = parsed.product_design_objects[designId];
                                extractedFields.cp_product_id = designObject.cp_product_id;
                            } else {
                                // Fallback: use first available design object
                                const firstKey = Object.keys(parsed.product_design_objects)[0];
                                if (firstKey) {
                                    const designObject = parsed.product_design_objects[firstKey];
                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                }
                            }
                        }
                    } catch (e) {
                        console.log('Error extracting fields from injected script:', e);
                    }
                    
                    extractedData.productsData = extractedFields;
                    console.log('Found product_options (injected script):', extractedFields);
                    return true;
                }
                
                // Method 1: Try to access via window object with different approaches
                const accessMethods = [
                    () => window.product_options,
                    () => window['product_options'],
                    () => unsafeWindow?.product_options, // For userscripts compatibility
                    () => this.product_options,
                    () => globalThis.product_options
                ];
                
                for (let i = 0; i < accessMethods.length; i++) {
                    try {
                        const result = accessMethods[i]();
                       if (result && typeof result === 'object') {
                           const parsed = result;
                           
                           // Extract specific fields from product_options
                           const extractedFields = {
                               category_id: parsed.category_id,
                               is_out_of_stock: parsed.is_out_of_stock,
                               cp_product_id: null,
                               full_object: parsed
                           };
                           
                           // Extract from product_design_objects using DesignId
                           try {
                               if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                   const designId = extractedData.designId;
                                   if (designId && parsed.product_design_objects[designId]) {
                                       const designObject = parsed.product_design_objects[designId];
                                       extractedFields.cp_product_id = designObject.cp_product_id;
                                   } else {
                                       // Fallback: use first available design object
                                       const firstKey = Object.keys(parsed.product_design_objects)[0];
                                       if (firstKey) {
                                           const designObject = parsed.product_design_objects[firstKey];
                                           extractedFields.cp_product_id = designObject.cp_product_id;
                                       }
                                   }
                               }
                           } catch (e) {
                               console.log('Error extracting fields from access method:', e);
                           }
                           
                           extractedData.productsData = extractedFields;
                           console.log(`Found product_options (method ${i + 1}):`, extractedFields);
                           return true;
                       }
                    } catch (e) {
                        console.log(`Access method ${i + 1} failed:`, e);
                    }
                }
                
                // Method 2: Direct global variable access (without window)
                try {
                   if (typeof product_options !== 'undefined') {
                       const parsed = product_options;
                       
                       // Extract specific fields from product_options
                       const extractedFields = {
                           category_id: parsed.category_id,
                           is_out_of_stock: parsed.is_out_of_stock,
                           cp_product_id: null,
                           full_object: parsed
                       };
                       
                       // Extract from product_design_objects using DesignId
                       try {
                           if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                               const designId = extractedData.designId;
                               if (designId && parsed.product_design_objects[designId]) {
                                   const designObject = parsed.product_design_objects[designId];
                                   extractedFields.cp_product_id = designObject.cp_product_id;
                               } else {
                                   // Fallback: use first available design object
                                   const firstKey = Object.keys(parsed.product_design_objects)[0];
                                   if (firstKey) {
                                       const designObject = parsed.product_design_objects[firstKey];
                                       extractedFields.cp_product_id = designObject.cp_product_id;
                                   }
                               }
                           }
                       } catch (e) {
                           console.log('Error extracting fields from global variable:', e);
                       }
                       
                       extractedData.productsData = extractedFields;
                       console.log('Found product_options (global variable):', extractedFields);
                       return true;
                   }
                } catch (e) {
                    console.log('product_options not accessible as global variable:', e);
                }
                
                // Method 3: Direct window access
                if (typeof window.product_options !== 'undefined') {
                    const parsed = window.product_options;
                    
                    // Extract specific fields from product_options
                    const extractedFields = {
                        category_id: parsed.category_id,
                        is_out_of_stock: parsed.is_out_of_stock,
                        cp_product_id: null,
                        full_object: parsed
                    };
                    
                    // Extract from product_design_objects using DesignId
                    try {
                        if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                            const designId = extractedData.designId;
                            if (designId && parsed.product_design_objects[designId]) {
                                const designObject = parsed.product_design_objects[designId];
                                extractedFields.cp_product_id = designObject.cp_product_id;
                            } else {
                                // Fallback: use first available design object
                                const firstKey = Object.keys(parsed.product_design_objects)[0];
                                if (firstKey) {
                                    const designObject = parsed.product_design_objects[firstKey];
                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                }
                            }
                        }
                    } catch (e) {
                        console.log('Error extracting fields from window property:', e);
                    }
                    
                    extractedData.productsData = extractedFields;
                    console.log('Found product_options (window property):', extractedFields);
                    return true;
                }
                
                // Method 4: Search all window properties
                const allKeys = Object.getOwnPropertyNames(window);
                console.log('Searching in', allKeys.length, 'window properties...');
                
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
                                        full_object: parsed
                                    };
                                    
                                    // Extract from product_design_objects using DesignId
                                    try {
                                        if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                            const designId = extractedData.designId;
                                            if (designId && parsed.product_design_objects[designId]) {
                                                const designObject = parsed.product_design_objects[designId];
                                                extractedFields.cp_product_id = designObject.cp_product_id;
                                            } else {
                                                // Fallback: use first available design object
                                                const firstKey = Object.keys(parsed.product_design_objects)[0];
                                                if (firstKey) {
                                                    const designObject = parsed.product_design_objects[firstKey];
                                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        console.log('Error extracting fields from key search:', e);
                                    }
                                    
                                    extractedData.productsData = extractedFields;
                                    console.log('Found product_options via key search:', key, extractedFields);
                                    return true;
                                }
                        } catch (e) {
                            console.log('Error accessing key:', key, e);
                        }
                    }
                }
                
                // Method 5: Search in common global objects (without eval)
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
                        if (location.obj && typeof location.obj === 'object') {
                            if (location.obj.product_options) {
                                const parsed = location.obj.product_options;
                                
                                // Extract specific fields from product_options
                                const extractedFields = {
                                    category_id: parsed.category_id,
                                    is_out_of_stock: parsed.is_out_of_stock,
                                    cp_product_id: null,
                                    full_object: parsed
                                };
                                
                                // Extract from product_design_objects using DesignId
                                try {
                                    if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                        const designId = extractedData.designId;
                                        if (designId && parsed.product_design_objects[designId]) {
                                            const designObject = parsed.product_design_objects[designId];
                                            extractedFields.cp_product_id = designObject.cp_product_id;
                                        } else {
                                            // Fallback: use first available design object
                                            const firstKey = Object.keys(parsed.product_design_objects)[0];
                                            if (firstKey) {
                                                const designObject = parsed.product_design_objects[firstKey];
                                                extractedFields.cp_product_id = designObject.cp_product_id;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log('Error extracting fields from global object:', e);
                                }
                                
                                extractedData.productsData = extractedFields;
                                console.log('Found product_options in:', location.name, extractedFields);
                                return true;
                            }
                        }
                    } catch (e) {
                        // Location doesn't exist, continue
                    }
                }
                
                // Method 6: Enhanced script tag search with better parsing
                const scripts = document.querySelectorAll('script');
                console.log(`Checking ${scripts.length} script tags...`);
                
                for (let i = 0; i < scripts.length; i++) {
                    const script = scripts[i];
                    const content = script.textContent || script.innerText || '';
                    
                    if (content.includes('product_options')) {
                        console.log(`🎯 Found product_options mention in script ${i + 1}`);
                        
                        // Use improved JSON extraction with proper brace counting
                        const varPattern = /var\s+product_options\s*=\s*/;
                        const match = content.match(varPattern);
                        
                        if (match) {
                            const startIndex = content.indexOf(match[0]) + match[0].length;
                            
                            // Find the start of the JSON object
                            let objectStart = -1;
                            for (let j = startIndex; j < content.length; j++) {
                                if (content[j] === '{') {
                                    objectStart = j;
                                    break;
                                }
                            }
                            
                            if (objectStart !== -1) {
                                // Count braces to find the complete object
                                let braceCount = 0;
                                let inString = false;
                                let stringChar = '';
                                let objectEnd = -1;
                                
                                for (let j = objectStart; j < content.length; j++) {
                                    const char = content[j];
                                    const prevChar = j > 0 ? content[j - 1] : '';
                                    
                                    // Handle string detection (both single and double quotes)
                                    if (!inString && (char === '"' || char === "'")) {
                                        inString = true;
                                        stringChar = char;
                                    } else if (inString && char === stringChar && prevChar !== '\\') {
                                        inString = false;
                                        stringChar = '';
                                    }
                                    
                                    // Count braces only outside strings
                                    if (!inString) {
                                        if (char === '{') {
                                            braceCount++;
                                        } else if (char === '}') {
                                            braceCount--;
                                            if (braceCount === 0) {
                                                objectEnd = j + 1;
                                                break;
                                            }
                                        }
                                    }
                                }
                                
                                if (objectEnd !== -1) {
                                    const jsonStr = content.substring(objectStart, objectEnd);
                                    console.log('Extracted complete JSON:', jsonStr.substring(0, 300) + '...');
                                    console.log('JSON length:', jsonStr.length);
                                    
                                    try {
                                        const parsed = JSON.parse(jsonStr);
                                        console.log('🎉 Successfully parsed complete product_options!', parsed);
                                        
                                        // Extract specific fields
                                        const extractedFields = {
                                            category_id: parsed.category_id,
                                            is_out_of_stock: parsed.is_out_of_stock,
                                            cp_product_id: null,
                                            full_object: parsed
                                        };
                                        
                                        // Look for design data (check both "product_designs" and "product_design_objects")
                                        const designsObject = parsed.product_designs || parsed.product_design_objects;
                                        console.log('=== Design Data Analysis ===');
                                        console.log('product_designs:', parsed.product_designs);
                                        console.log('product_design_objects:', parsed.product_design_objects);
                                        console.log('Using designsObject:', designsObject);
                                        
                        // Use helper function to extract CP fields
                        // Get current designId and cpProductId from the page
                        console.log('[SCRIPT] Extracting IDs from current page...');
                        
                        // Extract designId from images
                        let scriptDesignId = null;
                        const scriptImages = document.querySelectorAll('img');
                        for (const img of scriptImages) {
                            const src = img.getAttribute('src') || '';
                            const ref = img.getAttribute('ref') || '';
                            const urlToCheck = src + ' ' + ref;
                            const designIdMatch = urlToCheck.match(/\/designs\/(\d+)/);
                            if (designIdMatch) {
                                scriptDesignId = designIdMatch[1];
                                console.log('[SCRIPT] Found designId from image:', scriptDesignId);
                                break;
                            }
                        }
                        
                        // Extract cpProductId from URL
                        const scriptUrl = window.location.href;
                        const scriptCpMatch = scriptUrl.match(/,(\d{6,})/);
                        const scriptCpProductId = scriptCpMatch ? scriptCpMatch[1] : null;
                        console.log('[SCRIPT] Found cpProductId from URL:', scriptCpProductId);
                        
                        // Calculate correct designId using the formula: cpProductId + 100000000000
                        const scriptCorrectDesignId = scriptCpProductId ? (parseInt(scriptCpProductId) + 100000000000).toString() : null;
                        console.log('[SCRIPT] Calculated correct designId:', scriptCorrectDesignId);
                        
                        // Try the correct designId first
                        let cpFields = extractCpFieldsFromDesigns(designsObject, scriptCorrectDesignId, '[SCRIPT-CorrectDesignId]');
                        
                        // If no result, try other patterns
                        if (!cpFields.cp_product_type_no && scriptDesignId) {
                            console.log('[SCRIPT] Trying with extracted designId as key:', scriptDesignId);
                            cpFields = extractCpFieldsFromDesigns(designsObject, scriptDesignId, '[SCRIPT-ExtractedDesignId]');
                        }
                        
                        if (!cpFields.cp_product_type_no && scriptCpProductId) {
                            console.log('[SCRIPT] Trying with cpProductId as key:', scriptCpProductId);
                            cpFields = extractCpFieldsFromDesigns(designsObject, scriptCpProductId, '[SCRIPT-CPProductId]');
                        }
                        
                        extractedFields.cp_product_id = cpFields.cp_product_id;
                        extractedFields.cp_product_type_no = cpFields.cp_product_type_no;
                                        
                                        extractedData.productsData = extractedFields;
                                        console.log('Final extracted data:', extractedFields);
                                        
                                        // Save immediately
                                        chrome.storage.local.set(extractedData, function() {
                                            console.log('✅ Product options saved from enhanced script parsing');
                                            chrome.runtime.sendMessage({
                                                type: 'PRODUCT_INFO_FOUND',
                                                data: extractedData
                                            }).catch(() => {});
                                        });
                                        
                                        return true;
                                        
                                    } catch (parseError) {
                                        console.log('❌ JSON parse failed:', parseError.message);
                                        console.log('Failed to parse:', jsonStr.substring(0, 500));
                                    }
                                } else {
                                    console.log('❌ Could not find complete object boundary');
                                }
                            } else {
                                console.log('❌ Could not find JSON object start');
                            }
                        } else {
                            console.log('❌ Could not find var assignment pattern');
                        }
                        
                        // Try improved JSON extraction
                        try {
                            // Look for more flexible patterns
                            const patterns = [
                                /product_options\s*=\s*(\{[^;]*\})/g,
                                /product_options\s*:\s*(\{[^,}]*\})/g,
                                /"product_options"\s*:\s*(\{[^}]*\})/g,
                                /productDetail\.init\s*\(\s*(\{[^)]*\})\s*\)/g
                            ];
                            
                            for (let pattern of patterns) {
                                let match;
                                while ((match = pattern.exec(content)) !== null) {
                                    try {
                                        let objectStr = match[1];
                                        console.log('Trying pattern match:', objectStr.substring(0, 100) + '...');
                                        
                                        // Try to fix common JSON issues
                                        objectStr = objectStr.trim();
                                        
                                        // Handle incomplete JSON by trying to complete it
                                        if (!objectStr.endsWith('}')) {
                                            // Find the last complete object
                                            let braceCount = 0;
                                            let lastCompletePos = -1;
                                            for (let i = 0; i < objectStr.length; i++) {
                                                if (objectStr[i] === '{') braceCount++;
                                                if (objectStr[i] === '}') {
                                                    braceCount--;
                                                    if (braceCount === 0) {
                                                        lastCompletePos = i;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (lastCompletePos > 0) {
                                                objectStr = objectStr.substring(0, lastCompletePos + 1);
                                            }
                                        }
                                        
                                        const parsed = JSON.parse(objectStr);
                                        
                                        // Extract specific fields from parsed product_options
                                        const extractedFields = {
                                            category_id: parsed.category_id,
                                            is_out_of_stock: parsed.is_out_of_stock,
                                            cp_product_id: null,
                                            full_object: parsed
                                        };
                                        
                                        // Extract from product_design_objects using DesignId
                                        try {
                                            if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                                const designId = extractedData.designId;
                                                console.log('Using designId for pattern parsing:', designId);
                                                
                                                if (designId && parsed.product_design_objects[designId]) {
                                                    const designObject = parsed.product_design_objects[designId];
                                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                                    console.log('✓ Extracted fields from pattern parsing:', {
                                                        cp_product_id: extractedFields.cp_product_id,
                                                        cp_product_id: extractedFields.cp_product_id
                                                    });
                                                } else {
                                                    // Fallback: use first available design object
                                                    const firstKey = Object.keys(parsed.product_design_objects)[0];
                                                    if (firstKey) {
                                                        const designObject = parsed.product_design_objects[firstKey];
                                                        extractedFields.cp_product_id = designObject.cp_product_id;
                                                        console.log('✓ Extracted fields from pattern parsing (fallback):', {
                                                            cp_product_id: extractedFields.cp_product_id,
                                                            cp_product_id: extractedFields.cp_product_id
                                                        });
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.log('Error extracting fields from pattern-parsed data:', e);
                                        }
                                        
                                        extractedData.productsData = extractedFields;
                                        console.log('Successfully parsed product_options:', extractedFields);
                                        return true;
                                    } catch (e) {
                                        console.log('JSON parse failed for pattern:', e.message);
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('Improved extraction failed:', e.message);
                        }
                    }
                }
                
                // Method 7: Try to detect when product_options becomes available
                if (typeof window.MutationObserver !== 'undefined') {
                    console.log('Setting up mutation observer for dynamic content...');
                    const checkForProductOptions = () => {
                    if (window.product_options) {
                        const parsed = window.product_options;
                        
                        // Extract specific fields from product_options
                        const extractedFields = {
                            category_id: parsed.category_id,
                            is_out_of_stock: parsed.is_out_of_stock,
                            cp_product_id: null,
                            full_object: parsed
                        };
                        
                        // Extract from product_design_objects using DesignId
                        try {
                            if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                const designId = extractedData.designId;
                                if (designId && parsed.product_design_objects[designId]) {
                                    const designObject = parsed.product_design_objects[designId];
                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                } else {
                                    // Fallback: use first available design object
                                    const firstKey = Object.keys(parsed.product_design_objects)[0];
                                    if (firstKey) {
                                        const designObject = parsed.product_design_objects[firstKey];
                                        extractedFields.cp_product_id = designObject.cp_product_id;
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('Error extracting fields from mutation observer:', e);
                        }
                        
                        extractedData.productsData = extractedFields;
                        console.log('Found product_options via mutation observer:', extractedFields);
                        return true;
                        }
                        return false;
                    };
                    
                    if (checkForProductOptions()) {
                        return true;
                    }
                }
                
                console.log('product_options not found after comprehensive search');
                return false;
                
            } catch (e) {
                console.log('Error in product_options search:', e);
                return false;
            }
        }
        
        // Multiple search attempts with different timings and polling
        let searchAttempts = 0;
        const maxAttempts = 15;  // Increased attempts
        let pollInterval;
        let foundProductOptions = false;
        
        function attemptSearch() {
            if (foundProductOptions) return; // Stop if already found
            
            searchAttempts++;
            console.log(`Search attempt ${searchAttempts}/${maxAttempts} for product_options...`);
            
        // Quick check first - direct product_options
        console.log('Checking window.product_options...');
        console.log('typeof window.product_options:', typeof window.product_options);
        console.log('window.product_options:', window.product_options);
        
        // Check for productDetail.getCurrDesignObject() first
        if (window.productDetail && typeof window.productDetail.getCurrDesignObject === 'function') {
            console.log('🎉 FOUND productDetail.getCurrDesignObject() method!');
            
            try {
                const currDesignObject = window.productDetail.getCurrDesignObject();
                console.log('Current design object:', currDesignObject);
                
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
                    
                    console.log('✅ Extracted from getCurrDesignObject():', extractedFields);
                    
                    extractedData.productsData = extractedFields;
                    console.log('Saved extracted data:', extractedData);
                    
                    // Save to storage
                    chrome.storage.local.set(extractedData);
                    console.log('Data saved to storage');
                    
                    return extractedData;
                } else {
                    console.log('❌ getCurrDesignObject() returned invalid object');
                }
            } catch (e) {
                console.log('❌ Error calling getCurrDesignObject():', e);
            }
        }
        
        if (window.product_options && typeof window.product_options === 'object') {
            console.log('🎉 FOUND direct window.product_options!', window.product_options);
            
            const options = window.product_options;
            const extractedFields = {
                category_id: options.category_id,
                is_out_of_stock: options.is_out_of_stock,
                cp_product_id: null,
                cp_product_type_no: null,
                full_object: options
            };
            
            // Extract from product_design_objects using helper function
            try {
                const designsObject = options.product_designs || options.product_design_objects;
                
                // Get current designId and cpProductId from the page
                console.log('[PRODUCT_OPTIONS] Extracting IDs from current page...');
                
                // Extract designId from images
                let currentDesignId = null;
                const images = document.querySelectorAll('img');
                for (const img of images) {
                    const src = img.getAttribute('src') || '';
                    const ref = img.getAttribute('ref') || '';
                    const urlToCheck = src + ' ' + ref;
                    const designIdMatch = urlToCheck.match(/\/designs\/(\d+)/);
                    if (designIdMatch) {
                        currentDesignId = designIdMatch[1];
                        console.log('[PRODUCT_OPTIONS] Found designId from image:', currentDesignId);
                        break;
                    }
                }
                
                // Extract cpProductId from URL
                const currentUrl = window.location.href;
                const cpProductIdMatch = currentUrl.match(/,(\d{6,})/);
                const currentCpProductId = cpProductIdMatch ? cpProductIdMatch[1] : null;
                console.log('[PRODUCT_OPTIONS] Found cpProductId from URL:', currentCpProductId);
                
                // Show comparison with actual keys in designsObject
                console.log('[PRODUCT_OPTIONS] === ID COMPARISON WITH ACTUAL KEYS ===');
                console.log('[PRODUCT_OPTIONS] Available keys in product_design_objects:', Object.keys(designsObject));
                console.log('[PRODUCT_OPTIONS] Extracted designId:', currentDesignId);
                console.log('[PRODUCT_OPTIONS] Extracted cpProductId:', currentCpProductId);
                
                // Try common patterns
                const possibleKeys = [
                    currentDesignId,
                    currentCpProductId,
                    // ✅ CORRECT PATTERN: designId = 原id + 100000000000
                    currentCpProductId ? (parseInt(currentCpProductId) + 100000000000).toString() : null,
                    '10' + currentCpProductId,  // Other patterns to try
                    '1' + currentCpProductId,
                    currentCpProductId + '0',
                ];
                console.log('[PRODUCT_OPTIONS] Trying possible key patterns:', possibleKeys);
                
                possibleKeys.forEach(key => {
                    if (key && designsObject[key]) {
                        console.log(`[PRODUCT_OPTIONS] 🎯 KEY FOUND! "${key}" exists in designsObject`);
                        const obj = designsObject[key];
                        console.log(`[PRODUCT_OPTIONS] Object found for key "${key}"`);
                    }
                });
                
                // Calculate correct designId using the formula: cpProductId + 100000000000
                const correctDesignId = currentCpProductId ? (parseInt(currentCpProductId) + 100000000000).toString() : null;
                console.log('[PRODUCT_OPTIONS] Calculated correct designId:', correctDesignId);
                
                // Try the correct designId first
                let cpFields = extractCpFieldsFromDesigns(designsObject, correctDesignId, '[PRODUCT_OPTIONS-CorrectDesignId]');
                
                // If no result, try other patterns
                if (!cpFields.cp_product_type_no && currentDesignId) {
                    console.log('[PRODUCT_OPTIONS] Trying with extracted designId as key:', currentDesignId);
                    cpFields = extractCpFieldsFromDesigns(designsObject, currentDesignId, '[PRODUCT_OPTIONS-ExtractedDesignId]');
                }
                
                if (!cpFields.cp_product_type_no && currentCpProductId) {
                    console.log('[PRODUCT_OPTIONS] Trying with cpProductId as key:', currentCpProductId);
                    cpFields = extractCpFieldsFromDesigns(designsObject, currentCpProductId, '[PRODUCT_OPTIONS-CPProductId]');
                }
                
                extractedFields.cp_product_id = cpFields.cp_product_id;
                extractedFields.cp_product_type_no = cpFields.cp_product_type_no;
            } catch (e) {
                console.log('Error extracting from product_options:', e);
            }
            
            extractedData.productsData = extractedFields;
            foundProductOptions = true;
            
            chrome.storage.local.set(extractedData, function() {
                console.log('✅ Product options saved from window.product_options');
                chrome.runtime.sendMessage({
                    type: 'PRODUCT_INFO_FOUND',
                    data: extractedData
                }).catch(() => {});
            });
            
            return true;
        }
            
        // Check multiple productDetail variations
        console.log('Checking productDetail variations...');
        console.log('typeof window.productDetail:', typeof window.productDetail);
        console.log('typeof window.ProductDetail:', typeof window.ProductDetail);
        
        const productDetailSources = [
            { name: 'productDetail.options', getter: () => window.productDetail?.options },
            { name: 'ProductDetail.options', getter: () => window.ProductDetail?.options },
            { name: 'productDetail.data', getter: () => window.productDetail?.data },
            { name: 'productDetail.config', getter: () => window.productDetail?.config },
            { name: 'productDetail.product_options', getter: () => window.productDetail?.product_options },
            { name: 'productDetail (whole object)', getter: () => window.productDetail }
        ];
        
        let foundOptions = null;
        let sourceName = '';
        
        for (const source of productDetailSources) {
            try {
                const options = source.getter();
                if (options && typeof options === 'object') {
                    // Check if this looks like product options data
                    const hasProductData = options.category_id !== undefined || 
                                         options.product_design_objects !== undefined ||
                                         options.is_out_of_stock !== undefined ||
                                         options.cp_product_id !== undefined;
                    
                    if (hasProductData) {
                        foundOptions = options;
                        sourceName = source.name;
                        console.log(`🎉 FOUND in ${sourceName}!`, options);
                        break;
                    } else {
                        console.log(`${source.name} exists but doesn't look like product data:`, Object.keys(options));
                    }
                }
            } catch (e) {
                console.log(`Error checking ${source.name}:`, e.message);
            }
        }
        
        if (foundOptions) {
            console.log(`Using data from: ${sourceName}`);
            
            // Extract specific fields from found options
            const options = foundOptions;
                const extractedFields = {
                    category_id: options.category_id,
                    is_out_of_stock: options.is_out_of_stock,
                    cp_product_id: null,
                    full_object: options  // Keep full object for debugging
                };
                
                // Extract from product_design_objects using DesignId as key
                try {
                    console.log('=== DEBUG: product_design_objects structure ===');
                    console.log('options.product_design_objects:', options.product_design_objects);
                    console.log('Is object?', typeof options.product_design_objects === 'object');
                    console.log('Object keys:', Object.keys(options.product_design_objects || {}));
                    
                    if (options.product_design_objects && typeof options.product_design_objects === 'object') {
                        // Get the designId (should already be extracted from URL)
                        const designId = extractedData.designId;
                        console.log('Using designId as key:', designId);
                        
                        if (designId && options.product_design_objects[designId]) {
                            const designObject = options.product_design_objects[designId];
                            console.log('Found design object for designId:', designObject);
                            console.log('Available keys in design object:', Object.keys(designObject));
                            
                            // Extract the fields directly
                            if (designObject.cp_product_id !== undefined) {
                                extractedFields.cp_product_id = designObject.cp_product_id;
                                console.log('✓ Found cp_product_id:', designObject.cp_product_id);
                            }
                            
                            
                        } else if (designId) {
                            console.log(`❌ No design object found for designId: ${designId}`);
                            console.log('Available designIds:', Object.keys(options.product_design_objects));
                        } else {
                            console.log('❌ No designId available to use as key');
                            // Fallback: try to get the first object
                            const firstKey = Object.keys(options.product_design_objects)[0];
                            if (firstKey) {
                                console.log('Trying first available key:', firstKey);
                                const designObject = options.product_design_objects[firstKey];
                                if (designObject.cp_product_id !== undefined) {
                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                    console.log('✓ Found cp_product_id (fallback):', designObject.cp_product_id);
                                }
                            }
                        }
                        
                        console.log('Final extracted values:', {
                            cp_product_id: extractedFields.cp_product_id,
                        });
                    } else {
                        console.log('❌ product_design_objects not found or not an object');
                    }
                } catch (e) {
                    console.log('Error extracting from product_design_objects:', e);
                }
                
                extractedData.productsData = extractedFields;
                foundProductOptions = true;
                
                console.log('Extracted specific fields:', extractedFields);
                
                console.log('Saving to storage. extractedData:', extractedData);
                chrome.storage.local.set(extractedData, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Storage error:', chrome.runtime.lastError);
                    } else {
                        console.log('✅ Product options saved from productDetail');
                        console.log('Saved data keys:', Object.keys(extractedData));
                    }
                    
                    chrome.runtime.sendMessage({
                        type: 'PRODUCT_INFO_FOUND',
                        data: extractedData
                    }).catch((error) => {
                        console.log('Message send failed (normal if popup closed):', error);
                    });
                });
                
                if (pollInterval) clearInterval(pollInterval);
                return;
            }
            
            if (window.product_options && typeof window.product_options === 'object') {
                console.log('🎉 FOUND! window.product_options:', window.product_options);
                const parsed = window.product_options;
                
                // Extract specific fields from product_options
                const extractedFields = {
                    category_id: parsed.category_id,
                    is_out_of_stock: parsed.is_out_of_stock,
                    cp_product_id: null,
                    full_object: parsed
                };
                
                // Extract from product_design_objects using DesignId
                try {
                    if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                        const designId = extractedData.designId;
                        if (designId && parsed.product_design_objects[designId]) {
                            const designObject = parsed.product_design_objects[designId];
                            extractedFields.cp_product_id = designObject.cp_product_id;
                        } else {
                            // Fallback: use first available design object
                            const firstKey = Object.keys(parsed.product_design_objects)[0];
                            if (firstKey) {
                                const designObject = parsed.product_design_objects[firstKey];
                                extractedFields.cp_product_id = designObject.cp_product_id;
                            }
                        }
                    }
                } catch (e) {
                    console.log('Error extracting fields from quick check:', e);
                }
                
                extractedData.productsData = extractedFields;
                foundProductOptions = true;
                
                // Save immediately with detailed logging
                console.log('Saving to storage. extractedData:', extractedData);
                chrome.storage.local.set(extractedData, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Storage error:', chrome.runtime.lastError);
                    } else {
                        console.log('✅ Product options saved to storage successfully');
                        console.log('Saved data keys:', Object.keys(extractedData));
                    }
                    
                    chrome.runtime.sendMessage({
                        type: 'PRODUCT_INFO_FOUND',
                        data: extractedData
                    }).catch((error) => {
                        console.log('Message send failed (normal if popup closed):', error);
                    });
                });
                
                if (pollInterval) clearInterval(pollInterval);
                return;
            } else {
                console.log('❌ window.product_options not found or not an object');
            }
            
            // Debug: comprehensive check of window object
            try {
                console.log('=== Debug Info ===');
                console.log('window.product_options type:', typeof window.product_options);
                console.log('window.product_options value:', window.product_options);

                // Check productDetail variations
                const productDetailKeys = ['productDetail', 'ProductDetail', 'product_detail', 'PRODUCT_DETAIL'];
                for (let key of productDetailKeys) {
                    const obj = window[key];
                    if (obj && typeof obj === 'object') {
                        console.log(`Found ${key}:`, obj);
                        if (obj.options) {
                            console.log(`Found ${key}.options:`, obj.options);
                        }
                        if (obj.data) {
                            console.log(`Found ${key}.data:`, obj.data);
                        }
                        if (obj.config) {
                            console.log(`Found ${key}.config:`, obj.config);
                        }
                    }
                }

                // Check all window properties for anything containing "product"
                const windowKeys = Object.getOwnPropertyNames(window);
                const productKeys = windowKeys.filter(key => key.toLowerCase().includes('product'));
                console.log('Window properties containing "product":', productKeys);
                
                // Try different property name variations
                const variations = [
                    'product_options',
                    'productOptions', 
                    'Product_Options',
                    'PRODUCT_OPTIONS',
                    '_product_options',
                    'product_options_'
                ];
                
                for (let variation of variations) {
                    const value = window[variation];
                        if (value && typeof value === 'object') {
                            console.log(`FOUND variant ${variation}:`, value);
                            const parsed = value;
                            
                            // Extract specific fields from product_options
                            const extractedFields = {
                                category_id: parsed.category_id,
                                is_out_of_stock: parsed.is_out_of_stock,
                                cp_product_id: null,
                                full_object: parsed
                            };
                            
                            // Extract from product_design_objects using DesignId
                            try {
                                const pollingUrl = window.location.href;
                                const pollingDesignMatch = pollingUrl.match(/\/designs\/(\d+)/);
                                const designId = pollingDesignMatch ? pollingDesignMatch[1] : null;
                                
                                if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                    if (designId && parsed.product_design_objects[designId]) {
                                        const designObject = parsed.product_design_objects[designId];
                                        extractedFields.cp_product_id = designObject.cp_product_id;
                                    } else {
                                        // Fallback: use first available design object
                                        const firstKey = Object.keys(parsed.product_design_objects)[0];
                                        if (firstKey) {
                                            const designObject = parsed.product_design_objects[firstKey];
                                            extractedFields.cp_product_id = designObject.cp_product_id;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('Error extracting fields from variant:', e);
                            }
                            
                            extractedData.productsData = extractedFields;
                            foundProductOptions = true;
                        
                        // Save immediately
                        chrome.storage.local.set(extractedData, function() {
                            console.log(`✓ Product options (${variation}) saved to storage successfully`);
                            chrome.runtime.sendMessage({
                                type: 'PRODUCT_INFO_FOUND',
                                data: extractedData
                            }).catch(() => {});
                        });
                        
                        if (pollInterval) clearInterval(pollInterval);
                        return;
                    }
                }
                
            } catch (e) {
                console.log('Error in debug check:', e);
            }
            
            // Enhanced global variable search
            if (!foundProductOptions) {
                console.log('Searching for additional global product variables...');
                
                const globalVariables = [
                    'pageConfig', 'pageData', 'appConfig', 'appData', 'siteData',
                    'productConfig', 'productInfo', 'productData', 'productDetails',
                    'designData', 'designConfig', 'itemData', 'itemConfig',
                    'configData', 'globalConfig', 'initialData', 'bootstrapData'
                ];
                
                for (const varName of globalVariables) {
                    try {
                        const value = window[varName];
                        if (value && typeof value === 'object') {
                            console.log(`Checking global variable: ${varName}`, value);
                            
                            // Check if this object contains product-related data
                            const hasProductData = value.category_id !== undefined || 
                                                 value.product_design_objects !== undefined ||
                                                 value.is_out_of_stock !== undefined ||
                                                 value.cp_product_id !== undefined ||
                                                 (value.product && typeof value.product === 'object') ||
                                                 (value.options && typeof value.options === 'object');
                            
                            if (hasProductData) {
                                console.log(`🎉 FOUND product data in global variable: ${varName}`);
                                
                                // Try to extract from the found object
                                const dataSource = value.options || value.product || value;
                                const extractedFields = {
                                    category_id: dataSource.category_id,
                                    is_out_of_stock: dataSource.is_out_of_stock,
                                    cp_product_id: null,
                                    full_object: dataSource
                                };
                                
                                // Extract cp fields if available
                                if (dataSource.product_design_objects && typeof dataSource.product_design_objects === 'object') {
                                    const designId = extractedData.designId;
                                    if (designId && dataSource.product_design_objects[designId]) {
                                        const designObject = dataSource.product_design_objects[designId];
                                        extractedFields.cp_product_id = designObject.cp_product_id;
                                        console.log(`✓ Found cp fields from ${varName} via designId`);
                                    } else {
                                        const firstKey = Object.keys(dataSource.product_design_objects)[0];
                                        if (firstKey) {
                                            const designObject = dataSource.product_design_objects[firstKey];
                                            extractedFields.cp_product_id = designObject.cp_product_id;
                                            console.log(`✓ Found cp fields from ${varName} via first key`);
                                        }
                                    }
                                }
                                
                                extractedData.productsData = extractedFields;
                                foundProductOptions = true;
                                
                                chrome.storage.local.set(extractedData, function() {
                                    console.log(`✅ Product options saved from global variable: ${varName}`);
                                    chrome.runtime.sendMessage({
                                        type: 'PRODUCT_INFO_FOUND',
                                        data: extractedData
                                    }).catch(() => {});
                                });
                                
                                if (pollInterval) clearInterval(pollInterval);
                                break;
                            }
                        }
                    } catch (e) {
                        console.log(`Error checking global variable ${varName}:`, e.message);
                    }
                }
            }
            
            // Try the comprehensive search function if quick checks failed
            if (!foundProductOptions && searchForProductOptions()) {
                console.log('Successfully found product_options via searchForProductOptions on attempt', searchAttempts);
                foundProductOptions = true;
                chrome.storage.local.set(extractedData, function() {
                    console.log('✓ Product info updated in storage via comprehensive search');
                    chrome.runtime.sendMessage({
                        type: 'PRODUCT_INFO_FOUND',
                        data: extractedData
                    }).catch(() => {});
                });
                if (pollInterval) clearInterval(pollInterval);
                return;
            }
            
            if (searchAttempts < maxAttempts && !foundProductOptions) {
                const delay = searchAttempts * 300; // Delays: 300ms, 600ms, 900ms, etc.
                console.log(`Will retry in ${delay}ms...`);
                setTimeout(attemptSearch, delay);
            } else if (!foundProductOptions) {
                console.log('Failed to find product_options after', maxAttempts, 'attempts');
                
                // Start continuous polling as last resort
                console.log('Starting continuous polling every 2 seconds...');
                pollInterval = setInterval(() => {
                    if (foundProductOptions) {
                        clearInterval(pollInterval);
                        return;
                    }
                    
                    // Check productDetail.getCurrDesignObject() first (simplest method)
                    if (window.productDetail && typeof window.productDetail.getCurrDesignObject === 'function') {
                        console.log('✓ Found productDetail.getCurrDesignObject() via polling!');
                        
                        try {
                            const currDesignObject = window.productDetail.getCurrDesignObject();
                            console.log('Current design object (polling):', currDesignObject);
                            
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
                                
                                console.log('✅ Extracted from getCurrDesignObject() (polling):', extractedFields);
                                
                                extractedData.productsData = extractedFields;
                                foundProductOptions = true;
                                
                                chrome.storage.local.set(extractedData, function() {
                                    console.log('✓ Product options saved via polling (getCurrDesignObject)');
                                    chrome.runtime.sendMessage({
                                        type: 'PRODUCT_INFO_FOUND',
                                        data: extractedData
                                    }).catch(() => {});
                                });
                                
                                return;
                            }
                        } catch (e) {
                            console.log('❌ Error calling getCurrDesignObject() (polling):', e);
                        }
                    }
                    
                    // Check multiple possible sources during polling
                    if (window.product_options && typeof window.product_options === 'object') {
                        console.log('✓ Found product_options via polling!', window.product_options);
                        const parsed = window.product_options;
                        
                        // Extract specific fields from product_options
                        const extractedFields = {
                            category_id: parsed.category_id,
                            is_out_of_stock: parsed.is_out_of_stock,
                            cp_product_id: null,
                            full_object: parsed
                        };
                        
                        // Extract from product_design_objects using DesignId
                        try {
                            const pollingUrl2 = window.location.href;
                            const pollingDesignMatch2 = pollingUrl2.match(/\/designs\/(\d+)/);
                            const designId = pollingDesignMatch2 ? pollingDesignMatch2[1] : null;
                            
                            if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object') {
                                if (designId && parsed.product_design_objects[designId]) {
                                    const designObject = parsed.product_design_objects[designId];
                                    extractedFields.cp_product_id = designObject.cp_product_id;
                                } else {
                                    // Fallback: use first available design object
                                    const firstKey = Object.keys(parsed.product_design_objects)[0];
                                    if (firstKey) {
                                        const designObject = parsed.product_design_objects[firstKey];
                                        extractedFields.cp_product_id = designObject.cp_product_id;
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('Error extracting fields via polling:', e);
                        }
                        
                        extractedData.productsData = extractedFields;
                        foundProductOptions = true;
                    } else if (window.productDetail && window.productDetail.options) {
                        console.log('✓ Found productDetail.options via polling!', window.productDetail.options);
                        
                        // Extract specific fields from productDetail.options
                        const options = window.productDetail.options;
                        const extractedFields = {
                            category_id: options.category_id,
                            is_out_of_stock: options.is_out_of_stock,
                            cp_product_id: null,
                            full_object: options
                        };
                        
                        // Extract from product_design_objects using DesignId as key (polling)
                        try {
                            console.log('=== DEBUG (Polling): product_design_objects structure ===');
                            console.log('options.product_design_objects:', options.product_design_objects);
                            
                            if (options.product_design_objects && typeof options.product_design_objects === 'object') {
                                // Get the designId from URL
                                const pollingUrl3 = window.location.href;
                                const pollingDesignMatch3 = pollingUrl3.match(/\/designs\/(\d+)/);
                                const designId = pollingDesignMatch3 ? pollingDesignMatch3[1] : null;
                                console.log('Using designId as key (polling):', designId);
                                
                                if (designId && options.product_design_objects[designId]) {
                                    const designObject = options.product_design_objects[designId];
                                    console.log('Found design object for designId (polling):', designObject);
                                    
                                    // Extract the fields directly
                                    if (designObject.cp_product_id !== undefined) {
                                        extractedFields.cp_product_id = designObject.cp_product_id;
                                        console.log('✓ Found cp_product_id (polling):', designObject.cp_product_id);
                                    }
                                    
                                } else {
                                    console.log('❌ No design object found for designId (polling)');
                                    // Fallback: try to get the first object
                                    const firstKey = Object.keys(options.product_design_objects)[0];
                                    if (firstKey) {
                                        console.log('Trying first available key (polling):', firstKey);
                                        const designObject = options.product_design_objects[firstKey];
                                        if (designObject.cp_product_id !== undefined) {
                                            extractedFields.cp_product_id = designObject.cp_product_id;
                                            console.log('✓ Found cp_product_id (polling fallback):', designObject.cp_product_id);
                                        }
                                    }
                                }
                            } else {
                                console.log('❌ product_design_objects not found or not an object (polling)');
                            }
                        } catch (e) {
                            console.log('Error extracting from product_design_objects during polling:', e);
                        }
                        
                        extractedData.productsData = extractedFields;
                        foundProductOptions = true;
                    }
                    
                    if (foundProductOptions) {
                        
                        chrome.storage.local.set(extractedData, function() {
                            console.log('✓ Product options saved via polling');
                            chrome.runtime.sendMessage({
                                type: 'PRODUCT_INFO_FOUND',
                                data: extractedData
                            }).catch(() => {});
                        });
                        
                        clearInterval(pollInterval);
                    }
                }, 2000);
                
                // Stop polling after 60 seconds (increased from 30)
                setTimeout(() => {
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        console.log('Stopped polling for product_options after 60 seconds');
                    }
                }, 60000);
            }
        }
        
        // Start the search attempts
        attemptSearch();
        
        // Store all extracted data
        if (extractedData.designerName || extractedData.designId || extractedData.cpProductId || extractedData.productsData) {
            chrome.storage.local.set(extractedData, function() {
                console.log('Product info saved to storage:', extractedData);
            });
            
            // Send message to popup (if popup is open)
            chrome.runtime.sendMessage({
                type: 'PRODUCT_INFO_FOUND',
                data: extractedData
            }).catch(() => {
                // Ignore error, popup might not be open
            });
            
            return extractedData;
        } else {
            console.log('No product info found');
            // Clear previous data
            chrome.storage.local.remove(['url', 'timestamp', 'designerName', 'designerLink', 'designId', 'cpProductId', 'productsData']);
            return null;
        }
    }
    
    // Execute when DOM is ready
    function executeExtraction() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', extractProductInfo);
        } else {
            extractProductInfo();
        }
        
        // Also try after window load (for scripts that load after DOM)
        window.addEventListener('load', () => {
            console.log('Window loaded, retrying product_options extraction...');
            setTimeout(extractProductInfo, 500); // Small delay after window load
        });
        
        // Try again when any script tag is added (for dynamic script loading)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT') {
                        console.log('New script detected, retrying product_options extraction...');
                        setTimeout(extractProductInfo, 100);
                    }
                });
            });
        });
        
        observer.observe(document.head || document.documentElement, {
            childList: true,
            subtree: true
        });
    }
    
    executeExtraction();
    
    // Monitor URL changes (SPA applications) 
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
        const newUrl = window.location.href;
        if (newUrl !== lastUrl) {
            lastUrl = newUrl;
            setTimeout(extractProductInfo, 100); // Delay to ensure page update completion
        }
    });
    
    // Start observing URL changes
    urlObserver.observe(document, {
        subtree: true,
        childList: true
    });
    
    // Also listen for popstate events
    window.addEventListener('popstate', function() {
        setTimeout(extractProductInfo, 100);
    });
    
    // Listen for pushstate and replacestate
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
        originalPushState.apply(history, arguments);
        setTimeout(extractProductInfo, 100);
    };
    
    history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        setTimeout(extractProductInfo, 100);
    };
    
    // Create floating window
    function createFloatingWindow() {
        if (floatingWindow) {
            return floatingWindow;
        }
        
        // Create main container
        floatingWindow = document.createElement('div');
        floatingWindow.id = 'cp-product-info-floating';
        floatingWindow.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 380px;
            max-height: 720px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(255,255,255,0.1);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            padding: 0;
            display: none;
            overflow: visible;
        `;
        
        // Create header with close button
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0,0,0,0.1);
            position: relative;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Cafepress QA Tools';
        title.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: white;
        `;
        
        // Pin Button (to keep window open across page navigation)
        const pinButton = document.createElement('button');
        pinButton.id = 'cp-pin-button';
        pinButton.innerHTML = '📌';
        pinButton.title = 'Pin';
        pinButton.style.cssText = `
            position: absolute;
            top: -6px;
            right: -6px;
            background: rgba(255,255,255,0.85);
            border: 2px solid rgba(255,255,255,0.95);
            color: #333;
            font-size: 14px;
            cursor: pointer;
            padding: 0;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        `;
        
        // Check pinned state from storage
        const isPinned = localStorage.getItem('cp-window-pinned') === 'true';
        if (isPinned) {
            pinButton.style.background = 'rgba(255,235,59,0.9)';
            pinButton.style.borderColor = 'rgba(255,235,59,1)';
            pinButton.style.color = '#333';
            pinButton.style.transform = 'rotate(45deg)';
            pinButton.title = 'Unpin';
        }
        
        pinButton.addEventListener('click', () => {
            const currentlyPinned = localStorage.getItem('cp-window-pinned') === 'true';
            const newPinnedState = !currentlyPinned;
            
            localStorage.setItem('cp-window-pinned', newPinnedState.toString());
            
            if (newPinnedState) {
                // Pinned
                pinButton.style.background = 'rgba(255,235,59,0.9)';
                pinButton.style.borderColor = 'rgba(255,235,59,1)';
                pinButton.style.color = '#333';
                pinButton.style.transform = 'rotate(45deg)';
                pinButton.title = 'Unpin';
                console.log('✅ Window pinned - will stay open across pages');
            } else {
                // Unpinned
                pinButton.style.background = 'rgba(255,255,255,0.85)';
                pinButton.style.borderColor = 'rgba(255,255,255,0.95)';
                pinButton.style.color = '#333';
                pinButton.style.transform = 'rotate(0deg)';
                pinButton.title = 'Pin';
                console.log('📌 Window unpinned - will close when navigating');
            }
        });
        
        pinButton.addEventListener('mouseenter', () => {
            const isPinned = localStorage.getItem('cp-window-pinned') === 'true';
            if (isPinned) {
                pinButton.style.background = 'rgba(255,245,157,0.95)';
                pinButton.style.boxShadow = '0 4px 15px rgba(255,235,59,0.5)';
            } else {
                pinButton.style.background = 'rgba(255,255,255,0.95)';
                pinButton.style.boxShadow = '0 4px 15px rgba(255,255,255,0.5)';
            }
        });
        
        pinButton.addEventListener('mouseleave', () => {
            const isPinned = localStorage.getItem('cp-window-pinned') === 'true';
            if (isPinned) {
                pinButton.style.background = 'rgba(255,235,59,0.9)';
            } else {
                pinButton.style.background = 'rgba(255,255,255,0.85)';
            }
            pinButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.4)';
        });
        
        // SSO Login Button
        const ssoButton = document.createElement('button');
        ssoButton.textContent = 'SSO Login';
        ssoButton.style.cssText = `
            background: rgba(255,235,59,0.9);
            border: none;
            color: #333;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 4px;
            margin-left: auto;
            margin-right: 10px;
            transition: all 0.2s;
        `;
        ssoButton.addEventListener('click', () => {
            console.log('SSO Login clicked');
            // Get SSO configuration based on current environment
            const ssoConfig = CONFIG.getSsoConfig();
            console.log('SSO Config:', ssoConfig);
            console.log('Environment:', ssoConfig.environment);
            console.log('Branch:', ssoConfig.branch);
            console.log('Login URL:', ssoConfig.loginUrl);
            
            // Open environment-specific login page
            // Each environment maintains its own login session via ADFS
            window.open(ssoConfig.loginUrl, '_blank');
            
            // Update button text to show logged in status
            setTimeout(() => {
                ssoButton.textContent = 'SSO ✓';
                ssoButton.style.background = 'rgba(76,175,80,0.9)'; // Green
            }, 2000);
        });
        ssoButton.addEventListener('mouseenter', () => {
            ssoButton.style.background = 'rgba(255,235,59,1)';
            ssoButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        });
        ssoButton.addEventListener('mouseleave', () => {
            ssoButton.style.background = 'rgba(255,235,59,0.9)';
            ssoButton.style.boxShadow = 'none';
        });
        
        // Minimize Button
        const minimizeButton = document.createElement('button');
        minimizeButton.innerHTML = '−';
        minimizeButton.title = 'Minimize';
        minimizeButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            margin-right: 5px;
        `;
        minimizeButton.addEventListener('click', minimizeFloatingWindow);
        minimizeButton.addEventListener('mouseenter', () => {
            minimizeButton.style.backgroundColor = 'rgba(255,255,255,0.2)';
        });
        minimizeButton.addEventListener('mouseleave', () => {
            minimizeButton.style.backgroundColor = 'transparent';
        });
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        `;
        closeButton.addEventListener('click', hideFloatingWindow);
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = 'rgba(255,255,255,0.2)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        
        header.appendChild(title);
        header.appendChild(ssoButton);
        header.appendChild(minimizeButton);
        header.appendChild(closeButton);
        
        // Create content area
        const content = document.createElement('div');
        content.id = 'cp-floating-content';
        content.style.cssText = `
            padding: 10px;
            max-height: 640px;
            overflow-y: auto;
        `;
        
        floatingWindow.appendChild(header);
        floatingWindow.appendChild(content);
        floatingWindow.appendChild(pinButton);  // Add pin button to floating window container
        document.body.appendChild(floatingWindow);
        
        return floatingWindow;
    }
    
    function showFloatingWindow() {
        if (!floatingWindow) {
            createFloatingWindow();
        }
        
        floatingWindow.style.display = 'block';
        isWindowVisible = true;
        
        // Trigger data refresh and display
        updateFloatingWindowContent();
    }
    
    function hideFloatingWindow() {
        if (floatingWindow) {
            floatingWindow.style.display = 'none';
        }
        isWindowVisible = false;
        
        // Also hide the floating ball if it exists
        const floatingBall = document.getElementById('cp-floating-ball');
        if (floatingBall) {
            floatingBall.style.display = 'none';
        }
    }
    
    function toggleFloatingWindow() {
        if (isWindowVisible) {
            hideFloatingWindow();
        } else {
            showFloatingWindow();
        }
    }
    
    // Minimize window to floating ball
    function minimizeFloatingWindow() {
        if (!floatingWindow) return;
        
        // Save minimized state
        localStorage.setItem('cp-window-minimized', 'true');
        
        // Add transition animation
        floatingWindow.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        floatingWindow.style.transform = 'scale(0.3)';
        floatingWindow.style.opacity = '0';
        
        setTimeout(() => {
            floatingWindow.style.display = 'none';
            floatingWindow.style.transition = '';
            floatingWindow.style.transform = '';
            floatingWindow.style.opacity = '';
            isWindowVisible = false;
            
            // Show floating ball
            showFloatingBall();
        }, 400);
    }
    
    // Restore window from floating ball
    function restoreFloatingWindow() {
        // Clear minimized state
        localStorage.setItem('cp-window-minimized', 'false');
        
        // Hide floating ball
        const floatingBall = document.getElementById('cp-floating-ball');
        if (floatingBall) {
            floatingBall.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            floatingBall.style.transform = 'scale(0)';
            floatingBall.style.opacity = '0';
            
            setTimeout(() => {
                floatingBall.style.display = 'none';
                floatingBall.style.transition = '';
                floatingBall.style.transform = '';
                floatingBall.style.opacity = '';
            }, 300);
        }
        
        // Show window with animation
        if (floatingWindow) {
            floatingWindow.style.display = 'block';
            floatingWindow.style.transform = 'scale(0.3)';
            floatingWindow.style.opacity = '0';
            floatingWindow.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            
            setTimeout(() => {
                floatingWindow.style.transform = 'scale(1)';
                floatingWindow.style.opacity = '1';
            }, 10);
            
            setTimeout(() => {
                floatingWindow.style.transition = '';
                floatingWindow.style.transform = '';
                floatingWindow.style.opacity = '';
                isWindowVisible = true;
                
                // Update content after animation completes
                updateFloatingWindowContent();
            }, 400);
        }
    }
    
    // Create floating ball
    function showFloatingBall() {
        let floatingBall = document.getElementById('cp-floating-ball');
        
        if (!floatingBall) {
            floatingBall = document.createElement('div');
            floatingBall.id = 'cp-floating-ball';
            floatingBall.innerHTML = 'C';
            floatingBall.title = 'Click to restore';
            floatingBall.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                box-shadow: 0 4px 20px rgba(255,255,255,0.1);
                z-index: 10000;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: all 0.3s ease;
                animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            `;
            
            // Add bounce animation keyframes
            const style = document.createElement('style');
            style.textContent = `
                @keyframes bounceIn {
                    0% {
                        transform: scale(0);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 4px 20px rgba(255,255,255,0.1);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 6px 30px rgba(102,126,234,0.6);
                    }
                }
            `;
            document.head.appendChild(style);
            
            floatingBall.addEventListener('click', restoreFloatingWindow);
            
            floatingBall.addEventListener('mouseenter', () => {
                floatingBall.style.transform = 'scale(1.1)';
                floatingBall.style.boxShadow = '0 6px 30px rgba(102,126,234,0.6)';
            });
            
            floatingBall.addEventListener('mouseleave', () => {
                floatingBall.style.transform = 'scale(1)';
                floatingBall.style.boxShadow = '0 4px 20px rgba(255,255,255,0.1)';
            });
            
            document.body.appendChild(floatingBall);
        } else {
            floatingBall.style.display = 'flex';
            floatingBall.style.animation = 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }
    }
    
    function updateFloatingWindowContent() {
        if (!floatingWindow) return;
        
        const content = floatingWindow.querySelector('#cp-floating-content');
        if (!content) return;
        
        // Get data from storage
        chrome.storage.local.get(['url', 'timestamp', 'designerName', 'designerLink', 'designId', 'cpProductId', 'productImageId', 'productsData'], function(result) {
            console.log('Floating window loading data:', result);
            console.log('Floating window - productImageId from storage:', result.productImageId);
            
            let html = '';
            let productInfoHtml = '';
            
            // Check if we're on a product page by URL pattern
            const currentUrl = window.location.href;
            // Supports five URL formats:
            // 1. /+{seo-slug},{productId} - e.g. /+,78765606 or /+product-name,78765606
            // 2. /mf/{designId}/_xxx?productId={productId} - e.g. /mf/110425555/_tshirt?productId=78765606
            // 3. /mf/{designId}/xxx?fromProductId={productId} - e.g. /mf/80826596/large-puzzle?fromProductId=538485120
            // 4. /designer/xxx - e.g. /designer/custom-mens-classic-t-shirts?attr2=8915 (CYO - Create Your Own)
            // 5. /shopdetail/{storeName}.{productId} - e.g. /shopdetail/521shop.103000002960?attr2=8915 (Seller Store Product)
            const isProductPage = currentUrl.match(/\/\+[^/]*,\d+/) !== null || 
                                  currentUrl.match(/\/mf\/\d+\/[^?]*\?productId=\d+/) !== null ||
                                  currentUrl.match(/\/mf\/\d+\/[^?]*\?fromProductId=\d+/) !== null ||
                                  currentUrl.match(/\/designer\/[^/]+/) !== null ||
                                  currentUrl.match(/\/shopdetail\/[^/]+\.\d+/) !== null;
            
            // Check if we have valid product data (not just "Not found")
            const hasValidProductData = isProductPage && result && (
                (result.designerName && result.designerName !== 'Not found') ||
                (result.designId && result.designId !== 'Not found') ||
                (result.cpProductId && result.cpProductId !== 'Not found') ||
                (result.productsData && Object.keys(result.productsData).length > 0)
            );
            
            console.log('🔍 Checking if should display Product Info card:');
            console.log('  - Current URL:', currentUrl);
            console.log('  - Is product page (by URL):', isProductPage);
            console.log('  - Has designerName:', result?.designerName);
            console.log('  - Has designId:', result?.designId);
            console.log('  - Has cpProductId:', result?.cpProductId);
            console.log('  - Has productsData:', result?.productsData ? 'Yes' : 'No');
            console.log('  - Decision: hasValidProductData =', hasValidProductData);
            
            // Add environment switcher at the top (always show, but env buttons only on product pages)
            html += createEnvironmentSwitcher();
            
            // Add translation tool
            html += createTranslationTool();
            
            // Add search panel
            html += createSearchPanel();
            
            if (hasValidProductData) {
                // Start product info card
                productInfoHtml += `
                    <div id="floating-product-info-card" style="
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        overflow: hidden;
                        margin-bottom: 10px;
                        padding: 10px 15px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    ">
                        <div style="
                            font-size: 14px;
                            font-weight: bold;
                            margin-bottom: 8px;
                            color: #ffeb3b;
                            text-align: left;
                        ">Product Info</div>
                `;
                
                // Designer
                if (result.designerName) {
                    const designerValue = result.designerLink ? 
                        `<a href="${result.designerLink}" target="_blank" style="color: #ffeb3b; text-decoration: underline;">${result.designerName}</a>` :
                        result.designerName;
                    productInfoHtml += createInfoItem('Designer:', designerValue);
                } else {
                    productInfoHtml += createInfoItem('Designer:', 'Not found');
                }
                
                // DesignId
                if (result.designId) {
                    productInfoHtml += createInfoItem('DesignId:', result.designId);
                } else {
                    productInfoHtml += createInfoItem('DesignId:', 'Not found');
                }
                
                // Product data
                if (result.productsData) {
                    if (result.productsData.category_id !== undefined) {
                        productInfoHtml += createInfoItem('Category ID:', result.productsData.category_id || 'N/A');
                    } else {
                        productInfoHtml += createInfoItem('Category ID:', 'Not found');
                    }
                    
                    if (result.productsData.is_out_of_stock !== undefined) {
                        const stockStatus = result.productsData.is_out_of_stock ? 'Out of Stock' : 'In Stock';
                        const stockColor = result.productsData.is_out_of_stock ? '#e74c3c' : '#27ae60';
                        productInfoHtml += createInfoItem('Stock:', `<span style="color: ${stockColor};">${stockStatus}</span>`);
                    } else {
                        productInfoHtml += createInfoItem('Stock:', 'Not found');
                    }
                    
                } else {
                    productInfoHtml += createInfoItem('Category ID:', 'Not found');
                    productInfoHtml += createInfoItem('Stock:', 'Not found'); 
                }
                
                // CP Product Type - ONLY from default_design path
                let cpProductType = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.default_design && 
                    result.productsData.full_object.default_design.cp_product_type_no !== undefined) {
                    cpProductType = (result.productsData.full_object.default_design.cp_product_type_no !== null) ? 
                                   result.productsData.full_object.default_design.cp_product_type_no : 'N/A';
                    console.log('✅ Found CP Product Type from default_design:', cpProductType);
                }
                
                productInfoHtml += createInfoItem('CP Product Type:', cpProductType);
                
                // Default Overlay ID - ONLY from default_design path
                let defaultOverlayId = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.default_design && 
                    result.productsData.full_object.default_design.default_overlay_id !== undefined) {
                    defaultOverlayId = (result.productsData.full_object.default_design.default_overlay_id !== null) ? 
                                      result.productsData.full_object.default_design.default_overlay_id : 'N/A';
                    console.log('✅ Found Default Overlay ID from default_design:', defaultOverlayId);
                }
                
                productInfoHtml += createInfoItem('Default Overlay ID:', defaultOverlayId);
                
                // Option ID - ONLY from default_sku path
                let optionId = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.default_sku && 
                    result.productsData.full_object.default_sku.option_id !== undefined) {
                    optionId = (result.productsData.full_object.default_sku.option_id !== null) ? 
                              result.productsData.full_object.default_sku.option_id : 'N/A';
                    console.log('✅ Found Option ID from default_sku:', optionId);
                }
                
                productInfoHtml += createInfoItem('Option ID:', optionId);
                
                // Site ID - Hardcoded based on site type
                let siteId = 'Not found';
                
                // Determine site type from current URL and return Site ID using unified config
                const currentUrl = window.location.href;
                const region = CONFIG.detectRegion(currentUrl);
                if (region) {
                    siteId = CONFIG.getSiteId(region);
                    console.log(`✅ Detected region ${region}, Site ID:`, siteId);
                }
                
                productInfoHtml += createInfoItem('Site ID:', siteId);
                
                // SKU ID - ONLY from default_sku path
                let skuId = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.default_sku && 
                    result.productsData.full_object.default_sku.sku_id !== undefined) {
                    skuId = (result.productsData.full_object.default_sku.sku_id !== null) ? 
                           result.productsData.full_object.default_sku.sku_id : 'N/A';
                    console.log('✅ Found SKU ID from default_sku:', skuId);
                }
                
                productInfoHtml += createInfoItem('SKU ID:', skuId);
                
                // Vendor ID - ONLY from default_sku path
                let vendorId = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.default_sku && 
                    result.productsData.full_object.default_sku.vendor_id !== undefined) {
                    vendorId = (result.productsData.full_object.default_sku.vendor_id !== null) ? 
                              result.productsData.full_object.default_sku.vendor_id : 'N/A';
                    console.log('✅ Found Vendor ID from default_sku:', vendorId);
                }
                
                productInfoHtml += createInfoItem('Vendor ID:', vendorId);
                
                // Seller ID (Customer ID) - from product_design_objects[designId]
                let sellerId = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.product_design_objects && 
                    result.designId) {
                    
                    const designObjects = result.productsData.full_object.product_design_objects;
                    if (designObjects[result.designId] && designObjects[result.designId].seller_id !== undefined) {
                        sellerId = (designObjects[result.designId].seller_id !== null) ? 
                                  designObjects[result.designId].seller_id : 'N/A';
                        console.log('✅ Found Seller ID from product_design_objects[' + result.designId + ']:', sellerId);
                    }
                }
                
                productInfoHtml += createInfoItem('Seller ID (Customer ID):', sellerId);
                
                // Store ID - from product_design_objects[designId]
                let storeId = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.product_design_objects && 
                    result.designId) {
                    
                    const designObjects = result.productsData.full_object.product_design_objects;
                    if (designObjects[result.designId] && designObjects[result.designId].store_id !== undefined) {
                        storeId = (designObjects[result.designId].store_id !== null) ? 
                                 designObjects[result.designId].store_id : 'N/A';
                        console.log('✅ Found Store ID from product_design_objects[' + result.designId + ']:', storeId);
                    }
                }
                
                productInfoHtml += createInfoItem('Store ID:', storeId);
                
                // SW Product ID - from full_object.product_id
                let swProductId = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.product_id !== undefined) {
                    swProductId = (result.productsData.full_object.product_id !== null) ? 
                                 result.productsData.full_object.product_id : 'N/A';
                    console.log('✅ Found SW Product ID from full_object:', swProductId);
                }
                
                productInfoHtml += createInfoItem('SW Product ID:', swProductId);
                
                // Is Virtual - from full_object.is_virtual (convert 0/1 to False/True)
                let isVirtual = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.is_virtual !== undefined) {
                    const virtualValue = result.productsData.full_object.is_virtual;
                    if (virtualValue === 0) {
                        isVirtual = 'False';
                    } else if (virtualValue === 1) {
                        isVirtual = 'True';
                    } else {
                        isVirtual = (virtualValue !== null) ? virtualValue : 'N/A';
                    }
                    console.log('✅ Found Is Virtual from full_object:', virtualValue, '→ displaying as:', isVirtual);
                }
                
                productInfoHtml += createInfoItem('Is Virtual:', isVirtual);
                
                // Product Image ID - extracted from page HTML /dd/number pattern
                if (result.productImageId) {
                    productInfoHtml += createInfoItem('Product Image ID:', result.productImageId);
                    console.log('Displaying Product Image ID from HTML extraction:', result.productImageId);
                } else {
                    productInfoHtml += createInfoItem('Product Image ID:', 'Not found');
                }
                
                // CP Product ID - prioritize URL extraction over JavaScript object
                if (result.cpProductId) {
                    productInfoHtml += createInfoItem('CP Product ID:', result.cpProductId);
                    console.log('Using CP Product ID from URL:', result.cpProductId);
                } else if (result.productsData && result.productsData.cp_product_id !== undefined) {
                    productInfoHtml += createInfoItem('CP Product ID:', result.productsData.cp_product_id || 'N/A');
                    console.log('Using CP Product ID from JavaScript object:', result.productsData.cp_product_id);
                } else {
                    productInfoHtml += createInfoItem('CP Product ID:', 'Not found');
                    console.log('CP Product ID not found in URL or JavaScript object');
                }
                
                // Close product info card
                productInfoHtml += `</div>`;
                
                // URL and timestamp
                productInfoHtml += `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">`;
                productInfoHtml += createInfoRow('Page URL:', result.url || 'Unknown');
                productInfoHtml += createInfoRow('Extracted Time:', formatTimestamp(result.timestamp));
                productInfoHtml += `</div>`;
                
                // Refresh button and debug button
                productInfoHtml += `
                    <div style="margin-top: 15px; text-align: center;">
                        <button id="cp-refresh-btn" style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3);
                            color: white;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            transition: background-color 0.2s;
                            margin-right: 10px;
                        ">Refresh Check</button>
                        <button id="cp-debug-btn" style="
                            background: rgba(255,165,0,0.6);
                            border: 1px solid rgba(255,165,0,0.8);
                            color: white;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            transition: background-color 0.2s;
                        ">Debug Page</button>
                    </div>
                `;
            } else {
                // No valid product data - don't show Product Info card or environment switcher
                console.log('ℹ️ Not on a product page - hiding Product Info card and environment switcher');
                productInfoHtml = `
                    <div style="text-align: center; padding: 15px; color: rgba(255,255,255,0.6); font-size: 12px;">
                        Product Info only available on product pages
                    </div>
                `;
            }
            
            content.innerHTML = html;
            
            // Set product info separately
            const productInfoDiv = content.querySelector('#floating-product-info');
            if (productInfoDiv) {
                productInfoDiv.innerHTML = productInfoHtml;
                productInfoDiv.style.display = 'block';
            }
            
            // 异步获取并显示 PHPSESSID (在 DOM 创建后执行)
            // 通过 background script 获取 cookie（因为 content script 不能访问 chrome.cookies）
            chrome.runtime.sendMessage({
                type: 'GET_PHPSESSID',
                url: window.location.href
            }, (response) => {
                if (response && response.success && response.value) {
                    const sessionId = response.value;
                    const container = content.querySelector('#phpsessid-container');
                    if (container) {
                        container.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="
                                    font-size: 10px;
                                    color: rgba(255,255,255,0.6);
                                    white-space: nowrap;
                                ">PHPSESSID:</div>
                                <div style="
                                    font-size: 10px;
                                    color: #ffeb3b;
                                    font-family: monospace;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                    max-width: 280px;
                                " title="${sessionId}">${sessionId}</div>
                            </div>
                        `;
                        console.log('✅ PHPSESSID loaded:', sessionId);
                    }
                } else {
                    console.log('ℹ️ No PHPSESSID cookie found');
                }
            });
            
            // Add search functionality event listeners
            const searchBtn = content.querySelector('#floating-search-btn');
            const cancelOrderBtn = content.querySelector('#floating-cancel-order-btn');
            const searchInput = content.querySelector('#floating-order-id-input');
            const clearBtn = content.querySelector('#floating-clear-btn');
            const pdpBtn = content.querySelector('#floating-pdp-btn');
            
            if (searchBtn) {
                searchBtn.addEventListener('click', searchOrderInFloatingWindow);
                console.log('✓ Search button event listener added to floating window');
            }
            
            if (cancelOrderBtn) {
                cancelOrderBtn.addEventListener('click', cancelOrderInFloatingWindow);
                console.log('✓ Cancel Order button event listener added to floating window');
            }
            
            if (searchInput) {
                searchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchOrderInFloatingWindow();
                    }
                });
                
                // Show/hide clear button based on input value
                searchInput.addEventListener('input', function() {
                    if (clearBtn) {
                        clearBtn.style.display = this.value ? 'block' : 'none';
                    }
                });
                
                console.log('✓ Search input enter key listener added to floating window');
            }
            
            if (clearBtn) {
                clearBtn.addEventListener('click', function() {
                    if (searchInput) {
                        searchInput.value = '';
                        clearBtn.style.display = 'none';
                        searchInput.focus();
                    }
                });
                console.log('✓ Clear button event listener added to floating window');
            }
            
            if (pdpBtn) {
                pdpBtn.addEventListener('click', showPDPInfo);
                console.log('✓ PDP button event listener added to floating window');
            }
            
            // Add hover effects for Cancel Order button
            if (cancelOrderBtn) {
                cancelOrderBtn.addEventListener('mouseenter', () => {
                    if (!cancelOrderBtn.disabled) {
                        cancelOrderBtn.style.background = '#f4511e';
                    }
                });
                cancelOrderBtn.addEventListener('mouseleave', () => {
                    if (!cancelOrderBtn.disabled) {
                        cancelOrderBtn.style.background = '#ff5722';
                    }
                });
            }
            
            // Add hover effects for Back button
            if (pdpBtn) {
                pdpBtn.addEventListener('mouseenter', () => {
                    pdpBtn.style.background = 'rgba(255,255,255,0.3)';
                    pdpBtn.style.borderColor = 'rgba(255,255,255,0.5)';
                });
                pdpBtn.addEventListener('mouseleave', () => {
                    pdpBtn.style.background = 'rgba(255,255,255,0.2)';
                    pdpBtn.style.borderColor = 'rgba(255,255,255,0.3)';
                });
            }
            
            // Add panel toggle functionality
            const panelToggleBtn = content.querySelector('#cp-panel-toggle-btn');
            const collapsiblePanels = content.querySelector('#cp-collapsible-panels');
            
            if (panelToggleBtn && collapsiblePanels) {
                panelToggleBtn.addEventListener('click', () => {
                    const isCurrentlyExpanded = collapsiblePanels.style.maxHeight !== '0px';
                    const newExpandedState = !isCurrentlyExpanded;
                    
                    // Toggle panels
                    collapsiblePanels.style.maxHeight = newExpandedState ? '500px' : '0';
                    
                    // Update button text and title
                    const buttonText = panelToggleBtn.querySelector('span');
                    if (buttonText) {
                        buttonText.textContent = newExpandedState ? '▲ Collapse' : '▼ Expand';
                    }
                    panelToggleBtn.title = newExpandedState ? 'Collapse' : 'Expand';
                    
                    // Save state
                    localStorage.setItem('cp-panel-expanded', newExpandedState.toString());
                    
                    console.log('📋 Panel toggled:', newExpandedState ? 'Expanded' : 'Collapsed');
                });
                
                // Add hover effect
                panelToggleBtn.addEventListener('mouseenter', () => {
                    panelToggleBtn.style.background = 'rgba(255,255,255,0.1)';
                });
                panelToggleBtn.addEventListener('mouseleave', () => {
                    panelToggleBtn.style.background = 'transparent';
                });
                
                console.log('✓ Panel toggle button event listener added');
            }
            
            // Add store search functionality event listeners
            const storeEmailInput = content.querySelector('#floating-store-email-input');
            const storeEmailClearBtn = content.querySelector('#floating-store-email-clear-btn');
            const storeCustomerIdInput = content.querySelector('#floating-store-customer-id-input');
            const storeCustomerIdClearBtn = content.querySelector('#floating-store-customer-id-clear-btn');
            const searchStoreBtn = content.querySelector('#floating-search-store-btn');
            
            if (storeEmailInput) {
                // Show/hide clear button based on input value
                storeEmailInput.addEventListener('input', function() {
                    if (storeEmailClearBtn) {
                        storeEmailClearBtn.style.display = this.value ? 'block' : 'none';
                    }
                });
                
                // Enter key triggers search
                storeEmailInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && searchStoreBtn) {
                        searchStoreBtn.click();
                    }
                });
                
                console.log('✓ Store email input event listeners added');
            }
            
            if (storeEmailClearBtn) {
                storeEmailClearBtn.addEventListener('click', function() {
                    if (storeEmailInput) {
                        storeEmailInput.value = '';
                        storeEmailClearBtn.style.display = 'none';
                        storeEmailInput.focus();
                    }
                });
                console.log('✓ Store email clear button event listener added');
            }
            
            if (storeCustomerIdInput) {
                // Show/hide clear button based on input value
                storeCustomerIdInput.addEventListener('input', function() {
                    if (storeCustomerIdClearBtn) {
                        storeCustomerIdClearBtn.style.display = this.value ? 'block' : 'none';
                    }
                });
                
                // Enter key triggers search
                storeCustomerIdInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && searchStoreBtn) {
                        searchStoreBtn.click();
                    }
                });
                
                console.log('✓ Store customer ID input event listeners added');
            }
            
            if (storeCustomerIdClearBtn) {
                storeCustomerIdClearBtn.addEventListener('click', function() {
                    if (storeCustomerIdInput) {
                        storeCustomerIdInput.value = '';
                        storeCustomerIdClearBtn.style.display = 'none';
                        storeCustomerIdInput.focus();
                    }
                });
                console.log('✓ Store customer ID clear button event listener added');
            }
            
            if (searchStoreBtn) {
                searchStoreBtn.addEventListener('click', async function() {
                    const email = storeEmailInput ? storeEmailInput.value.trim() : '';
                    const customerId = storeCustomerIdInput ? storeCustomerIdInput.value.trim() : '';
                    
                    if (!email && !customerId) {
                        showToastNotification('Please enter Email or SW Customer ID', 'warning');
                        return;
                    }
                    
                    console.log('🔍 Search Store clicked:', { email, customerId });
                    
                    // Disable button and show loading state
                    searchStoreBtn.disabled = true;
                    searchStoreBtn.textContent = 'Searching...';
                    
                    try {
                        // Search Store needs to use Pre environment as Live API doesn't exist yet
                        const environment = detectEnvironment();
                        const detectedBranch = CONFIG.autoDetectBranch() || CONFIG.BRANCH.CURRENT;
                        console.log('Current environment:', environment);
                        console.log('Current branch:', detectedBranch);
                        
                        const response = await chrome.runtime.sendMessage({
                            type: 'SEARCH_STORE',
                            email: email,
                            swCustomerId: customerId,
                            environment: environment,
                            branch: detectedBranch
                        });
                        
                        if (!response.success) {
                            throw new Error(response.error || 'Failed to search stores');
                        }
                        
                        console.log('✅ Store search successful:', response.data);
                        
                        if (response.data && response.data.length > 0) {
                            displayStoreSearchResults(response.data);
                            showToastNotification(`✅ Found ${response.data.length} store${response.data.length > 1 ? 's' : ''}`, 'success');
                        } else {
                            // Show no results message
                            const orderDetailDiv = document.getElementById('floating-order-detail');
                            const productInfoDiv = document.getElementById('floating-product-info');
                            
                            if (orderDetailDiv) {
                                if (productInfoDiv) productInfoDiv.style.display = 'none';
                                orderDetailDiv.style.display = 'block';
                                orderDetailDiv.innerHTML = `
                                    <div style="
                                        padding: 20px;
                                        text-align: center;
                                        color: rgba(255, 255, 255, 0.7);
                                    ">
                                        <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                                        <div style="font-size: 14px;">No stores found</div>
                                    </div>
                                `;
                            }
                            showToastNotification('No stores found', 'info');
                        }
                    } catch (error) {
                        console.error('❌ Store search failed:', error);
                        showToastNotification(`❌ Search failed: ${error.message}`, 'error');
                    } finally {
                        searchStoreBtn.disabled = false;
                        searchStoreBtn.textContent = 'Search Store';
                    }
                });
                
                // Hover effects
                searchStoreBtn.addEventListener('mouseenter', () => {
                    searchStoreBtn.style.background = '#ab47bc';
                });
                searchStoreBtn.addEventListener('mouseleave', () => {
                    searchStoreBtn.style.background = '#9c27b0';
                });
                
                console.log('✓ Search Store button event listener added');
            }
            
            // Add image approval functionality event listeners
            const imageIdInput = content.querySelector('#floating-image-id-input');
            const imageClearBtn = content.querySelector('#floating-image-clear-btn');
            const approveBtn = content.querySelector('#floating-approve-btn');
            const blockBtn = content.querySelector('#floating-block-btn');
            
            if (imageIdInput) {
                imageIdInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        // Trigger approve by default on Enter
                        if (approveBtn) {
                            approveBtn.click();
                        }
                    }
                });
                
                // Show/hide clear button based on input value
                imageIdInput.addEventListener('input', function() {
                    if (imageClearBtn) {
                        imageClearBtn.style.display = this.value ? 'block' : 'none';
                    }
                });
                
                console.log('✓ Image ID input enter key listener added');
            }
            
            if (imageClearBtn) {
                imageClearBtn.addEventListener('click', function() {
                    if (imageIdInput) {
                        imageIdInput.value = '';
                        imageClearBtn.style.display = 'none';
                        imageIdInput.focus();
                    }
                });
                console.log('✓ Image clear button event listener added');
            }
            
            if (approveBtn) {
                approveBtn.addEventListener('click', async function() {
                    const imageId = imageIdInput ? imageIdInput.value.trim() : '';
                    if (!imageId) {
                        console.log('⚠️ No Image ID entered');
                        showToastNotification('Please enter Image ID', 'warning');
                        return;
                    }
                    
                    // Disable button and show loading state
                    approveBtn.disabled = true;
                    approveBtn.textContent = 'Approving...';
                    
                    try {
                        await approveImage(imageId);
                        showToastNotification(`✅ Image ${imageId} approved successfully!`, 'success');
                        // Keep Image ID in input for user reference
                    } catch (error) {
                        console.error('❌ Approve failed:', error);
                        showToastNotification(`❌ ${error.message}`, 'error');
                    } finally {
                        approveBtn.disabled = false;
                        approveBtn.textContent = 'Approve';
                    }
                });
                
                approveBtn.addEventListener('mouseenter', () => {
                    if (!approveBtn.disabled) {
                        approveBtn.style.background = '#66bb6a';
                    }
                });
                approveBtn.addEventListener('mouseleave', () => {
                    if (!approveBtn.disabled) {
                        approveBtn.style.background = '#4caf50';
                    }
                });
                
                console.log('✓ Approve button event listener added');
            }
            
            if (blockBtn) {
                blockBtn.addEventListener('click', async function() {
                    const imageId = imageIdInput ? imageIdInput.value.trim() : '';
                    if (!imageId) {
                        console.log('⚠️ No Image ID entered');
                        showToastNotification('Please enter Image ID', 'warning');
                        return;
                    }
                    
                    // Disable button and show loading state
                    blockBtn.disabled = true;
                    blockBtn.textContent = 'Blocking...';
                    
                    try {
                        await blockImage(imageId);
                        showToastNotification(`🚫 Image ${imageId} blocked successfully!`, 'success');
                        // Keep Image ID in input for user reference
                    } catch (error) {
                        console.error('❌ Block failed:', error);
                        showToastNotification(`❌ ${error.message}`, 'error');
                    } finally {
                        blockBtn.disabled = false;
                        blockBtn.textContent = 'Block';
                    }
                });
                
                blockBtn.addEventListener('mouseenter', () => {
                    if (!blockBtn.disabled) {
                        blockBtn.style.background = '#e57373';
                    }
                });
                blockBtn.addEventListener('mouseleave', () => {
                    if (!blockBtn.disabled) {
                        blockBtn.style.background = '#f44336';
                    }
                });
                
                console.log('✓ Block button event listener added');
            }
            
            // Add Gen PromoCode button event listener
            const genPromoCodeBtn = content.querySelector('#floating-gen-promocode-btn');
            const pcCodeDisplay = content.querySelector('#pc-code-display');
            
            // Restore last generated promo code from storage
            if (pcCodeDisplay) {
                chrome.storage.local.get(['lastPromoCode', 'lastPromoPercent'], (result) => {
                    if (result.lastPromoCode && result.lastPromoPercent) {
                        pcCodeDisplay.textContent = `Code: ${result.lastPromoCode} (${result.lastPromoPercent}%Off)`;
                        pcCodeDisplay.style.display = 'block';
                        console.log('✅ Restored last promo code:', result.lastPromoCode);
                    }
                });
            }
            
            if (genPromoCodeBtn) {
                genPromoCodeBtn.addEventListener('click', async function() {
                    console.log('🎟️ Gen PromoCode button clicked');
                    
                    // Disable button and show loading state
                    genPromoCodeBtn.disabled = true;
                    genPromoCodeBtn.textContent = 'Generating...';
                    genPromoCodeBtn.style.opacity = '0.6';
                    genPromoCodeBtn.style.cursor = 'not-allowed';
                    
                    // Hide code display during generation
                    if (pcCodeDisplay) {
                        pcCodeDisplay.style.display = 'none';
                    }
                    
                    // Generate code: QACODE + MMDDHHMM
                    const today = new Date();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const hour = String(today.getHours()).padStart(2, '0');
                    const minute = String(today.getMinutes()).padStart(2, '0');
                    const pcId = `QACODE${month}${day}${hour}${minute}`;
                    
                    // Random sale_percent between 10-50
                    const salePercent = Math.floor(Math.random() * 41) + 10;
                    
                    // Random voucher_max_value between 1-5
                    const voucherMaxValue = Math.floor(Math.random() * 5) + 1;
                    
                    // Date format: MM/DD/YYYY
                    const year = today.getFullYear();
                    const dateStr = `${month}/${day}/${year}`;
                    
                    // Description
                    const description = `${pcId}-${salePercent}%Off`;
                    
                    const siteIds = ['170', '171', '172', '173'];
                    const siteNames = ['CAFUS', 'CAFAU', 'CAFUK', 'CAFCA'];
                    
                    // Auto-detect environment
                    const hostname = window.location.hostname;
                    let environment = 'live';
                    if (hostname.includes('.pre.planetart.com')) {
                        environment = 'pre';
                    } else if (hostname.includes('.stage.planetart.com')) {
                        environment = 'stage';
                    }
                    
                    console.log(`📝 Promo Code Details:`);
                    console.log(`  Environment: ${environment}`);
                    console.log(`  ID: ${pcId}`);
                    console.log(`  Sale Percent: ${salePercent}%`);
                    console.log(`  Voucher Max Value: $${voucherMaxValue}`);
                    console.log(`  Date: ${dateStr}`);
                    console.log(`  Description: ${description}`);
                    console.log(`  Sites: ${siteIds.join(', ')}`);
                    
                    try {
                        // Send request to background script
                        const response = await new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                type: 'GEN_PROMOCODE',
                                pcId: pcId,
                                salePercent: salePercent,
                                voucherMaxValue: voucherMaxValue,
                                dateStr: dateStr,
                                description: description,
                                siteIds: siteIds,
                                environment: environment
                            }, resolve);
                        });
                        
                        if (response.success) {
                            console.log('✅ Promo Codes generated successfully:', response.results);
                            
                            // Build success message
                            let message = `Generated ${pcId} (${salePercent}%Off)\n`;
                            response.results.forEach((result, index) => {
                                if (result.success) {
                                    message += `✓ ${siteNames[index]}\n`;
                                } else {
                                    message += `✗ ${siteNames[index]}: ${result.error}\n`;
                                }
                            });
                            
                            showToastNotification(message, 'success', 5000);
                            
                            // Display the generated code
                            if (pcCodeDisplay) {
                                pcCodeDisplay.textContent = `Code: ${pcId} (${salePercent}%Off)`;
                                pcCodeDisplay.style.display = 'block';
                            }
                            
                            // Save to storage for persistence
                            chrome.storage.local.set({
                                lastPromoCode: pcId,
                                lastPromoPercent: salePercent,
                                lastPromoTime: new Date().toISOString()
                            });
                        } else {
                            console.error('❌ Error generating promo codes:', response.error);
                            showToastNotification(`Error: ${response.error}`, 'error');
                        }
                    } catch (error) {
                        console.error('❌ Exception:', error);
                        showToastNotification(`Exception: ${error.message}`, 'error');
                    } finally {
                        // Re-enable button
                        genPromoCodeBtn.disabled = false;
                        genPromoCodeBtn.textContent = 'Gen PromoCode';
                        genPromoCodeBtn.style.opacity = '1';
                        genPromoCodeBtn.style.cursor = 'pointer';
                    }
                });
                
                genPromoCodeBtn.addEventListener('mouseenter', () => {
                    if (!genPromoCodeBtn.disabled) {
                        genPromoCodeBtn.style.background = '#ffa726';
                    }
                });
                genPromoCodeBtn.addEventListener('mouseleave', () => {
                    if (!genPromoCodeBtn.disabled) {
                        genPromoCodeBtn.style.background = '#ff9800';
                    }
                });
                
                console.log('✓ Gen PromoCode button event listener added');
            }
            
            // Add Gen Giftcerts button event listener
            const genGiftcertsBtn = content.querySelector('#floating-gen-giftcerts-btn');
            const gcCodeDisplay = content.querySelector('#gc-code-display');
            
            // Restore last generated gift cert code from storage
            if (gcCodeDisplay) {
                chrome.storage.local.get(['lastGiftCertCode', 'lastGiftCertAmount'], (result) => {
                    if (result.lastGiftCertCode && result.lastGiftCertAmount) {
                        gcCodeDisplay.textContent = `Code: ${result.lastGiftCertCode} ($${result.lastGiftCertAmount})`;
                        gcCodeDisplay.style.display = 'block';
                        console.log('✅ Restored last gift cert code:', result.lastGiftCertCode);
                    }
                });
            }
            
            if (genGiftcertsBtn) {
                genGiftcertsBtn.addEventListener('click', async function() {
                    console.log('🎁 Gen Giftcerts button clicked');
                    
                    // Disable button and show loading state
                    genGiftcertsBtn.disabled = true;
                    genGiftcertsBtn.textContent = 'Generating...';
                    genGiftcertsBtn.style.opacity = '0.6';
                    genGiftcertsBtn.style.cursor = 'not-allowed';
                    
                    // Hide code display during generation
                    if (gcCodeDisplay) {
                        gcCodeDisplay.style.display = 'none';
                    }
                    
                    // Generate code: QAGiftCode + MMDDHHMM (例如: QAGiftCode10191430)
                    const today = new Date();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const hour = String(today.getHours()).padStart(2, '0');
                    const minute = String(today.getMinutes()).padStart(2, '0');
                    const gcNumber = `QAGiftCode${month}${day}${hour}${minute}`;
                    
                    // Random amount between 1-10
                    const gcAmount = Math.floor(Math.random() * 10) + 1;
                    
                    // Notes
                    const notes = `${gcNumber}-${gcAmount}`;
                    
                    const siteIds = ['170', '171', '172', '173'];
                    const siteNames = ['CAFUS', 'CAFAU', 'CAFUK', 'CAFCA'];
                    
                    // Auto-detect environment
                    const hostname = window.location.hostname;
                    let environment = 'live';
                    if (hostname.includes('.pre.planetart.com')) {
                        environment = 'pre';
                    } else if (hostname.includes('.stage.planetart.com')) {
                        environment = 'stage';
                    }
                    
                    console.log(`📝 Gift Certificate Details:`);
                    console.log(`  Environment: ${environment}`);
                    console.log(`  Code: ${gcNumber}`);
                    console.log(`  Amount: $${gcAmount}`);
                    console.log(`  Notes: ${notes}`);
                    console.log(`  Sites: ${siteIds.join(', ')}`);
                    
                    try {
                        // Send request to background script
                        const response = await new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                type: 'GEN_GIFTCERTS',
                                gcNumber: gcNumber,
                                gcAmount: gcAmount,
                                notes: notes,
                                siteIds: siteIds,
                                environment: environment
                            }, resolve);
                        });
                        
                        if (response.success) {
                            console.log('✅ Gift Certificates generated successfully:', response.results);
                            
                            // Build success message
                            let message = `Generated ${gcNumber} ($${gcAmount})\n`;
                            response.results.forEach((result, index) => {
                                if (result.success) {
                                    message += `✓ ${siteNames[index]}\n`;
                                } else {
                                    message += `✗ ${siteNames[index]}: ${result.error}\n`;
                                }
                            });
                            
                            showToastNotification(message, 'success', 5000);
                            
                            // Display the generated code
                            if (gcCodeDisplay) {
                                gcCodeDisplay.textContent = `Code: ${gcNumber} ($${gcAmount})`;
                                gcCodeDisplay.style.display = 'block';
                            }
                            
                            // Save to storage for persistence
                            chrome.storage.local.set({
                                lastGiftCertCode: gcNumber,
                                lastGiftCertAmount: gcAmount,
                                lastGiftCertTime: new Date().toISOString()
                            });
                        } else {
                            console.error('❌ Error generating gift certificates:', response.error);
                            showToastNotification(`Error: ${response.error}`, 'error');
                        }
                    } catch (error) {
                        console.error('❌ Exception:', error);
                        showToastNotification(`Exception: ${error.message}`, 'error');
                    } finally {
                        // Re-enable button
                        genGiftcertsBtn.disabled = false;
                        genGiftcertsBtn.textContent = 'Gen Giftcerts';
                        genGiftcertsBtn.style.opacity = '1';
                        genGiftcertsBtn.style.cursor = 'pointer';
                    }
                });
                
                genGiftcertsBtn.addEventListener('mouseenter', () => {
                    if (!genGiftcertsBtn.disabled) {
                        genGiftcertsBtn.style.background = '#ab47bc';
                    }
                });
                genGiftcertsBtn.addEventListener('mouseleave', () => {
                    if (!genGiftcertsBtn.disabled) {
                        genGiftcertsBtn.style.background = '#9c27b0';
                    }
                });
                
                console.log('✓ Gen Giftcerts button event listener added');
            }
            
            // Add Translation Tool button event listener
            const openTranslationToolBtn = content.querySelector('#open-translation-tool-btn');
            const translationCard = content.querySelector('#translation-card');
            const searchPanel = content.querySelector('#floating-product-info');
            const functionPanel = content.querySelector('#cp-function-panel');
            const navLinksCardEl = content.querySelector('#navLinksCard');
            const environmentInfoPanel = content.querySelector('#environment-info-panel');
            const translationBackBtnHeader = content.querySelector('#translation-back-btn');
            let isTranslationToolOpen = false;
            
            if (openTranslationToolBtn && translationCard) {
                openTranslationToolBtn.addEventListener('click', () => {
                    console.log('🌐 Toggle Translation Tool');
                    
                    isTranslationToolOpen = !isTranslationToolOpen;
                    
                    if (isTranslationToolOpen) {
                        // Show translation card
                        translationCard.style.display = 'block';
                        
                        // Show Back button
                        if (translationBackBtnHeader) {
                            translationBackBtnHeader.style.display = 'block';
                        }
                        
                        // Hide all content (environment info, search panel, function panel, navLinksCard)
                        if (environmentInfoPanel) {
                            environmentInfoPanel.style.display = 'none';
                        }
                        if (searchPanel) {
                            searchPanel.style.display = 'none';
                        }
                        if (functionPanel) {
                            functionPanel.style.display = 'none';
                        }
                        if (navLinksCardEl) {
                            navLinksCardEl.style.display = 'none';
                        }
                    } else {
                        // Hide translation card
                        translationCard.style.display = 'none';
                        
                        // Hide Back button
                        if (translationBackBtnHeader) {
                            translationBackBtnHeader.style.display = 'none';
                        }
                        
                        // Show all content
                        if (environmentInfoPanel) {
                            environmentInfoPanel.style.display = 'flex';
                        }
                        if (searchPanel) {
                            searchPanel.style.display = 'block';
                        }
                        if (functionPanel) {
                            functionPanel.style.display = 'block';
                        }
                        if (navLinksCardEl) {
                            navLinksCardEl.style.display = 'block';
                        }
                    }
                });
                
                // Get common translation tool elements
                const translateBtn = content.querySelector('#translate-btn');
                const sourceTextareaEl = content.querySelector('#translation-source');
                const targetTextareaEl = content.querySelector('#translation-target');
                const langSwitchArrow = content.querySelector('#lang-switch-arrow');
                const sourceLabel = content.querySelector('#source-label');
                const targetLabel = content.querySelector('#target-label');
                
                // Track language direction (false = zh->en, true = en->zh)
                let isEnglishToChinese = false;
                
                // Add Translate button event listener
                if (translateBtn && sourceTextareaEl && targetTextareaEl) {
                    // Function to call MyMemory API
                    async function translateText() {
                        const text = sourceTextareaEl.value.trim();
                        if (!text) {
                            console.log('⚠️ No text to translate');
                            showToastNotification('Please enter text to translate', 'warning');
                            return;
                        }
                        
                        // Determine language pair based on switch state
                        const langPair = isEnglishToChinese ? 'en|zh' : 'zh|en';
                        
                        // Disable button and show loading state
                        translateBtn.disabled = true;
                        translateBtn.textContent = 'Translating...';
                        targetTextareaEl.value = 'Translating...';
                        
                        try {
                            // Call MyMemory API
                            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
                            const response = await fetch(apiUrl);
                            
                            if (!response.ok) {
                                throw new Error(`API request failed: ${response.status}`);
                            }
                            
                            const data = await response.json();
                            
                            if (data.responseStatus === 200 && data.responseData) {
                                targetTextareaEl.value = data.responseData.translatedText;
                                console.log('✅ Translation successful');
                            } else {
                                throw new Error('Translation failed');
                            }
                        } catch (error) {
                            console.error('❌ Translation error:', error);
                            targetTextareaEl.value = '';
                            showToastNotification(`❌ Translation failed: ${error.message}`, 'error');
                        } finally {
                            translateBtn.disabled = false;
                            translateBtn.textContent = 'Translate';
                        }
                    }
                    
                    // Click event
                    translateBtn.addEventListener('click', translateText);
                    
                    // Enter key event in source textarea
                    sourceTextareaEl.addEventListener('keydown', (e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                            e.preventDefault();
                            translateText();
                        }
                    });
                    
                    console.log('✓ Translate button event listener added');
                }
                
                // Add Clear button event listener
                const clearSourceBtn = content.querySelector('#clear-source-btn');
                if (clearSourceBtn && sourceTextareaEl && targetTextareaEl) {
                    clearSourceBtn.addEventListener('click', () => {
                        sourceTextareaEl.value = '';
                        targetTextareaEl.value = '';
                    });
                }
                
                // Add Copy button event listener
                const copyTranslationBtn = content.querySelector('#copy-translation-btn');
                if (copyTranslationBtn && targetTextareaEl) {
                    copyTranslationBtn.addEventListener('click', async () => {
                        if (targetTextareaEl.value) {
                            try {
                                await navigator.clipboard.writeText(targetTextareaEl.value);
                                const originalText = copyTranslationBtn.innerHTML;
                                copyTranslationBtn.innerHTML = '✅ Copied!';
                                setTimeout(() => {
                                    copyTranslationBtn.innerHTML = originalText;
                                }, 2000);
                            } catch (error) {
                                console.error('Failed to copy:', error);
                            }
                        }
                    });
                }
                
                // Add Language Switch Arrow click event listener
                if (langSwitchArrow && sourceLabel && targetLabel && sourceTextareaEl && targetTextareaEl) {
                    langSwitchArrow.addEventListener('click', () => {
                        isEnglishToChinese = !isEnglishToChinese;
                        
                        if (isEnglishToChinese) {
                            // Switch to English -> Chinese (input English, output Chinese)
                            sourceLabel.textContent = 'English';
                            targetLabel.textContent = 'Chinese';
                            sourceTextareaEl.placeholder = 'Enter text to translate...';
                            targetTextareaEl.placeholder = '翻译结果将显示在这里...';
                        } else {
                            // Default: Chinese -> English (input Chinese, output English)
                            sourceLabel.textContent = 'Chinese';
                            targetLabel.textContent = 'English';
                            sourceTextareaEl.placeholder = '输入要翻译的文本...';
                            targetTextareaEl.placeholder = 'Translation will appear here...';
                        }
                        // Clear both textareas when switching
                        sourceTextareaEl.value = '';
                        targetTextareaEl.value = '';
                        
                        console.log('🔄 Language switched:', isEnglishToChinese ? 'EN→ZH' : 'ZH→EN');
                    });
                }
                
                // Add Back button event listener
                if (translationBackBtnHeader) {
                    translationBackBtnHeader.addEventListener('click', () => {
                        console.log('← Back to main panel');
                        
                        // Hide translation card
                        if (translationCard) {
                            translationCard.style.display = 'none';
                        }
                        
                        // Hide Back button
                        translationBackBtnHeader.style.display = 'none';
                        
                        // Show all hidden panels
                        if (environmentInfoPanel) {
                            environmentInfoPanel.style.display = 'flex';
                        }
                        if (searchPanel) {
                            searchPanel.style.display = 'block';
                        }
                        if (functionPanel) {
                            functionPanel.style.display = 'block';
                        }
                        if (navLinksCardEl) {
                            navLinksCardEl.style.display = 'block';
                        }
                        
                        // Update translation tool open state
                        isTranslationToolOpen = false;
                    });
                }
                
                // Add custom style for placeholder color
                const style = document.createElement('style');
                style.textContent = `
                    #translation-source::placeholder,
                    #translation-target::placeholder {
                        color: rgba(255, 255, 255, 0.5) !important;
                    }
                `;
                document.head.appendChild(style);
                
                console.log('✓ Translation Tool button event listener added');
            }
            
            // Add refresh button event listener
            const refreshBtn = content.querySelector('#cp-refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    refreshBtn.textContent = 'Refreshing...';
                    refreshBtn.disabled = true;
                    
                    // Re-run extraction
                    extractProductInfo();
                    
                    setTimeout(() => {
                        updateFloatingWindowContent();
                    }, 1000);
                });
                
                refreshBtn.addEventListener('mouseenter', () => {
                    refreshBtn.style.backgroundColor = 'rgba(255,255,255,0.3)';
                });
                refreshBtn.addEventListener('mouseleave', () => {
                    refreshBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
                });
            }
            
            // Add environment switcher event listeners
            const envSwitchBtns = content.querySelectorAll('.env-switch-btn');
            envSwitchBtns.forEach(btn => {
                if (!btn.disabled) {
                    btn.addEventListener('click', () => {
                        const targetUrl = btn.getAttribute('data-url');
                        if (targetUrl) {
                            console.log('Switching to environment:', targetUrl);
                            window.open(targetUrl, '_blank');
                        }
                    });
                }
            });
            
            // Add Test Links button event listener
            const testLinksBtn = content.querySelector('#floating-test-links-btn');
            const testLinksPanel = content.querySelector('#floating-test-links-panel');
            let isTestLinksPanelVisible = false;
            
            if (testLinksBtn && testLinksPanel) {
                testLinksBtn.addEventListener('click', () => {
                    isTestLinksPanelVisible = !isTestLinksPanelVisible;
                    
                    if (isTestLinksPanelVisible) {
                        // Show panel and generate content
                        testLinksPanel.innerHTML = createTestLinksPanel();
                        testLinksPanel.style.display = 'block';
                        testLinksBtn.textContent = 'Hide Links';
                        
                        // Hide Product Info card when Test Links panel is shown
                        const productInfoCard = content.querySelector('#floating-product-info-card');
                        if (productInfoCard) {
                            productInfoCard.style.display = 'none';
                        }
                        
                        // Add event listeners for Copy buttons
                        const copyBtns = testLinksPanel.querySelectorAll('.test-link-copy-btn');
                        copyBtns.forEach(btn => {
                            btn.addEventListener('click', async () => {
                                const url = btn.getAttribute('data-url');
                                if (!url) return;
                                
                                try {
                                    await navigator.clipboard.writeText(url);
                                    const originalText = btn.innerHTML;
                                    btn.innerHTML = '✅';
                                    btn.style.background = 'rgba(76, 175, 80, 0.3)';
                                    btn.style.color = '#81c784';
                                    
                                    setTimeout(() => {
                                        btn.innerHTML = originalText;
                                        btn.style.background = 'rgba(33, 150, 243, 0.2)';
                                        btn.style.color = '#64b5f6';
                                    }, 1500);
                                } catch (err) {
                                    console.error('Failed to copy:', err);
                                    btn.innerHTML = '❌';
                                    setTimeout(() => {
                                        btn.innerHTML = 'Copy';
                                        btn.style.background = 'rgba(33, 150, 243, 0.2)';
                                        btn.style.color = '#64b5f6';
                                    }, 1500);
                                }
                            });
                        });
                        
                        // Add event listeners for Open buttons
                        const openBtns = testLinksPanel.querySelectorAll('.test-link-open-btn');
                        openBtns.forEach(btn => {
                            btn.addEventListener('click', () => {
                                let url = btn.getAttribute('data-url');
                                if (url) {
                                    // Ensure URL has protocol to avoid being treated as relative path
                                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                        url = 'https://' + url;
                                        console.log('Added https:// to URL:', url);
                                    }
                                    window.open(url, '_blank');
                                }
                            });
                        });
                        
                        // Add PTN Search functionality
                        const ptnSearchInput = testLinksPanel.querySelector('#ptnSearchInput');
                        const ptnSearchButton = testLinksPanel.querySelector('#ptnSearchButton');
                        const ptnSearchResults = testLinksPanel.querySelector('#ptnSearchResults');
                        
                        // Get panel elements
                        const ptnSearchPanel = testLinksPanel.querySelector('#ptnSearchPanel');
                        const navLinksCard = testLinksPanel.querySelector('#navLinksCard');
                        const ptnResultsView = testLinksPanel.querySelector('#ptnResultsView');
                        const ptnBackButton = testLinksPanel.querySelector('#ptnBackButton');
                        
                        if (ptnSearchInput && ptnSearchButton) {
                            // PTN search function - Display results inline
                            async function performPTNSearch() {
                                const searchTerm = ptnSearchInput.value.trim();
                                
                                if (!searchTerm) {
                                    alert('PTN or PTN Caption');
                                    return;
                                }
                                
                                ptnSearchButton.textContent = 'Searching...';
                                ptnSearchButton.disabled = true;
                                
                                try {
                                    // Load PTN data
                                    const ptnData = await loadPTNDataFromCSV();
                                    
                                    // Check if search term is a number (PTN ID)
                                    const isNumericSearch = /^\d+$/.test(searchTerm);
                                    
                                    let results;
                                    
                                    if (isNumericSearch) {
                                        // If searching by ID (numeric), filter by PTN number
                                        results = ptnData.filter(item => 
                                            item.ptn === searchTerm && 
                                            item.active === 'TRUE' && 
                                            item.stockMessage.includes('In Stock')
                                        );
                                    } else {
                                        // If searching by name, search by caption
                                        const searchLower = searchTerm.toLowerCase();
                                        results = ptnData.filter(item => 
                                            item.caption.toLowerCase().includes(searchLower) &&
                                            item.active === 'TRUE' && 
                                            item.stockMessage.includes('In Stock')
                                        );
                                    }
                                    
                                    // Display results (this will hide search panel and nav links)
                                    displayPTNSearchResults(results, searchTerm, ptnSearchPanel, navLinksCard, ptnResultsView);
                                    
                                    // Clear input
                                    ptnSearchInput.value = '';
                                    
                                } catch (error) {
                                    console.error('PTN search error:', error);
                                    alert('Search error, please try again');
                                } finally {
                                    ptnSearchButton.textContent = 'Search';
                                    ptnSearchButton.disabled = false;
                                }
                            }
                            
                            // Bind search button
                            ptnSearchButton.addEventListener('click', performPTNSearch);
                            
                            // Bind Enter key
                            ptnSearchInput.addEventListener('keypress', (e) => {
                                if (e.key === 'Enter') {
                                    performPTNSearch();
                                }
                            });
                            
                            // Bind back button
                            if (ptnBackButton) {
                                ptnBackButton.addEventListener('click', () => {
                                    showPTNSearchPanel(ptnSearchPanel, navLinksCard, ptnResultsView);
                                });
                            }
                            
                            console.log('✓ PTN Search event listeners added');
                        }
                    } else {
                        // Hide panel
                        testLinksPanel.style.display = 'none';
                        testLinksBtn.textContent = 'Test Links';
                        
                        // Show Product Info card when Test Links panel is hidden
                        const productInfoCard = content.querySelector('#floating-product-info-card');
                        if (productInfoCard) {
                            productInfoCard.style.display = 'block';
                        }
                    }
                });
                
                console.log('✓ Test Links button event listener added');
            }
            
            // Add debug button event listener
            const debugBtn = content.querySelector('#cp-debug-btn');
            if (debugBtn) {
                debugBtn.addEventListener('click', () => {
                    console.log('=== DEBUG PAGE DATA STRUCTURES ===');
                    console.log('Current URL:', window.location.href);
                    
                    // Test productDetail.getCurrDesignObject() method first
                    console.log('=== 🎯 TESTING productDetail.getCurrDesignObject() ===');
                    if (window.productDetail && typeof window.productDetail.getCurrDesignObject === 'function') {
                        console.log('✅ productDetail.getCurrDesignObject() method exists');
                        try {
                            const currDesignObject = window.productDetail.getCurrDesignObject();
                            console.log('🎉 Current design object:', currDesignObject);
                            
                            if (currDesignObject && typeof currDesignObject === 'object') {
                                console.log('Object type:', typeof currDesignObject);
                                console.log('Object keys:', Object.keys(currDesignObject));
                                console.log('cp_product_id:', currDesignObject.cp_product_id);
                                console.log('cp_product_type_no:', currDesignObject.cp_product_type_no);
                                
                                if (currDesignObject.cp_product_type_no !== undefined) {
                                    console.log('🎉 SUCCESS! Found cp_product_type_no via getCurrDesignObject():', currDesignObject.cp_product_type_no);
                                } else {
                                    console.log('❌ cp_product_type_no not found in current design object');
                                }
                            } else {
                                console.log('❌ getCurrDesignObject() returned invalid object');
                            }
                        } catch (e) {
                            console.log('❌ Error calling getCurrDesignObject():', e);
                        }
                    } else {
                        console.log('❌ productDetail.getCurrDesignObject() method not available');
                        console.log('productDetail exists:', !!window.productDetail);
                        if (window.productDetail) {
                            console.log('productDetail methods:', Object.getOwnPropertyNames(window.productDetail).filter(prop => typeof window.productDetail[prop] === 'function'));
                        }
                    }
                    
                    // Extract IDs from current page at the beginning for use throughout debug
                    const debugUrl3 = window.location.href;
                    const debugCpMatch3 = debugUrl3.match(/,(\d{6,})/);
                    const testCpProductId2 = debugCpMatch3 ? debugCpMatch3[1] : null;
                    
                    // Extract designId from images
                    let testDesignId2 = null;
                    const images = document.querySelectorAll('img');
                    for (const img of images) {
                        const src = img.getAttribute('src') || '';
                        const ref = img.getAttribute('ref') || '';
                        const urlToCheck = src + ' ' + ref;
                        const debugDesignMatch2 = urlToCheck.match(/\/designs\/(\d+)/);
                        if (debugDesignMatch2) {
                            testDesignId2 = debugDesignMatch2[1];
                            break;
                        }
                    }
                    
                    // Define testDesignId for use throughout debug
                    const testDesignId = testDesignId2;
                    const testCpProductId = testCpProductId2;
                    
                    // Now that variables are defined, do the detailed analysis
                    // Look for product_options or similar objects
                    const candidateObjects = [
                        { name: 'window.product_options', obj: window.product_options },
                        { name: 'window.productDetail?.options', obj: window.productDetail?.options }
                    ];
                    
                    candidateObjects.forEach(({name, obj}) => {
                        if (obj && typeof obj === 'object') {
                            console.log(`\n--- Analyzing ${name} ---`);
                            console.log('Object keys:', Object.keys(obj));
                            
                            const designsObj = obj.product_designs || obj.product_design_objects;
                            if (designsObj) {
                                console.log(`${name} has design objects:`, designsObj);
                                console.log(`Design object keys:`, Object.keys(designsObj));
                                
                                // Check each design object
                                Object.entries(designsObj).forEach(([key, design]) => {
                                    console.log(`\n  Design Key: ${key}`);
                                    console.log(`  Design Object:`, design);
                                    
                                    if (design && typeof design === 'object') {
                                        console.log(`  Design Object Properties:`);
                                        Object.entries(design).forEach(([prop, val]) => {
                                            console.log(`    ${prop}: ${val} (${typeof val})`);
                                            
                                            // Check if this property matches our designId
                                            if (val && val.toString() === testDesignId) {
                                                console.log(`    ✓ MATCH! ${prop} matches designId`);
                                            }
                                        });
                                        
                                        // Look for product type fields specifically
                                        if (design.product_type_no !== undefined) {
                                            console.log(`    ✓ Found product_type_no: ${design.product_type_no}`);
                                        }
                                    }
                                });
                                
                                // Test our helper function with both keys
                                console.log(`\n--- Testing Helper Function with ${name} ---`);
                                console.log(`Testing with designId: ${testDesignId}`);
                                const result1 = extractCpFieldsFromDesigns(designsObj, testDesignId, `[DEBUG-${name}-DesignId]`);
                                console.log(`Helper function result (designId):`, result1);
                                
                                // Also test with cpProductId if available
                                if (testCpProductId && testCpProductId !== testDesignId) {
                                    console.log(`Testing with cpProductId: ${testCpProductId}`);
                                    const result2 = extractCpFieldsFromDesigns(designsObj, testCpProductId, `[DEBUG-${name}-CPProductId]`);
                                    console.log(`Helper function result (cpProductId):`, result2);
                                }
                            } else {
                                console.log(`${name} has no design objects`);
                            }
                        }
                    });
                    
                    // Test with any found design objects from productKeys
                    if (productKeys.length > 0) {
                        for (const key of productKeys) {
                            try {
                                const value = window[key];
                                if (value && typeof value === 'object') {
                                    const designsObject = value.product_designs || value.product_design_objects;
                                    if (designsObject) {
                                        console.log(`\n--- Testing ${key} ---`);
                                        console.log(`${key} design object:`, designsObject);
                                        const result = extractCpFieldsFromDesigns(designsObject, testDesignId, `[TEST-${key}]`);
                                        console.log(`Helper function result for ${key}:`, result);
                                    }
                                }
                            } catch (e) {
                                console.log(`Error testing with ${key}:`, e.message);
                            }
                        }
                    }
                    
                    // Check for common product data structures
                    console.log('=== CHECKING COMMON OBJECTS ===');
                    
                    // Direct window property checks
                    const checks = [
                        { name: 'product_options', value: window.product_options },
                        { name: 'productDetail', value: window.productDetail },
                        { name: 'productDetail.options', value: window.productDetail?.options },
                        { name: 'ProductDetail', value: window.ProductDetail },
                        { name: 'productData', value: window.productData },
                        { name: 'product', value: window.product },
                        { name: 'productInfo', value: window.productInfo },
                        { name: 'pageData', value: window.pageData },
                        { name: 'appData', value: window.appData }
                    ];
                    
                    checks.forEach(({name, value}) => {
                        if (value && typeof value === 'object') {
                            console.log(`✓ FOUND window.${name}:`, value);
                            console.log(`   Keys: [${Object.keys(value).join(', ')}]`);
                            console.log(`   Size: ${JSON.stringify(value).length} chars`);
                            
                            // If this is productDetail, also check its options
                            if (name === 'productDetail' && value.options) {
                                console.log(`   productDetail.options:`, value.options);
                                console.log(`   options keys: [${Object.keys(value.options).join(', ')}]`);
                            }
                        } else {
                            console.log(`✗ window.${name}: ${typeof value} (${value})`);
                        }
                    });
                    
                    // Search all window properties for product-related objects
                    console.log('=== SEARCHING WINDOW PROPERTIES ===');
                    const windowKeys = Object.keys(window);
                    const productKeys = windowKeys.filter(key => 
                        key.toLowerCase().includes('product') ||
                        key.toLowerCase().includes('detail') ||
                        key.toLowerCase().includes('data') ||
                        key.toLowerCase().includes('config') ||
                        key.toLowerCase().includes('options')
                    );
                    
                    console.log('Product-related window keys:', productKeys);
                    productKeys.forEach(key => {
                        try {
                            const value = window[key];
                            if (value && typeof value === 'object') {
                                console.log(`WINDOW.${key}:`, value);
                                console.log(`   Type: ${typeof value}, Keys: [${Object.keys(value).slice(0,10).join(', ')}${Object.keys(value).length > 10 ? '...' : ''}]`);
                            }
                        } catch (e) {
                            console.log(`Error accessing window.${key}:`, e.message);
                        }
                    });
                    
                    // Search script tags for JSON data
                    console.log('=== SEARCHING SCRIPT TAGS ===');
                    const scripts = document.querySelectorAll('script');
                    let foundData = false;
                    
                    scripts.forEach((script, index) => {
                        const content = script.textContent || script.innerHTML;
                        if (content && (
                            content.includes('product') || 
                            content.includes('category_id') ||
                            content.includes('cp_product_id') ||
                            content.includes('design')
                        )) {
                            console.log(`Script ${index} contains product data:`, content.substring(0, 500) + '...');
                            
                            // Try to extract JSON objects
                            const jsonMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                            if (jsonMatches) {
                                jsonMatches.forEach((match, i) => {
                                    try {
                                        const parsed = JSON.parse(match);
                                        if (parsed && typeof parsed === 'object') {
                                            console.log(`   JSON ${i}:`, parsed);
                                        }
                                    } catch (e) {
                                        // Ignore invalid JSON
                                    }
                                });
                            }
                            foundData = true;
                        }
                    });
                    
                    if (!foundData) {
                        console.log('No product-related data found in script tags');
                    }
                    
                    // Check for React/Vue component data
                    console.log('=== CHECKING FRAMEWORK DATA ===');
                    const reactKeys = windowKeys.filter(key => key.startsWith('__REACT') || key.startsWith('__VUE'));
                    console.log('Framework keys:', reactKeys);
                    
                    // Test URL extraction
                    console.log('=== TESTING URL EXTRACTION ===');
                    const debugUrl = window.location.href;
                    console.log('Current URL:', debugUrl);
                    
                    const debugCpRegex = /,(\d+)/;
                    const debugCpMatch = debugUrl.match(debugCpRegex);
                    
                    if (debugCpMatch) {
                        console.log('✓ CP Product ID found in URL:', debugCpMatch[1]);
                    } else {
                        console.log('❌ CP Product ID not found in URL');
                    }
                    
                    // Test with specific focus on product_designs/product_design_objects (moved after variable declarations)
                    console.log('=== DETAILED DESIGN OBJECT ANALYSIS ===');
                    
                    // DIRECT TEST: Check product_design_objects[designId].cp_product_id
                    console.log('=== 🎯 DIRECT TEST: product_design_objects[designId].cp_product_id ===');
                    console.log('Using designId:', testDesignId2);
                    console.log('Using cpProductId:', testCpProductId2);
                    
                    // Show both key values for comparison
                    console.log('=== KEY COMPARISON ===');
                    console.log('designId (from URL designs):', testDesignId2);
                    console.log('cpProductId (from URL comma):', testCpProductId2);
                    console.log('These values are different:', testDesignId2 !== testCpProductId2);
                    
                    // Check product_options first
                    if (window.product_options && window.product_options.product_design_objects) {
                        const designObjects = window.product_options.product_design_objects;
                        console.log('✓ Found product_options.product_design_objects:', designObjects);
                        console.log('Available keys:', Object.keys(designObjects));
                        
                        // Test with designId
                        if (testDesignId2) {
                            console.log(`Testing designObjects[${testDesignId2}]:`, designObjects[testDesignId2]);
                            if (designObjects[testDesignId2]) {
                                const obj = designObjects[testDesignId2];
                                console.log(`✓ Found object for designId ${testDesignId2}:`, obj);
                            } else {
                                console.log(`❌ No object found for designId ${testDesignId2}`);
                            }
                        }
                        
                        // Test with cpProductId
                        if (testCpProductId2 && testCpProductId2 !== testDesignId2) {
                            console.log(`Testing designObjects[${testCpProductId2}]:`, designObjects[testCpProductId2]);
                            if (designObjects[testCpProductId2]) {
                                const obj = designObjects[testCpProductId2];
                                console.log(`✓ Found object for cpProductId ${testCpProductId2}:`, obj);
                            } else {
                                console.log(`❌ No object found for cpProductId ${testCpProductId2}`);
                            }
                        }
                        
                        // Show all objects to see their structure
                        console.log('=== ALL DESIGN OBJECTS STRUCTURE ===');
                        Object.entries(designObjects).forEach(([key, obj]) => {
                            console.log(`Key: ${key}`);
                            console.log(`Object:`, obj);
                            if (obj && typeof obj === 'object') {
                                console.log(`  Fields: ${Object.keys(obj).join(', ')}`);
                                if (obj.product_type_no !== undefined) {
                                    console.log(`  🎯 product_type_no: ${obj.product_type_no}`);
                                }
                                if (obj.id !== undefined) {
                                    console.log(`  🔍 id: ${obj.id}`);
                                }
                            }
                            console.log('---');
                        });
                        
                    } else {
                        console.log('❌ product_options.product_design_objects not found');
                        console.log('window.product_options:', window.product_options);
                    }
                    
                    // Also check product_designs
                    if (window.product_options && window.product_options.product_designs) {
                        const designObjects = window.product_options.product_designs;
                        console.log('✓ Found product_options.product_designs:', designObjects);
                        console.log('Available keys:', Object.keys(designObjects));
                        
                        // Show structure
                        Object.entries(designObjects).forEach(([key, obj]) => {
                            console.log(`Design Key: ${key}`);
                            console.log(`Design Object:`, obj);
                            if (obj && typeof obj === 'object') {
                                console.log(`  Fields: ${Object.keys(obj).join(', ')}`);
                                if (obj.product_type_no !== undefined) {
                                    console.log(`  🎯 product_type_no: ${obj.product_type_no}`);
                                }
                                if (obj.id !== undefined) {
                                    console.log(`  🔍 id: ${obj.id}`);
                                }
                            }
                        });
                    }
                    
                    console.log('=== DEBUG COMPLETE ===');
                    showToastNotification('🔍 Debug完成！请查看控制台 (F12)', 'info');
                });
                
                debugBtn.addEventListener('mouseenter', () => {
                    debugBtn.style.backgroundColor = 'rgba(255,165,0,0.8)';
                });
                debugBtn.addEventListener('mouseleave', () => {
                    debugBtn.style.backgroundColor = 'rgba(255,165,0,0.6)';
                });
            }
        });
    }
    
    // Mock order data for demonstration
    function getMockOrderData(orderId) {
        const mockOrders = {
            '12345': {
                orderId: '12345',
                customerName: 'John Doe',
                email: 'john.doe@example.com',
                orderDate: '2024-01-15',
                status: 'Shipped',
                totalAmount: '$29.99',
                shippingAddress: '123 Main St, New York, NY 10001',
                items: [
                    { 
                        itemNumber: '51334364400',
                        totalPrice: '$14.84',
                        designId: '100861886004',
                        quantity: '1',
                        unitPrice: '$14.84'
                    },
                    { 
                        itemNumber: '51334364401',
                        totalPrice: '$14.84',
                        designId: '100861886005',
                        quantity: '1',
                        unitPrice: '$14.84'
                    },
                    { 
                        itemNumber: '51334364402',
                        totalPrice: '$29.68',
                        designId: '100861886006',
                        quantity: '2',
                        unitPrice: '$14.84'
                    }
                ],
                shipTo: 'Joey zhou\n23801 Calabasas Rd Ste 2005\nCalabasas, CA  91302-3320\nUnited States',
                shipMethod: 'Standard (2-5 business days)'
            },
            '67890': {
                orderId: '67890',
                customerName: 'Jane Smith',
                email: 'jane.smith@example.com',
                orderDate: '2024-01-14',
                status: 'Processing',
                totalAmount: '$45.50',
                shippingAddress: '456 Oak Ave, Los Angeles, CA 90210',
                items: [
                    { name: 'Hoodie', quantity: 1, price: '$35.50' },
                    { name: 'Sticker Pack', quantity: 2, price: '$5.00' }
                ]
            },
            '11111': {
                orderId: '11111',
                customerName: 'Bob Johnson',
                email: 'bob.johnson@example.com',
                orderDate: '2024-01-13',
                status: 'Delivered',
                totalAmount: '$15.99',
                shippingAddress: '789 Pine St, Chicago, IL 60601',
                items: [
                    { name: 'Phone Case', quantity: 1, price: '$15.99' }
                ]
            }
        };
        
        return mockOrders[orderId] || null;
    }
    
    // Create search panel HTML
    // Toast notification function
    function showToastNotification(message, type = 'info') {
        // Remove existing toast if any
        const existingToast = document.getElementById('cp-toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.id = 'cp-toast-notification';
        toast.textContent = message;
        
        // Set color based on type
        let bgColor = 'rgba(33, 150, 243, 0.95)'; // info - blue
        if (type === 'success') bgColor = 'rgba(76, 175, 80, 0.95)'; // green
        if (type === 'error') bgColor = 'rgba(244, 67, 54, 0.95)'; // red
        if (type === 'warning') bgColor = 'rgba(255, 152, 0, 0.95)'; // orange
        
        // Get floating window position and width
        const floatingWindow = document.getElementById('cp-floating-window');
        let rightPosition = '20px';
        
        if (floatingWindow) {
            const rect = floatingWindow.getBoundingClientRect();
            // Align with the floating window's right edge (with same padding as content)
            rightPosition = `${window.innerWidth - rect.right + 10}px`;
        }
        
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: ${rightPosition};
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(255,255,255,0.1);
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            animation: slideInDown 0.3s ease-out;
        `;
        
        // Add animation keyframes
        if (!document.getElementById('cp-toast-style')) {
            const style = document.createElement('style');
            style.id = 'cp-toast-style';
            style.textContent = `
                @keyframes slideInDown {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutUp {
                    from {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutUp 0.3s ease-out';
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }
    
    // Detect current environment from URL
    function detectEnvironment() {
        return CONFIG.detectEnvironment(window.location.hostname);
    }
    
    // Get Admin API base URL based on environment (using unified config)
    function getAdminApiUrl(environment) {
        return CONFIG.getAdminBaseUrl(environment);
    }
    
    // Approve image function
    async function approveImage(imageId) {
        console.log('🔍 Approving image:', imageId);
        
        // Use Pre environment (will switch to Live when deployed)
        const environment = detectEnvironment();
        const detectedBranch = CONFIG.autoDetectBranch() || CONFIG.BRANCH.CURRENT;
        console.log('Current environment:', environment);
        console.log('Current branch:', detectedBranch);
        
        const response = await chrome.runtime.sendMessage({
            type: 'APPROVE_BLOCK_IMAGE',
            imageId: imageId,
            action: 'approve',
            environment: environment,
            branch: detectedBranch
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to approve image');
        }
        
        console.log('✅ Image approved successfully:', imageId);
        return response;
    }
    
    // Block image function
    async function blockImage(imageId) {
        console.log('🔍 Blocking image:', imageId);
        
        // Use Pre environment (will switch to Live when deployed)
        const environment = detectEnvironment();
        const detectedBranch = CONFIG.autoDetectBranch() || CONFIG.BRANCH.CURRENT;
        console.log('Current environment:', environment);
        console.log('Current branch:', detectedBranch);
        
        const response = await chrome.runtime.sendMessage({
            type: 'APPROVE_BLOCK_IMAGE',
            imageId: imageId,
            action: 'block',
            environment: environment,
            branch: detectedBranch
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to block image');
        }
        
        console.log('🚫 Image blocked successfully:', imageId);
        return response;
    }
    
    function createSearchPanel() {
        // Check if panel is expanded (default: true)
        const isExpanded = localStorage.getItem('cp-panel-expanded') !== 'false';
        
        return `
            <!-- Search Panel -->
            <div id="cp-function-panel" style="
                margin-bottom: 10px;
                padding: 0;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <!-- Order Search Panel (Always visible) -->
                <div style="display: flex; gap: 8px; align-items: center; padding: 6px;">
                    <div style="position: relative; display: flex; align-items: center;">
                        <input 
                            type="text" 
                            id="floating-order-id-input" 
                            placeholder="Enter Order ID"
                            maxlength="11"
                            autocomplete="off"
                            style="
                                width: 120px;
                                padding: 8px 28px 8px 12px;
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
                        <button
                            id="floating-clear-btn"
                            style="
                                position: absolute;
                                right: 4px;
                                background: transparent;
                                border: none;
                                color: rgba(255, 255, 255, 0.6);
                                cursor: pointer;
                                font-size: 16px;
                                line-height: 1;
                                padding: 4px 6px;
                                border-radius: 50%;
                                display: none;
                                transition: all 0.2s ease;
                            "
                            title="Clear"
                        >×</button>
                    </div>
                    <style>
                        #floating-order-id-input::placeholder {
                            color: rgba(255, 255, 255, 0.6);
                            opacity: 1;
                        }
                        #floating-clear-btn:hover {
                            background: rgba(255, 255, 255, 0.1);
                            color: rgba(255, 255, 255, 0.9);
                        }
                    </style>
                    <button 
                        id="floating-search-btn"
                        style="
                            background: #ffeb3b;
                            color: #333;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                        "
                    >Search</button>
                    <button 
                        id="floating-cancel-order-btn"
                        style="
                            background: #ff5722;
                            color: #fff;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                        "
                    >Cancel Order</button>
                </div>
                
                <!-- Collapsible Panels Container -->
                <div id="cp-collapsible-panels" style="
                    max-height: ${isExpanded ? '500px' : '0'};
                    overflow: hidden;
                    transition: max-height 0.3s ease-in-out;
                ">
                    <!-- Store Search Panel -->
                    <div style="
                        display: flex; 
                        gap: 8px; 
                        align-items: center; 
                        padding: 6px;
                        border-top: 1px solid rgba(255,255,255,0.1);
                    ">
                    <div style="position: relative; display: flex; align-items: center;">
                        <input 
                            type="email" 
                            id="floating-store-email-input" 
                            placeholder="Enter Email"
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            style="
                                width: 120px;
                                padding: 8px 28px 8px 12px;
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
                        <button
                            id="floating-store-email-clear-btn"
                            style="
                                position: absolute;
                                right: 4px;
                                background: transparent;
                                border: none;
                                color: rgba(255, 255, 255, 0.6);
                                cursor: pointer;
                                font-size: 16px;
                                line-height: 1;
                                padding: 4px 6px;
                                border-radius: 50%;
                                display: none;
                                transition: all 0.2s ease;
                            "
                            title="Clear"
                        >×</button>
                    </div>
                    <div style="position: relative; display: flex; align-items: center;">
                        <input 
                            type="text" 
                            id="floating-store-customer-id-input" 
                            placeholder="SW Customer ID"
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            style="
                                width: 100px;
                                padding: 8px 28px 8px 12px;
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
                        <button
                            id="floating-store-customer-id-clear-btn"
                            style="
                                position: absolute;
                                right: 4px;
                                background: transparent;
                                border: none;
                                color: rgba(255, 255, 255, 0.6);
                                cursor: pointer;
                                font-size: 16px;
                                line-height: 1;
                                padding: 4px 6px;
                                border-radius: 50%;
                                display: none;
                                transition: all 0.2s ease;
                            "
                            title="Clear"
                        >×</button>
                    </div>
                    <style>
                        #floating-store-email-input::placeholder,
                        #floating-store-customer-id-input::placeholder {
                            color: rgba(255, 255, 255, 0.6);
                            opacity: 1;
                        }
                        #floating-store-email-clear-btn:hover,
                        #floating-store-customer-id-clear-btn:hover {
                            background: rgba(255, 255, 255, 0.1);
                            color: rgba(255, 255, 255, 0.9);
                        }
                    </style>
                    <button 
                        id="floating-search-store-btn"
                        style="
                            background: #9c27b0;
                            color: #fff;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                        "
                    >Search Store</button>
                </div>
                
                <!-- Image Approval Panel -->
                <div style="
                    display: flex; 
                    gap: 8px; 
                    align-items: center; 
                    padding: 6px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                ">
                    <div style="position: relative; display: flex; align-items: center;">
                        <input 
                            type="text" 
                            id="floating-image-id-input" 
                            placeholder="Enter Image ID"
                            autocomplete="off"
                            style="
                                width: 120px;
                                padding: 8px 28px 8px 12px;
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
                        <button
                            id="floating-image-clear-btn"
                            style="
                                position: absolute;
                                right: 4px;
                                background: transparent;
                                border: none;
                                color: rgba(255, 255, 255, 0.6);
                                cursor: pointer;
                                font-size: 16px;
                                line-height: 1;
                                padding: 4px 6px;
                                border-radius: 50%;
                                display: none;
                                transition: all 0.2s ease;
                            "
                            title="Clear"
                        >×</button>
                    </div>
                    <style>
                        #floating-image-id-input::placeholder {
                            color: rgba(255, 255, 255, 0.6);
                            opacity: 1;
                        }
                        #floating-image-clear-btn:hover {
                            background: rgba(255, 255, 255, 0.1);
                            color: rgba(255, 255, 255, 0.9);
                        }
                    </style>
                    <button 
                        id="floating-approve-btn"
                        style="
                            background: #4caf50;
                            color: #fff;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                        "
                    >Approve</button>
                    <button 
                        id="floating-block-btn"
                        style="
                            background: #f44336;
                            color: #fff;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                        "
                    >Block</button>
                </div>
                
                <!-- Gen PromoCode Button and Code Display -->
                <div style="
                    padding: 6px 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <button 
                        id="floating-gen-promocode-btn"
                        style="
                            background: #ff9800;
                            color: #fff;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                            flex-shrink: 0;
                        "
                    >Gen PromoCode</button>
                    <div 
                        id="pc-code-display"
                        style="
                            display: none;
                            color: #ffeb3b;
                            font-size: 11px;
                            font-weight: bold;
                            font-family: monospace;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            flex: 1;
                        "
                    ></div>
                </div>
                
                <!-- Gen Giftcerts Button and Code Display -->
                <div style="
                    padding: 6px 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <button 
                        id="floating-gen-giftcerts-btn"
                        style="
                            background: #9c27b0;
                            color: #fff;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                            flex-shrink: 0;
                        "
                    >Gen Giftcerts</button>
                    <div 
                        id="gc-code-display"
                        style="
                            display: none;
                            color: #ffeb3b;
                            font-size: 11px;
                            font-weight: bold;
                            font-family: monospace;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            flex: 1;
                        "
                    ></div>
                </div>
                </div>
                
                <!-- Test Links Button -->
                <div style="
                    padding: 6px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: center;
                ">
                    <button 
                        id="floating-test-links-btn"
                        style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: #fff;
                            border: none;
                            padding: 8px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                            width: 100%;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            display: block;
                            box-sizing: border-box;
                        "
                    >Test Links</button>
                </div>
                
                <!-- Test Links Panel (hidden by default) -->
                <div id="floating-test-links-panel" style="display: none;"></div>
                
                <!-- Toggle Button -->
                <div style="
                    padding: 4px 6px;
                    border-top: 1px solid rgba(255,255,255,0.0);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    transition: background 0.2s ease;
                " id="cp-panel-toggle-btn" title="${isExpanded ? 'Collapse' : 'Expand'}">
                    <span style="
                        color: rgba(255,255,255,0.7);
                        font-size: 11px;
                        font-weight: 500;
                        user-select: none;
                    ">${isExpanded ? '▲ Collapse' : '▼ Expand'}</span>
                </div>
            </div>
            <div id="floating-order-detail" style="display: none;"></div>
            <div id="floating-product-info"></div>
        `;
    }
    
    // Display store search results in floating window
    function displayStoreSearchResults(storesData) {
        const orderDetailDiv = document.getElementById('floating-order-detail');
        const productInfoDiv = document.getElementById('floating-product-info');
        
        if (!orderDetailDiv) return;
        
        // Hide product info, show order detail area for store results
        if (productInfoDiv) productInfoDiv.style.display = 'none';
        orderDetailDiv.style.display = 'block';
        
        // Group stores by email
        const storesByEmail = {};
        storesData.forEach(store => {
            if (!storesByEmail[store.email]) {
                storesByEmail[store.email] = [];
            }
            storesByEmail[store.email].push(store);
        });
        
        let html = '<div style="padding: 10px;">';
        
        // Create a card for each email
        Object.keys(storesByEmail).forEach(email => {
            const stores = storesByEmail[email];
            
            html += `
                <div style="
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                ">
                    <!-- Email Header -->
                    <div style="
                        margin-bottom: 16px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    ">
                        <div style="
                            color: #ffeb3b;
                            font-size: 14px;
                            font-weight: bold;
                            margin-bottom: 4px;
                        ">${email}</div>
                        <div style="
                            color: rgba(255, 255, 255, 0.6);
                            font-size: 11px;
                        ">${stores.length} store${stores.length > 1 ? 's' : ''} found</div>
                    </div>
                    
                    <!-- Stores List - Vertical Layout -->
                    <div>
            `;
            
            stores.forEach((store, storeIndex) => {
                html += `
                    <div style="
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: ${storeIndex < stores.length - 1 ? '10px' : '0'};
                    ">
                        <!-- Store Name -->
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                            margin-bottom: 8px;
                            padding-bottom: 8px;
                            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                        ">
                            <span style="
                                color: rgba(255, 255, 255, 0.7);
                                font-size: 11px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            ">Store Name:</span>
                            <span style="
                                color: #fff;
                                font-size: 13px;
                                font-weight: 600;
                            ">${store.storeName || 'N/A'}</span>
                        </div>
                        
                        <!-- Store ID -->
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 6px;
                        ">
                            <span style="
                                color: rgba(255, 255, 255, 0.6);
                                font-size: 11px;
                            ">Store ID:</span>
                            <span style="
                                color: rgba(255, 255, 255, 0.9);
                                font-size: 12px;
                            ">${store.storeId || 'N/A'}</span>
                        </div>
                        
                        <!-- CP Member No -->
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 6px;
                        ">
                            <span style="
                                color: rgba(255, 255, 255, 0.6);
                                font-size: 11px;
                            ">CP Member No:</span>
                            <span style="
                                color: rgba(255, 255, 255, 0.9);
                                font-size: 12px;
                            ">${store.cpMemberNo || 'N/A'}</span>
                        </div>
                        
                        <!-- SW Customer ID -->
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <span style="
                                color: rgba(255, 255, 255, 0.6);
                                font-size: 11px;
                            ">SW Customer ID:</span>
                            <span style="
                                color: rgba(255, 255, 255, 0.9);
                                font-size: 12px;
                            ">${store.swCustomerId || 'N/A'}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        orderDetailDiv.innerHTML = html;
    }
    
    // Display order details in floating window
    function displayOrderDetails(orderData) {
        const orderDetailDiv = document.getElementById('floating-order-detail');
        const productInfoDiv = document.getElementById('floating-product-info');
        
        if (!orderDetailDiv) return;
        
        // Hide product info when showing order details
        if (productInfoDiv) {
            productInfoDiv.style.display = 'none';
        }
        
        if (!orderData) {
            orderDetailDiv.innerHTML = `
                <div style="
                    margin-bottom: 15px;
                    padding: 15px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.2);
                    min-height: 500px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="color: #fff; text-align: center; font-weight: bold;">
                        Order not found
                    </div>
                </div>
            `;
            orderDetailDiv.style.display = 'block';
            return;
        }
        
        let itemsHtml = '';
        orderData.items.forEach((item, index) => {
            itemsHtml += `
                <div style="
                    padding: ${index > 0 ? '8px 0 4px 0' : '4px 0'};
                    ${index > 0 ? 'border-top: 1px solid rgba(255,255,255,0.1);' : ''}
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                margin-bottom: 4px;
                    ">
                        <span style="color: #fff; font-size: 13px; font-weight: bold;">${item.itemNumber}</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 13px;">${item.totalPrice}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        padding: 2px 0;
                    ">
                        <span style="color: rgba(255,255,255,0.8); font-size: 11px;">Design:</span>
                        <span style="color: rgba(255,255,255,0.8); font-size: 11px; text-align: right;">${item.designId}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        padding: 2px 0;
                    ">
                        <span style="color: rgba(255,255,255,0.8); font-size: 11px;">Qty:</span>
                        <span style="color: rgba(255,255,255,0.8); font-size: 11px; text-align: right;">${item.quantity}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        padding: 2px 0;
                    ">
                        <span style="color: rgba(255,255,255,0.8); font-size: 11px;">Unit Price Paid:</span>
                        <span style="color: rgba(255,255,255,0.8); font-size: 11px; text-align: right;">${item.unitPrice}</span>
                    </div>
                </div>
            `;
        });
        
        const statusColor = orderData.status === 'Delivered' ? '#4CAF50' : 
                           orderData.status === 'Shipped' ? '#2196F3' : '#FF9800';
        
        orderDetailDiv.innerHTML = `
            <div>
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 10px;
                    padding: 10px 15px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                ">
                    <div style="
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #ffeb3b;
                        text-align: left;
                    ">Order Summary</div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Order ID:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.orderId}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Customer:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.customerName}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Email:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; word-break: break-all; text-align: right;">${orderData.email}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Order Date:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.orderDate}</span>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Status:</span>
                        <span style="color: ${statusColor}; font-weight: bold; font-size: 11px; text-align: right;">${orderData.status}</span>
                    </div>
                    ${orderData.saleDiscount && orderData.saleDiscount !== 'N/A' ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Sale Discount:</span>
                        <span style="color: #FF9800; font-weight: bold; font-size: 11px; text-align: right;">${orderData.saleDiscount}</span>
                    </div>` : ''}
                    ${orderData.subtotal && orderData.subtotal !== 'N/A' ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Subtotal:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.subtotal}</span>
                    </div>` : ''}
                    ${orderData.shippingHandling && orderData.shippingHandling !== 'N/A' ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">S&H:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.shippingHandling}</span>
                    </div>` : ''}
                    ${orderData.salesTax && orderData.salesTax !== 'N/A' ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Sales Tax:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.salesTax}</span>
                    </div>` : ''}
                    ${orderData.total && orderData.total !== 'N/A' ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">TOTAL:</span>
                        <span style="color: #4CAF50; font-weight: bold; font-size: 11px; text-align: right;">${orderData.total}</span>
                    </div>` : ''}
                    ${orderData.grandTotal && orderData.grandTotal !== 'N/A' ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">GRAND TOTAL:</span>
                        <span style="color: #4CAF50; font-weight: bold; font-size: 12px; text-align: right;">${orderData.grandTotal}</span>
                    </div>` : ''}
                    ${orderData.promoCode && orderData.promoCode !== 'N/A' ? `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Promo Code:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.promoCode}</span>
                    </div>` : ''}
                </div>
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 10px 15px;
                ">
                    <div style="
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #ffeb3b;
                        text-align: left;
                    ">Order Items</div>
                    ${itemsHtml}
                </div>
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                    margin-top: 10px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 10px 15px;
                ">
                    <div style="
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #ffeb3b;
                        text-align: left;
                    ">Ship & Payment</div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                        gap: 10px;
                    ">
                        <div style="color: #fff; font-size: 11px; white-space: nowrap; align-self: flex-start;">Ship To:</div>
                        <div style="color: #ffeb3b; font-weight: bold; font-size: 11px; line-height: 1.5; text-align: right; white-space: pre-line;">${orderData.shipTo || 'N/A'}</div>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 4px 0;
                        margin-top: 4px;
                        gap: 10px;
                    ">
                        <span style="color: #fff; font-size: 11px; white-space: nowrap;">Ship Method:</span>
                        <span style="color: #ffeb3b; font-weight: bold; font-size: 11px; text-align: right;">${orderData.shipMethod || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
        orderDetailDiv.style.display = 'block';
    }
    
    // Search order function for floating window
    // Fetch order data from Admin page via background script
    async function fetchOrderFromAdmin(orderId) {
        console.log('🔍 Content: Requesting order from background script:', orderId);
        
        try {
            // Determine admin base URL based on current environment
            const environment = detectEnvironment();
            const detectedBranch = CONFIG.autoDetectBranch() || CONFIG.BRANCH.CURRENT;
            const originalBranch = CONFIG.BRANCH.CURRENT;
            CONFIG.BRANCH.CURRENT = detectedBranch;
            const adminBaseUrl = CONFIG.getAdminBaseUrl(environment);
            CONFIG.BRANCH.CURRENT = originalBranch;
            
            console.log('Using environment:', environment);
            console.log('Using branch:', detectedBranch);
            console.log('Admin Base URL:', adminBaseUrl);
            
            // Initialize order data
            const orderData = {
                orderId: orderId,
                customerName: 'N/A',
                email: 'N/A',
                orderDate: 'N/A',
                status: 'N/A',
                totalAmount: 'N/A',
                shippingAddress: 'N/A',
                items: [],
                shipTo: null,
                shipMethod: null,
                // New financial fields
                subtotal: 'N/A',
                shippingHandling: 'N/A',
                total: 'N/A',
                salesTax: 'N/A',
                grandTotal: 'N/A',
                promoCode: 'N/A',
                saleDiscount: 'N/A'
            };
            
            // ========== STEP 1: Fetch from order_tab_index.php (Order Date, Status, Customer Name) ==========
            console.log('=== STEP 1: Fetching from order_tab_index.php ===');
            const indexResponse = await chrome.runtime.sendMessage({
                type: 'FETCH_ORDER_FROM_ADMIN',
                orderId: orderId,
                url: `${adminBaseUrl}${CONFIG.API_ENDPOINTS.ORDER_TAB_INDEX}?order_id=${orderId}`
            });
            
            if (indexResponse.success) {
                console.log('✓ Index page HTML received, length:', indexResponse.html.length);
                const parser = new DOMParser();
                const indexDoc = parser.parseFromString(indexResponse.html, 'text/html');
                
                // Extract Order Date, Status, Customer Name from index page
                const allTds = indexDoc.querySelectorAll('td');
                console.log('Found <td> elements in index page:', allTds.length);
            
            for (let i = 0; i < allTds.length; i++) {
                const td = allTds[i];
                const tdText = td.textContent.trim();
                
                // Look for "Order Date:" in current td - exact match
                if (tdText === 'Order Date:' || tdText.toLowerCase() === 'order date:') {
                    console.log('✓ Found "Order Date:" td:', tdText);
                    
                    // Get next td (sibling)
                    const nextTd = td.nextElementSibling;
                    if (nextTd && nextTd.tagName === 'TD') {
                        const dateValue = nextTd.textContent.trim();
                        if (dateValue && dateValue !== '' && dateValue !== 'N/A') {
                            orderData.orderDate = dateValue;
                            console.log('✓ Extracted Order Date:', orderData.orderDate);
                        }
                    }
                }
                
                // Look for "Status:" - must match exactly to avoid false positives
                if (tdText === 'Status:' || tdText.toLowerCase() === 'status:') {
                    console.log('✓ Found "Status:" td:', tdText);
                    const nextTd = td.nextElementSibling;
                    if (nextTd && nextTd.tagName === 'TD') {
                        const statusValue = nextTd.textContent.trim();
                        // Only set if we got a meaningful value
                        if (statusValue && statusValue !== '' && statusValue !== 'N/A') {
                            orderData.status = statusValue;
                            console.log('✓ Extracted Status:', orderData.status);
                        }
                    }
                }
                
                // Look for "Customer:" or "Name:"
                if (tdText.includes('Customer:') || tdText.includes('Name:')) {
                    console.log('✓ Found customer td:', tdText);
                    const nextTd = td.nextElementSibling;
                    if (nextTd && nextTd.tagName === 'TD') {
                        orderData.customerName = nextTd.textContent.trim();
                        console.log('✓ Extracted Customer Name:', orderData.customerName);
                    }
                }
            }
            } else {
                console.log('⚠️ Failed to fetch index page:', indexResponse.error);
            }
            
            // ========== STEP 2: Fetch from order_tab_overview.php (Financial fields & Ship & Payment) ==========
            console.log('=== STEP 2: Fetching from order_tab_overview.php ===');
            const overviewResponse = await chrome.runtime.sendMessage({
                type: 'FETCH_ORDER_FROM_ADMIN',
                orderId: orderId,
                url: `${adminBaseUrl}${CONFIG.API_ENDPOINTS.ORDER_TAB_OVERVIEW}?order_id=${orderId}`
            });
            
            if (overviewResponse.success) {
                console.log('✓ Overview page HTML received, length:', overviewResponse.html.length);
                const overviewParser = new DOMParser();
                const overviewDoc = overviewParser.parseFromString(overviewResponse.html, 'text/html');
                
                // Extract financial fields and Ship & Payment from overview page
                const overviewTds = overviewDoc.querySelectorAll('td');
                console.log('Found <td> elements in overview page:', overviewTds.length);
            
            // Extract financial fields from overview page
            console.log('=== DEBUG: Extracting financial fields from overview ===');
            
            // Look for Subtotal (label in previous td)
            overviewTds.forEach((td, idx) => {
                const tdText = td.textContent.trim();
                
                if (tdText === 'Subtotal:' || tdText.toLowerCase() === 'subtotal:') {
                    console.log('✓ Found "Subtotal:" td');
                    // Look for next td with class "c2 tar" and colspan="2"
                    const nextTd = overviewTds[idx + 1];
                    console.log('DEBUG: Next td after Subtotal:', nextTd);
                    if (nextTd) {
                        console.log('DEBUG: Next td classes:', nextTd.className);
                        console.log('DEBUG: Next td colspan:', nextTd.getAttribute('colspan'));
                        console.log('DEBUG: Next td text:', nextTd.textContent.trim());
                        
                        // Relaxed condition: just check if next td exists and has content
                        const value = nextTd.textContent.trim();
                        if (value && value !== '' && value !== 'N/A') {
                            orderData.subtotal = value;
                            console.log('✓ Extracted Subtotal:', orderData.subtotal);
                        }
                    }
                }
                
                if (tdText === 'S&H:' || tdText.toLowerCase() === 's&h:') {
                    console.log('✓ Found "S&H:" td');
                    const nextTd = overviewTds[idx + 1];
                    if (nextTd) {
                        const value = nextTd.textContent.trim();
                        if (value && value !== '' && value !== 'N/A') {
                            orderData.shippingHandling = value;
                            console.log('✓ Extracted S&H:', orderData.shippingHandling);
                        }
                    }
                }
                
                if (tdText === 'TOTAL:' || tdText.toLowerCase() === 'total:') {
                    console.log('✓ Found "TOTAL:" td');
                    const nextTd = overviewTds[idx + 1];
                    if (nextTd) {
                        const value = nextTd.textContent.trim();
                        if (value && value !== '' && value !== 'N/A') {
                            orderData.total = value;
                            console.log('✓ Extracted TOTAL:', orderData.total);
                        }
                    }
                }
                
                if (tdText === 'Sales Tax:' || tdText.toLowerCase() === 'sales tax:') {
                    console.log('✓ Found "Sales Tax:" td');
                    const nextTd = overviewTds[idx + 1];
                    if (nextTd) {
                        const value = nextTd.textContent.trim();
                        if (value && value !== '' && value !== 'N/A') {
                            orderData.salesTax = value;
                            console.log('✓ Extracted Sales Tax:', orderData.salesTax);
                        }
                    }
                }
                
                if (tdText === 'GRAND TOTAL:' || tdText.toLowerCase() === 'grand total:') {
                    console.log('✓ Found "GRAND TOTAL:" td');
                    const nextTd = overviewTds[idx + 1];
                    if (nextTd) {
                        const value = nextTd.textContent.trim();
                        if (value && value !== '' && value !== 'N/A') {
                            orderData.grandTotal = value;
                            console.log('✓ Extracted GRAND TOTAL:', orderData.grandTotal);
                        }
                    }
                }
                
                if (tdText === 'Promo Code:' || tdText.toLowerCase() === 'promo code:') {
                    console.log('✓ Found "Promo Code:" td');
                    const nextTd = overviewTds[idx + 1];
                    if (nextTd) {
                        const value = nextTd.textContent.trim();
                        if (value && value !== '' && value !== 'N/A' && value.toLowerCase() !== 'none') {
                            orderData.promoCode = value;
                            console.log('✓ Extracted Promo Code:', orderData.promoCode);
                        }
                    }
                }
                
                if (tdText === 'Sale Discount:' || tdText.toLowerCase() === 'sale discount:') {
                    console.log('✓ Found "Sale Discount:" td');
                    const nextTd = overviewTds[idx + 1];
                    if (nextTd) {
                        const value = nextTd.textContent.trim();
                        if (value && value !== '' && value !== 'N/A') {
                            orderData.saleDiscount = value;
                            console.log('✓ Extracted Sale Discount:', orderData.saleDiscount);
                        }
                    }
                }
            });
            
            // Extract Ship & Payment information from overview page
            console.log('=== DEBUG: Extracting Ship & Payment fields from overview ===');
            
            // 1. Ship To - from <span id="warpshipping"> with <br> tags
            const shipToSpan = overviewDoc.querySelector('#warpshipping');
            if (shipToSpan) {
                console.log('✓ Found #warpshipping span');
                console.log('DEBUG: shipToSpan.innerHTML:', shipToSpan.innerHTML);
                // Get innerHTML to preserve <br> tags, then convert <br> to newlines
                let shipToHTML = shipToSpan.innerHTML;
                // Replace <br> tags with newlines
                let shipToText = shipToHTML.replace(/<br\s*\/?>/gi, '\n');
                // Remove any HTML tags that might remain
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = shipToText;
                let rawText = tempDiv.textContent || tempDiv.innerText || '';
                // Clean up extra whitespace and normalize spaces
                // Split by newlines, trim each line, filter out empty lines, and join
                orderData.shipTo = rawText
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .join('\n')
                    .trim(); // Final trim to remove any leading/trailing whitespace
                console.log('✓ Extracted Ship To:', JSON.stringify(orderData.shipTo));
            } else {
                console.log('⚠️ #warpshipping not found');
            }
            
            // 2. Ship Method - from <td id="ship_method_tab"> looking for <span> or <a> tag
            const shipMethodTd = overviewDoc.querySelector('#ship_method_tab');
            if (shipMethodTd) {
                console.log('✓ Found #ship_method_tab td');
                console.log('DEBUG: #ship_method_tab innerHTML:', shipMethodTd.innerHTML);
                
                // Try to find <span> tag first (more common)
                let shipMethodSpan = shipMethodTd.querySelector('span');
                if (shipMethodSpan) {
                    orderData.shipMethod = shipMethodSpan.textContent.trim();
                    console.log('✓ Extracted Ship Method from <span>:', orderData.shipMethod);
                } else {
                    // Fallback to <a> tag
                    const shipMethodLink = shipMethodTd.querySelector('a');
                    if (shipMethodLink) {
                        orderData.shipMethod = shipMethodLink.textContent.trim();
                        console.log('✓ Extracted Ship Method from <a>:', orderData.shipMethod);
                    } else {
                        console.log('⚠️ Neither <span> nor <a> tag found in #ship_method_tab');
                    }
                }
            } else {
                console.log('⚠️ #ship_method_tab not found');
            }
            } else {
                console.log('⚠️ Failed to fetch overview page:', overviewResponse.error);
            }
            
            // ========== STEP 3: Fetch from order_tab_items.php (Order Items) ==========
            console.log('=== STEP 3: Fetching Order Items from order_tab_items.php ===');
            
            // First, get the main items page to determine items_count
            const itemsPageResponse = await chrome.runtime.sendMessage({
                type: 'FETCH_ORDER_FROM_ADMIN',
                orderId: orderId,
                url: `${adminBaseUrl}${CONFIG.API_ENDPOINTS.ORDER_TAB_ITEMS}?order_id=${orderId}`
            });
            
            let itemsCount = 2; // Default fallback
            if (itemsPageResponse.success) {
                // Try to extract items_count from the page
                const countMatch = itemsPageResponse.html.match(/items_count=(\d+)/);
                if (countMatch) {
                    itemsCount = parseInt(countMatch[1]);
                    console.log(`✓ Detected ${itemsCount} items in order`);
                }
            }
            
            // Now fetch each item via AJAX endpoint
            console.log(`Fetching ${itemsCount} items via AJAX...`);
            for (let itemNum = 1; itemNum <= itemsCount; itemNum++) {
                console.log(`\n=== Fetching Item ${itemNum} of ${itemsCount} ===`);
                const itemsResponse = await chrome.runtime.sendMessage({
                    type: 'FETCH_ORDER_FROM_ADMIN',
                    orderId: orderId,
                    url: `${adminBaseUrl}${CONFIG.API_ENDPOINTS.ORDER_TAB_ITEM_AJAX}?item_number=${itemNum}&items_count=${itemsCount}&fp_only=0&order_id=${orderId}`
                });
            
            if (itemsResponse.success) {
                console.log('✓ Items page HTML received, length:', itemsResponse.html.length);
                console.log('DEBUG: Items page HTML preview (first 2000 chars):', itemsResponse.html.substring(0, 2000));
                
                const itemsParser = new DOMParser();
                const itemsDoc = itemsParser.parseFromString(itemsResponse.html, 'text/html');
                
                // Debug: Check page title and body content
                console.log('DEBUG: Page title:', itemsDoc.title);
                console.log('DEBUG: Body text preview:', itemsDoc.body.textContent.substring(0, 500));
                
                // Extract items from the AJAX response
                // AJAX returns fragment without item_wrapper, starts with item_bar
                console.log('Parsing AJAX response HTML...');
                
                // The AJAX response is the entire item content, treat it as one item
                const itemWrapper = itemsDoc.body; // Use body as container
                console.log(`\n=== Processing Item ${itemNum} ===`);
                    
                const item = {
                    itemNumber: 'N/A',
                    totalPrice: 'N/A',
                    designId: 'N/A',
                    quantity: 'N/A',
                    unitPrice: 'N/A'
                };
                
                // 1. Extract Item ID from <span>ID: 51344396400</span> in item_bar
                const itemBar = itemWrapper.querySelector('div.item_bar');
                if (itemBar) {
                    const spans = itemBar.querySelectorAll('span');
                    spans.forEach(span => {
                        const text = span.textContent.trim();
                        if (text.startsWith('ID:')) {
                            item.itemNumber = text.replace('ID:', '').trim();
                            console.log('✓ Extracted Item ID:', item.itemNumber);
                        }
                    });
                }
                
                // 2. Extract Design from line_wrapper containing "Design:"
                const lineWrappers = itemWrapper.querySelectorAll('div.line_wrapper');
                lineWrappers.forEach(wrapper => {
                    const flSpan = wrapper.querySelector('span.fl');
                    if (flSpan && flSpan.textContent.trim() === 'Design:') {
                        // Find <a> tag with design ID (the red link with numbers)
                        const links = wrapper.querySelectorAll('a');
                        links.forEach(link => {
                            const linkText = link.textContent.trim();
                            // Design ID link contains only numbers
                            if (/^\d+$/.test(linkText)) {
                                item.designId = linkText;
                                console.log('✓ Extracted Design ID:', item.designId);
                            }
                        });
                    }
                });
                
                // 3. Extract Qty, Unit Price Paid, Amount from item_pricing section
                const pricingSection = itemWrapper.querySelector('div.item_pricing');
                if (pricingSection) {
                    const pricingWrappers = pricingSection.querySelectorAll('div.line_wrapper');
                    pricingWrappers.forEach(wrapper => {
                        const flSpan = wrapper.querySelector('span.fl');
                        const frSpan = wrapper.querySelector('span.fr');
                        
                        if (flSpan && frSpan) {
                            const label = flSpan.textContent.trim();
                            const value = frSpan.textContent.trim();
                            
                            if (label === 'Qty:') {
                                item.quantity = value;
                                console.log('✓ Extracted Qty:', item.quantity);
                            } else if (label === 'Unit Price Paid:') {
                                item.unitPrice = value;
                                console.log('✓ Extracted Unit Price:', item.unitPrice);
                            } else if (label === 'Amount:') {
                                item.totalPrice = value;
                                console.log('✓ Extracted Amount:', item.totalPrice);
                            }
                        }
                    });
                }
                
                // Add item to orderData if we got at least the item number
                if (item.itemNumber !== 'N/A') {
                    orderData.items.push(item);
                    console.log('✓ Added item to order:', item);
                } else {
                    console.log('⚠️ Skipping item - no Item ID found');
                }
                
                console.log(`✓ Item ${itemNum} processed, total items so far: ${orderData.items.length}`);
            } else {
                console.log(`⚠️ Failed to fetch item ${itemNum}:`, itemsResponse.error);
            }
            }
            
            console.log(`✓ Total items extracted: ${orderData.items.length}`);
            
            // ========== STEP 4: Fetch from order_tab_customer.php (Email) ==========
            console.log('=== STEP 4: Fetching Email from order_tab_customer.php ===');
            console.log('📊 Order data BEFORE email extraction:', JSON.stringify(orderData, null, 2));
            try {
                const customerResponse = await chrome.runtime.sendMessage({
                    type: 'FETCH_ORDER_FROM_ADMIN',
                    orderId: orderId,
                    url: `${adminBaseUrl}${CONFIG.API_ENDPOINTS.ORDER_TAB_CUSTOMER}?order_id=${orderId}`
                });
                
                if (customerResponse.success) {
                    console.log('✓ Customer page HTML received, length:', customerResponse.html.length);
                    
                    const customerParser = new DOMParser();
                    const customerDoc = customerParser.parseFromString(customerResponse.html, 'text/html');
                    
                    // Extract Email from customer page
                    const customerTds = customerDoc.querySelectorAll('td');
                    for (let i = 0; i < customerTds.length; i++) {
                        const td = customerTds[i];
                        const tdText = td.textContent.trim();
                        
                        if (tdText === 'Email:' || tdText.toLowerCase() === 'email:') {
                            console.log('✓ Found "Email:" td in customer page');
                            const nextTd = td.nextElementSibling;
                            if (nextTd && nextTd.tagName === 'TD') {
                                // Find first <a> tag in the td
                                const firstLink = nextTd.querySelector('a');
                                if (firstLink) {
                                    const emailValue = firstLink.textContent.trim();
                                    // Validate it's an email format (contains @ and .)
                                    if (emailValue && emailValue.includes('@') && emailValue.includes('.')) {
                                        orderData.email = emailValue;
                                        console.log('✓ Extracted Email from customer page:', orderData.email);
                                        break;
                                    } else {
                                        console.log('⚠️ Found <a> tag but value is not email format:', emailValue);
                                    }
                                } else {
                                    // Try to get text content directly
                                    const emailValue = nextTd.textContent.trim();
                                    if (emailValue && emailValue.includes('@') && emailValue.includes('.')) {
                                        orderData.email = emailValue;
                                        console.log('✓ Extracted Email from text content:', orderData.email);
                                        break;
                                    } else {
                                        console.log('⚠️ No valid email found in td');
                                    }
                                }
                            }
                        }
                    }
                } else {
                    console.log('⚠️ Failed to fetch customer page:', customerResponse.error);
                }
            } catch (emailError) {
                console.log('⚠️ Error fetching email from customer page:', emailError);
            }
            
            console.log('📊 Order data AFTER email extraction:', JSON.stringify(orderData, null, 2));
            console.log('✅ Extracted order data:', orderData);
            return orderData;
            
        } catch (error) {
            console.error('❌ Error fetching order:', error);
            throw error;
        }
    }
    
    function searchOrderInFloatingWindow() {
        const input = document.getElementById('floating-order-id-input');
        const searchBtn = document.getElementById('floating-search-btn');
        
        if (!input || !searchBtn) return;
        
        const orderId = input.value.trim();
        
        if (!orderId) {
            return;
        }
        
        console.log('Searching for order ID:', orderId);
        
        // Show searching state
        searchBtn.textContent = 'Searching...';
        searchBtn.disabled = true;
        
        // Try to fetch from Admin first, fallback to mock data
        fetchOrderFromAdmin(orderId)
            .then(orderData => {
                console.log('Using Admin data');
                displayOrderDetails(orderData);
            })
            .catch(error => {
                console.warn('Admin fetch failed, using mock data:', error.message);
                // Fallback to mock data
                const orderData = getMockOrderData(orderId);
                if (!orderData) {
                    displayOrderDetails(null); // Show "Order not found"
                } else {
                    displayOrderDetails(orderData);
                }
            })
            .finally(() => {
                searchBtn.textContent = 'Search';
                searchBtn.disabled = false;
            });
    }
    
    // Cancel order in floating window
    async function cancelOrderInFloatingWindow() {
        const input = document.getElementById('floating-order-id-input');
        const cancelOrderBtn = document.getElementById('floating-cancel-order-btn');
        
        if (!input || !cancelOrderBtn) return;
        
        const orderId = input.value.trim();
        
        if (!orderId) {
            showToastNotification('Please enter an Order ID', 'warning');
            return;
        }
        
        // Validate order ID format (should be numeric)
        if (!/^\d+$/.test(orderId)) {
            showToastNotification('Order ID must be numeric', 'warning');
            return;
        }
        
        console.log('Cancelling order ID:', orderId);
        
        // Show canceling state
        cancelOrderBtn.textContent = 'Cancelling...';
        cancelOrderBtn.disabled = true;
        
        try {
            // Detect environment and branch from current page
            const currentUrl = window.location.href;
            const detectedBranch = CONFIG.autoDetectBranch() || CONFIG.BRANCH.CURRENT;
            const environment = CONFIG.detectEnvironment(window.location.hostname);
            
            console.log('Detected environment:', environment);
            console.log('Detected branch:', detectedBranch);
            
            // Send cancel order request to background script
            const response = await chrome.runtime.sendMessage({
                type: 'CANCEL_ORDER',
                orderId: orderId,
                environment: environment,
                branch: detectedBranch
            });
            
            if (response.success) {
                console.log('✅ Order cancelled successfully:', response.data);
                showToastNotification(`Order ${orderId} has been cancelled successfully`, 'success');
                
                // If we're showing order details, refresh them
                const orderDetailDiv = document.getElementById('floating-order-detail');
                if (orderDetailDiv && orderDetailDiv.style.display !== 'none') {
                    // Refresh order details after a short delay to allow backend to update
                    setTimeout(() => {
                        searchOrderById();
                    }, 1000);
                }
            } else {
                console.error('❌ Order cancellation failed:', response.error);
                showToastNotification(`Cancellation failed: ${response.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error cancelling order:', error);
            showToastNotification(`Cancellation failed: ${error.message}`, 'error');
        } finally {
            // Restore button state
            cancelOrderBtn.textContent = 'Cancel Order';
            cancelOrderBtn.disabled = false;
        }
    }
    
    // Show PDP (Product Detail Page) info - default view
    function showPDPInfo() {
        const orderDetailDiv = document.getElementById('floating-order-detail');
        const productInfoDiv = document.getElementById('floating-product-info');
        
        // Hide order details
        if (orderDetailDiv) {
            orderDetailDiv.style.display = 'none';
            orderDetailDiv.innerHTML = '';
        }
        
        // Show product info
        if (productInfoDiv) {
            productInfoDiv.style.display = 'block';
        }
        
        // Clear the search input
        const input = document.getElementById('floating-order-id-input');
        if (input) {
            input.value = '';
        }
    }
    
    function createInfoItem(label, value) {
        return `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
                gap: 10px;
                font-size: 11px;
            ">
                <span style="color: #fff; user-select: text; cursor: text; white-space: nowrap;">${label}</span>
                <span style="color: #ffeb3b; font-weight: bold; user-select: text; cursor: text; word-break: break-all; text-align: right;">${value}</span>
            </div>
        `;
    }
    
    function createTranslationTool() {
        return `
            <div id="translation-tool-container" style="
                margin-bottom: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.2);
                padding: 15px;
            ">
                <!-- Header with Translation label and Back button -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0;
                ">
                    <div 
                        id="open-translation-tool-btn"
                        style="
                            background: transparent;
                            color: #ffeb3b;
                            border: none;
                            padding: 0;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: bold;
                        "
                    >Translation</div>
                    
                    <button 
                        id="translation-back-btn"
                        style="
                            background: rgba(255,255,255,0.2);
                            color: #fff;
                            border: 1px solid rgba(255,255,255,0.3);
                            padding: 8px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                            transition: all 0.2s ease;
                            display: none;
                        "
                        onmouseover="this.style.background='rgba(255,255,255,0.3)';"
                        onmouseout="this.style.background='rgba(255,255,255,0.2)';"
                    >← Back</button>
                </div>
                
                <!-- Translation Card (hidden by default) -->
                <div id="translation-card" style="display: none; padding: 0; margin-top: 15px;">
                    
                    <!-- Language Selector -->
                    <div style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div id="lang-left" style="
                            font-size: 16px;
                            font-weight: bold;
                            color: #fff;
                        ">English</div>
                        
                        <div 
                            id="lang-switch-arrow"
                            style="
                                font-size: 24px;
                                color: #ffeb3b;
                                cursor: pointer;
                                padding: 5px 15px;
                                transition: all 0.2s ease;
                                user-select: none;
                            "
                            onmouseover="this.style.transform='scale(1.2)';"
                            onmouseout="this.style.transform='scale(1)';"
                        >⇄</div>
                        
                        <div id="lang-right" style="
                            font-size: 16px;
                            font-weight: bold;
                            color: #fff;
                        ">Chinese</div>
                    </div>
                    
                    <!-- Source Text Area -->
                    <div style="margin-bottom: 15px;">
                        <div id="source-label" style="
                            font-size: 14px;
                            font-weight: bold;
                            color: #ffeb3b;
                            margin-bottom: 8px;
                        ">Chinese</div>
                        <textarea 
                            id="translation-source"
                            placeholder="输入要翻译的文本..."
                            style="
                                width: 100%;
                                min-height: 120px;
                                padding: 12px;
                                border: 1px solid rgba(255,255,255,0.2);
                                border-radius: 8px;
                                font-size: 14px;
                                resize: vertical;
                                box-sizing: border-box;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                outline: none;
                            "
                        ></textarea>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                            <button 
                                id="translate-btn"
                                style="
                                    background: #ffeb3b;
                                    color: #333;
                                    border: none;
                                    padding: 8px 24px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 13px;
                                    font-weight: bold;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                "
                                onmouseover="this.style.background='#ffd700'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                                onmouseout="this.style.background='#ffeb3b'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                            >Translate</button>
                            <button 
                                id="clear-source-btn"
                                style="
                                    background: rgba(255,255,255,0.2);
                                    color: #fff;
                                    border: 1px solid rgba(255,255,255,0.3);
                                    padding: 6px 16px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: all 0.2s ease;
                                "
                                onmouseover="this.style.background='rgba(255,255,255,0.3)';"
                                onmouseout="this.style.background='rgba(255,255,255,0.2)';"
                            >Clear</button>
                        </div>
                    </div>
                    
                    <!-- Target Text Area -->
                    <div style="margin-bottom: 15px;">
                        <div id="target-label" style="
                            font-size: 14px;
                            font-weight: bold;
                            color: #ffeb3b;
                            margin-bottom: 8px;
                        ">English</div>
                        <textarea 
                            id="translation-target"
                            placeholder="Translation will appear here..."
                            readonly
                            style="
                                width: 100%;
                                min-height: 120px;
                                padding: 12px;
                                border: 1px solid rgba(255,255,255,0.2);
                                border-radius: 8px;
                                font-size: 14px;
                                resize: vertical;
                                box-sizing: border-box;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                outline: none;
                            "
                        ></textarea>
                        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                            <button 
                                id="copy-translation-btn"
                                style="
                                    background: rgba(255,255,255,0.2);
                                    color: #fff;
                                    border: 1px solid rgba(255,255,255,0.3);
                                    padding: 6px 16px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: all 0.2s ease;
                                "
                                onmouseover="this.style.background='rgba(255,255,255,0.3)';"
                                onmouseout="this.style.background='rgba(255,255,255,0.2)';"
                            >Copy</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
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
    
    // PTN Data cache for content script
    let ptnDataCacheContent = null;
    
    // Parse CSV line with proper quote handling
    function parseCSVLineContent(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"' && inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                // Toggle quote mode
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Push last field
        result.push(current.trim());
        return result;
    }
    
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
                
                const fields = parseCSVLineContent(line);
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
    
    function getEnvironmentInfo(currentUrl) {
        // Extract product path and parameters from current URL
        let productPath = '';
        let siteType = ''; // 'US', 'CA', 'UK', 'AU'
        
        // Determine site type and extract path
        if (currentUrl.includes('cafus-cpsw-web.pre.planetart.com') || 
            currentUrl.includes('cafus-cpsw-web.stage.planetart.com') || 
            currentUrl.includes('cafepress.com')) {
            siteType = 'US';
            
            if (currentUrl.includes('cafus-cpsw-web.pre.planetart.com')) {
                const match = currentUrl.match(/cafus-cpsw-web\.pre\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafus-cpsw-web.stage.planetart.com')) {
                const match = currentUrl.match(/cafus-cpsw-web\.stage\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafepress.com')) {
                const match = currentUrl.match(/cafepress\.com(\/.*)/);
                if (match) productPath = match[1];
            }
        }
        else if (currentUrl.includes('cafca-cpsw-web.pre.planetart.com') || 
                 currentUrl.includes('cafca-cpsw-web.stage.planetart.com') || 
                 currentUrl.includes('cafepress.ca')) {
            siteType = 'CA';
            
            if (currentUrl.includes('cafca-cpsw-web.pre.planetart.com')) {
                const match = currentUrl.match(/cafca-cpsw-web\.pre\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafca-cpsw-web.stage.planetart.com')) {
                const match = currentUrl.match(/cafca-cpsw-web\.stage\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafepress.ca')) {
                const match = currentUrl.match(/cafepress\.ca(\/.*)/);
                if (match) productPath = match[1];
            }
        }
        else if (currentUrl.includes('cafuk-cpsw-web.pre.planetart.com') || 
                 currentUrl.includes('cafuk-cpsw-web.stage.planetart.com') || 
                 currentUrl.includes('cafepress.co.uk')) {
            siteType = 'UK';
            
            if (currentUrl.includes('cafuk-cpsw-web.pre.planetart.com')) {
                const match = currentUrl.match(/cafuk-cpsw-web\.pre\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafuk-cpsw-web.stage.planetart.com')) {
                const match = currentUrl.match(/cafuk-cpsw-web\.stage\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafepress.co.uk')) {
                const match = currentUrl.match(/cafepress\.co\.uk(\/.*)/);
                if (match) productPath = match[1];
            }
        }
        else if (currentUrl.includes('cafau-cpsw-web.pre.planetart.com') || 
                 currentUrl.includes('cafau-cpsw-web.stage.planetart.com') || 
                 currentUrl.includes('cafepress.com.au')) {
            siteType = 'AU';
            
            if (currentUrl.includes('cafau-cpsw-web.pre.planetart.com')) {
                const match = currentUrl.match(/cafau-cpsw-web\.pre\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafau-cpsw-web.stage.planetart.com')) {
                const match = currentUrl.match(/cafau-cpsw-web\.stage\.planetart\.com(\/.*)/);
                if (match) productPath = match[1];
            } else if (currentUrl.includes('cafepress.com.au')) {
                const match = currentUrl.match(/cafepress\.com\.au(\/.*)/);
                if (match) productPath = match[1];
            }
        }
        else {
            // Not a supported environment
            return null;
        }
        
        // Extract search parameters
        const urlObj = new URL(currentUrl);
        const searchParams = urlObj.search;
        const fullPath = productPath + searchParams;
        
        // Generate environments based on site type using unified config
        const config = CONFIG.getSiteConfig(siteType);
        if (!config) return null;
        
        const environments = [
            {
                name: 'Pre',
                url: `https://${config.PRE}${fullPath}`,
                current: currentUrl.includes(config.PRE)
            },
            {
                name: 'Stage', 
                url: `https://${config.STAGE}${fullPath}`,
                current: currentUrl.includes(config.STAGE)
            },
            {
                name: 'Live',
                url: `https://${config.LIVE}${fullPath}`,
                current: currentUrl.includes(config.LIVE)
            }
        ];
        
        return environments;
    }
    
    function createInfoRow(label, value) {
        return `
            <div style="
                margin-bottom: 8px;
                font-size: 8px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            ">
                <span style="color: #fff; opacity: 0.7; margin-right: 10px; user-select: text; cursor: text;">${label}</span>
                <span style="color: #ffeb3b; opacity: 0.8; user-select: text; cursor: text; word-break: break-all; text-align: right; max-width: 70%;">${value || 'Unknown'}</span>
            </div>
        `;
    }
    
    function formatTimestamp(isoString) {
        if (!isoString) return 'Unknown';
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            
            if (diffSecs < 60) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            return date.toLocaleString('en-US');
        } catch (e) {
            return 'Unknown';
        }
    }
    
    // Check if window should be auto-opened (pinned state)
    function checkAndAutoShowWindow() {
        const isPinned = localStorage.getItem('cp-window-pinned') === 'true';
        const isMinimized = localStorage.getItem('cp-window-minimized') === 'true';
        
        if (isPinned) {
            console.log('🔍 Window is pinned - auto-showing on page load');
            console.log('📦 Minimized state:', isMinimized);
            
            // Wait for DOM to be ready before showing
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => {
                        if (isMinimized) {
                            // Show as floating ball if minimized
                            createFloatingWindow();
                            updateFloatingWindowContent(); // Load content even when minimized
                            showFloatingBall();
                        } else {
                            // Show full window if not minimized
                            showFloatingWindow();
                        }
                    }, 500); // Small delay to ensure page is stable
                });
            } else {
                // DOM already ready
                setTimeout(() => {
                    if (isMinimized) {
                        // Show as floating ball if minimized
                        createFloatingWindow();
                        updateFloatingWindowContent(); // Load content even when minimized
                        showFloatingBall();
                    } else {
                        // Show full window if not minimized
                        showFloatingWindow();
                    }
                }, 500);
            }
        } else {
            console.log('📌 Window is not pinned - waiting for manual open');
        }
    }
    
    // Execute auto-show check
    checkAndAutoShowWindow();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content script received message:', message);
        
        if (message.type === 'TOGGLE_FLOATING_WINDOW') {
            toggleFloatingWindow();
            sendResponse({success: true});
        }
        
        return true;
    });
    
})();
} // End of isSupportedDomain() check
