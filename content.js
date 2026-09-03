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
    let floatingWindowHost = null;
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
        
        // Extract CPB product ID and design ID from URL
        const cpbParsed = parseCpbProductUrl(currentUrl);
        if (cpbParsed) {
            extractedData.cpProductId = cpbParsed.productId;
            if (cpbParsed.designId) {
                extractedData.designId = cpbParsed.designId;
            }
            console.log('Extracted CPB Product ID from URL:', extractedData.cpProductId);
            console.log('Extracted CPB Design ID from URL:', extractedData.designId);
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
        const maxAttempts = 3;  // Reduced attempts for better performance
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
                console.log('Starting continuous polling every 3 seconds...');
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
                }, 3000);
                
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
                updateFloatingWindowContent();
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
        // Only execute on product detail pages, not on list pages
        if (!isProductDetailPage()) {
            return;
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', extractProductInfo);
        } else {
            extractProductInfo();
        }
        
        // Also try after window load (for scripts that load after DOM)
        window.addEventListener('load', () => {
            if (isProductDetailPage()) {
                console.log('Window loaded, retrying product_options extraction...');
                setTimeout(extractProductInfo, 500);
            }
        });
        
        // Try again when any script tag is added (for dynamic script loading)
        const observer = new MutationObserver((mutations) => {
            if (!isProductDetailPage()) return;
            
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
        
        initProductOptionChangeWatcher();
    }
    
    // Monitor URL changes (SPA applications) - only on detail pages
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
        const newUrl = window.location.href;
        if (newUrl !== lastUrl && isProductDetailPage()) {
            lastUrl = newUrl;
            lastDefaultSkuFingerprint = null;
            setTimeout(extractProductInfo, 100);
        }
    });
    
    // Start observing URL changes
    urlObserver.observe(document, {
        subtree: true,
        childList: true
    });
    
    // Also listen for popstate events
    window.addEventListener('popstate', function() {
        if (isProductDetailPage()) {
            lastDefaultSkuFingerprint = null;
            setTimeout(extractProductInfo, 100);
        }
    });
    
    // Listen for pushstate and replacestate
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
        originalPushState.apply(history, arguments);
        if (isProductDetailPage()) {
            lastDefaultSkuFingerprint = null;
            setTimeout(extractProductInfo, 100);
        }
    };
    
    history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        if (isProductDetailPage()) {
            lastDefaultSkuFingerprint = null;
            setTimeout(extractProductInfo, 100);
        }
    };
    
    // Function to extract product ID from URL
    function extractProductIdFromUrl(url) {
        // Format: /+{seo-slug},{productId}
        const match = url.match(/\/\+[^,]*?,(\d+)/);
        if (match) {
            return match[1];
        }
        // Format: ?productId={productId}
        const productIdMatch = url.match(/[?&]productId=(\d+)/);
        if (productIdMatch) {
            return productIdMatch[1];
        }
        return null;
    }
    
    // Function to check if we're on a product list page
    function isProductListPage() {
        const currentUrl = window.location.href;
        // Product list page patterns:
        // 1. URL contains /+xxx but doesn't have productId (no comma + number)
        //    Example: https://cafus-master.pre.planetart.com/+oven-mitts
        // 2. URL contains /make/xxx (CYO product category pages)
        //    Example: https://www.cafepress.com/make/custom-kids-hoodies
        const isPlusPattern = /\/\+[^/]+/.test(currentUrl);
        const hasProductId = /\/\+[^,]*,\d+/.test(currentUrl);
        const isMakePattern = /\/make\/[^/]+/.test(currentUrl);
        
        return (isPlusPattern && !hasProductId) || isMakePattern;
    }
    
    // CP homepage (e.g. https://www.cafepress.com/)
    function isCartPage() {
        const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
        return path === '/cart' || path === '/business/cart';
    }
    
    function isCpHomePage() {
        const path = window.location.pathname;
        const isRootPath = path === '/' || path === '';
        if (!isRootPath) return false;
        
        const hostname = window.location.hostname;
        if (/^(www\.)?cafepress\.(com|ca|co\.uk|com\.au)$/.test(hostname)) {
            return true;
        }
        
        return /caf(?:us|ca|uk|au)-[^.]+\.(pre|stage)\.planetart\.com/.test(hostname);
    }
    
    function isCpProductBadgePage() {
        if (isCartPage()) return false;
        return isProductListPage() || isCpHomePage() || isCpProductDetailPage();
    }

    function isCpProductDetailPage() {
        if (isCpbProductDetailPage()) return false;
        return /\/\+[^,]*,\d+/.test(window.location.href);
    }

    function isCpbYmalSection(element) {
        if (!element) return false;
        return !!element.closest('.js-product-details-ymal-area, .js-product-details-ymal, .product-details-ymal, .product-details-suggest-area');
    }

    function getCpbYmalBadgeSection() {
        return getCpPdpBadgeSectionByTitle(/you may also like/i) || getCpbRecommendationSection();
    }

    function isExcludedProductBadgeLink(link) {
        if (!link) return true;
        if (link.closest('.thumbs-search-banner-wrapper')) return true;
        if (link.classList.contains('thumbs-search-banner-link')) return true;
        if (link.closest('.cpb-search-carousel')) return true;

        const href = link.getAttribute('href') || '';
        if (link.closest('.container-designs') &&
            !isCpbYmalSection(link) &&
            /\/business\/product-\d+-design-\d+/.test(href)) {
            return true;
        }
        return false;
    }

    function removeExcludedProductBadges() {
        document.querySelectorAll('.thumbs-search-banner-wrapper .cp-product-id-badge').forEach(badge => badge.remove());
        document.querySelectorAll('.cpb-search-carousel .cp-product-id-badge').forEach(badge => badge.remove());
        document.querySelectorAll('.container-designs a[href*="/business/product-"]').forEach(link => {
            if (isCpbYmalSection(link)) return;
            const container = link.closest('.design-item-wrapper, .product-item-card, [class*="product"], [class*="item"], [class*="card"]');
            container?.querySelectorAll('.cp-product-id-badge').forEach(badge => badge.remove());
        });
    }
    
    function removeAllProductBadges() {
        document.querySelectorAll('.cp-product-id-badge').forEach(badge => badge.remove());
        document.querySelectorAll('.cp-cpb-decoration-badge').forEach(badge => badge.remove());
    }
    
    function getBestsellersSection() {
        const directSection = document.querySelector(
            '.bestsellers-products, .bestseller-products, [class*="bestsellers-products"]'
        );
        if (directSection) return directSection;

        const header = document.querySelector('.bestsellers-products-header, [class*="bestsellers-products-header"]');
        if (header) {
            const fromHeader = header.closest(
                '.bestsellers-products, .bestseller-products, [class*="bestsellers-products"], [class*="bestseller"]'
            );
            if (fromHeader) return fromHeader;
            if (header.parentElement) return header.parentElement;
        }

        const titleCandidates = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
        for (const el of titleCandidates) {
            const text = (el.textContent || '').trim();
            if (!/bestsellers/i.test(text)) continue;
            
            const section = el.closest('section, [class*="bestseller"], [class*="carousel"], [class*="slider"], [class*="product-list"], [class*="product-grid"]');
            if (section) return section;
            
            let node = el.parentElement;
            for (let i = 0; i < 6 && node; i++) {
                if (node.querySelector('a[href*="/+"], a[href*="/designer/"], a[href*="/make/"]')) {
                    return node;
                }
                node = node.parentElement;
            }
        }
        return null;
    }

    let cpHomeBestsellerProductItemsCache = null;
    let cpHomeBestsellerProductItemsPromise = null;
    let cpPdpRecommendationProductItemsCache = null;
    let cpbDecorationLookupCache = null;
    let cpbSimpleFilterItemsCache = null;
    let stiusQfItemsLookupCache = null;
    let lastCpBadgePageUrl = '';

    function resetCpBadgeCachesIfUrlChanged() {
        const currentUrl = window.location.href;
        if (currentUrl !== lastCpBadgePageUrl) {
            lastCpBadgePageUrl = currentUrl;
            cpHomeBestsellerProductItemsCache = null;
            cpPdpRecommendationProductItemsCache = null;
            cpbDecorationLookupCache = null;
            cpbSimpleFilterItemsCache = null;
            stiusQfItemsLookupCache = null;
        }
    }

    function isStiusSite() {
        return CONFIG.detectRegion(window.location.href) === 'STIUS';
    }

    function isStiusProductListPage() {
        if (!isStiusSite() || isCartPage()) return false;
        return !!document.getElementById('category_thumb_wrapper');
    }

    function isStiusBadgePage() {
        if (!isStiusSite() || isCartPage()) return false;
        if (document.getElementById('category_thumb_wrapper')) return true;

        const scripts = document.querySelectorAll('script');
        for (const scriptEl of scripts) {
            const content = scriptEl.textContent || scriptEl.innerHTML || '';
            if (content.includes('QFDATAJSON') &&
                (content.includes('category_thumb_wrapper') || content.includes('ornament-thumbs'))) {
                return true;
            }
        }
        return false;
    }

    function mapStiusQfRawItem(rawItem, idx) {
        if (!rawItem || !idx) return null;

        const designId = rawItem[idx.ID];
        if (designId === undefined || designId === null) return null;

        return {
            design_id: designId,
            design_group_id: rawItem[idx.DESIGN_GROUP_ID],
            name: rawItem[idx.NAME],
            product_id: rawItem[idx.PRODUCT_ID],
            product_type_id: rawItem[idx.PRODUCT_TYPE_ID],
            seo_url: rawItem[idx.SEO_URL] || ''
        };
    }

    function buildStiusQfItemsFromData(data) {
        const items = [];
        const lookup = new Map();

        if (!data || !Array.isArray(data.items) || !data.structure_indexes) {
            return { items, lookup };
        }

        const idx = data.structure_indexes;
        data.items.forEach(rawItem => {
            const mapped = mapStiusQfRawItem(rawItem, idx);
            if (!mapped) return;
            items.push(mapped);
            lookup.set(String(mapped.design_id), mapped);
        });

        return { items, lookup };
    }

    function mapStiusCompactEntry(entry) {
        if (Array.isArray(entry)) {
            return {
                design_id: entry[0],
                design_group_id: entry[1],
                product_id: entry[2],
                product_type_id: entry[3]
            };
        }
        return entry;
    }

    function buildStiusLookupFromCompactEntries(compactEntries) {
        const lookup = new Map();
        if (!Array.isArray(compactEntries)) return lookup;

        compactEntries.forEach(entry => {
            const item = mapStiusCompactEntry(entry);
            if (!item || item.design_id === undefined || item.design_id === null) return;
            lookup.set(String(item.design_id), item);
        });
        return lookup;
    }

    function loadStiusQfDataLookup() {
        if (stiusQfItemsLookupCache) {
            return stiusQfItemsLookupCache;
        }

        try {
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    try {
                        const data = typeof QFDATAJSON !== 'undefined' ? QFDATAJSON :
                            (typeof window.QFDATAJSON !== 'undefined' ? window.QFDATAJSON : null);
                        if (!data || !Array.isArray(data.items) || !data.structure_indexes) return;

                        const idx = data.structure_indexes;
                        const compactItems = [];
                        data.items.forEach(function(item) {
                            if (!item) return;
                            const designId = item[idx.ID];
                            if (designId === undefined || designId === null) return;
                            compactItems.push([
                                designId,
                                item[idx.DESIGN_GROUP_ID],
                                item[idx.PRODUCT_ID],
                                item[idx.PRODUCT_TYPE_ID]
                            ]);
                        });

                        document.documentElement.setAttribute('data-cp-stius-badge-items', JSON.stringify(compactItems));
                    } catch (e) {}
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();

            const compactItemsAttr = document.documentElement.getAttribute('data-cp-stius-badge-items');
            document.documentElement.removeAttribute('data-cp-stius-badge-items');

            if (compactItemsAttr) {
                const compactItems = JSON.parse(compactItemsAttr);
                const lookup = buildStiusLookupFromCompactEntries(compactItems);
                if (lookup.size > 0) {
                    stiusQfItemsLookupCache = lookup;
                    return lookup;
                }
            }
        } catch (e) {
            console.log('Error loading STI QFDATAJSON via injection:', e);
        }

        try {
            const scripts = document.querySelectorAll('script');
            for (const scriptEl of scripts) {
                const content = scriptEl.textContent || scriptEl.innerHTML;
                if (!content || !content.includes('QFDATAJSON')) continue;

                const parsed = parseJsObjectAssignment(content, 'QFDATAJSON');
                if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
                    const built = buildStiusQfItemsFromData(parsed);
                    if (built.lookup.size > 0) {
                        stiusQfItemsLookupCache = built.lookup;
                        return built.lookup;
                    }
                }
            }
        } catch (e) {
            console.log('Error parsing STI QFDATAJSON from script tags:', e);
        }

        stiusQfItemsLookupCache = new Map();
        return stiusQfItemsLookupCache;
    }

    function getStiusBadgeMountPoint(card) {
        if (!card) return null;

        const shadowOverlay = card.querySelector('.shadow-overlay-container.V-None-Thumb-Shadow') ||
            card.querySelector('.shadow-overlay-container[class*="V-None-Thumb-Shadow"]') ||
            card.querySelector('.shadow-overlay-container');
        if (shadowOverlay) return shadowOverlay;

        // Ornaments and other non-card products do not use shadow-overlay-container
        return card.querySelector('.thumb_wrapper.ornament') ||
            card.querySelector('.thumb_wrapper .horizontal') ||
            card.querySelector('.thumb_wrapper .vertical') ||
            card.querySelector('.thumb_wrapper .square') ||
            card.querySelector('.thumb_wrapper');
    }

    function attachStiusBadgeToThumb(card, badge) {
        const mountPoint = getStiusBadgeMountPoint(card);
        if (!mountPoint) return false;

        if (mountPoint.querySelector('.cp-product-id-badge')) {
            return true;
        }

        const mountStyle = window.getComputedStyle(mountPoint);
        if (mountStyle.position === 'static') {
            mountPoint.style.position = 'relative';
        }

        mountPoint.appendChild(badge);
        return true;
    }

    function getStiusBadgeProductCards() {
        const root = document.getElementById('category_thumb_wrapper') || document;
        return Array.from(root.querySelectorAll('.category_thumb[data-design-id]'));
    }

    function getStiusBadgeProductLinks() {
        const root = document.getElementById('category_thumb_wrapper') || document;
        const links = root.querySelectorAll('.category_thumb[data-design-id] a, .category_thumb .thumb_wrapper a');
        return Array.from(links).filter(link => {
            const href = link.getAttribute('href') || '';
            return href && !href.startsWith('#') && !href.startsWith('javascript:');
        });
    }

    function findStiusItemForLink(link, lookup) {
        if (!link || !lookup || lookup.size === 0) return null;

        const container = link.closest('.category_thumb[data-design-id]');
        if (container) {
            const designId = container.getAttribute('data-design-id');
            if (designId && lookup.has(designId)) {
                return lookup.get(designId);
            }
        }

        const href = link.getAttribute('href') || '';
        if (href) {
            const normalizedHref = href.split('?')[0].replace(/\/+$/, '');
            for (const item of lookup.values()) {
                const seoUrl = item.seo_url || '';
                if (!seoUrl) continue;
                const normalizedSeo = seoUrl.split('?')[0].replace(/\/+$/, '');
                if (normalizedHref === normalizedSeo || href === seoUrl || href.endsWith(normalizedSeo)) {
                    return item;
                }
            }
        }

        const img = (container || link).querySelector('img');
        if (img) {
            const urlText = [
                img.src,
                img.getAttribute('data-src'),
                img.getAttribute('data-lazy-src'),
                img.getAttribute('data-srcset')
            ].filter(Boolean).join(' ');
            const designMatch = urlText.match(/(?:design[_-]?id|designs)[=/](\d+)/i) ||
                urlText.match(/\/(\d{5,})(?:[/?_.-]|$)/);
            if (designMatch && lookup.has(designMatch[1])) {
                return lookup.get(designMatch[1]);
            }
        }

        return null;
    }

    function buildStiusBadgeContent(item) {
        if (!item) return '';

        const lines = [];
        const addLine = (label, value) => {
            if (value !== undefined && value !== null && value !== '') {
                lines.push(`${label}: ${value}`);
            }
        };

        addLine('DesignID', item.design_id);
        addLine('DesignGroupID', item.design_group_id);
        addLine('ProductTypeID', item.product_type_id);
        if (item.product_id !== undefined && item.product_id !== null) {
            addLine('ProductID', item.product_id);
        }
        return lines.join('\n');
    }

    function cleanupStiusMisplacedBadges() {
        document.querySelectorAll('#category_thumb_wrapper .category_thumb[data-design-id]').forEach(card => {
            const mountPoint = getStiusBadgeMountPoint(card);
            card.querySelectorAll('.cp-product-id-badge').forEach(badge => {
                if (!mountPoint || !mountPoint.contains(badge)) {
                    badge.remove();
                }
            });
        });
    }

    async function displayStiusProductBadges() {
        if (isCartPage()) {
            removeAllProductBadges();
            return;
        }
        if (!isStiusBadgePage()) {
            return;
        }

        resetCpBadgeCachesIfUrlChanged();
        cleanupStiusMisplacedBadges();

        const badgeEnabled = await isBadgeDisplayEnabled();
        if (!badgeEnabled) {
            updateBadgeVisibility(false);
            return;
        }

        const lookup = loadStiusQfDataLookup();
        const productCards = getStiusBadgeProductCards();

        if (productCards.length === 0) {
            console.log('STI badges: no product cards found yet');
            return;
        }

        if (!lookup || lookup.size === 0) {
            console.log('STI badges: QFDATAJSON not ready yet');
            return;
        }

        const processedProducts = new Set();

        productCards.forEach(card => {
            const designId = card.getAttribute('data-design-id');
            if (!designId || processedProducts.has(designId)) return;

            if (card.querySelector('.cp-product-id-badge')) {
                processedProducts.add(designId);
                return;
            }

            let item = lookup.get(String(designId));
            if (!item) {
                const link = card.querySelector('.thumb_wrapper a[href], a[href]');
                item = link ? findStiusItemForLink(link, lookup) : null;
            }
            if (!item) return;

            const badgeContent = buildStiusBadgeContent(item);
            if (!badgeContent) return;

            const badge = createListPageProductBadge(badgeContent, badgeEnabled);
            if (attachStiusBadgeToThumb(card, badge)) {
                processedProducts.add(designId);
            }
        });

        console.log(`STI PLP: processed ${processedProducts.size} product badges`);
    }

    function parseJsArrayAssignment(content, variableName) {
        if (!content || !variableName) return null;

        const markerIndex = content.indexOf(variableName);
        if (markerIndex === -1) return null;

        const assignIndex = content.indexOf('=', markerIndex);
        if (assignIndex === -1) return null;

        const arrayStart = content.indexOf('[', assignIndex);
        if (arrayStart === -1) return null;

        let depth = 0;
        for (let i = arrayStart; i < content.length; i++) {
            const ch = content[i];
            if (ch === '[') depth++;
            else if (ch === ']') {
                depth--;
                if (depth === 0) {
                    try {
                        const parsed = JSON.parse(content.slice(arrayStart, i + 1));
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            return parsed;
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                }
            }
        }

        return null;
    }

    function parseProductItemsFromHtml(html) {
        return parseJsArrayAssignment(html, 'PRODUCT_ITEMS');
    }

    function getHomeBestsellerDesignIds(section) {
        const designIds = new Set();
        if (!section) return designIds;

        section.querySelectorAll('.design-item-wrapper[data-id], .design-item-wrapper.product-item-card').forEach(card => {
            const dataId = card.getAttribute('data-id');
            if (dataId) designIds.add(String(dataId));
        });

        return designIds;
    }

    function getHomeBestsellerSourceUrl(section) {
        const shopAllLink = section?.querySelector('.bestsellers-products-action a[href*="/+"]');
        if (shopAllLink) {
            const href = shopAllLink.getAttribute('href');
            if (href) return href;
        }
        return '/+gifts';
    }

    async function ensureCpHomeBestsellerProductItems(section) {
        if (cpHomeBestsellerProductItemsCache) {
            return cpHomeBestsellerProductItemsCache;
        }

        if (!section) return null;

        if (!cpHomeBestsellerProductItemsPromise) {
            cpHomeBestsellerProductItemsPromise = (async () => {
                try {
                    const designIds = getHomeBestsellerDesignIds(section);
                    if (designIds.size === 0) return null;

                    const sourceUrl = new URL(getHomeBestsellerSourceUrl(section), window.location.origin).href;
                    const response = await fetch(sourceUrl, { credentials: 'include' });
                    if (!response.ok) {
                        console.log('CP Homepage: failed to fetch PRODUCT_ITEMS source', response.status);
                        return null;
                    }

                    const html = await response.text();
                    const allItems = parseProductItemsFromHtml(html);
                    if (!allItems) {
                        console.log('CP Homepage: PRODUCT_ITEMS not found in Bestsellers source page');
                        return null;
                    }

                    const filtered = allItems.filter(item => item && designIds.has(String(item.design_id)));
                    if (filtered.length > 0) {
                        cpHomeBestsellerProductItemsCache = filtered;
                        window.PRODUCT_ITEMS = filtered;
                        console.log(`CP Homepage: loaded ${filtered.length} PRODUCT_ITEMS for Bestsellers`);
                        return filtered;
                    }
                } catch (e) {
                    console.log('CP Homepage: error loading Bestsellers PRODUCT_ITEMS:', e);
                }
                return null;
            })().finally(() => {
                cpHomeBestsellerProductItemsPromise = null;
            });
        }

        return cpHomeBestsellerProductItemsPromise;
    }

    function getCpPdpBadgeSectionByTitle(titlePattern) {
        const titleCandidates = document.querySelectorAll('.container-draggable-list .list-title, .container-draggable-list h3.list-title');
        for (const el of titleCandidates) {
            const text = (el.textContent || '').trim();
            if (!titlePattern.test(text)) continue;

            const section = el.closest('.container-draggable-list');
            if (section) return section;
        }
        return null;
    }

    function getCpPdpBadgeSections() {
        const sections = [];
        const alsoAvailable = getCpPdpBadgeSectionByTitle(/also available on/i);
        const exploreMore = getCpPdpBadgeSectionByTitle(/explore more designs/i);
        if (alsoAvailable) sections.push(alsoAvailable);
        if (exploreMore) sections.push(exploreMore);
        return sections;
    }

    function getCpPdpSectionListKey(section) {
        const sectionId = section?.id || '';
        const match = sectionId.match(/^draggable-list-(.+)$/);
        return match ? match[1] : null;
    }

    function findCpPdpSectionProductItems(section) {
        const listKey = getCpPdpSectionListKey(section);
        if (!listKey) return null;

        const varName = `products_${listKey}`;

        try {
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    try {
                        const items = (typeof window['${varName}'] !== 'undefined') ? window['${varName}'] :
                            (typeof ${varName} !== 'undefined' ? ${varName} : null);
                        if (Array.isArray(items) && items.length > 0) {
                            document.documentElement.setAttribute('data-cp-pdp-section-items', JSON.stringify(items));
                        }
                    } catch (e) {}
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();

            const dataAttr = document.documentElement.getAttribute('data-cp-pdp-section-items');
            if (dataAttr) {
                document.documentElement.removeAttribute('data-cp-pdp-section-items');
                const parsed = JSON.parse(dataAttr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.log('Error reading CP PDP section product items from page context:', e);
        }

        const scripts = document.querySelectorAll('script');
        for (let scriptEl of scripts) {
            const content = scriptEl.textContent || scriptEl.innerHTML;
            if (content && content.includes(varName)) {
                const parsed = parseJsArrayAssignment(content, varName);
                if (parsed) return parsed;
            }
        }

        return null;
    }
    
    // CPB product list page (e.g. /business/bags/tote-bags)
    function parseCpbProductUrl(url) {
        const urlToParse = url || window.location.href;
        try {
            const parsed = new URL(urlToParse, window.location.origin);
            const pathname = parsed.pathname;
            const search = parsed.search;
            
            const designInPath = pathname.match(/^\/business\/product-(\d+)-design-(\d+)\/?$/);
            if (designInPath) {
                return { productId: designInPath[1], designId: designInPath[2] };
            }
            
            const productOnly = pathname.match(/^\/business\/product-(\d+)\/?$/);
            if (productOnly) {
                const didMatch = search.match(/[?&]did=(\d+)/);
                return {
                    productId: productOnly[1],
                    designId: didMatch ? didMatch[1] : null
                };
            }
        } catch (e) {
            return null;
        }
        return null;
    }
    
    function isCpbProductListPage() {
        const currentUrl = window.location.href;
        const isCpbSite = /\/business(\/|$|\?)/.test(currentUrl) ||
            /cpbus-[^.]+\.(pre|stage)\.planetart\.com/.test(window.location.hostname);
        if (!isCpbSite) return false;
        return !isCpbProductDetailPage();
    }

    function isCpbSearchPage() {
        return /\/business\/search(\/|\?|$)/.test(window.location.pathname + window.location.search);
    }
    
    function findProductItemsArray() {
        try {
            if (isCpHomePage() && cpHomeBestsellerProductItemsCache) {
                return cpHomeBestsellerProductItemsCache;
            }

            if (isCpProductDetailPage() && cpPdpRecommendationProductItemsCache) {
                return cpPdpRecommendationProductItemsCache;
            }

            const windowArrays = [
                window.PRODUCT_ITEMS,
                window.product_items,
                window.productItems,
                window.products
            ].filter(arr => arr && Array.isArray(arr) && arr.length > 0);
            
            if (windowArrays.length > 0) {
                return windowArrays[0];
            }
            
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    let items = null;
                    if (typeof PRODUCT_ITEMS !== 'undefined' && Array.isArray(PRODUCT_ITEMS)) {
                        items = PRODUCT_ITEMS;
                    } else if (typeof window.PRODUCT_ITEMS !== 'undefined' && Array.isArray(window.PRODUCT_ITEMS)) {
                        items = window.PRODUCT_ITEMS;
                    }
                    if (items) {
                        document.documentElement.setAttribute('data-cp-product-items', JSON.stringify(items));
                    }
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
            
            const dataAttr = document.documentElement.getAttribute('data-cp-product-items');
            if (dataAttr) {
                document.documentElement.removeAttribute('data-cp-product-items');
                const parsed = JSON.parse(dataAttr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
            
            const scripts = document.querySelectorAll('script');
            for (let scriptEl of scripts) {
                const content = scriptEl.textContent || scriptEl.innerHTML;
                if (content && content.includes('PRODUCT_ITEMS')) {
                    try {
                        const match = content.match(/(?:var\s+)?PRODUCT_ITEMS\s*=\s*(\[[\s\S]*?\]);/);
                        if (match && match[1]) {
                            const parsed = JSON.parse(match[1]);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                return parsed;
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        } catch (e) {
            console.log('Error finding PRODUCT_ITEMS:', e);
        }
        return null;
    }

    function parseJsObjectAssignment(content, variableName) {
        if (!content || !variableName) return null;

        const markerIndex = content.indexOf(variableName);
        if (markerIndex === -1) return null;

        const assignIndex = content.indexOf('=', markerIndex);
        if (assignIndex === -1) return null;

        const objectStart = content.indexOf('{', assignIndex);
        if (objectStart === -1) return null;

        let depth = 0;
        for (let i = objectStart; i < content.length; i++) {
            const ch = content[i];
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) {
                    try {
                        return JSON.parse(content.slice(objectStart, i + 1));
                    } catch (e) {
                        return null;
                    }
                }
            }
        }

        return null;
    }

    function buildCpbSimpleFilterContextFromItems(items) {
        const compactItems = [];
        const decorationLookup = new Map();

        if (!Array.isArray(items)) {
            return { items: compactItems, lookup: decorationLookup };
        }

        items.forEach(item => {
            if (!item || item.design_id === undefined || item.design_id === null) return;

            const designId = String(item.design_id);
            compactItems.push({
                design_id: item.design_id,
                product_id: item.product_id,
                option_id: item.option_id,
                category_id: item.category_id,
                default_overlay_id: item.default_overlay_id,
                detail_url: item.detail_url,
                DECORATION: item.DECORATION
            });

            const dec = item.design_decoration;
            const label = (dec && (dec.caption || dec.name || dec.group)) || item.DECORATION;
            if (!label) return;

            decorationLookup.set(designId, {
                caption: dec?.caption || label,
                name: dec?.name || label,
                group: dec?.group || label,
                icon_url_plp: dec?.icon_url_plp || '',
                icon_url_pdp: dec?.icon_url_pdp || ''
            });
        });

        return { items: compactItems, lookup: decorationLookup };
    }

    function loadCpbSimpleFilterContext() {
        if (cpbSimpleFilterItemsCache && cpbDecorationLookupCache) {
            return {
                items: cpbSimpleFilterItemsCache,
                lookup: cpbDecorationLookupCache
            };
        }

        try {
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    try {
                        const data = typeof SimpleFilterFullData !== 'undefined' ? SimpleFilterFullData :
                            (typeof window.SimpleFilterFullData !== 'undefined' ? window.SimpleFilterFullData : null);
                        if (!data || !Array.isArray(data.items) || data.items.length === 0) return;

                        const decorationLookup = {};
                        const compactItems = [];
                        data.items.forEach(function(item) {
                            if (!item || item.design_id === undefined || item.design_id === null) return;
                            const designId = String(item.design_id);
                            compactItems.push({
                                design_id: item.design_id,
                                product_id: item.product_id,
                                option_id: item.option_id,
                                category_id: item.category_id,
                                default_overlay_id: item.default_overlay_id,
                                detail_url: item.detail_url,
                                DECORATION: item.DECORATION
                            });

                            const dec = item.design_decoration;
                            const label = (dec && (dec.caption || dec.name || dec.group)) || item.DECORATION;
                            if (!label) return;

                            decorationLookup[designId] = {
                                caption: (dec && dec.caption) || label,
                                name: (dec && dec.name) || label,
                                group: (dec && dec.group) || label,
                                icon_url_plp: (dec && dec.icon_url_plp) || '',
                                icon_url_pdp: (dec && dec.icon_url_pdp) || ''
                            };
                        });

                        document.documentElement.setAttribute('data-cp-cpb-badge-items-compact', JSON.stringify(compactItems));
                        document.documentElement.setAttribute('data-cp-cpb-decoration-lookup', JSON.stringify(decorationLookup));
                    } catch (e) {}
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();

            const compactItemsAttr = document.documentElement.getAttribute('data-cp-cpb-badge-items-compact');
            const lookupAttr = document.documentElement.getAttribute('data-cp-cpb-decoration-lookup');
            document.documentElement.removeAttribute('data-cp-cpb-badge-items-compact');
            document.documentElement.removeAttribute('data-cp-cpb-decoration-lookup');

            if (compactItemsAttr && lookupAttr) {
                const items = JSON.parse(compactItemsAttr);
                const lookupObject = JSON.parse(lookupAttr);
                const lookup = new Map(Object.entries(lookupObject));
                if (Array.isArray(items) && items.length > 0) {
                    cpbSimpleFilterItemsCache = items;
                    cpbDecorationLookupCache = lookup;
                    return { items, lookup };
                }
            }
        } catch (e) {
            console.log('Error loading CPB SimpleFilterFullData via injection:', e);
        }

        try {
            const scripts = document.querySelectorAll('script');
            for (const scriptEl of scripts) {
                const content = scriptEl.textContent || scriptEl.innerHTML;
                if (!content || !content.includes('SimpleFilterFullData')) continue;

                const parsed = parseJsObjectAssignment(content, 'SimpleFilterFullData');
                if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
                    const built = buildCpbSimpleFilterContextFromItems(parsed.items);
                    cpbSimpleFilterItemsCache = built.items;
                    cpbDecorationLookupCache = built.lookup;
                    return built;
                }
            }
        } catch (e) {
            console.log('Error parsing CPB SimpleFilterFullData from script tags:', e);
        }

        cpbSimpleFilterItemsCache = [];
        cpbDecorationLookupCache = new Map();
        return { items: cpbSimpleFilterItemsCache, lookup: cpbDecorationLookupCache };
    }

    function findCpbSimpleFilterItems() {
        const context = loadCpbSimpleFilterContext();
        return context.items.length > 0 ? context.items : null;
    }

    function findCpbDecorationLookup() {
        const context = loadCpbSimpleFilterContext();
        return context.lookup;
    }

    function enrichCpbBadgeItem(item) {
        if (!item) return item;

        const designId = item.design_id !== undefined && item.design_id !== null ? String(item.design_id) : '';
        const decoration = designId ? findCpbDecorationLookup().get(designId) : null;

        if (decoration) {
            return { ...item, design_decoration: decoration };
        }

        if (item.design_decoration && typeof item.design_decoration === 'object') {
            return item;
        }

        if (item.DECORATION) {
            return {
                ...item,
                design_decoration: {
                    caption: item.DECORATION,
                    name: item.DECORATION,
                    group: item.DECORATION
                }
            };
        }

        return item;
    }

    function resolveCpbDecorationIconUrl(decoration, label) {
        const directUrl = decoration?.icon_url_plp || decoration?.icon_url_pdp;
        if (directUrl) return directUrl;

        const normalized = String(label || decoration?.name || decoration?.group || '').toLowerCase();
        if (normalized.includes('embroid')) {
            return 'https://d32u6scf3pzwp7.cloudfront.net/cpbus/images/icon/Icon-Embroider.png';
        }
        if (normalized.includes('print') || normalized.includes('dtf') || normalized.includes('dtg') ||
            normalized.includes('full-color') || normalized.includes('digital')) {
            return 'https://d32u6scf3pzwp7.cloudfront.net/cpbus/images/icon/CPB_Icon_Full_Color.png';
        }

        return null;
    }

    function getCpbDecorationInfo(item) {
        const enriched = enrichCpbBadgeItem(item);
        const decoration = enriched?.design_decoration;
        if (decoration && typeof decoration === 'object') {
            const label = decoration.caption || decoration.name || decoration.group || enriched.DECORATION;
            if (label) {
                return {
                    label,
                    iconUrl: resolveCpbDecorationIconUrl(decoration, label)
                };
            }
        }

        if (enriched?.DECORATION) {
            return {
                label: enriched.DECORATION,
                iconUrl: resolveCpbDecorationIconUrl(null, enriched.DECORATION)
            };
        }

        return null;
    }
    
    function findCpbBadgeProductItems() {
        if (isCpbProductDetailPage()) {
            const ymalSection = getCpbYmalBadgeSection();
            if (ymalSection) {
                const ymalItems = findCpPdpSectionProductItems(ymalSection);
                if (ymalItems && ymalItems.length > 0) {
                    return ymalItems;
                }
            }
        }

        const simpleFilterItems = findCpbSimpleFilterItems();
        if (simpleFilterItems && simpleFilterItems.length > 0) {
            return simpleFilterItems;
        }

        const primaryItems = findProductItemsArray();
        if (primaryItems && primaryItems.length > 0) {
            return primaryItems;
        }
        
        try {
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    const sources = [
                        typeof PRODUCT_ITEMS !== 'undefined' ? PRODUCT_ITEMS : null,
                        typeof window.PRODUCT_ITEMS !== 'undefined' ? window.PRODUCT_ITEMS : null,
                        typeof RELATED_PRODUCT_ITEMS !== 'undefined' ? RELATED_PRODUCT_ITEMS : null,
                        typeof window.RELATED_PRODUCT_ITEMS !== 'undefined' ? window.RELATED_PRODUCT_ITEMS : null,
                        typeof ALSO_LIKE_ITEMS !== 'undefined' ? ALSO_LIKE_ITEMS : null,
                        typeof window.ALSO_LIKE_ITEMS !== 'undefined' ? window.ALSO_LIKE_ITEMS : null
                    ];
                    const items = sources.find(arr => Array.isArray(arr) && arr.length > 0);
                    if (items) {
                        document.documentElement.setAttribute('data-cp-cpb-badge-items', JSON.stringify(items));
                    }
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
            
            const dataAttr = document.documentElement.getAttribute('data-cp-cpb-badge-items');
            if (dataAttr) {
                document.documentElement.removeAttribute('data-cp-cpb-badge-items');
                const parsed = JSON.parse(dataAttr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.log('Error finding CPB badge product items:', e);
        }
        
        return null;
    }
    
    function getCpbRecommendationSection() {
        const titleCandidates = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
        for (const el of titleCandidates) {
            const text = (el.textContent || '').trim();
            if (!/you may also like/i.test(text)) continue;
            
            const section = el.closest('section, [class*="recommend"], [class*="also-like"], [class*="related"], [class*="carousel"], [class*="slider"], [class*="ymal"]');
            if (section) return section;
            
            let node = el.parentElement;
            for (let i = 0; i < 6 && node; i++) {
                if (node.querySelector('a[href*="/business/product-"]')) {
                    return node;
                }
                node = node.parentElement;
            }
        }
        return null;
    }
    
    function isCurrentCpbProductLink(href) {
        if (!href) return false;
        try {
            const linkPath = new URL(href, window.location.origin).pathname;
            return linkPath === window.location.pathname;
        } catch (e) {
            return href.includes(window.location.pathname);
        }
    }
    
    function buildCpbItemFromLink(link) {
        const href = link.getAttribute('href') || '';
        const parsed = parseCpbProductUrl(href);
        if (!parsed) return null;
        
        return {
            product_id: parsed.productId,
            design_id: parsed.designId,
            option_id: parsed.productId,
            category_id: undefined,
            default_overlay_id: undefined
        };
    }
    
    function isCpbBadgePage() {
        if (isCartPage()) return false;
        return isCpbProductListPage() || isCpbProductDetailPage();
    }
    
    function getCpbBadgeProductLinks() {
        if (isCpbProductDetailPage()) {
            const recommendSection = getCpbYmalBadgeSection();
            const root = recommendSection || document;
            return Array.from(root.querySelectorAll('a[href*="/business/product-"]'))
                .filter(link => !isExcludedProductBadgeLink(link))
                .filter(link => !isCurrentCpbProductLink(link.getAttribute('href')));
        }

        const searchRoot = isCpbSearchPage()
            ? (document.querySelector('.search-result-thumbs, .search-results') || document)
            : document;
        
        return Array.from(searchRoot.querySelectorAll('a[href*="/business/product-"]'))
            .filter(link => !isExcludedProductBadgeLink(link));
    }
    
    function buildCpbBadgeContent(item, options = {}) {
        const enrichedItem = enrichCpbBadgeItem(item);
        const lines = [];
        const addLine = (label, value) => {
            if (value !== undefined && value !== null && value !== '') {
                lines.push(`${label}: ${value}`);
            }
        };

        if (!options.isRecommendation) {
            addLine('CategoryID', enrichedItem.category_id);
        }
        addLine('DesignID', enrichedItem.design_id);
        if (!options.isRecommendation) {
            addLine('OverlayID', enrichedItem.default_overlay_id);
        }
        addLine('OptionID', enrichedItem.option_id);
        return lines.join('\n');
    }
    
    function findCpbProductItemForLink(link, productItems) {
        const href = link.getAttribute('href') || '';
        
        const parsed = parseCpbProductUrl(href);
        if (parsed) {
            const productId = parsed.productId;
            const designId = parsed.designId;
            if (designId) {
                const byDesign = productItems.find(item => String(item.design_id) === designId);
                if (byDesign) return byDesign;
            }
            const byProduct = productItems.find(item =>
                String(item.product_id) === productId || String(item.option_id) === productId
            );
            if (byProduct) return byProduct;
        }
        
        const byDetailUrl = productItems.find(item =>
            item.detail_url && (href === item.detail_url || href.includes(item.detail_url))
        );
        if (byDetailUrl) return byDetailUrl;

        const container = link.closest('.design-item-wrapper, .product-item, .product, [class*="product"], [class*="item"], [class*="card"], [class*="tile"]') || link;
        const dataDesignId = container.getAttribute?.('data-id');
        if (dataDesignId) {
            const byDataId = productItems.find(item => String(item.design_id) === String(dataDesignId));
            if (byDataId) return byDataId;
        }
        
        const containerForImg = container;
        const img = containerForImg.querySelector('img');
        if (img) {
            const urlText = [
                img.src,
                img.getAttribute('data-src'),
                img.getAttribute('data-lazy-src'),
                img.getAttribute('data-srcset')
            ].filter(Boolean).join(' ');
            const designMatch = urlText.match(/\/designs\/(\d+)/);
            if (designMatch) {
                return productItems.find(item => String(item.design_id) === designMatch[1]);
            }
        }
        
        return null;
    }
    
    function createListPageProductBadge(badgeContent, badgeEnabled) {
        const badge = document.createElement('div');
        badge.className = 'cp-product-id-badge';
        badge.textContent = badgeContent;
        badge.style.cssText = `
            position: absolute;
            bottom: 5px;
            left: 5px;
            background: rgba(119, 165, 233, 0.4);
            color: #333;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            z-index: 1001;
            pointer-events: auto;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.4;
            white-space: pre-line;
            text-align: left;
            max-width: 150px;
            word-wrap: break-word;
            cursor: pointer;
            user-select: text;
            transition: background-color 0.2s ease, transform 0.1s ease;
            display: ${badgeEnabled ? 'block' : 'none'};
            visibility: ${badgeEnabled ? 'visible' : 'hidden'};
        `;
        
        badge.addEventListener('mouseenter', function() {
            badge.style.background = 'rgba(119, 165, 233, 0.6)';
            badge.style.transform = 'scale(1.02)';
        });
        
        badge.addEventListener('mouseleave', function() {
            badge.style.background = 'rgba(119, 165, 233, 0.4)';
            badge.style.transform = 'scale(1)';
        });
        
        badge.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(badge.textContent).then(() => {
                    const originalText = badge.textContent;
                    const originalBackground = badge.style.background;
                    badge.textContent = 'Copied!';
                    badge.style.background = 'rgba(76, 175, 80, 0.8)';
                    badge.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        badge.textContent = originalText;
                        badge.style.background = originalBackground || 'rgba(119, 165, 233, 0.4)';
                        badge.style.transform = 'scale(1)';
                    }, 1000);
                }).catch(err => console.error('Failed to copy:', err));
            }
        });
        
        badge.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });
        
        badge.addEventListener('mouseup', function(e) {
            e.stopPropagation();
        });
        
        return badge;
    }

    function createCpbDecorationBadge(decorationInfo, badgeEnabled) {
        const badge = document.createElement('div');
        badge.className = 'cp-cpb-decoration-badge';
        badge.title = decorationInfo.label;

        if (decorationInfo.iconUrl) {
            const icon = document.createElement('img');
            icon.className = 'cp-cpb-decoration-badge-icon';
            icon.src = decorationInfo.iconUrl;
            icon.alt = '';
            icon.draggable = false;
            icon.style.cssText = `
                width: 16px;
                height: 16px;
                flex: 0 0 16px;
                object-fit: contain;
                display: block;
            `;
            badge.appendChild(icon);
        }

        const label = document.createElement('span');
        label.className = 'cp-cpb-decoration-badge-label';
        label.textContent = decorationInfo.label;
        badge.appendChild(label);

        badge.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            right: auto;
            display: ${badgeEnabled ? 'inline-flex' : 'none'};
            visibility: ${badgeEnabled ? 'visible' : 'hidden'};
            align-items: center;
            gap: 4px;
            max-width: calc(100% - 10px);
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.92);
            color: #333;
            border: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            font-size: 9px;
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            z-index: 1002;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        label.style.cssText = `
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;

        return badge;
    }

    function attachCpbDecorationBadge(productContainer, link, badge) {
        let imageContainer = null;
        const productImage = productContainer.querySelector('img');

        if (productImage) {
            imageContainer = productImage.parentElement;
            let ancestor = imageContainer;
            while (ancestor && ancestor !== document.body) {
                const ancestorStyle = window.getComputedStyle(ancestor);
                if (ancestorStyle.position === 'relative' || ancestorStyle.position === 'absolute') {
                    imageContainer = ancestor;
                    break;
                }
                ancestor = ancestor.parentElement;
            }

            if (imageContainer) {
                const containerStyle = window.getComputedStyle(imageContainer);
                if (containerStyle.position === 'static') {
                    imageContainer.style.position = 'relative';
                }
            }
        } else {
            imageContainer = productContainer;
            const containerStyle = window.getComputedStyle(imageContainer);
            if (containerStyle.position === 'static') {
                imageContainer.style.position = 'relative';
            }
        }

        if (imageContainer && !imageContainer.querySelector('.cp-cpb-decoration-badge')) {
            imageContainer.appendChild(badge);
        } else if (link && link.parentElement && !link.parentElement.querySelector('.cp-cpb-decoration-badge')) {
            const parent = link.parentElement;
            if (window.getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(badge);
        }
    }
    
    function attachBadgeToProductContainer(productContainer, link, badge) {
        let imageContainer = null;
        const productImage = productContainer.querySelector('img');
        
        if (productImage) {
            imageContainer = productImage.parentElement;
            let ancestor = imageContainer;
            let foundPositioned = false;
            
            while (ancestor && ancestor !== document.body) {
                const ancestorStyle = window.getComputedStyle(ancestor);
                if (ancestorStyle.position === 'relative' || ancestorStyle.position === 'absolute') {
                    imageContainer = ancestor;
                    foundPositioned = true;
                    break;
                }
                ancestor = ancestor.parentElement;
            }
            
            if (!foundPositioned) {
                imageContainer = productImage.parentElement;
                const containerStyle = window.getComputedStyle(imageContainer);
                if (containerStyle.position === 'static') {
                    imageContainer.style.position = 'relative';
                }
            }
        } else {
            imageContainer = productContainer;
            const containerStyle = window.getComputedStyle(imageContainer);
            if (containerStyle.position === 'static') {
                imageContainer.style.position = 'relative';
            }
        }
        
        if (imageContainer && !imageContainer.querySelector('.cp-product-id-badge')) {
            imageContainer.appendChild(badge);
        } else if (link && link.parentElement && !link.parentElement.querySelector('.cp-product-id-badge')) {
            const parent = link.parentElement;
            if (window.getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(badge);
        }
    }
    
    function resolveCpbBadgeItem(link, productItems) {
        let item = null;
        if (productItems && productItems.length > 0) {
            item = findCpbProductItemForLink(link, productItems);
        }
        if (!item) {
            item = buildCpbItemFromLink(link);
        }
        return enrichCpbBadgeItem(item);
    }
    
    async function displayCpbProductBadges() {
        if (isCartPage()) {
            removeAllProductBadges();
            return;
        }
        if (!isCpbBadgePage()) {
            return;
        }

        resetCpBadgeCachesIfUrlChanged();
        
        const badgeEnabled = await isBadgeDisplayEnabled();
        if (!badgeEnabled) {
            updateBadgeVisibility(false);
            return;
        }
        
        const productItems = findCpbBadgeProductItems();
        const productLinks = getCpbBadgeProductLinks();
        
        if (productLinks.length === 0) {
            console.log('CPB badges: no product links found');
            return;
        }
        
        if (!productItems || productItems.length === 0) {
            console.log('CPB badges: PRODUCT_ITEMS not found, using URL fallback where possible');
        }
        
        const isRecommendationBadge = isCpbProductDetailPage();
        const showDecorationOnPlp = isCpbProductListPage();
        const processedProducts = new Set();
        
        productLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || isExcludedProductBadgeLink(link)) return;
            
            const productContainer = link.closest('.design-item-wrapper, .product-item, .product, [class*="product"], [class*="item"], [class*="card"], [class*="tile"]') || link.parentElement;
            if (!productContainer) return;
            
            const productKey = `${href}-${Math.round(productContainer.getBoundingClientRect().top)}`;
            if (processedProducts.has(productKey)) return;
            
            const item = resolveCpbBadgeItem(link, productItems);
            if (!item) return;

            const hasIdBadge = productContainer.querySelector('.cp-product-id-badge');
            const hasDecorationBadge = productContainer.querySelector('.cp-cpb-decoration-badge');

            if (!hasIdBadge) {
                const badgeContent = buildCpbBadgeContent(item, {
                    isRecommendation: isRecommendationBadge
                });
                if (badgeContent) {
                    const badge = createListPageProductBadge(badgeContent, badgeEnabled);
                    attachBadgeToProductContainer(productContainer, link, badge);
                }
            }

            if (showDecorationOnPlp && !hasDecorationBadge) {
                const decorationInfo = getCpbDecorationInfo(item);
                if (decorationInfo) {
                    const decorationBadge = createCpbDecorationBadge(decorationInfo, badgeEnabled);
                    attachCpbDecorationBadge(productContainer, link, decorationBadge);
                }
            }

            processedProducts.add(productKey);
        });
        
        const pageType = isCpbProductDetailPage() ? 'PDP recommendations' : 'PLP';
        console.log(`CPB ${pageType}: processed ${processedProducts.size} product badges`);
    }
    
    async function displayCpbProductIdsOnListPage() {
        return displayCpbProductBadges();
    }
    
    // CPB product detail page (e.g. /business/product-12001-design-548950 or /business/product-3159?did=503620)
    function isCpbProductDetailPage() {
        return parseCpbProductUrl() !== null;
    }
    
    function formatProductInfoField(value) {
        if (value === undefined || value === null) return 'Not found';
        return value === '' ? 'N/A' : String(value);
    }
    
    function extractCpbProductInfoFromOptions(fullObject) {
        if (!fullObject) return null;
        
        const defaultDesign = fullObject.default_design || {};
        const defaultSku = fullObject.default_sku || {};
        
        return {
            category_id: fullObject.category_id,
            design_id: defaultDesign.id ?? fullObject.design_id,
            product_id: fullObject.product_id,
            option_id: fullObject.option_id ?? fullObject.default_option_id ?? defaultSku.option_id,
            product_type_id: fullObject.product_type_id,
            sku_id: defaultSku.sku_id,
            design_group_id: defaultDesign.design_group_id
        };
    }
    
    function buildCpbProductInfoHtml(result) {
        let html = `
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
        
        const cpbInfo = extractCpbProductInfoFromOptions(result.productsData?.full_object);
        
        html += createInfoItem('Category ID:', formatProductInfoField(cpbInfo?.category_id ?? result.productsData?.category_id));
        html += createInfoItem('Design ID:', formatProductInfoField(cpbInfo?.design_id ?? result.designId));
        html += createInfoItem('Product ID:', formatProductInfoField(cpbInfo?.product_id ?? result.cpProductId));
        html += createInfoItem('Option ID:', formatProductInfoField(cpbInfo?.option_id));
        html += createInfoItem('Product Type ID:', formatProductInfoField(cpbInfo?.product_type_id));
        html += createInfoItem('sku_id:', formatProductInfoField(cpbInfo?.sku_id));
        html += createInfoItem('Design Group ID:', formatProductInfoField(cpbInfo?.design_group_id));
        html += createInfoItem('Site ID:', CONFIG.getSiteId('CPB'));
        
        html += `</div>`;
        return html;
    }
    
    // Function to check if we're on a product detail page
    function isProductDetailPage() {
        const currentUrl = window.location.href;
        // CP product detail: /+xxx,yyy
        // CPB product detail: /business/product-{productId}-design-{designId} or /business/product-{productId}?did={designId}
        return /\/\+[^,]*,\d+/.test(currentUrl) || isCpbProductDetailPage();
    }
    
    let lastDefaultSkuFingerprint = null;
    let productOptionWatcherInitialized = false;
    
    function readProductOptionsFromPageContext() {
        try {
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    let dataFound = null;
                    if (typeof product_options !== 'undefined') {
                        dataFound = product_options;
                    } else if (typeof window.product_options !== 'undefined') {
                        dataFound = window.product_options;
                    } else if (typeof productDetail !== 'undefined' && productDetail.options) {
                        dataFound = productDetail.options;
                    }
                    if (dataFound) {
                        document.documentElement.setAttribute('data-cp-product-options-refresh', JSON.stringify(dataFound));
                    }
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
            
            const dataAttr = document.documentElement.getAttribute('data-cp-product-options-refresh');
            if (dataAttr) {
                document.documentElement.removeAttribute('data-cp-product-options-refresh');
                return JSON.parse(dataAttr);
            }
        } catch (e) {
            console.log('Error reading product_options from page context:', e);
        }
        return null;
    }
    
    function getDefaultSkuFingerprint(options) {
        if (!options || !options.default_sku) return null;
        const ds = options.default_sku;
        return [ds.sku, ds.sku_id, ds.option_id, ds.vendor_id].join('|');
    }
    
    function buildProductsDataFromOptions(parsed, designId, existingProductsData) {
        const extractedFields = {
            category_id: parsed.category_id,
            is_out_of_stock: parsed.is_out_of_stock,
            cp_product_id: existingProductsData?.cp_product_id ?? null,
            full_object: parsed
        };
        
        try {
            if (parsed.product_design_objects && typeof parsed.product_design_objects === 'object' && designId) {
                const designObject = parsed.product_design_objects[designId];
                if (designObject && designObject.cp_product_id !== undefined) {
                    extractedFields.cp_product_id = designObject.cp_product_id;
                }
            }
        } catch (e) {
            console.log('Error building productsData from options:', e);
        }
        
        return extractedFields;
    }
    
    function refreshProductOptionsData(force = false) {
        if (!isProductDetailPage()) return;
        
        const options = readProductOptionsFromPageContext();
        if (!options) return;
        
        const fingerprint = getDefaultSkuFingerprint(options);
        if (!force && fingerprint === lastDefaultSkuFingerprint) return;
        lastDefaultSkuFingerprint = fingerprint;
        
        chrome.storage.local.get(
            ['url', 'designerName', 'designerLink', 'designId', 'cpProductId', 'productImageId', 'productsData'],
            function(existing) {
                const productsData = buildProductsDataFromOptions(
                    options,
                    existing.designId,
                    existing.productsData
                );
                
                const updatedData = {
                    ...existing,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    productsData
                };
                
                chrome.storage.local.set(updatedData, function() {
                    console.log('✅ Product options refreshed, default_sku fingerprint:', fingerprint);
                    chrome.runtime.sendMessage({
                        type: 'PRODUCT_INFO_FOUND',
                        data: updatedData
                    }).catch(() => {});
                    updateFloatingWindowContent();
                });
            }
        );
    }
    
    function initProductOptionChangeWatcher() {
        if (productOptionWatcherInitialized || !isProductDetailPage()) return;
        productOptionWatcherInitialized = true;
        
        const options = readProductOptionsFromPageContext();
        if (options) {
            lastDefaultSkuFingerprint = getDefaultSkuFingerprint(options);
        }
        
        const scheduleRefresh = () => {
            setTimeout(() => refreshProductOptionsData(), 300);
            setTimeout(() => refreshProductOptionsData(), 800);
        };
        
        document.addEventListener('click', function(e) {
            const optionEl = e.target.closest(
                '[data-option-id], [data-attr], [data-attribute], .product-option, .option-item, .option-value, .attr-item, .product-attr, .size-option, .variant-option, button[class*="option"], button[class*="attr"], li[class*="option"], li[class*="attr"]'
            );
            if (optionEl) {
                scheduleRefresh();
            }
        }, true);
        
        document.addEventListener('change', function(e) {
            if (e.target.matches('select, input[type="radio"], input[type="checkbox"]')) {
                scheduleRefresh();
            }
        }, true);
        
        let lastOptionUrl = window.location.href;
        setInterval(() => {
            if (!isProductDetailPage()) return;
            
            if (window.location.href !== lastOptionUrl) {
                lastOptionUrl = window.location.href;
                setTimeout(() => refreshProductOptionsData(true), 300);
            }
            
            refreshProductOptionsData();
        }, 1500);
        
        console.log('✅ Product option change watcher initialized');
    }
    
    executeExtraction();
    
    // Function to check if we're on a design library page
    function isDesignLibraryPage() {
        const currentUrl = window.location.href;
        // Design library page patterns:
        // /sell/design/library
        return /\/sell\/design\/library/.test(currentUrl);
    }
    
    // Function to extract designId from image URL
    function extractDesignIdFromImage(img) {
        if (!img) return null;
        
        let src = img.getAttribute('src') || '';
        const dataSrc = img.getAttribute('data-src') || '';
        const dataLazySrc = img.getAttribute('data-lazy-src') || '';
        const dataSrcset = img.getAttribute('data-srcset') || '';
        const ref = img.getAttribute('ref') || '';
        const dataTempSrc = img.getAttribute('data-temp-src') || '';
        const dataBgImage = img.getAttribute('data-bg-image') || '';
        
        if (src.startsWith('data:image/gif') || src.includes('placeholder') || src.includes('1x1')) {
            src = '';
        }
        
        let currentSrc = img.currentSrc || img.src || '';
        if (currentSrc.startsWith('data:image/gif') || currentSrc.includes('placeholder')) {
            currentSrc = '';
        }
        const naturalSrc = img.naturalSrc || '';
        
        const urlToCheck = src + ' ' + dataSrc + ' ' + dataLazySrc + ' ' + dataSrcset + ' ' + ref + ' ' + currentSrc + ' ' + naturalSrc + ' ' + dataTempSrc + ' ' + dataBgImage;
        
        const designMatch = urlToCheck.match(/\/designs\/(\d{10,})/);
        if (designMatch) {
            return designMatch[1];
        }
        
        const previewMatch = urlToCheck.match(/\/(?:preview|image)\/[^/]*-(\d{10,})-/);
        if (previewMatch) {
            return previewMatch[1];
        }
        
        const generalMatch = urlToCheck.match(/-(\d{10,})-/);
        if (generalMatch) {
            return generalMatch[1];
        }
        
        const queryMatch = urlToCheck.match(/(?:designId|design_id)[=:](\d{10,})/i);
        if (queryMatch) {
            return queryMatch[1];
        }
        
        return null;
    }
    
    // Function to update badge visibility based on settings
    function updateBadgeVisibility(enabled) {
        const badges = document.querySelectorAll('.cp-product-id-badge, .cp-cpb-decoration-badge');
        badges.forEach(badge => {
            if (enabled) {
                badge.style.display = badge.classList.contains('cp-cpb-decoration-badge') ? 'inline-flex' : 'block';
                badge.style.visibility = 'visible';
            } else {
                badge.style.display = 'none';
                badge.style.visibility = 'hidden';
            }
        });
        console.log(`Badge visibility updated: ${enabled ? 'shown' : 'hidden'}, found ${badges.length} badges`);
    }
    
    // Function to check if badge display is enabled
    async function isBadgeDisplayEnabled() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['badgeDisplayEnabled'], (result) => {
                // Default to true if not set
                resolve(result.badgeDisplayEnabled !== false);
            });
        });
    }
    
    // Function to update design badge visibility based on settings
    function updateDesignBadgeVisibility(enabled) {
        const badges = document.querySelectorAll('.cp-design-image-id-badge');
        badges.forEach(badge => {
            if (enabled) {
                badge.style.display = 'block';
                badge.style.visibility = 'visible';
            } else {
                badge.style.display = 'none';
                badge.style.visibility = 'hidden';
            }
        });
        console.log(`Design badge visibility updated: ${enabled ? 'shown' : 'hidden'}, found ${badges.length} badges`);
    }
    
    // Function to check if design badge display is enabled
    async function isDesignBadgeDisplayEnabled() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['designBadgeDisplayEnabled'], (result) => {
                // Default to true if not set
                resolve(result.designBadgeDisplayEnabled !== false);
            });
        });
    }
    
    // Function to display Image IDs on design library page
    async function displayDesignImageIdsOnLibraryPage() {
        if (!isDesignLibraryPage()) {
            return;
        }
        
        // Check if design badge display is enabled
        const badgeEnabled = await isDesignBadgeDisplayEnabled();
        if (!badgeEnabled) {
            // Hide existing badges if setting is disabled
            updateDesignBadgeVisibility(false);
            return;
        }
        
        // Find all design items with data-drag-design attribute
        const designItems = document.querySelectorAll('[data-drag-design]');
        
        console.log(`Design Library: Found ${designItems.length} design items with data-drag-design`);
        
        // Track processed designs to avoid duplicates
        const processedDesigns = new Set();
        
        designItems.forEach((designItem, index) => {
            const imageId = designItem.getAttribute('data-drag-design');
            if (!imageId) return;
            
            // Create unique identifier for this design
            const designRect = designItem.getBoundingClientRect();
            const designKey = `${imageId}-${designRect.top}-${designRect.left}`;
            
            // Skip if already processed
            if (processedDesigns.has(designKey)) {
                return;
            }
            
            // Skip if badge already exists
            const existingBadge = designItem.querySelector('.cp-design-image-id-badge');
            if (existingBadge) {
                processedDesigns.add(designKey);
                return;
            }
            
            // Mark as processing
            processedDesigns.add(designKey);
            
            // Find the image first to calculate proper positioning
            const img = designItem.querySelector('img');
            
            // Create Image ID badge
            const badge = document.createElement('div');
            badge.className = 'cp-design-image-id-badge';
            badge.textContent = `Image ID: ${imageId}`;
            
            // Badge style - positioned at the bottom left of the image container
            badge.style.cssText = `
                position: absolute;
                bottom: 5px;
                left: 5px;
                background: rgba(119, 165, 233, 0.4);
                color: #333;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                z-index: 1001;
                pointer-events: auto;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.4;
                white-space: pre-line;
                text-align: left;
                max-width: 150px;
                word-wrap: break-word;
                cursor: pointer;
                user-select: text;
                transition: background-color 0.2s ease, transform 0.1s ease;
                display: ${badgeEnabled ? 'block' : 'none'};
                visibility: ${badgeEnabled ? 'visible' : 'hidden'};
            `;
            
            // Hover effect
            badge.addEventListener('mouseenter', function() {
                badge.style.background = 'rgba(119, 165, 233, 0.6)';
                badge.style.transform = 'scale(1.02)';
            });
            
            badge.addEventListener('mouseleave', function() {
                badge.style.background = 'rgba(119, 165, 233, 0.4)';
                badge.style.transform = 'scale(1)';
            });
            
            // Click handler to copy Image ID
            badge.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const textToCopy = imageId;
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        // Show temporary feedback
                        const originalText = badge.textContent;
                        const originalBackground = badge.style.background;
                        badge.textContent = 'Copied!';
                        badge.style.background = 'rgba(76, 175, 80, 0.8)';
                        badge.style.transform = 'scale(1.05)';
                        setTimeout(() => {
                            badge.textContent = originalText;
                            badge.style.background = originalBackground || 'rgba(119, 165, 233, 0.4)';
                            badge.style.transform = 'scale(1)';
                        }, 1000);
                    }).catch(err => {
                        console.error('Failed to copy:', err);
                    });
                } else {
                    // Fallback: select text
                    const range = document.createRange();
                    range.selectNodeContents(badge);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            });
            
            // Prevent badge clicks from triggering other events
            badge.addEventListener('mousedown', function(e) {
                e.stopPropagation();
            });
            
            badge.addEventListener('mouseup', function(e) {
                e.stopPropagation();
            });
            
            // Find the best container for the badge - use .el-image class as the container
            let imageContainer = null;
            
            // First, try to find the .el-image element inside the design item
            const elImageContainer = designItem.querySelector('.el-image');
            if (elImageContainer) {
                imageContainer = elImageContainer;
                // Ensure container has proper positioning
                const containerStyle = window.getComputedStyle(imageContainer);
                if (containerStyle.position === 'static') {
                    imageContainer.style.position = 'relative';
                }
            } else if (img) {
                // Fallback: use the image's parent element
                let imgParent = img.parentElement;
                if (imgParent) {
                    imageContainer = imgParent;
                    const containerStyle = window.getComputedStyle(imageContainer);
                    if (containerStyle.position === 'static') {
                        imageContainer.style.position = 'relative';
                    }
                }
            }
            
            // Fallback: use the design item itself
            if (!imageContainer) {
                const containerStyle = window.getComputedStyle(designItem);
                if (containerStyle.position === 'static') {
                    designItem.style.position = 'relative';
                }
                imageContainer = designItem;
            }
            
            // Add badge to container
            if (imageContainer) {
                const existingBadgeInContainer = imageContainer.querySelector('.cp-design-image-id-badge');
                if (!existingBadgeInContainer) {
                    imageContainer.appendChild(badge);
                }
            }
            
            // Store imageId on badge for later use
            badge.setAttribute('data-image-id', imageId);
        });
    }
    
    // Function to display product IDs on product list page
    async function displayProductIdsOnListPage() {
        if (isCartPage()) {
            removeAllProductBadges();
            return;
        }
        if (!isCpProductBadgePage()) {
            return;
        }

        resetCpBadgeCachesIfUrlChanged();
        removeExcludedProductBadges();
        
        // Check if badge display is enabled
        const badgeEnabled = await isBadgeDisplayEnabled();
        if (!badgeEnabled) {
            // Hide existing badges if setting is disabled
            updateBadgeVisibility(false);
            return;
        }
        
        const onHomePage = isCpHomePage();
        const onCpPdp = isCpProductDetailPage();
        let searchRoots = [document];
        
        if (onHomePage) {
            const bestsellersSection = getBestsellersSection();
            if (!bestsellersSection) {
                console.log('CP Homepage: Bestsellers section not found yet');
                return;
            }
            const homeProductItems = await ensureCpHomeBestsellerProductItems(bestsellersSection);
            if (!homeProductItems) {
                console.log('CP Homepage: PRODUCT_ITEMS not ready yet for Bestsellers');
                return;
            }
            searchRoots = [bestsellersSection];
        } else if (onCpPdp) {
            const pdpSections = getCpPdpBadgeSections();
            if (pdpSections.length === 0) {
                console.log('CP PDP: recommendation sections not found yet');
                return;
            }

            let combinedItems = [];
            for (const section of pdpSections) {
                const items = findCpPdpSectionProductItems(section);
                if (items && items.length > 0) {
                    combinedItems = combinedItems.concat(items);
                }
            }
            if (combinedItems.length === 0) {
                console.log('CP PDP: section PRODUCT_ITEMS not ready yet');
                return;
            }
            cpPdpRecommendationProductItemsCache = combinedItems;
            searchRoots = pdpSections;
        }
        
        // Track processed products to avoid duplicates
        const processedProducts = new Set();

        for (const searchRoot of searchRoots) {
        
        // Find all product links - support multiple patterns:
        // 1. /+ pattern (regular products)
        // 2. /designer/ pattern (CYO products)
        // 3. /make/ pattern (CYO product category pages - may link to /designer/ or /+)
        // Exclude non-product pages like /make/design-your-own
        const productLinks = searchRoot.querySelectorAll('a[href*="/+"], a[href*="/designer/"], a[href*="/make/"]');
        
        // Filter out non-product links from productLinks
        const filteredProductLinks = Array.from(productLinks).filter(link => {
            const href = link.getAttribute('href');
            if (!href) return false;
            if (isExcludedProductBadgeLink(link)) return false;
            // Exclude non-product pages
            if (href.includes('/make/design-your-own') || href.includes('/make/design-your-own/')) {
                return false;
            }
            return true;
        });
        
        // Also find product cards/items that might contain product links
        // For /make/ pages, products might be in different containers
        const makePageLinks = searchRoot.querySelectorAll('.product-item a, .product-card a, [class*="product"] a, [class*="item"] a');
        const allLinks = new Set([...filteredProductLinks]);
        makePageLinks.forEach(link => {
            if (isExcludedProductBadgeLink(link)) return;
            const href = link.getAttribute('href');
            if (href && (href.includes('/+') || href.includes('/designer/') || href.includes('/make/'))) {
                // Exclude non-product pages
                if (!href.includes('/make/design-your-own') && !href.includes('/make/design-your-own/')) {
                    allLinks.add(link);
                }
            }
        });
        
        // Convert Set back to Array for forEach
        const finalProductLinks = Array.from(allLinks);
        
        // For /make/ pages, if no product links found, try to find product containers directly
        // But exclude /make/design-your-own page
        const isMakePage = /\/make\/[^/]+/.test(window.location.href);
        const isDesignYourOwnPage = window.location.href.includes('/make/design-your-own');
        if (isMakePage && !isDesignYourOwnPage && !onHomePage && !onCpPdp && finalProductLinks.length === 0) {
            // Look for product containers that might contain product images
            const productContainers = searchRoot.querySelectorAll('.product-item, .product, [class*="product"], [class*="item"], [class*="card"], [class*="design-item"]');
            productContainers.forEach(container => {
                // Check if container has product image or preview-image (but not logo)
                const images = container.querySelectorAll('img');
                let hasValidImage = false;
                for (let img of images) {
                    // Skip logo images
                    const src = (img.getAttribute('src') || '').toLowerCase();
                    const className = (img.className || '').toLowerCase();
                    const parentClass = (img.parentElement?.className || '').toLowerCase();
                    if (src.includes('logo') || className.includes('logo') || parentClass.includes('logo')) {
                        continue;
                    }
                    hasValidImage = true;
                    break;
                }
                if (hasValidImage || container.querySelector('.preview-image, [class*="image"]')) {
                    // Create a virtual link for this container
                    const virtualLink = document.createElement('a');
                    virtualLink.setAttribute('href', window.location.href);
                    virtualLink.style.display = 'none';
                    container.appendChild(virtualLink);
                    allLinks.add(virtualLink);
                }
            });
            // Update finalProductLinks
            finalProductLinks.length = 0;
            finalProductLinks.push(...Array.from(allLinks));
        }
        
        finalProductLinks.forEach((link, index) => {
            const href = link.getAttribute('href');
            if (!href || isExcludedProductBadgeLink(link)) return;
            
            // Create unique identifier for this product
            const productContainer = link.closest('.product-item, .product, [class*="product"], [class*="item"], [class*="card"]');
            const productId = productContainer ? `${href}-${productContainer.getBoundingClientRect().top}-${productContainer.getBoundingClientRect().left}` : href;
            
            // Skip if already processed
            if (processedProducts.has(productId)) {
                return;
            }
            
            // Skip if badge already exists in container
            if (productContainer) {
                const existingBadge = productContainer.querySelector('.cp-product-id-badge');
                if (existingBadge) {
                    processedProducts.add(productId);
                    return;
                }
            } else {
                const existingBadge = link.closest('.product-item, .product, [class*="product"]')?.querySelector('.cp-product-id-badge');
                if (existingBadge) {
                    processedProducts.add(productId);
                    return;
                }
            }
            
            // Mark as processing
            processedProducts.add(productId);
            
            // Check if this is a CYO product (includes /designer/ or /make/ in href, or current page is /make/)
            const isCYOProduct = href && (href.includes('/designer/') || href.includes('/make/'));
            const isMakePage = /\/make\/[^/]+/.test(window.location.href);
            
            if (isCYOProduct || isMakePage) {
                if (productContainer) {
                    const previewImage = productContainer.querySelector('.preview-image img');
                    if (!previewImage || !previewImage.src || previewImage.src.includes('data:image/gif') || previewImage.src.includes('placeholder')) {
                        // Wait for preview-image to load with retry mechanism
                        let retryCount = 0;
                        const maxRetries = 10;
                        let processed = false;
                        
                        const processWhenReady = async () => {
                            if (!processed) {
                                processed = true;
                                // Double check badge doesn't exist before processing
                                const existingBadge = productContainer.querySelector('.cp-product-id-badge');
                                if (!existingBadge) {
                                    await processProductLink(link);
                                }
                            }
                        };
                        
                        const checkPreviewImage = () => {
                            const previewImg = productContainer.querySelector('.preview-image img');
                            if (previewImg && previewImg.src && !previewImg.src.includes('data:image/gif') && !previewImg.src.includes('placeholder')) {
                                // Preview image loaded, process this product
                                processWhenReady();
                            } else if (retryCount < maxRetries) {
                                retryCount++;
                                setTimeout(checkPreviewImage, 300);
                            } else {
                                // Max retries reached, process anyway
                                processWhenReady();
                            }
                        };
                        
                        // Start checking after initial delay
                        setTimeout(checkPreviewImage, 500);
                        
                        // Also observe for preview-image addition
                        const previewObserver = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                mutation.addedNodes.forEach((node) => {
                                    if (node.nodeType === 1) {
                                        if (node.classList && node.classList.contains('preview-image')) {
                                            const img = node.querySelector('img');
                                            if (img && img.src && !img.src.includes('data:image/gif') && !img.src.includes('placeholder')) {
                                                previewObserver.disconnect();
                                                processWhenReady();
                                            }
                                        }
                                        if (node.querySelector && node.querySelector('.preview-image img')) {
                                            const img = node.querySelector('.preview-image img');
                                            if (img && img.src && !img.src.includes('data:image/gif') && !img.src.includes('placeholder')) {
                                                previewObserver.disconnect();
                                                processWhenReady();
                                            }
                                        }
                                    }
                                });
                            });
                        });
                        
                        previewObserver.observe(productContainer, {
                            childList: true,
                            subtree: true
                        });
                        
                        // Disconnect observer after timeout
                        setTimeout(() => {
                            previewObserver.disconnect();
                            if (retryCount >= maxRetries && !processed) {
                                processWhenReady();
                            }
                        }, 5000);
                        
                        return; // Skip immediate processing, wait for retry
                    }
                }
            }
            
            // Process non-CYO products or CYO products with preview-image already loaded
            // For /make/ pages, also check if there's a product displayed directly on the page
            if (isMakePage && !href) {
                // On /make/ pages, product might be displayed directly without a link
                // Try to find product container and process it
                if (productContainer) {
                    // Check if badge already exists
                    const existingBadge = productContainer.querySelector('.cp-product-id-badge');
                    if (!existingBadge) {
                        // Create a virtual link for processing
                        const virtualLink = document.createElement('a');
                        virtualLink.setAttribute('href', window.location.href);
                        virtualLink.style.display = 'none';
                        productContainer.appendChild(virtualLink);
                        processProductLink(virtualLink).catch(err => console.error('Error processing virtual link:', err));
                    }
                }
            } else {
                // Double check before processing
                if (productContainer) {
                    const existingBadge = productContainer.querySelector('.cp-product-id-badge');
                    if (!existingBadge) {
                        processProductLink(link).catch(err => console.error('Error processing product link:', err));
                    }
                } else {
                    processProductLink(link).catch(err => console.error('Error processing product link:', err));
                }
            }
        });
        }
    }
    
    // Helper function to process a single product link
    async function processProductLink(link) {
        if (isExcludedProductBadgeLink(link)) {
            return;
        }

        // Find product container first
        const productContainer = link.closest('.product-item, .product, [class*="product"], [class*="item"], [class*="card"]');
        
        // Skip if badge already exists in container
        if (productContainer) {
            const existingBadge = productContainer.querySelector('.cp-product-id-badge');
            if (existingBadge) {
                return; // Badge already exists, skip
            }
        } else {
            // Fallback: check in link's parent
            const existingBadge = link.closest('.product-item, .product, [class*="product"]')?.querySelector('.cp-product-id-badge');
            if (existingBadge) return;
        }
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Exclude non-product pages
        if (href.includes('/make/design-your-own') || href.includes('/make/design-your-own/')) {
            return;
        }
        
        // Find the product image (img tag) - priority: preview-image class for CYO products
        let productImage = null;
        
        // Helper function to check if an image is a logo
        function isLogoImage(img) {
            if (!img) return false;
            const src = (img.getAttribute('src') || '').toLowerCase();
            const dataSrc = (img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '').toLowerCase();
            const className = (img.className || '').toLowerCase();
            const alt = (img.getAttribute('alt') || '').toLowerCase();
            const id = (img.id || '').toLowerCase();
            const parentClass = (img.parentElement?.className || '').toLowerCase();
            
            // Check for logo indicators
            return src.includes('logo') || 
                   src.includes('cp-logo') || 
                   src.includes('cafepress-logo') ||
                   dataSrc.includes('logo') ||
                   dataSrc.includes('cp-logo') ||
                   className.includes('logo') ||
                   alt.includes('logo') ||
                   id.includes('logo') ||
                   parentClass.includes('logo');
        }
        
        // For CYO products, prioritize finding img in class="preview-image"
        // Also handle /make/ pages which are CYO product category pages
        const isCYO = href.includes('/designer/') || href.includes('/make/');
        const isMakePage = /\/make\/[^/]+/.test(window.location.href);
        
        if (isCYO || isMakePage) {
                // First, try to find preview-image class within link or nearby
                const previewImageContainer = link.querySelector('.preview-image') || 
                                            link.closest('.product-item, .product, [class*="product"]')?.querySelector('.preview-image');
                
                if (previewImageContainer) {
                    productImage = previewImageContainer.querySelector('img');
                    if (productImage) {
                        // Skip if it's a logo
                        if (isLogoImage(productImage)) {
                            productImage = null;
                        } else {
                            const src = productImage.getAttribute('src') || '';
                            // Verify it's not a placeholder
                            if (!src.startsWith('data:image/gif') && !src.includes('placeholder') && !src.includes('1x1')) {
                                // Found valid preview-image img
                            } else {
                                productImage = null; // Continue searching
                            }
                        }
                    }
                }
            }
            
            // If not found in preview-image, search within the link
            if (!productImage) {
                const linkImg = link.querySelector('img');
                if (linkImg && !isLogoImage(linkImg)) {
                    productImage = linkImg;
                }
            }
            
            // If not found in link, search in parent elements
            if (!productImage) {
                let parent = link.parentElement;
                let depth = 0;
                const maxDepth = 5;
                while (parent && depth < maxDepth) {
                    // For CYO products, also check for preview-image in parent
                    if (href.includes('/designer/')) {
                        const previewImageContainer = parent.querySelector('.preview-image');
                        if (previewImageContainer) {
                            const img = previewImageContainer.querySelector('img');
                            if (img && !isLogoImage(img)) {
                                const src = img.getAttribute('src') || '';
                                if (!src.startsWith('data:image/gif') && !src.includes('placeholder') && !src.includes('1x1')) {
                                    productImage = img;
                                    break;
                                }
                            }
                        }
                    }
                    
                    const parentImg = parent.querySelector('img');
                    if (parentImg && !isLogoImage(parentImg)) {
                        productImage = parentImg;
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
            }
            
            // For CYO products, find real image if current is a placeholder
            if (productImage && (isCYO || isMakePage)) {
                const src = productImage.getAttribute('src') || '';
                const isPlaceholder = src.startsWith('data:image/gif') || src.includes('placeholder') || src.includes('1x1');
                
                if (isPlaceholder) {
                    // First, try to find preview-image class which should have the real image
                    const previewImageContainer = link.closest('.product-item, .product, [class*="product"]')?.querySelector('.preview-image');
                    if (previewImageContainer) {
                        const previewImg = previewImageContainer.querySelector('img');
                        if (previewImg && !isLogoImage(previewImg)) {
                            const previewSrc = previewImg.getAttribute('src') || '';
                            const previewDataSrc = previewImg.getAttribute('data-src') || previewImg.getAttribute('data-lazy-src') || '';
                            if (previewSrc && !previewSrc.startsWith('data:image/gif') && !previewSrc.includes('placeholder') && !previewSrc.includes('1x1')) {
                                productImage = previewImg;
                            } else if (previewDataSrc && !previewDataSrc.startsWith('data:')) {
                                previewImg.setAttribute('data-temp-src', previewDataSrc);
                                productImage = previewImg;
                            }
                        }
                    }
                    
                    // If still placeholder, try data attributes
                    if (productImage) {
                        const currentSrc = productImage.getAttribute('src') || '';
                        const stillPlaceholder = currentSrc.startsWith('data:image/gif') || currentSrc.includes('placeholder') || currentSrc.includes('1x1');
                        
                        if (stillPlaceholder) {
                            const dataLazySrc = productImage.getAttribute('data-lazy-src') || '';
                            const dataSrc = productImage.getAttribute('data-src') || '';
                            const dataSrcset = productImage.getAttribute('data-srcset') || '';
                            
                            if (dataLazySrc && !dataLazySrc.startsWith('data:')) {
                                productImage.setAttribute('data-temp-src', dataLazySrc);
                            } else if (dataSrc && !dataSrc.startsWith('data:')) {
                                productImage.setAttribute('data-temp-src', dataSrc);
                            } else if (dataSrcset) {
                                const firstSrcset = dataSrcset.split(',')[0].trim().split(' ')[0];
                                if (firstSrcset && !firstSrcset.startsWith('data:')) {
                                    productImage.setAttribute('data-temp-src', firstSrcset);
                                }
                            }
                            
                            // Search for other images in nearby containers
                            let container = productImage.parentElement;
                            for (let i = 0; i < 5 && container; i++) {
                                // Prioritize preview-image in container
                                const containerPreview = container.querySelector('.preview-image');
                                if (containerPreview) {
                                    const previewImg = containerPreview.querySelector('img');
                                    if (previewImg && !isLogoImage(previewImg)) {
                                        const previewSrc = previewImg.getAttribute('src') || '';
                                        if (previewSrc && !previewSrc.startsWith('data:image/gif') && !previewSrc.includes('placeholder')) {
                                            productImage = previewImg;
                                            break;
                                        }
                                    }
                                }
                                
                                const otherImages = container.querySelectorAll('img:not([src*="data:image/gif"])');
                                for (let otherImg of otherImages) {
                                    if (isLogoImage(otherImg)) continue;
                                    const otherSrc = otherImg.getAttribute('src') || '';
                                    const otherDataSrc = otherImg.getAttribute('data-src') || otherImg.getAttribute('data-lazy-src') || '';
                                    if ((otherSrc && !otherSrc.startsWith('data:') && !otherSrc.includes('placeholder')) ||
                                        (otherDataSrc && !otherDataSrc.startsWith('data:'))) {
                                        productImage = otherImg;
                                        break;
                                    }
                                }
                                
                                const bgImage = window.getComputedStyle(container).backgroundImage;
                                if (bgImage && bgImage !== 'none' && !bgImage.includes('data:')) {
                                    const bgMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
                                    if (bgMatch && bgMatch[1]) {
                                        productImage.setAttribute('data-bg-image', bgMatch[1]);
                                    }
                                }
                                
                                container = container.parentElement;
                            }
                        }
                    }
                }
            }
            
        // For non-CYO products, require image to exist
        if (!productImage && !href.includes('/designer/')) {
            return;
        }
        
        // Extract designId from image URL (primary method)
        let designIdFromImage = null;
        if (productImage) {
            designIdFromImage = extractDesignIdFromImage(productImage);
        }
        
        // For CYO products, try to extract from data attributes if not found in src
        if (href.includes('/designer/') && !designIdFromImage) {
                // Helper function to extract designId from URL string
                function extractDesignIdFromUrlString(urlString) {
                    if (!urlString) return null;
                    const designMatch = urlString.match(/\/designs\/(\d{10,})/);
                    if (designMatch) return designMatch[1];
                    const previewMatch = urlString.match(/\/(?:preview|image)\/[^/]*-(\d{10,})-/);
                    if (previewMatch) return previewMatch[1];
                    const generalMatch = urlString.match(/-(\d{10,})-/);
                    if (generalMatch) return generalMatch[1];
                    return null;
                }
                
                if (productImage) {
                    const src = productImage.getAttribute('src') || '';
                    const isPlaceholder = src.startsWith('data:image/gif') || src.includes('placeholder');
                    
                    // Try data attributes for lazy-loaded images
                    const dataLazySrc = productImage.getAttribute('data-lazy-src') || '';
                    const dataSrc = productImage.getAttribute('data-src') || '';
                    const dataSrcset = productImage.getAttribute('data-srcset') || '';
                    
                    if (dataLazySrc) {
                        designIdFromImage = extractDesignIdFromUrlString(dataLazySrc);
                    }
                    if (!designIdFromImage && dataSrc) {
                        designIdFromImage = extractDesignIdFromUrlString(dataSrc);
                    }
                    if (!designIdFromImage && dataSrcset) {
                        const srcsetUrls = dataSrcset.split(',');
                        for (let srcsetUrl of srcsetUrls) {
                            const url = srcsetUrl.trim().split(' ')[0];
                            designIdFromImage = extractDesignIdFromUrlString(url);
                            if (designIdFromImage) break;
                        }
                    }
                    
                    // Also check if src itself contains designId (even if not a placeholder)
                    // This handles cases where src is set but extractDesignIdFromImage didn't work
                    if (!designIdFromImage && src && !isPlaceholder) {
                        designIdFromImage = extractDesignIdFromUrlString(src);
                    }
                }
                
                // If still no designId, try to find image in nearby elements
                // Priority: check preview-image class for CYO products
                if (!designIdFromImage) {
                    // First, try preview-image class
                    const previewImageContainer = link.closest('.product-item, .product, [class*="product"]')?.querySelector('.preview-image');
                    if (previewImageContainer) {
                        const img = previewImageContainer.querySelector('img');
                        if (img && !isLogoImage(img)) {
                            const imgSrc = img.getAttribute('src') || '';
                            const imgDataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
                            if (imgSrc && !imgSrc.startsWith('data:image/gif') && !imgSrc.includes('placeholder')) {
                                designIdFromImage = extractDesignIdFromImage(img);
                            } else if (imgDataSrc) {
                                designIdFromImage = extractDesignIdFromUrlString(imgDataSrc);
                            }
                        }
                    }
                    
                    // Fallback: search in nearby containers
                    if (!designIdFromImage) {
                        let container = link.parentElement;
                        for (let i = 0; i < 5 && container && container !== document.body; i++) {
                            const images = container.querySelectorAll('img');
                            for (let img of images) {
                                if (isLogoImage(img)) continue;
                                const imgSrc = img.getAttribute('src') || '';
                                const imgDataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
                                if (imgSrc && !imgSrc.startsWith('data:image/gif') && !imgSrc.includes('placeholder')) {
                                    designIdFromImage = extractDesignIdFromImage(img);
                                    if (designIdFromImage) break;
                                } else if (imgDataSrc) {
                                    designIdFromImage = extractDesignIdFromUrlString(imgDataSrc);
                                    if (designIdFromImage) break;
                                }
                            }
                            if (designIdFromImage) break;
                            container = container.parentElement;
                        }
                    }
                }
            }
            
            // Fallback: Extract productId from URL if no designId found in image
            let productId = null;
            if (!designIdFromImage) {
                productId = extractProductIdFromUrl(href);
            }
            
            // Try to get PTN, product_id, and option_id from PRODUCT_ITEMS array
            let ptn = null;
            let productIdValue = null;
            let optionId = null;
            let matchedDesignId = null;
            
            try {
                const productItems = findProductItemsArray();
                if (productItems) {
                    const designIdsToTry = [];
                    
                    if (designIdFromImage) {
                        const imageDesignIdNum = parseInt(designIdFromImage);
                        designIdsToTry.push(imageDesignIdNum + 100000000000);
                        designIdsToTry.push(imageDesignIdNum);
                    }
                    
                    if (productId && !isNaN(productId)) {
                        const productIdNum = parseInt(productId);
                        designIdsToTry.push(productIdNum + 100000000000);
                        designIdsToTry.push(productIdNum);
                    }
                    
                    if (designIdsToTry.length > 0) {
                        const uniqueDesignIds = [...new Set(designIdsToTry)];
                        for (let i = 0; i < productItems.length; i++) {
                            const item = productItems[i];
                            if (!item) continue;
                            
                            const itemDesignId = item.design_id;
                            for (let tryId of uniqueDesignIds) {
                                if (itemDesignId === tryId || String(itemDesignId) === String(tryId)) {
                                    ptn = item.product_type_no;
                                    productIdValue = item.product_id;
                                    optionId = item.option_id;
                                    matchedDesignId = itemDesignId;
                                    break;
                                }
                            }
                            if (ptn !== null && ptn !== undefined) {
                                break;
                            }
                        }
                    }
                    
                    // For CYO products, try matching by attr2 parameter if no designId found
                    if (href.includes('/designer/') && designIdsToTry.length === 0) {
                        const attr2Match = href.match(/[?&]attr2=(\d+)/);
                        if (attr2Match) {
                            for (let i = 0; i < productItems.length; i++) {
                                const item = productItems[i];
                                if (!item) continue;
                                
                                if ((item.option_id && String(item.option_id) === attr2Match[1]) ||
                                    (item.product_id && String(item.product_id) === attr2Match[1])) {
                                    ptn = item.product_type_no;
                                    productIdValue = item.product_id;
                                    optionId = item.option_id;
                                    matchedDesignId = item.design_id;
                                    break;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Silently fail, just proceed without data
            }
            
            // Build badge content
            // Priority: use design_id to avoid duplication with ProductID
            // If design_id (matchedDesignId) is available, use it; otherwise use designIdFromImage
            let displayId = null;
            if (matchedDesignId) {
                // Use matched design_id from PRODUCT_ITEMS array (most accurate)
                displayId = matchedDesignId.toString();
            } else if (designIdFromImage) {
                // Use design_id extracted from image URL
                displayId = designIdFromImage.toString();
            } else if (productIdValue && productIdValue !== productId) {
                // Only use productIdValue if it's different from productId to avoid duplication
                displayId = productIdValue.toString();
            } else if (productId) {
                displayId = productId;
            } else {
                displayId = (isCYO || isMakePage) ? 'CYO' : 'N/A';
            }
            let badgeContent = `ID: ${displayId}`;
            if (ptn !== null && ptn !== undefined) {
                badgeContent += `\nPTN: ${ptn}`;
            } else {
                badgeContent += `\nPTN: N/A`;
            }
            if (productIdValue !== null && productIdValue !== undefined) {
                badgeContent += `\nProductID: ${productIdValue}`;
            } else {
                badgeContent += `\nProductID: N/A`;
            }
            if (optionId !== null && optionId !== undefined) {
                badgeContent += `\nOptionID: ${optionId}`;
            } else {
                badgeContent += `\nOptionID: N/A`;
            }
            
            // Create product ID badge - unified style for both CYO and regular products
            const badge = document.createElement('div');
            badge.className = 'cp-product-id-badge';
            badge.textContent = badgeContent;
            
            // Get badge display setting synchronously (we already checked it before creating badge)
            // But apply it immediately to avoid flash
            const badgeEnabled = await isBadgeDisplayEnabled();
            
            // Unified badge style for both CYO and regular products to ensure consistency
            badge.style.cssText = `
                position: absolute;
                bottom: 5px;
                left: 5px;
                background: rgba(119, 165, 233, 0.4);
                color: #333;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                z-index: 1001;
                pointer-events: auto;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.4;
                white-space: pre-line;
                text-align: left;
                max-width: 150px;
                word-wrap: break-word;
                cursor: pointer;
                user-select: text;
                transition: background-color 0.2s ease, transform 0.1s ease;
                display: ${badgeEnabled ? 'block' : 'none'};
                visibility: ${badgeEnabled ? 'visible' : 'hidden'};
            `;
            
            // Unified hover effect for both CYO and regular products
            badge.addEventListener('mouseenter', function() {
                badge.style.background = 'rgba(119, 165, 233, 0.6)';
                badge.style.transform = 'scale(1.02)';
            });
            
            badge.addEventListener('mouseleave', function() {
                badge.style.background = 'rgba(119, 165, 233, 0.4)';
                badge.style.transform = 'scale(1)';
            });
            
            // Add click handler to prevent navigation and enable copying
            badge.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get stored values from badge attributes
                const storedIdentifier = badge.getAttribute('data-identifier');
                const storedMatchedDesignId = badge.getAttribute('data-matched-design-id');
                
                // Calculate DesignId - use matched designId if available, otherwise use stored identifier
                let designId = storedMatchedDesignId;
                if (!designId && storedIdentifier) {
                    // If stored identifier is a number, it might be productId - add offset
                    if (!isNaN(storedIdentifier)) {
                        designId = (parseInt(storedIdentifier) + 100000000000).toString();
                    } else {
                        designId = storedIdentifier;
                    }
                }
                
                // Read current badge content to get all information (including updated values)
                const badgeText = badge.textContent;
                const lines = badgeText.split('\n');
                
                // Build text to copy with all available information
                let textToCopy = badgeText.split('\n')[0]; // Use first line as ID
                if (designId) {
                    textToCopy += `\nDesignId: ${designId}`;
                }
                
                // Extract PTN, ProductID, and OptionID from badge text if available
                for (let line of lines) {
                    if (line.includes('PTN:')) {
                        textToCopy += `\n${line.trim()}`;
                    } else if (line.includes('ProductID:')) {
                        textToCopy += `\n${line.trim()}`;
                    } else if (line.includes('OptionID:')) {
                        textToCopy += `\n${line.trim()}`;
                    }
                }
                
                // Unified click feedback for both CYO and regular products
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        // Show temporary feedback - unified style for all products
                        const originalText = badge.textContent;
                        const originalBackground = badge.style.background;
                        badge.textContent = 'Copied!';
                        badge.style.background = 'rgba(76, 175, 80, 0.8)';
                        badge.style.transform = 'scale(1.05)';
                        setTimeout(() => {
                            badge.textContent = originalText;
                            badge.style.background = originalBackground || 'rgba(119, 165, 233, 0.4)';
                            badge.style.transform = 'scale(1)';
                        }, 1000);
                    }).catch(err => {
                        console.error('Failed to copy:', err);
                    });
                } else {
                    // Fallback: select text
                    const range = document.createRange();
                    range.selectNodeContents(badge);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            });
            
            // Prevent badge clicks from triggering link navigation
            badge.addEventListener('mousedown', function(e) {
                e.stopPropagation();
            });
            
            badge.addEventListener('mouseup', function(e) {
                e.stopPropagation();
            });
            
            // Find the best container for the badge
            let imageContainer = null;
            
            if (productImage) {
                imageContainer = productImage.parentElement;
                
                // If the image is directly inside a link, use the link as container
                if (imageContainer === link && imageContainer.tagName === 'A') {
                    const linkStyle = window.getComputedStyle(imageContainer);
                    if (linkStyle.position === 'static') {
                        imageContainer.style.position = 'relative';
                    }
                } else {
                    // Look for the closest ancestor with relative/absolute positioning
                    let ancestor = imageContainer;
                    let foundPositioned = false;
                    
                    while (ancestor && ancestor !== document.body) {
                        const ancestorStyle = window.getComputedStyle(ancestor);
                        if (ancestorStyle.position === 'relative' || ancestorStyle.position === 'absolute') {
                            imageContainer = ancestor;
                            foundPositioned = true;
                            break;
                        }
                        ancestor = ancestor.parentElement;
                    }
                    
                    if (!foundPositioned) {
                        imageContainer = productImage.parentElement;
                        const containerStyle = window.getComputedStyle(imageContainer);
                        if (containerStyle.position === 'static') {
                            imageContainer.style.position = 'relative';
                        }
                    }
                }
            } else {
                // For CYO products without image, find a container near the link
                // Enhanced logic to ensure CYO products always get a badge container
                let container = link.parentElement;
                let foundContainer = false;
                
                // Try to find a suitable container with better search logic
                for (let i = 0; i < 10 && container && container !== document.body; i++) {
                    // Check if this container would be suitable
                    const containerStyle = window.getComputedStyle(container);
                    const containerRect = container.getBoundingClientRect();
                    
                    // Prefer containers that have dimensions (visible containers)
                    if (containerRect.width > 0 && containerRect.height > 0) {
                        if (containerStyle.position === 'static') {
                            container.style.position = 'relative';
                        }
                        imageContainer = container;
                        foundContainer = true;
                        break;
                    }
                    
                    container = container.parentElement;
                }
                
                // Fallback: Use link's parent or link itself, or find any product container
                if (!foundContainer) {
                    // Try to find product container by class
                    const productContainer = link.closest('.product-item, .product, [class*="product"], [class*="item"]');
                    if (productContainer) {
                        const containerStyle = window.getComputedStyle(productContainer);
                        if (containerStyle.position === 'static') {
                            productContainer.style.position = 'relative';
                        }
                        imageContainer = productContainer;
                    } else {
                        // Last resort: use link's parent or link itself
                        imageContainer = link.parentElement || link;
                        const containerStyle = window.getComputedStyle(imageContainer);
                        if (containerStyle.position === 'static') {
                            imageContainer.style.position = 'relative';
                        }
                    }
                }
            }
            
            // Ensure badge is always added, especially for CYO products
            // Double check no duplicate badge exists before adding
            if (imageContainer) {
                // Check if badge already exists in this container
                const existingBadge = imageContainer.querySelector('.cp-product-id-badge');
                if (!existingBadge) {
                    imageContainer.appendChild(badge);
                } else {
                    // Badge already exists, don't add duplicate
                    return;
                }
            } else if (isCYO || isMakePage) {
                // For CYO products, always ensure badge is added even if container search fails
                // Try to use link's closest product wrapper or create a wrapper
                const fallbackContainer = link.closest('.product-item, .product, [class*="product"], [class*="item"], [class*="card"], [class*="tile"]') || 
                                          link.parentElement || 
                                          link;
                if (fallbackContainer !== link || fallbackContainer.tagName !== 'A') {
                    // Check if badge already exists
                    const existingBadge = fallbackContainer.querySelector('.cp-product-id-badge');
                    if (!existingBadge) {
                        const containerStyle = window.getComputedStyle(fallbackContainer);
                        if (containerStyle.position === 'static') {
                            fallbackContainer.style.position = 'relative';
                        }
                        fallbackContainer.appendChild(badge);
                    } else {
                        // Badge already exists, don't add duplicate
                        return;
                    }
                } else {
                    // If link itself is the only option, wrap badge in a positioned div
                    // But first check if parent already has a badge
                    const parent = link.parentElement;
                    if (parent) {
                        const existingBadge = parent.querySelector('.cp-product-id-badge');
                        if (!existingBadge) {
                            const wrapper = document.createElement('div');
                            wrapper.style.cssText = 'position: relative; display: inline-block;';
                            link.parentNode.insertBefore(wrapper, link);
                            wrapper.appendChild(link);
                            wrapper.appendChild(badge);
                        } else {
                            // Badge already exists, don't add duplicate
                            return;
                        }
                    }
                }
            }
            
            // Store designId or productId on badge for later use
            const identifierForUpdate = designIdFromImage || productId;
            if (identifierForUpdate) {
                badge.setAttribute('data-identifier', identifierForUpdate);
            }
            if (matchedDesignId) {
                badge.setAttribute('data-matched-design-id', matchedDesignId.toString());
            }
            
        // If data not found, try to update it later (for delayed loading)
        if (!ptn || productIdValue === null || optionId === null) {
            if (identifierForUpdate) {
                setTimeout(() => {
                    updateBadgeData(badge, identifierForUpdate);
                }, 2000);
                setTimeout(() => {
                    updateBadgeData(badge, identifierForUpdate);
                }, 5000);
            }
        }
    }
    
    // Function to update badge data (PTN, product_id, option_id) if PRODUCT_ITEMS becomes available later
    function updateBadgeData(badge, designId) {
        if (!badge || !designId) return;
        
        // Check if all data is already set (not N/A)
        const currentText = badge.textContent;
        if (currentText && 
            !currentText.includes('PTN: N/A') && 
            !currentText.includes('ProductID: N/A') && 
            !currentText.includes('OptionID: N/A')) {
            return; // Already has all data, no need to update
        }
        
        let ptn = null;
        let productIdValue = null;
        let optionId = null;
        try {
            // Try to find PRODUCT_ITEMS
            const windowArrays = [
                window.PRODUCT_ITEMS,
                window.product_items,
                window.productItems,
                window.products
            ].filter(arr => arr && Array.isArray(arr) && arr.length > 0);
            
            const productItems = windowArrays.length > 0 ? windowArrays[0] : null;
            
            if (productItems) {
                const designIdNum = parseInt(designId);
                const designIdsToTry = [
                    designIdNum + 100000000000, // With offset
                    designIdNum                  // Without offset
                ];
                
                for (let i = 0; i < productItems.length; i++) {
                    const item = productItems[i];
                    if (!item) continue;
                    
                    const itemDesignId = item.design_id;
                    for (let tryId of designIdsToTry) {
                        if (itemDesignId === tryId || String(itemDesignId) === String(tryId)) {
                            ptn = item.product_type_no;
                            productIdValue = item.product_id;
                            optionId = item.option_id;
                            if (ptn !== null && ptn !== undefined) {
                                // Update badge content
                                const lines = currentText.split('\n');
                                if (lines.length >= 2) {
                                    // Update PTN
                                    if (lines[1].includes('PTN: N/A') && ptn !== null && ptn !== undefined) {
                                        lines[1] = `PTN: ${ptn}`;
                                    }
                                    // Update ProductID
                                    if (lines.length >= 3 && lines[2].includes('ProductID: N/A') && productIdValue !== null && productIdValue !== undefined) {
                                        lines[2] = `ProductID: ${productIdValue}`;
                                    }
                                    // Update OptionID
                                    if (lines.length >= 4 && lines[3].includes('OptionID: N/A') && optionId !== null && optionId !== undefined) {
                                        lines[3] = `OptionID: ${optionId}`;
                                    }
                                    badge.textContent = lines.join('\n');
                                }
                                break;
                            }
                        }
                    }
                    if (ptn !== null && ptn !== undefined) {
                        break;
                    }
                }
            }
        } catch (e) {
            // Silently fail
        }
    }
    
    // Function to display category filter IDs on product list page
    function displayCategoryFilterIds() {
        if (!isProductListPage()) {
            return;
        }
        
        // Find all category filter nodes with data-filter-id
        const categoryNodes = document.querySelectorAll('.filter-group-container .category-filter-node[data-filter-id]');
        
        categoryNodes.forEach((node) => {
            // Skip if already has a filter ID badge
            if (node.querySelector('.cp-filter-id-badge')) {
                return;
            }
            
            const filterId = node.getAttribute('data-filter-id');
            if (!filterId) return;
            
            // Find the category name element (the link inside)
            const categoryLink = node.querySelector('.category-filter-name a, .row a');
            if (!categoryLink) return;
            
            // Create the filter ID badge - append inside the <a> tag to preserve layout
            const badge = document.createElement('span');
            badge.className = 'cp-filter-id-badge';
            badge.textContent = ` ${filterId}`;
            badge.title = `Click to copy`;
            badge.style.cssText = `
                color: #888;
                font-size: 11px;
                font-weight: normal;
                cursor: pointer;
            `;
            
            // Hover effect
            badge.addEventListener('mouseenter', () => {
                badge.style.color = '#667eea';
            });
            badge.addEventListener('mouseleave', () => {
                badge.style.color = '#888';
            });
            
            // Click to copy
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(filterId).then(() => {
                    const originalText = badge.textContent;
                    badge.textContent = ' ✓';
                    badge.style.color = '#4CAF50';
                    setTimeout(() => {
                        badge.textContent = originalText;
                        badge.style.color = '#888';
                    }, 1000);
                }).catch(err => {
                    console.error('Failed to copy filter ID:', err);
                });
            });
            
            // Append badge inside the category link to preserve layout
            categoryLink.appendChild(badge);
        });
    }
    
    // Initial call and observe for dynamic content
    function initProductListDisplay() {
        if (isCartPage()) {
            removeAllProductBadges();
            return;
        }
        
        const shouldShowListBadges = isCpProductBadgePage() || isCpbBadgePage() || isStiusBadgePage();
        
        // Initial check
        if (shouldShowListBadges) {
            setTimeout(() => {
                displayProductIdsOnListPage().catch(err => console.error('Error displaying product IDs:', err));
                displayCpbProductBadges().catch(err => console.error('Error displaying CPB product IDs:', err));
                displayStiusProductBadges().catch(err => console.error('Error displaying STI product IDs:', err));
                displayCategoryFilterIds(); // Also display category filter IDs
            }, 1000);
            
            // Also try when window is fully loaded
            if (document.readyState !== 'complete') {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        displayProductIdsOnListPage().catch(err => console.error('Error displaying product IDs:', err));
                        displayCpbProductBadges().catch(err => console.error('Error displaying CPB product IDs:', err));
                        displayStiusProductBadges().catch(err => console.error('Error displaying STI product IDs:', err));
                        displayCategoryFilterIds();
                    }, 500);
                }, { once: true });
            }
            
            // Retry homepage Bestsellers badges while section loads asynchronously
            if (isCpHomePage()) {
                [2000, 4000, 6000, 8000, 10000, 15000].forEach(delay => {
                    setTimeout(() => {
                        displayProductIdsOnListPage().catch(err => console.error('Error displaying homepage Bestsellers badges:', err));
                    }, delay);
                });
            }

            // Retry CP PDP recommendation badges while sections load asynchronously
            if (isCpProductDetailPage()) {
                [2000, 4000, 6000, 8000, 10000, 15000].forEach(delay => {
                    setTimeout(() => {
                        displayProductIdsOnListPage().catch(err => console.error('Error displaying CP PDP recommendation badges:', err));
                    }, delay);
                });
            }
            
            // Retry CPB badges while PRODUCT_ITEMS / recommendations load asynchronously
            const cpbRetryDelays = (isCpbProductDetailPage() || isCpbSearchPage())
                ? [500, 1000, 2000, 4000, 6000, 8000, 10000, 15000]
                : [2000, 4000, 6000];
            cpbRetryDelays.forEach(delay => {
                setTimeout(() => {
                    displayCpbProductBadges().catch(err => console.error('Error displaying CPB product IDs:', err));
                }, delay);
            });

            // Retry STI badges while QuickFilter renders thumbnails asynchronously
            if (isStiusBadgePage()) {
                [500, 1000, 2000, 4000, 6000, 8000, 10000, 15000].forEach(delay => {
                    setTimeout(() => {
                        displayStiusProductBadges().catch(err => console.error('Error displaying STI product IDs:', err));
                    }, delay);
                });
            }
        }
        
        // Observe DOM changes for dynamically loaded products
        const observer = new MutationObserver((mutations) => {
            if (isCartPage()) {
                removeAllProductBadges();
                return;
            }
            if (isCpProductBadgePage() || isCpbBadgePage() || isStiusBadgePage()) {
                let shouldUpdate = false;
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if new product links were added
                            if (node.querySelectorAll && (
                                node.querySelectorAll('a[href*="/+"]').length > 0 ||
                                node.querySelectorAll('a[href*="/business/product-"]').length > 0 ||
                                node.querySelectorAll('.design-item-wrapper[data-id]').length > 0 ||
                                node.querySelectorAll('.category_thumb[data-design-id]').length > 0
                            )) {
                                shouldUpdate = true;
                            }
                            if (node.classList && (
                                node.classList.contains('bestsellers-products') ||
                                node.classList.contains('container-draggable-list') ||
                                node.classList.contains('design-item-wrapper') ||
                                node.classList.contains('product-item-card') ||
                                node.classList.contains('category_thumb') ||
                                node.classList.contains('ornament-thumbs')
                            )) {
                                shouldUpdate = true;
                            }
                            if (node.textContent && /you may also like/i.test(node.textContent)) {
                                shouldUpdate = true;
                            }
                            if (node.textContent && /bestsellers/i.test(node.textContent)) {
                                shouldUpdate = true;
                            }
                            if (node.textContent && /also available on/i.test(node.textContent)) {
                                shouldUpdate = true;
                            }
                            if (node.textContent && /explore more designs/i.test(node.textContent)) {
                                shouldUpdate = true;
                            }
                            // Also check if the node itself is a product link
                            if (node.tagName === 'A') {
                                const href = node.getAttribute('href') || '';
                                if (href.includes('/+') || href.includes('/business/product-')) {
                                    shouldUpdate = true;
                                }
                            }
                        }
                    });
                });
                
                if (shouldUpdate) {
                    setTimeout(() => {
                        displayProductIdsOnListPage().catch(err => console.error('Error displaying product IDs:', err));
                        displayCpbProductBadges().catch(err => console.error('Error displaying CPB product IDs:', err));
                        displayStiusProductBadges().catch(err => console.error('Error displaying STI product IDs:', err));
                        displayCategoryFilterIds();
                    }, 300);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also re-run on URL changes
        let lastUrl = window.location.href;
        setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                if (isCartPage()) {
                    removeAllProductBadges();
                    return;
                }
                if (isCpProductBadgePage() || isCpbBadgePage() || isStiusBadgePage()) {
                    setTimeout(() => {
                        displayProductIdsOnListPage().catch(err => console.error('Error displaying product IDs:', err));
                        displayCpbProductBadges().catch(err => console.error('Error displaying CPB product IDs:', err));
                        displayStiusProductBadges().catch(err => console.error('Error displaying STI product IDs:', err));
                        displayCategoryFilterIds();
                    }, 500);
                }
            }
        }, 500);
    }
    
    // Initialize product list display
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProductListDisplay);
    } else {
        initProductListDisplay();
    }
    
    // Initial call and observe for dynamic content on design library page
    function initDesignLibraryDisplay() {
        // Initial check
        if (isDesignLibraryPage()) {
            setTimeout(() => {
                displayDesignImageIdsOnLibraryPage().catch(err => console.error('Error displaying design Image IDs:', err));
            }, 1000);
            
            // Also try when window is fully loaded
            if (document.readyState !== 'complete') {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        displayDesignImageIdsOnLibraryPage().catch(err => console.error('Error displaying design Image IDs:', err));
                    }, 500);
                }, { once: true });
            }
        }
        
        // Observe DOM changes for dynamically loaded designs
        const observer = new MutationObserver((mutations) => {
            if (isDesignLibraryPage()) {
                let shouldUpdate = false;
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if new design items were added
                            if (node.querySelectorAll && node.querySelectorAll('[data-drag-design]').length > 0) {
                                shouldUpdate = true;
                            }
                            // Also check if the node itself has data-drag-design
                            if (node.hasAttribute && node.hasAttribute('data-drag-design')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                });
                
                if (shouldUpdate) {
                    setTimeout(() => {
                        displayDesignImageIdsOnLibraryPage().catch(err => console.error('Error displaying design Image IDs:', err));
                    }, 300);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also re-run on URL changes
        let lastUrl = window.location.href;
        setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                if (isDesignLibraryPage()) {
                    setTimeout(() => {
                        displayDesignImageIdsOnLibraryPage().catch(err => console.error('Error displaying design Image IDs:', err));
                    }, 500);
                }
            }
        }, 500);
    }
    
    // Initialize design library display
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesignLibraryDisplay);
    } else {
        initDesignLibraryDisplay();
    }
    
    // =============================================
    // PTN Search Floating Bar (Fixed at top of page)
    // =============================================
    
    let ptnFloatingBar = null;
    let ptnDataCache = null;
    
    // Parse CSV line with proper quote handling
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
    
    // Load PTN CSV data
    async function loadPTNData() {
        if (ptnDataCache) {
            return ptnDataCache;
        }
        
        try {
            const response = await fetch(chrome.runtime.getURL('cpdata/cafepress_product_types.csv'));
            const csvText = await response.text();
            
            const lines = csvText.split('\n');
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const fields = parseCSVLine(line);
                if (fields.length >= 4) {
                    data.push({
                        ptn: fields[0],
                        caption: fields[1],
                        stockMessage: fields[2],
                        active: fields[3]
                    });
                }
            }
            
            ptnDataCache = data;
            console.log('PTN data loaded:', data.length, 'records');
            return data;
        } catch (error) {
            console.error('Error loading PTN data:', error);
            return [];
        }
    }
    
    // Function to get logged in user info from dataLayer or API
    function getLoggedInUserInfo() {
        let customerId = null;
        let email = null;
        
        try {
            // Method 1: Check window.dataLayer array
            if (window.dataLayer && Array.isArray(window.dataLayer)) {
                for (const item of window.dataLayer) {
                    if (item && typeof item === 'object') {
                        if (item['gtm.pa_customer_id']) {
                            customerId = item['gtm.pa_customer_id'];
                        }
                        if (item['gtm.pa_email']) {
                            email = item['gtm.pa_email'];
                        }
                    }
                }
            }
            
            // Method 2: Search in script tags for dataLayer.push
            if (!customerId || !email) {
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const content = script.textContent || '';
                    if (content.includes('dataLayer.push') && content.includes('gtm.pa_customer_id')) {
                        // Extract customer_id
                        const customerIdMatch = content.match(/['"]gtm\.pa_customer_id['"]:\s*['"](\d+)['"]/);
                        if (customerIdMatch) {
                            customerId = customerIdMatch[1];
                        }
                        
                        // Extract email
                        const emailMatch = content.match(/['"]gtm\.pa_email['"]:\s*['"]([^'"]+)['"]/);
                        if (emailMatch) {
                            email = emailMatch[1];
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error getting user info:', e);
        }
        
        return {
            customerId: customerId,
            email: email,
            isLoggedIn: !!(customerId && email)
        };
    }
    
    // Async function to get user info from Member/detail API (for /sell pages)
    async function fetchMemberDetailInfo() {
        try {
            const timestamp = Date.now();
            const response = await fetch(`https://www.cafepress.com/rest/sell/WWWCOM/Member/detail?t=${timestamp}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.memberNo && data.email) {
                    return {
                        customerId: data.memberNo,
                        email: data.email,
                        isLoggedIn: true
                    };
                }
            }
        } catch (e) {
            console.log('Error fetching member detail:', e);
        }
        
        return null;
    }
    
    // Update user info display
    async function updateUserInfoDisplay(userInfoContainer) {
        // First try synchronous method
        let userInfo = getLoggedInUserInfo();
        
        // If not logged in from dataLayer, try API (especially for /sell pages)
        if (!userInfo.isLoggedIn && window.location.pathname.startsWith('/sell')) {
            const apiUserInfo = await fetchMemberDetailInfo();
            if (apiUserInfo) {
                userInfo = apiUserInfo;
            }
        }
        
        if (userInfo.isLoggedIn) {
            userInfoContainer.innerHTML = `
                <span style="color: #1de9b6;">●</span>
                <span title="Customer ID: ${userInfo.customerId}">${userInfo.email}</span>
                <span style="background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 3px; font-size: 10px;">ID: ${userInfo.customerId}</span>
            `;
        } else {
            userInfoContainer.innerHTML = `
                <span style="color: #ff9800;">●</span>
                <span style="color: rgba(255,255,255,0.7);">Guest</span>
            `;
        }
    }
    
    // Create PTN Search Floating Bar
    function createPTNFloatingBar() {
        if (ptnFloatingBar) {
            return ptnFloatingBar;
        }
        
        ptnFloatingBar = document.createElement('div');
        ptnFloatingBar.id = 'cp-ptn-floating-bar';
        ptnFloatingBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 28px;
            background: rgba(102, 126, 234, 0.85);
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            padding: 0 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // Title
        const title = document.createElement('span');
        title.textContent = '🔍 PTN';
        title.style.cssText = `
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
        `;
        
        // Search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'cp-ptn-search-input';
        searchInput.placeholder = 'PTN number or name...';
        searchInput.style.cssText = `
            flex: 1;
            max-width: 250px;
            padding: 4px 8px;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 3px;
            background: rgba(255,255,255,0.15);
            color: white;
            font-size: 12px;
            outline: none;
            height: 20px;
        `;
        searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#ffeb3b';
            searchInput.style.background = 'rgba(255,255,255,0.25)';
        });
        searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = 'rgba(255,255,255,0.3)';
            searchInput.style.background = 'rgba(255,255,255,0.15)';
        });
        
        // Search button
        const searchBtn = document.createElement('button');
        searchBtn.textContent = 'Search';
        searchBtn.id = 'cp-ptn-search-btn';
        searchBtn.style.cssText = `
            background: #ffeb3b;
            color: #333;
            border: none;
            padding: 4px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
            transition: all 0.2s ease;
            white-space: nowrap;
            height: 22px;
        `;
        searchBtn.addEventListener('mouseenter', () => {
            searchBtn.style.background = '#fff';
        });
        searchBtn.addEventListener('mouseleave', () => {
            searchBtn.style.background = '#ffeb3b';
        });
        
        // Results container (dropdown style)
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'cp-ptn-results';
        resultsContainer.style.cssText = `
            display: none;
            position: fixed;
            top: 28px;
            left: 20px;
            width: 420px;
            background: linear-gradient(180deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
            border-radius: 0 0 8px 8px;
            padding: 12px;
            font-size: 12px;
            max-height: 450px;
            overflow-y: auto;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 99998;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.15);
            border-top: none;
        `;
        
        // User info display
        const userInfoContainer = document.createElement('div');
        userInfoContainer.id = 'cp-user-info';
        userInfoContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: rgba(255,255,255,0.9);
            margin-left: 15px;
            padding-left: 15px;
            border-left: 1px solid rgba(255,255,255,0.3);
        `;
        
        // Initial display (loading or quick sync check)
        const userInfo = getLoggedInUserInfo();
        if (userInfo.isLoggedIn) {
            userInfoContainer.innerHTML = `
                <span style="color: #1de9b6;">●</span>
                <span title="Customer ID: ${userInfo.customerId}">${userInfo.email}</span>
                <span style="background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 3px; font-size: 10px;">ID: ${userInfo.customerId}</span>
            `;
        } else {
            // Show loading indicator, will update async
            userInfoContainer.innerHTML = `
                <span style="color: rgba(255,255,255,0.5);">●</span>
                <span style="color: rgba(255,255,255,0.5);">Loading...</span>
            `;
            // Async update for /sell pages
            updateUserInfoDisplay(userInfoContainer);
        }
        
        // Cookie info display container (will be placed before userInfoContainer)
        const cookieInfoContainer = document.createElement('div');
        cookieInfoContainer.id = 'cp-cookie-info';
        cookieInfoContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 10px;
            color: rgba(255,255,255,0.8);
            margin-left: auto;
        `;
        
        // Initial loading state
        cookieInfoContainer.innerHTML = `
            <span style="color: rgba(255,255,255,0.5);">Loading...</span>
        `;
        
        // Async load cookies
        function loadCookieInfo() {
            let cartId = '-';
            let phpSessionId = '-';
            let noTracking = '-';
            let loadedCount = 0;
            
            const updateDisplay = () => {
                loadedCount++;
                if (loadedCount >= 3) {
                    cookieInfoContainer.innerHTML = `
                        <span title="Click to copy" style="cursor: pointer;" onclick="navigator.clipboard.writeText('${cartId}')">
                            <span style="color: rgba(255,255,255,0.6);">cart_id:</span>
                            <span style="color: #ffeb3b;">${cartId}</span>
                        </span>
                        <span title="Click to copy" style="cursor: pointer;" onclick="navigator.clipboard.writeText('${phpSessionId}')">
                            <span style="color: rgba(255,255,255,0.6);">PHPSESSID:</span>
                            <span style="color: #1de9b6;">${phpSessionId}</span>
                        </span>
                        <span title="Click to copy" style="cursor: pointer;" onclick="navigator.clipboard.writeText('${noTracking}')">
                            <span style="color: rgba(255,255,255,0.6);">NO_TRACKING:</span>
                            <span style="color: ${noTracking === '1' ? '#f44336' : '#1de9b6'};">${noTracking}</span>
                        </span>
                    `;
                }
            };
            
            // Get cart_id
            chrome.runtime.sendMessage({
                type: 'GET_CART_ID',
                url: window.location.href
            }, (response) => {
                if (response && response.success && response.value) {
                    cartId = response.value;
                }
                updateDisplay();
            });
            
            // Get PHPSESSID
            chrome.runtime.sendMessage({
                type: 'GET_PHPSESSID',
                url: window.location.href
            }, (response) => {
                if (response && response.success && response.value) {
                    phpSessionId = response.value;
                }
                updateDisplay();
            });
            
            // Get NO_TRACKING
            chrome.runtime.sendMessage({
                type: 'GET_NO_TRACKING',
                url: window.location.href
            }, (response) => {
                if (response && response.success && response.value) {
                    noTracking = response.value;
                }
                updateDisplay();
            });
        }
        
        // Load cookies after a short delay
        setTimeout(loadCookieInfo, 100);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.title = 'Hide PTN Search Bar';
        closeBtn.style.cssText = `
            background: transparent;
            border: none;
            color: white;
            font-size: 14px;
            cursor: pointer;
            padding: 2px 5px;
            opacity: 0.7;
            transition: opacity 0.2s;
            line-height: 1;
            margin-left: 10px;
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.opacity = '1';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.opacity = '0.7';
        });
        closeBtn.addEventListener('click', () => {
            hidePTNFloatingBar();
            resultsContainer.style.display = 'none';
        });
        
        // Search function
        async function performPTNSearch() {
            const searchTerm = searchInput.value.trim();
            
            if (!searchTerm) {
                resultsContainer.style.display = 'none';
                return;
            }
            
            searchBtn.textContent = 'Searching...';
            searchBtn.disabled = true;
            
            try {
                const ptnData = await loadPTNData();
                const isNumericSearch = /^\d+$/.test(searchTerm);
                
                let results;
                
                if (isNumericSearch) {
                    // Search by PTN number - show all matching results (not just In Stock)
                    results = ptnData.filter(item => item.ptn === searchTerm);
                } else {
                    // Search by name
                    const searchLower = searchTerm.toLowerCase();
                    results = ptnData.filter(item => 
                        item.caption.toLowerCase().includes(searchLower)
                    );
                }
                
                // Display results
                if (!results || results.length === 0) {
                    resultsContainer.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: #ff9800;">
                            <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
                            <div>No PTN records found</div>
                        </div>`;
                } else {
                    let html = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <span style="color: #1de9b6; font-weight: bold; font-size: 13px;">Found ${results.length} record(s)</span>
                            <button id="cp-ptn-close-results" style="background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 16px; padding: 0 5px;" title="Close">✕</button>
                        </div>
                        <div style="display: grid; gap: 8px;">
                    `;
                    
                    results.slice(0, 15).forEach((item, index) => {
                        const isActive = item.active === 'TRUE';
                        const activeColor = isActive ? '#1de9b6' : '#f44336';
                        const activeBg = isActive ? 'rgba(29, 233, 182, 0.1)' : 'rgba(244, 67, 54, 0.1)';
                        const activeText = isActive ? 'Active' : 'Inactive';
                        
                        let stockColor = '#aaa';
                        let stockBg = 'rgba(255,255,255,0.05)';
                        if (item.stockMessage.includes('In Stock')) {
                            stockColor = '#1de9b6';
                            stockBg = 'rgba(29, 233, 182, 0.15)';
                        } else if (item.stockMessage.includes('Out of Stock') || item.stockMessage.includes('No Longer')) {
                            stockColor = '#f44336';
                            stockBg = 'rgba(244, 67, 54, 0.15)';
                        } else if (item.stockMessage.includes('Temporarily')) {
                            stockColor = '#ff9800';
                            stockBg = 'rgba(255, 152, 0, 0.15)';
                        }
                        
                        html += `
                            <div class="cp-ptn-result-row" data-ptn="${item.ptn}" data-caption="${item.caption.replace(/"/g, '&quot;')}" 
                                 style="background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 6px; border-left: 3px solid ${isActive ? '#1de9b6' : '#f44336'}; transition: all 0.2s; cursor: pointer;" 
                                 onmouseover="this.style.background='rgba(255,255,255,0.25)'" 
                                 onmouseout="this.style.background='rgba(255,255,255,0.15)'"
                                 title="Double-click to copy Caption">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                                    <div style="flex: 1; min-width: 0;">
                                        <span style="color: #ffeb3b; font-weight: bold; font-size: 12px;">PTN: ${item.ptn}</span>
                                        <span style="color: rgba(255,255,255,0.4); margin: 0 4px;">|</span>
                                        <span style="color: #fff; font-size: 11px;">${item.caption}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                                        <span style="background: ${stockBg}; color: ${stockColor}; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 500; white-space: nowrap;">${item.stockMessage}</span>
                                        <span style="background: ${activeBg}; color: ${activeColor}; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; white-space: nowrap;">${activeText}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                    
                    if (results.length > 15) {
                        html += `<div style="color: rgba(255,255,255,0.5); text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px;">... and ${results.length - 15} more results</div>`;
                    }
                    
                    resultsContainer.innerHTML = html;
                    
                    // Add close button event
                    const closeResultsBtn = document.getElementById('cp-ptn-close-results');
                    if (closeResultsBtn) {
                        closeResultsBtn.addEventListener('click', () => {
                            resultsContainer.style.display = 'none';
                        });
                    }
                    
                    // Add double-click to copy event for each row
                    const resultRows = resultsContainer.querySelectorAll('.cp-ptn-result-row');
                    resultRows.forEach(row => {
                        row.addEventListener('dblclick', function(e) {
                            e.preventDefault();
                            const caption = this.getAttribute('data-caption');
                            const textToCopy = caption;
                            
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(textToCopy).then(() => {
                                    // Show feedback
                                    const originalBg = this.style.background;
                                    const originalBorderColor = this.style.borderLeftColor;
                                    this.style.background = 'rgba(76, 175, 80, 0.3)';
                                    this.style.borderLeftColor = '#4CAF50';
                                    
                                    // Show copied text
                                    const copiedIndicator = document.createElement('span');
                                    copiedIndicator.textContent = '✓ Copied!';
                                    copiedIndicator.style.cssText = 'position: absolute; right: 50px; color: #4CAF50; font-size: 11px; font-weight: bold;';
                                    this.style.position = 'relative';
                                    this.appendChild(copiedIndicator);
                                    
                                    setTimeout(() => {
                                        this.style.background = originalBg || 'rgba(255,255,255,0.08)';
                                        this.style.borderLeftColor = originalBorderColor;
                                        if (copiedIndicator.parentNode) {
                                            copiedIndicator.parentNode.removeChild(copiedIndicator);
                                        }
                                    }, 1000);
                                }).catch(err => {
                                    console.error('Failed to copy:', err);
                                });
                            }
                        });
                    });
                }
                
                resultsContainer.style.display = 'block';
                
            } catch (error) {
                console.error('Error searching PTN:', error);
                resultsContainer.innerHTML = '<span style="color: #f44336;">Search error</span>';
                resultsContainer.style.display = 'block';
            } finally {
                searchBtn.textContent = 'Search';
                searchBtn.disabled = false;
            }
        }
        
        // Bind events
        searchBtn.addEventListener('click', performPTNSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performPTNSearch();
            }
        });
        
        // Clear results when input changes
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() === '') {
                resultsContainer.style.display = 'none';
            }
        });
        
        // Click outside to hide results
        document.addEventListener('click', (e) => {
            // Check if click is outside the PTN bar and results container
            if (ptnFloatingBar && resultsContainer) {
                const isClickInsideBar = ptnFloatingBar.contains(e.target);
                const isClickInsideResults = resultsContainer.contains(e.target);
                
                if (!isClickInsideBar && !isClickInsideResults) {
                    resultsContainer.style.display = 'none';
                }
            }
        });
        
        // Assemble the bar
        ptnFloatingBar.appendChild(title);
        ptnFloatingBar.appendChild(searchInput);
        ptnFloatingBar.appendChild(searchBtn);
        ptnFloatingBar.appendChild(cookieInfoContainer);
        ptnFloatingBar.appendChild(userInfoContainer);
        ptnFloatingBar.appendChild(closeBtn);
        
        document.body.appendChild(ptnFloatingBar);
        // Results container is separate, appended to body for dropdown effect
        document.body.appendChild(resultsContainer);
        
        // Add body padding to prevent content from being hidden
        document.body.style.paddingTop = '28px';
        
        return ptnFloatingBar;
    }
    
    // Show PTN Floating Bar
    function showPTNFloatingBar() {
        if (!ptnFloatingBar) {
            createPTNFloatingBar();
        }
        ptnFloatingBar.style.display = 'flex';
        document.body.style.paddingTop = '28px';
    }
    
    // Hide PTN Floating Bar
    function hidePTNFloatingBar() {
        if (ptnFloatingBar) {
            ptnFloatingBar.style.display = 'none';
            document.body.style.paddingTop = '0';
            // Also hide results dropdown
            const resultsContainer = document.getElementById('cp-ptn-results');
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
            }
        }
    }
    
    // Toggle PTN Floating Bar
    function togglePTNFloatingBar() {
        if (ptnFloatingBar && ptnFloatingBar.style.display !== 'none') {
            hidePTNFloatingBar();
        } else {
            showPTNFloatingBar();
        }
    }
    
    // Initialize PTN Floating Bar on page load
    function initPTNFloatingBar() {
        // Check if PTN bar should be shown (stored setting)
        chrome.storage.local.get(['ptnBarVisible'], (result) => {
            if (result.ptnBarVisible !== false) {
                // Default to showing the bar
                showPTNFloatingBar();
            }
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPTNFloatingBar);
    } else {
        initPTNFloatingBar();
    }
    
    // Create floating window
    function createFloatingWindow() {
        if (floatingWindow) {
            return floatingWindow;
        }
        
        // Shadow DOM host: isolate QA panel from site-global CSS (e.g. STI button/input rules)
        floatingWindowHost = document.createElement('div');
        floatingWindowHost.id = 'cp-qa-tools-host';
        floatingWindowHost.style.cssText = `
            all: initial;
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
            overflow: visible;
            z-index: 2147483647;
        `;
        
        const shadow = floatingWindowHost.attachShadow({ mode: 'open' });
        const isolationStyle = document.createElement('style');
        isolationStyle.textContent = `
            *, *::before, *::after { box-sizing: border-box; }
            button, input, textarea, select {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                letter-spacing: normal;
                text-transform: none;
                -webkit-appearance: none;
                appearance: none;
            }
            input[type="checkbox"] {
                -webkit-appearance: checkbox;
                appearance: auto;
            }
        `;
        shadow.appendChild(isolationStyle);
        
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
            font-size: 12px;
            line-height: normal;
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
            background: rgba(0,0,0,0.1);
            position: relative;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
        `;
        
        // Top row: title, setting button, and control buttons
        const headerTop = document.createElement('div');
        headerTop.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        // Left side: title and setting button
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Cafepress QA Tools';
        title.style.cssText = `
            margin: 0;
            font-size: 12px;
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
        
        // Setting button (icon only) next to title
        const settingButton = document.createElement('button');
        settingButton.innerHTML = '⚙️';
        settingButton.id = 'cp-setting-button';
        settingButton.title = 'Settings';
        settingButton.style.cssText = `
            background: transparent;
            border: none;
            color: white;
            font-size: 14px;
            cursor: pointer;
            padding: 2px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            opacity: 0.8;
        `;
        
        titleContainer.appendChild(title);
        titleContainer.appendChild(settingButton);
        
        // Right side: SSO Login and control buttons
        const rightButtons = document.createElement('div');
        rightButtons.style.cssText = `
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        
        rightButtons.appendChild(ssoButton);
        rightButtons.appendChild(minimizeButton);
        rightButtons.appendChild(closeButton);
        
        headerTop.appendChild(titleContainer);
        headerTop.appendChild(rightButtons);
        
        let settingsPanelVisible = false;
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'cp-settings-panel';
        settingsPanel.style.cssText = `
            display: none;
            padding: 12px;
            background: rgba(0,0,0,0.2);
            border-top: 1px solid rgba(255,255,255,0.2);
            border-bottom: 1px solid rgba(255,255,255,0.2);
        `;
        
        // Badge display toggle
        const badgeToggleContainer = document.createElement('div');
        badgeToggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        `;
        
        const badgeToggle = document.createElement('input');
        badgeToggle.type = 'checkbox';
        badgeToggle.id = 'cp-badge-toggle';
        badgeToggle.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #ffeb3b;
            flex-shrink: 0;
        `;
        
        const badgeToggleLabel = document.createElement('label');
        badgeToggleLabel.textContent = 'Show Thumbs Badge';
        badgeToggleLabel.setAttribute('for', 'cp-badge-toggle');
        badgeToggleLabel.style.cssText = `
            color: white;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
        `;
        
        // Load badge display setting
        chrome.storage.local.get(['badgeDisplayEnabled'], (result) => {
            const enabled = result.badgeDisplayEnabled !== false; // Default to true
            badgeToggle.checked = enabled;
            // Update existing badges
            updateBadgeVisibility(enabled);
        });
        
        badgeToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            chrome.storage.local.set({ badgeDisplayEnabled: enabled }, () => {
                // Update all existing badges immediately
                updateBadgeVisibility(enabled);
                console.log('Badge display setting saved:', enabled);
                // Also trigger a refresh of product list display if on product list page
                if (isCpProductBadgePage() || isCpbBadgePage()) {
                    setTimeout(() => {
                        displayProductIdsOnListPage().catch(err => console.error('Error refreshing badges:', err));
                        displayCpbProductBadges().catch(err => console.error('Error refreshing CPB badges:', err));
                    }, 100);
                } else if (isStiusBadgePage()) {
                    setTimeout(() => {
                        displayStiusProductBadges().catch(err => console.error('Error refreshing STI badges:', err));
                    }, 100);
                }
            });
        });
        
        // Listen for storage changes from other tabs/windows
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.badgeDisplayEnabled) {
                const enabled = changes.badgeDisplayEnabled.newValue !== false;
                badgeToggle.checked = enabled;
                updateBadgeVisibility(enabled);
            }
        });
        
        badgeToggleContainer.appendChild(badgeToggle);
        badgeToggleContainer.appendChild(badgeToggleLabel);
        settingsPanel.appendChild(badgeToggleContainer);
        
        // Design Badge display toggle
        const designBadgeToggleContainer = document.createElement('div');
        designBadgeToggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        `;
        
        const designBadgeToggle = document.createElement('input');
        designBadgeToggle.type = 'checkbox';
        designBadgeToggle.id = 'cp-design-badge-toggle';
        designBadgeToggle.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #ffeb3b;
            flex-shrink: 0;
        `;
        
        const designBadgeToggleLabel = document.createElement('label');
        designBadgeToggleLabel.textContent = 'Show Design Image ID Badge';
        designBadgeToggleLabel.setAttribute('for', 'cp-design-badge-toggle');
        designBadgeToggleLabel.style.cssText = `
            color: white;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
        `;
        
        // Load design badge display setting
        chrome.storage.local.get(['designBadgeDisplayEnabled'], (result) => {
            const enabled = result.designBadgeDisplayEnabled !== false; // Default to true
            designBadgeToggle.checked = enabled;
            // Update existing design badges
            updateDesignBadgeVisibility(enabled);
        });
        
        designBadgeToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            chrome.storage.local.set({ designBadgeDisplayEnabled: enabled }, () => {
                // Update all existing design badges immediately
                updateDesignBadgeVisibility(enabled);
                console.log('Design badge display setting saved:', enabled);
                // Also trigger a refresh of design library display if on design library page
                if (isDesignLibraryPage()) {
                    setTimeout(() => {
                        displayDesignImageIdsOnLibraryPage().catch(err => console.error('Error refreshing design badges:', err));
                    }, 100);
                }
            });
        });
        
        // Listen for storage changes from other tabs/windows for design badges
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.designBadgeDisplayEnabled) {
                const enabled = changes.designBadgeDisplayEnabled.newValue !== false;
                designBadgeToggle.checked = enabled;
                updateDesignBadgeVisibility(enabled);
            }
        });
        
        designBadgeToggleContainer.appendChild(designBadgeToggle);
        designBadgeToggleContainer.appendChild(designBadgeToggleLabel);
        settingsPanel.appendChild(designBadgeToggleContainer);
        
        // PTN Search Bar display toggle
        const ptnBarToggleContainer = document.createElement('div');
        ptnBarToggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        `;
        
        const ptnBarToggle = document.createElement('input');
        ptnBarToggle.type = 'checkbox';
        ptnBarToggle.id = 'cp-ptn-bar-toggle';
        ptnBarToggle.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #ffeb3b;
            flex-shrink: 0;
        `;
        
        const ptnBarToggleLabel = document.createElement('label');
        ptnBarToggleLabel.textContent = 'Show PTN Search Bar';
        ptnBarToggleLabel.setAttribute('for', 'cp-ptn-bar-toggle');
        ptnBarToggleLabel.style.cssText = `
            color: white;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
        `;
        
        // Load PTN bar display setting
        chrome.storage.local.get(['ptnBarVisible'], (result) => {
            const enabled = result.ptnBarVisible !== false; // Default to true
            ptnBarToggle.checked = enabled;
        });
        
        ptnBarToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            chrome.storage.local.set({ ptnBarVisible: enabled }, () => {
                if (enabled) {
                    showPTNFloatingBar();
                } else {
                    hidePTNFloatingBar();
                }
                console.log('PTN bar display setting saved:', enabled);
            });
        });
        
        // Listen for storage changes from other tabs/windows for PTN bar
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.ptnBarVisible) {
                const enabled = changes.ptnBarVisible.newValue !== false;
                ptnBarToggle.checked = enabled;
                if (enabled) {
                    showPTNFloatingBar();
                } else {
                    hidePTNFloatingBar();
                }
            }
        });
        
        ptnBarToggleContainer.appendChild(ptnBarToggle);
        ptnBarToggleContainer.appendChild(ptnBarToggleLabel);
        settingsPanel.appendChild(ptnBarToggleContainer);

        // Side Panel open toggle
        const sidePanelStorageKey = CONFIG.SIDE_PANEL?.STORAGE_KEY || 'sidePanelEnabled';
        const sidePanelToggleContainer = document.createElement('div');
        sidePanelToggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        `;

        const sidePanelToggle = document.createElement('input');
        sidePanelToggle.type = 'checkbox';
        sidePanelToggle.id = 'cp-side-panel-toggle';
        sidePanelToggle.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #ffeb3b;
            flex-shrink: 0;
        `;

        const sidePanelToggleLabel = document.createElement('label');
        sidePanelToggleLabel.textContent = 'Open AI Side Panel on Click';
        sidePanelToggleLabel.setAttribute('for', 'cp-side-panel-toggle');
        sidePanelToggleLabel.style.cssText = `
            color: white;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
        `;

        chrome.storage.local.get([sidePanelStorageKey], (result) => {
            const enabled = result[sidePanelStorageKey] !== false;
            sidePanelToggle.checked = enabled;
        });

        sidePanelToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            chrome.storage.local.set({ [sidePanelStorageKey]: enabled }, () => {
                console.log('Side panel open setting saved:', enabled);
            });
        });

        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes[sidePanelStorageKey]) {
                sidePanelToggle.checked = changes[sidePanelStorageKey].newValue !== false;
            }
        });

        sidePanelToggleContainer.appendChild(sidePanelToggle);
        sidePanelToggleContainer.appendChild(sidePanelToggleLabel);
        settingsPanel.appendChild(sidePanelToggleContainer);
        
        settingButton.addEventListener('click', () => {
            settingsPanelVisible = !settingsPanelVisible;
            if (settingsPanelVisible) {
                settingsPanel.style.display = 'block';
                settingButton.style.opacity = '1';
            } else {
                settingsPanel.style.display = 'none';
                settingButton.style.opacity = '0.8';
            }
        });
        
        settingButton.addEventListener('mouseenter', () => {
            settingButton.style.opacity = '1';
        });
        
        settingButton.addEventListener('mouseleave', () => {
            if (!settingsPanelVisible) {
                settingButton.style.opacity = '0.8';
            }
        });
        
        header.appendChild(headerTop);
        
        // Create content area
        const content = document.createElement('div');
        content.id = 'cp-floating-content';
        content.style.cssText = `
            padding: 10px;
            max-height: 640px;
            overflow-y: auto;
        `;
        
        floatingWindow.appendChild(header);
        floatingWindow.appendChild(settingsPanel);
        floatingWindow.appendChild(content);
        floatingWindow.appendChild(pinButton);  // Add pin button to floating window container
        shadow.appendChild(floatingWindow);
        document.documentElement.appendChild(floatingWindowHost);
        
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

    // Show QA panel as minimized floating ball (used when extension icon is clicked)
    function showFloatingMinimized() {
        if (!floatingWindow) {
            createFloatingWindow();
        }

        localStorage.setItem('cp-window-minimized', 'true');

        if (floatingWindow) {
            floatingWindow.style.display = 'none';
            floatingWindow.style.transition = '';
            floatingWindow.style.transform = '';
            floatingWindow.style.opacity = '';
            isWindowVisible = false;
        }

        showFloatingBall();

        try {
            updateFloatingWindowContent();
        } catch (error) {
            console.error('Failed to update floating window content:', error);
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
            
            const mountTarget = document.body || document.documentElement;
            mountTarget.appendChild(floatingBall);
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
            // 6. /business/product-{productId}-design-{designId} or /business/product-{productId}?did={designId} - CPB product detail page
            const isCpbPdp = isCpbProductDetailPage();
            const isProductPage = currentUrl.match(/\/\+[^/]*,\d+/) !== null || 
                                  currentUrl.match(/\/mf\/\d+\/[^?]*\?productId=\d+/) !== null ||
                                  currentUrl.match(/\/mf\/\d+\/[^?]*\?fromProductId=\d+/) !== null ||
                                  currentUrl.match(/\/designer\/[^/]+/) !== null ||
                                  currentUrl.match(/\/shopdetail\/[^/]+\.\d+/) !== null ||
                                  isCpbPdp;
            
            // Check if we have valid product data (not just "Not found")
            const hasValidProductData = isProductPage && result && (
                isCpbPdp ? (
                    (result.productsData && result.productsData.full_object) ||
                    result.designId ||
                    result.cpProductId
                ) : (
                    (result.designerName && result.designerName !== 'Not found') ||
                    (result.designId && result.designId !== 'Not found') ||
                    (result.cpProductId && result.cpProductId !== 'Not found') ||
                    (result.productsData && Object.keys(result.productsData).length > 0)
                )
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
                if (isCpbPdp) {
                    productInfoHtml += buildCpbProductInfoHtml(result);
                } else {
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
                
                // Default Global sku - ONLY from default_sku path
                let defaultGlobalSku = 'Not found';
                
                if (result.productsData && 
                    result.productsData.full_object && 
                    result.productsData.full_object.default_sku && 
                    result.productsData.full_object.default_sku.sku !== undefined) {
                    defaultGlobalSku = (result.productsData.full_object.default_sku.sku !== null) ? 
                                      result.productsData.full_object.default_sku.sku : 'N/A';
                    console.log('✅ Found Default Global sku from default_sku:', defaultGlobalSku);
                }
                
                productInfoHtml += createInfoItem('Default Global sku:', defaultGlobalSku);
                
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
                
                // Seller ID (Customer ID) - from default_design, fallback to product_design_objects[designId]
                let sellerId = 'Not found';
                
                if (result.productsData && result.productsData.full_object) {
                    const fullObject = result.productsData.full_object;
                    
                    if (fullObject.default_design && fullObject.default_design.seller_id !== undefined) {
                        sellerId = (fullObject.default_design.seller_id !== null) ?
                                  fullObject.default_design.seller_id : 'N/A';
                        console.log('✅ Found Seller ID from default_design:', sellerId);
                    } else if (fullObject.product_design_objects && result.designId) {
                        const designObjects = fullObject.product_design_objects;
                        if (designObjects[result.designId] && designObjects[result.designId].seller_id !== undefined) {
                            sellerId = (designObjects[result.designId].seller_id !== null) ?
                                      designObjects[result.designId].seller_id : 'N/A';
                            console.log('✅ Found Seller ID from product_design_objects[' + result.designId + ']:', sellerId);
                        }
                    }
                }
                
                productInfoHtml += createInfoItem('Seller ID (Customer ID):', sellerId);
                
                // Store ID - from default_design, fallback to product_design_objects[designId]
                let storeId = 'Not found';
                
                if (result.productsData && result.productsData.full_object) {
                    const fullObject = result.productsData.full_object;
                    
                    if (fullObject.default_design && fullObject.default_design.store_id !== undefined) {
                        storeId = (fullObject.default_design.store_id !== null) ?
                                 fullObject.default_design.store_id : 'N/A';
                        console.log('✅ Found Store ID from default_design:', storeId);
                    } else if (fullObject.product_design_objects && result.designId) {
                        const designObjects = fullObject.product_design_objects;
                        if (designObjects[result.designId] && designObjects[result.designId].store_id !== undefined) {
                            storeId = (designObjects[result.designId].store_id !== null) ?
                                     designObjects[result.designId].store_id : 'N/A';
                            console.log('✅ Found Store ID from product_design_objects[' + result.designId + ']:', storeId);
                        }
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
                }
                
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
            
            // 异步获取并显示 cart_id (在 DOM 创建后执行)
            // 通过 background script 获取 cookie（因为 content script 不能访问 chrome.cookies）
            chrome.runtime.sendMessage({
                type: 'GET_CART_ID',
                url: window.location.href
            }, (response) => {
                if (response && response.success && response.value) {
                    const cartId = response.value;
                    const container = content.querySelector('#cart-id-container');
                    if (container) {
                        container.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="
                                    font-size: 10px;
                                    color: rgba(255,255,255,0.6);
                                    white-space: nowrap;
                                ">cart_id:</div>
                                <div style="
                                    font-size: 10px;
                                    color: #ffeb3b;
                                    font-family: monospace;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                    max-width: 280px;
                                " title="${cartId}">${cartId}</div>
                            </div>
                        `;
                        console.log('✅ cart_id loaded:', cartId);
                    }
                } else {
                    console.log('ℹ️ No cart_id cookie found');
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
                        
                        // Hide other cards
                        const qrcodeCard = content.querySelector('#qrcode-card');
                        const cookieCard = content.querySelector('#cookie-card');
                        const shipAddressCardEl = content.querySelector('#ship-address-card');
                        if (qrcodeCard) {
                            qrcodeCard.style.display = 'none';
                        }
                        if (cookieCard) {
                            cookieCard.style.display = 'none';
                        }
                        if (shipAddressCardEl) {
                            shipAddressCardEl.style.display = 'none';
                        }
                        
                        // Hide other buttons - only show Translation
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (qrBtn) {
                            qrBtn.style.display = 'none';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'none';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'none';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'none';
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
                        
                        // Show other buttons again
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (qrBtn) {
                            qrBtn.style.display = 'flex';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'flex';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'flex';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'flex';
                        }
                        
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
            
            // Add QR Code button event listener
            const qrcodeBtn = content.querySelector('#qrcode-btn');
            const qrcodeCard = content.querySelector('#qrcode-card');
            let isQRCodeToolOpen = false;
            
            if (qrcodeBtn && qrcodeCard) {
                // QR Code generation function
                const qrcodeInput = content.querySelector('#qrcode-input');
                const qrcodeDisplay = content.querySelector('#qrcode-display');
                const generateQrcodeBtn = content.querySelector('#generate-qrcode-btn');
                const clearQrcodeBtn = content.querySelector('#clear-qrcode-btn');
                
                function generateQRCode(text) {
                    if (!text) {
                        qrcodeDisplay.innerHTML = '<div style="color: #999; font-size: 14px; text-align: center;">Please enter text or URL to generate QR code</div>';
                        return;
                    }
                    
                    // Show loading state
                    qrcodeDisplay.innerHTML = '<div style="color: #999; font-size: 14px; text-align: center;">Generating QR code...</div>';
                    
                    // Use QR Server API to generate QR code
                    const encodedText = encodeURIComponent(text);
                    const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodedText;
                    
                    // Create image element
                    const img = document.createElement('img');
                    img.src = qrCodeUrl;
                    img.alt = 'QR Code';
                    img.style.maxWidth = '280px';
                    img.style.maxHeight = '280px';
                    img.style.display = 'block';
                    
                    img.onload = () => {
                        qrcodeDisplay.innerHTML = '';
                        qrcodeDisplay.appendChild(img);
                        console.log('✓ QR Code generated successfully');
                    };
                    
                    img.onerror = () => {
                        qrcodeDisplay.innerHTML = '<div style="color: #f44336; font-size: 14px; text-align: center;">Failed to generate QR code. Please try again.</div>';
                    };
                }
                
                // QRcode button click event with auto-generation
                qrcodeBtn.addEventListener('click', () => {
                    console.log('📱 Toggle QR Code Tool');
                    
                    isQRCodeToolOpen = !isQRCodeToolOpen;
                    
                    if (isQRCodeToolOpen) {
                        // First, show QR code card and UI
                        qrcodeCard.style.display = 'block';
                        
                        // Show Back button
                        if (translationBackBtnHeader) {
                            translationBackBtnHeader.style.display = 'block';
                        }
                        
                        // Hide other cards
                        if (translationCard) {
                            translationCard.style.display = 'none';
                        }
                        const cookieCard = content.querySelector('#cookie-card');
                        const shipAddressCardEl = content.querySelector('#ship-address-card');
                        if (cookieCard) {
                            cookieCard.style.display = 'none';
                        }
                        if (shipAddressCardEl) {
                            shipAddressCardEl.style.display = 'none';
                        }
                        
                        // Hide other buttons - only show QRcode
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'none';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'none';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'none';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'none';
                        }
                        
                        // Hide all content
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
                        
                        // Auto-fill current URL
                        const currentUrl = window.location.href;
                        if (qrcodeInput) {
                            qrcodeInput.value = currentUrl;
                        }
                        
                        // Then generate QR code in background
                        setTimeout(() => {
                            generateQRCode(currentUrl);
                        }, 100);
                        
                    } else {
                        // Hide QR code card
                        qrcodeCard.style.display = 'none';
                        
                        // Show other buttons again
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'flex';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'flex';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'flex';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'flex';
                        }
                        
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
                
                // Generate QR Code button
                if (generateQrcodeBtn && qrcodeInput) {
                    generateQrcodeBtn.addEventListener('click', () => {
                        const text = qrcodeInput.value.trim();
                        generateQRCode(text);
                    });
                }
                
                // Clear Input button
                if (clearQrcodeBtn && qrcodeInput) {
                    clearQrcodeBtn.addEventListener('click', () => {
                        qrcodeInput.value = '';
                        qrcodeDisplay.innerHTML = '<div style="color: #999; font-size: 14px; text-align: center;">Your QR code will appear here</div>';
                    });
                }
                
                // Add placeholder styles for QR Code input
                const qrcodeStyle = document.createElement('style');
                qrcodeStyle.textContent = '#qrcode-input::placeholder { color: rgba(255, 255, 255, 0.5) !important; }';
                document.head.appendChild(qrcodeStyle);
                
                console.log('✓ QR Code button event listener added');
            }
            
            // Add Cookie Management button event listener
            const cookieBtn = content.querySelector('#cookie-btn');
            const cookieCard = content.querySelector('#cookie-card');
            let isCookieToolOpen = false;
            let lastAddedCookieName = null; // Track the most recently added cookie
            
            if (cookieBtn && cookieCard) {
                cookieBtn.addEventListener('click', () => {
                    console.log('🍪 Toggle Cookie Management Tool');
                    
                    isCookieToolOpen = !isCookieToolOpen;
                    
                    if (isCookieToolOpen) {
                        // Hide other cards
                        if (translationCard) {
                            translationCard.style.display = 'none';
                        }
                        if (qrcodeCard) {
                            qrcodeCard.style.display = 'none';
                        }
                        const shipAddressCardEl = content.querySelector('#ship-address-card');
                        if (shipAddressCardEl) {
                            shipAddressCardEl.style.display = 'none';
                        }
                        
                        // Hide other buttons - only show Cookie
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'none';
                        }
                        if (qrBtn) {
                            qrBtn.style.display = 'none';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'none';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'none';
                        }
                        
                        // Show Cookie card
                        cookieCard.style.display = 'block';
                        
                        // Show Back button
                        if (translationBackBtn) {
                            translationBackBtn.style.display = 'block';
                        }
                        
                        // Hide other content
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
                        
                        // Load cookies automatically
                        loadCookies();
                    } else {
                        cookieCard.style.display = 'none';
                        
                        // Show other buttons again
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'flex';
                        }
                        if (qrBtn) {
                            qrBtn.style.display = 'flex';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'flex';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'flex';
                        }
                        
                        if (translationBackBtn) {
                            translationBackBtn.style.display = 'none';
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
                
                // Add Refresh Cookies button event listener
                const refreshCookiesBtn = content.querySelector('#refresh-cookies-btn');
                if (refreshCookiesBtn) {
                    refreshCookiesBtn.addEventListener('click', () => {
                        console.log('🔄 Refreshing cookies...');
                        loadCookies();
                    });
                }
                
                // Add Export Cookies button event listener
                const exportCookiesBtn = content.querySelector('#export-cookies-btn');
                if (exportCookiesBtn) {
                    exportCookiesBtn.addEventListener('click', async () => {
                        console.log('📋 Exporting cookies...');
                        const currentUrl = window.location.href;
                        
                        try {
                            const cookies = await chrome.runtime.sendMessage({
                                type: 'GET_COOKIES',
                                url: currentUrl
                            });
                            
                            if (cookies && cookies.length > 0) {
                                const cookieText = cookies.map(cookie => 
                                    `${cookie.name}=${cookie.value}`
                                ).join('; ');
                                
                                await navigator.clipboard.writeText(cookieText);
                                showToastNotification('✅ Cookies copied to clipboard!', 'success');
                            } else {
                                showToastNotification('⚠️ No cookies found', 'warning');
                            }
                        } catch (error) {
                            console.error('❌ Export cookies error:', error);
                            showToastNotification('❌ Failed to export cookies', 'error');
                        }
                    });
                }
                
                // Add Cookie button event listener
                const addCookieBtn = content.querySelector('#add-cookie-btn');
                const newCookieKeyInput = content.querySelector('#new-cookie-key');
                const newCookieValueInput = content.querySelector('#new-cookie-value');
                
                if (addCookieBtn && newCookieKeyInput && newCookieValueInput) {
                    // Enter key support for inputs
                    const handleAddCookie = async () => {
                        const key = newCookieKeyInput.value.trim();
                        const value = newCookieValueInput.value.trim();
                        
                        if (!key || !value) {
                            showToastNotification('⚠️ Please enter both Key and Value', 'warning');
                            return;
                        }
                        
                        const currentUrl = window.location.href;
                        const urlObj = new URL(currentUrl);
                        const domain = urlObj.hostname;
                        
                        // Disable button during operation
                        addCookieBtn.disabled = true;
                        const originalText = addCookieBtn.textContent;
                        addCookieBtn.textContent = 'Adding...';
                        
                        try {
                            const response = await chrome.runtime.sendMessage({
                                type: 'SET_COOKIE',
                                name: key,
                                value: value,
                                domain: domain,
                                url: currentUrl
                            });
                            
                            if (response && response.success) {
                                console.log('✅ Cookie added successfully:', response.cookie);
                                showToastNotification(`✅ Cookie "${key}" added successfully!`, 'success');
                                
                                // Track the newly added cookie
                                lastAddedCookieName = key;
                                
                                // Clear inputs
                                newCookieKeyInput.value = '';
                                newCookieValueInput.value = '';
                                
                                // Wait a bit to ensure cookie is fully set before refreshing
                                await new Promise(resolve => setTimeout(resolve, 300));
                                
                                // Refresh cookie list
                                await loadCookies();
                            } else {
                                const errorMsg = response?.error || 'Unknown error';
                                console.error('❌ Add cookie failed:', errorMsg);
                                showToastNotification(`❌ Failed to add cookie: ${errorMsg}`, 'error');
                            }
                        } catch (error) {
                            console.error('❌ Add cookie error:', error);
                            showToastNotification('❌ Failed to add cookie', 'error');
                        } finally {
                            // Re-enable button
                            addCookieBtn.disabled = false;
                            addCookieBtn.textContent = originalText;
                        }
                    };
                    
                    addCookieBtn.addEventListener('click', handleAddCookie);
                    
                    newCookieKeyInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            newCookieValueInput.focus();
                        }
                    });
                    
                    newCookieValueInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleAddCookie();
                        }
                    });
                }
                
                // Function to load and display cookies
                async function loadCookies() {
                    const cookieListEl = content.querySelector('#cookie-list');
                    if (!cookieListEl) return;
                    
                    cookieListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">Loading...</div>';
                    
                    const currentUrl = window.location.href;
                    
                    try {
                        const cookies = await chrome.runtime.sendMessage({
                            type: 'GET_COOKIES',
                            url: currentUrl
                        });
                        
                        if (!cookies || cookies.length === 0) {
                            cookieListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">No cookies found</div>';
                            return;
                        }
                        
                        // Sort cookies: put the last added cookie first
                        const sortedCookies = [...cookies].sort((a, b) => {
                            if (a.name === lastAddedCookieName) return -1;
                            if (b.name === lastAddedCookieName) return 1;
                            return 0;
                        });
                        
                        // Reset the tracking variable after first display (optional: keep it until next add)
                        // lastAddedCookieName = null; // Uncomment if you want to reset after first display
                        
                        let html = '';
                        
                        sortedCookies.forEach((cookie, index) => {
                            html += `
                                <div style="
                                    background: rgba(255,255,255,0.08);
                                    border-radius: 6px;
                                    padding: 12px;
                                    margin-bottom: 10px;
                                    display: flex;
                                    align-items: flex-start;
                                    gap: 12px;
                                    border: 1px solid rgba(255,255,255,0.1);
                                    transition: all 0.2s ease;
                                " onmouseover="this.style.background='rgba(255,255,255,0.12)'; this.style.borderColor='rgba(255,255,255,0.2)';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.1)';">
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="
                                            font-weight: bold;
                                            color: #fff;
                                            margin-bottom: 6px;
                                            word-break: break-all;
                                            font-size: 14px;
                                        ">${cookie.name}</div>
                                        <div style="
                                            color: rgba(255,255,255,0.7);
                                            font-size: 12px;
                                            word-break: break-all;
                                            font-family: monospace;
                                            line-height: 1.5;
                                        ">${cookie.value}</div>
                                    </div>
                                    <button 
                                        class="delete-cookie-btn"
                                        data-cookie-name="${cookie.name}"
                                        data-cookie-domain="${cookie.domain}"
                                        data-cookie-path="${cookie.path}"
                                        style="
                                            width: 32px;
                                            height: 32px;
                                            min-width: 32px;
                                            background: #fff;
                                            border: none;
                                            border-radius: 50%;
                                            color: #333;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            font-size: 18px;
                                            font-weight: bold;
                                            flex-shrink: 0;
                                        "
                                        title="Delete cookie"
                                    >×</button>
                                </div>
                            `;
                        });
                        
                        cookieListEl.innerHTML = html;
                        
                        // Add delete button event listeners
                        const deleteButtons = cookieListEl.querySelectorAll('.delete-cookie-btn');
                        deleteButtons.forEach(btn => {
                            btn.addEventListener('click', async (e) => {
                                e.stopPropagation();
                                const cookieName = btn.getAttribute('data-cookie-name');
                                const cookieDomain = btn.getAttribute('data-cookie-domain');
                                const cookiePath = btn.getAttribute('data-cookie-path');
                                
                                try {
                                    await chrome.runtime.sendMessage({
                                        type: 'DELETE_COOKIE',
                                        name: cookieName,
                                        domain: cookieDomain,
                                        path: cookiePath,
                                        url: currentUrl
                                    });
                                    
                                    showToastNotification(`✅ Cookie "${cookieName}" deleted successfully!`, 'success');
                                    loadCookies(); // Refresh the list
                                } catch (error) {
                                    console.error('❌ Delete cookie error:', error);
                                    showToastNotification('❌ Failed to delete cookie', 'error');
                                }
                            });
                        });
                    } catch (error) {
                        console.error('❌ Load cookies error:', error);
                        cookieListEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Failed to load cookies</div>';
                    }
                }
                
                console.log('✓ Cookie Management button event listener added');
            }
            
            // Add ShipAddress button event listener
            const shipAddressBtn = content.querySelector('#ship-address-btn');
            const shipAddressCard = content.querySelector('#ship-address-card');
            let isShipAddressToolOpen = false;
            
            // Address generation data
            const firstNames = ['Jo', 'John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Tom', 'Amy', 'Robert', 'Maria', 'James', 'Linda'];
            const lastNames = ['Hultquist', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson'];
            
            const usStreetNames = ['E Francis Ave', 'N Main St', 'W Oak Blvd', 'S Park Dr', 'E Maple Ln', 'N Elm St', 'W Pine Ave', 'S Cedar Rd', 'E Birch Way', 'N Spruce Ct'];
            const usCities = ['La Habra', 'Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas'];
            const usStates = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
            const usZipPrefixes = [90631, 10001, 77001, 33101, 60601, 19101, 44101, 30301, 28201, 48201];
            
            const caStreetNames = ['Yonge St', 'Bay St', 'Queen St', 'King St', 'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Blvd', 'Pine Rd', 'Elm St'];
            const caCities = ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'];
            const caProvinces = ['ON', 'BC', 'QC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'];
            const caPostalPrefixes = ['M5H', 'V6B', 'H3A', 'T2P', 'K1A', 'T5J', 'R3B', 'G1A', 'L8L', 'N2G'];
            
            const ukStreetNames = ['High St', 'Church Rd', 'London Rd', 'Park Ave', 'Main St', 'Queen St', 'King St', 'Victoria Rd', 'Mill Ln', 'Oak Dr'];
            const ukCities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol', 'Sheffield', 'Cardiff'];
            const ukCounties = ['Greater London', 'Greater Manchester', 'West Midlands', 'West Yorkshire', 'Scotland', 'Merseyside', 'Lothian', 'South West England', 'South Yorkshire', 'Wales'];
            const ukPostcodes = ['SW1A 1AA', 'M1 1AA', 'B1 1AA', 'LS1 1AA', 'G1 1AA', 'L1 1AA', 'EH1 1AA', 'BS1 1AA', 'S1 1AA', 'CF1 1AA'];
            
            const auStreetNames = ['Collins St', 'George St', 'Bourke St', 'Flinders St', 'King St', 'Elizabeth St', 'Swanston St', 'Queen St', 'William St', 'Pitt St'];
            const auCities = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong'];
            const auStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
            const auPostcodes = [2000, 3000, 4000, 6000, 5000, 7000, 800, 2600];
            
            // Generate random address for a country
            function generateAddress(country) {
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                
                let streetNumber = Math.floor(Math.random() * 9999) + 1;
                let streetName, city, state, zip, countryName;
                
                switch(country) {
                    case 'US':
                        streetName = usStreetNames[Math.floor(Math.random() * usStreetNames.length)];
                        city = usCities[Math.floor(Math.random() * usCities.length)];
                        state = usStates[Math.floor(Math.random() * usStates.length)];
                        const zipPrefix = usZipPrefixes[Math.floor(Math.random() * usZipPrefixes.length)];
                        const zipSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                        zip = `${zipPrefix}-${zipSuffix}`;
                        countryName = 'United States';
                        break;
                    case 'CA':
                        streetName = caStreetNames[Math.floor(Math.random() * caStreetNames.length)];
                        city = caCities[Math.floor(Math.random() * caCities.length)];
                        state = caProvinces[Math.floor(Math.random() * caProvinces.length)];
                        const postalPrefix = caPostalPrefixes[Math.floor(Math.random() * caPostalPrefixes.length)];
                        const postalSuffix = Math.floor(Math.random() * 999).toString().padStart(3, '0');
                        zip = `${postalPrefix} ${postalSuffix}`;
                        countryName = 'Canada';
                        break;
                    case 'UK':
                        streetName = ukStreetNames[Math.floor(Math.random() * ukStreetNames.length)];
                        city = ukCities[Math.floor(Math.random() * ukCities.length)];
                        state = ukCounties[Math.floor(Math.random() * ukCounties.length)];
                        zip = ukPostcodes[Math.floor(Math.random() * ukPostcodes.length)];
                        countryName = 'United Kingdom';
                        break;
                    case 'AU':
                        streetName = auStreetNames[Math.floor(Math.random() * auStreetNames.length)];
                        city = auCities[Math.floor(Math.random() * auCities.length)];
                        state = auStates[Math.floor(Math.random() * auStates.length)];
                        zip = auPostcodes[Math.floor(Math.random() * auPostcodes.length)].toString();
                        countryName = 'Australia';
                        break;
                }
                
                return {
                    name: `${firstName} ${lastName}`,
                    street: `${streetNumber} ${streetName}`,
                    cityStateZip: country === 'CA' || country === 'UK' || country === 'AU' 
                        ? `${city}, ${state}  ${zip}` 
                        : `${city}, ${state}  ${zip}`,
                    country: countryName
                };
            }
            
            // Function to generate and display addresses
            function generateAddresses() {
                const addressListEl = content.querySelector('#address-list');
                if (!addressListEl) return;
                
                addressListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">Generating addresses...</div>';
                
                setTimeout(() => {
                    const countries = ['US', 'CA', 'UK', 'AU'];
                    let html = '';
                    
                    countries.forEach(country => {
                        const address = generateAddress(country);
                        html += `
                            <div style="
                                background: rgba(255,255,255,0.1);
                                border: 1px solid rgba(255,255,255,0.2);
                                border-radius: 6px;
                                padding: 10px;
                                flex: 0 0 calc(50% - 5px);
                                box-sizing: border-box;
                            ">
                                <div style="
                                    font-size: 10px;
                                    color: rgba(255,255,255,0.7);
                                    margin-bottom: 6px;
                                    text-transform: uppercase;
                                    font-weight: bold;
                                ">${address.country}</div>
                                <div style="
                                    font-size: 12px;
                                    color: #fff;
                                    line-height: 1.4;
                                    white-space: pre-line;
                                ">${address.name}
${address.street}
${address.cityStateZip}</div>
                            </div>
                        `;
                    });
                    
                    addressListEl.innerHTML = html;
                }, 300);
            }
            
            if (shipAddressBtn && shipAddressCard) {
                shipAddressBtn.addEventListener('click', () => {
                    console.log('📍 Toggle ShipAddress Tool');
                    
                    isShipAddressToolOpen = !isShipAddressToolOpen;
                    
                    if (isShipAddressToolOpen) {
                        // Hide other cards
                        if (translationCard) {
                            translationCard.style.display = 'none';
                        }
                        if (qrcodeCard) {
                            qrcodeCard.style.display = 'none';
                        }
                        if (cookieCard) {
                            cookieCard.style.display = 'none';
                        }
                        
                        // Hide other buttons - only show ShipAddress
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'none';
                        }
                        if (qrBtn) {
                            qrBtn.style.display = 'none';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'none';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'none';
                        }
                        
                        // Show ShipAddress card
                        shipAddressCard.style.display = 'block';
                        
                        // Show Back button
                        if (translationBackBtn) {
                            translationBackBtn.style.display = 'block';
                        }
                        
                        // Hide other content
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
                        
                        // Generate addresses automatically
                        generateAddresses();
                    } else {
                        shipAddressCard.style.display = 'none';
                        
                        // Show other buttons again
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const syncImageBtn = content.querySelector('#sync-image-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'flex';
                        }
                        if (qrBtn) {
                            qrBtn.style.display = 'flex';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'flex';
                        }
                        if (syncImageBtn) {
                            syncImageBtn.style.display = 'flex';
                        }
                        
                        if (translationBackBtn) {
                            translationBackBtn.style.display = 'none';
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
                
                // Add Refresh Addresses button event listener
                const refreshAddressesBtn = content.querySelector('#refresh-addresses-btn');
                if (refreshAddressesBtn) {
                    refreshAddressesBtn.addEventListener('click', () => {
                        console.log('🔄 Refreshing addresses...');
                        generateAddresses();
                    });
                }
                
                console.log('✓ ShipAddress button event listener added');
            }
            
            // Add Sync Image button event listener
            const syncImageBtn = content.querySelector('#sync-image-btn');
            const syncImageCard = content.querySelector('#sync-image-card');
            let isSyncImageToolOpen = false;
            let currentSyncSessionId = null;

            function openKnowledgeBaseHandbook() {
                const storageKey = CONFIG.KNOWLEDGE_BASE?.STORAGE_KEY || 'knowledgeBasePath';
                const defaultPath = CONFIG.KNOWLEDGE_BASE?.DEFAULT_PATH || '';

                chrome.storage.local.get([storageKey], (result) => {
                    const filePath = result[storageKey] || defaultPath;
                    if (!filePath) {
                        alert('知识库路径未配置，请在 chrome.storage.local 中设置 knowledgeBasePath');
                        return;
                    }

                    chrome.runtime.sendMessage({
                        type: 'OPEN_KNOWLEDGE_BASE',
                        filePath
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            alert('无法打开知识库：' + chrome.runtime.lastError.message);
                            return;
                        }
                        if (!response?.success) {
                            alert('无法打开知识库：' + (response?.error || '未知错误') + '\n\n请确认：\n1. 文件路径正确\n2. 在 chrome://extensions 中为该扩展开启「允许访问文件网址」');
                        }
                    });
                });
            }

            const knowledgeBaseBtn = content.querySelector('#knowledge-base-btn');
            if (knowledgeBaseBtn) {
                knowledgeBaseBtn.addEventListener('click', (e) => {
                    if (e.shiftKey) {
                        console.log('📚 Open Knowledge Base handbook (Shift+click)');
                        openKnowledgeBaseHandbook();
                        return;
                    }
                    console.log('📚 Open AI Side Panel - Knowledge tab');
                    chrome.runtime.sendMessage({
                        type: 'OPEN_SIDE_PANEL',
                        tab: 'knowledge'
                    });
                });
                knowledgeBaseBtn.title = '打开 AI 知识库（Shift+点击打开本地手册）';
                console.log('✓ Knowledge Base button event listener added');
            }
            
            // Generate unique session ID
            function generateSessionId() {
                return 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Generate QR code for sync image
            function generateSyncQRCode(sessionId) {
                const qrcodeDisplay = content.querySelector('#sync-qrcode-display');
                if (!qrcodeDisplay) return;
                
                // Get upload page URL from storage or use default
                chrome.storage.local.get(['uploadPageUrl'], (result) => {
                    let uploadUrl;
                    if (result.uploadPageUrl && result.uploadPageUrl !== '') {
                        uploadUrl = `${result.uploadPageUrl}?session=${sessionId}`;
                    } else {
                        // Default: use Vercel deployment URL
                        // If this doesn't work, user needs to configure uploadPageUrl
                        // Try multiple possible URLs
                        uploadUrl = `https://qa-tool-five.vercel.app/upload.html?session=${sessionId}`;
                    }
                    
                    // Show URL info for debugging
                    console.log('📡 Upload page URL:', uploadUrl);
                    
                    // Generate QR code using the same API as the QR code tool
                    const encodedText = encodeURIComponent(uploadUrl);
                    const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodedText;
                    
                    const img = document.createElement('img');
                    img.src = qrCodeUrl;
                    img.alt = 'Sync Image QR Code';
                    img.style.maxWidth = '280px';
                    img.style.maxHeight = '280px';
                    img.style.display = 'block';
                    
                    img.onload = () => {
                        qrcodeDisplay.innerHTML = '';
                        qrcodeDisplay.appendChild(img);
                    };
                    
                    img.onerror = () => {
                        qrcodeDisplay.innerHTML = '<div style="color: #f44336; font-size: 14px; text-align: center;">生成二维码失败，请重试</div>';
                    };
                });
            }
            
            // Load uploaded images from local storage only (no API calls)
            // This avoids all storage bucket list API permission issues
            async function loadSyncImages(sessionId) {
                const imagesListEl = content.querySelector('#sync-images-list');
                if (!imagesListEl) return;
                
                imagesListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">正在加载图片...</div>';
                
                try {
                    const storageKey = `sync_images_${sessionId}`;
                    console.log('🔑 Loading images for session:', sessionId);
                    console.log('📦 Storage key:', storageKey);
                    
                    // Load from chrome.storage.local (primary source)
                    chrome.storage.local.get([storageKey], (result) => {
                        let images = result[storageKey];
                        
                        // If chrome.storage is empty, try localStorage (fallback)
                        if (!images || !Array.isArray(images) || images.length === 0) {
                            try {
                                const localStorageData = localStorage.getItem(storageKey);
                                if (localStorageData) {
                                    images = JSON.parse(localStorageData);
                                    console.log('📦 Loaded from localStorage:', images?.length || 0, 'images');
                                    
                                    // Copy to chrome.storage for future use
                                    if (images && Array.isArray(images) && images.length > 0) {
                                        chrome.storage.local.set({ [storageKey]: images }, () => {
                                            console.log('💾 Copied to chrome.storage');
                                        });
                                    }
                                }
                            } catch (e) {
                                console.log('⚠️ Could not read from localStorage:', e);
                            }
                        } else {
                            console.log('✅ Loaded from chrome.storage:', images.length, 'images');
                        }
                        
                        if (images && Array.isArray(images) && images.length > 0) {
                            console.log('✅ Displaying', images.length, 'images');
                            displaySyncImages(images);
                        } else {
                            imagesListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">暂无上传的图片<br><small style="color: #666; font-size: 12px; margin-top: 10px; display: block;">提示：上传图片后会自动保存并显示</small></div>';
                        }
                    });
                } catch (error) {
                    console.error('❌ Load sync images error:', error);
                    imagesListEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">加载图片失败: ' + (error.message || '未知错误') + '</div>';
                }
            }
            
            // Old function with API calls - kept for reference but not used
            async function loadSyncImages_OLD_WITH_API(sessionId) {
                const imagesListEl = content.querySelector('#sync-images-list');
                if (!imagesListEl) return;
                
                imagesListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">正在加载图片...</div>';
                
                try {
                    // Get Supabase configuration from storage, with defaults
                    chrome.storage.local.get(['supabaseUrl', 'supabaseAnonKey', 'supabaseBucket'], async (result) => {
                        // Use default values if not configured
                        const supabaseUrl = result.supabaseUrl || 'https://hgjmoyhmlanlrgbvttax.supabase.co';
                        const supabaseAnonKey = result.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnam1veWhtbGFubHJnYnZ0dGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTI2MTIsImV4cCI6MjA3NjgyODYxMn0.iaZarnzuQMBNoPDj4iyhMqmJ08x-OXWiAhZF7RiOleI';
                        const supabaseBucket = result.supabaseBucket || 'sync-images';
                        
                        if (!supabaseUrl || !supabaseAnonKey || !supabaseBucket) {
                            imagesListEl.innerHTML = '<div style="color: #ff9800; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">请先配置Supabase设置</div>';
                            return;
                        }
                        
                        try {
                            console.log('🔑 Loading images for session:', sessionId);
                            console.log('🔑 Supabase config:', { url: supabaseUrl, bucket: supabaseBucket });
                            
                            const prefix = sessionId + '/';
                            
                            // Try multiple API formats - Supabase Storage API can be finicky
                            let response = null;
                            let listUrl = '';
                            let lastError = null;
                            
                            // Format 1: Standard format with prefix query parameter (most common)
                            listUrl = `${supabaseUrl}/storage/v1/object/list/${supabaseBucket}?prefix=${encodeURIComponent(prefix)}`;
                            console.log('📡 Attempting Format 1 (prefix only):', listUrl);
                            
                            response = await fetch(listUrl, {
                                method: 'GET',
                                headers: {
                                    'apikey': supabaseAnonKey,
                                    'Authorization': `Bearer ${supabaseAnonKey}`
                                }
                            });
                            
                            console.log('📡 Format 1 response:', response.status, response.statusText);
                            
                            if (!response.ok) {
                                const errorText = await response.text();
                                console.log('📡 Format 1 error:', errorText);
                                lastError = { status: response.status, text: errorText };
                                
                                // Format 2: With limit parameter
                                listUrl = `${supabaseUrl}/storage/v1/object/list/${supabaseBucket}?prefix=${encodeURIComponent(prefix)}&limit=1000`;
                                console.log('📡 Attempting Format 2 (with limit):', listUrl);
                                
                                response = await fetch(listUrl, {
                                    method: 'GET',
                                    headers: {
                                        'apikey': supabaseAnonKey,
                                        'Authorization': `Bearer ${supabaseAnonKey}`
                                    }
                                });
                                
                                console.log('📡 Format 2 response:', response.status, response.statusText);
                            }
                            
                            if (!response.ok) {
                                const errorText = await response.text();
                                console.log('📡 Format 2 error:', errorText);
                                lastError = { status: response.status, text: errorText };
                                
                                // Format 3: Try without trailing slash in prefix
                                const prefixNoSlash = sessionId;
                                listUrl = `${supabaseUrl}/storage/v1/object/list/${supabaseBucket}?prefix=${encodeURIComponent(prefixNoSlash)}`;
                                console.log('📡 Attempting Format 3 (prefix without trailing slash):', listUrl);
                                
                                response = await fetch(listUrl, {
                                    method: 'GET',
                                    headers: {
                                        'apikey': supabaseAnonKey,
                                        'Authorization': `Bearer ${supabaseAnonKey}`
                                    }
                                });
                                
                                console.log('📡 Format 3 response:', response.status, response.statusText);
                            }
                            
                            if (!response.ok) {
                                const errorText = await response.text();
                                console.log('📡 Format 3 error:', errorText);
                                lastError = { status: response.status, text: errorText };
                                
                                // Format 4: Try listing root and filter client-side
                                listUrl = `${supabaseUrl}/storage/v1/object/list/${supabaseBucket}`;
                                console.log('📡 Attempting Format 4 (root listing):', listUrl);
                                
                                response = await fetch(listUrl, {
                                    method: 'GET',
                                    headers: {
                                        'apikey': supabaseAnonKey,
                                        'Authorization': `Bearer ${supabaseAnonKey}`
                                    }
                                });
                                
                                console.log('📡 Format 4 response:', response.status, response.statusText);
                            }
                            
                            if (!response.ok) {
                                let errorData;
                                let errorText = '';
                                try {
                                    errorText = await response.text();
                                    try {
                                        errorData = JSON.parse(errorText);
                                    } catch {
                                        errorData = { error: errorText, message: errorText };
                                    }
                                } catch {
                                    errorData = { error: 'Unknown error', message: 'Unknown error' };
                                }
                                
                                console.error('❌ All API formats failed. Last attempt:', {
                                    url: listUrl,
                                    status: response.status,
                                    statusText: response.statusText,
                                    error: errorData,
                                    rawText: errorText.substring(0, 500)
                                });
                                
                                // Handle specific error cases
                                if (errorData && (errorData.error === 'Bucket not found' || errorData.message === 'Bucket not found' || errorData.statusCode === '404')) {
                                    // This is likely an RLS policy issue, not that bucket doesn't exist
                                    // Try listing from root to verify bucket access
                                    console.warn('⚠️ Bucket not found error - might be RLS policy issue');
                                    console.warn('💡 Trying to list from root to verify bucket access...');
                                    
                                    // Try listing from root without prefix to verify bucket access
                                    // Try different API formats
                                    const rootUrl1 = `${supabaseUrl}/storage/v1/object/list/${supabaseBucket}`;
                                    const rootUrl2 = `${supabaseUrl}/storage/v1/object/list/${supabaseBucket}?limit=100`;
                                    
                                    console.log('📡 Trying root listing (format 1):', rootUrl1);
                                    
                                    let rootResponse = await fetch(rootUrl1, {
                                        method: 'GET',
                                        headers: {
                                            'apikey': supabaseAnonKey,
                                            'Authorization': `Bearer ${supabaseAnonKey}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });
                                    
                                    // If first format fails, try second format
                                    if (!rootResponse.ok) {
                                        console.log('📡 Format 1 failed, trying format 2:', rootUrl2);
                                        rootResponse = await fetch(rootUrl2, {
                                            method: 'GET',
                                            headers: {
                                                'apikey': supabaseAnonKey,
                                                'Authorization': `Bearer ${supabaseAnonKey}`,
                                                'Content-Type': 'application/json'
                                            }
                                        });
                                    }
                                    
                                    console.log('📡 Root response status:', rootResponse.status);
                                    
                                    if (rootResponse.ok) {
                                        const rootData = await rootResponse.json();
                                        console.log('✅ Root listing successful, got', rootData?.length || 0, 'items');
                                        console.log('📦 Root data sample:', rootData?.slice(0, 3));
                                        
                                        // Filter files that match our session
                                        const sessionFiles = Array.isArray(rootData) 
                                            ? rootData.filter(f => {
                                                if (!f || !f.name) return false;
                                                // Check if file name starts with session prefix
                                                return f.name.startsWith(prefix);
                                            })
                                            : [];
                                        
                                        console.log('🔍 Filtered session files:', sessionFiles.length);
                                        
                                        if (sessionFiles.length > 0) {
                                            // Process the filtered files
                                            const fileList = sessionFiles.filter(file => {
                                                if (!file || !file.name) return false;
                                                const hasExtension = file.name.includes('.') && file.name.split('.').length > 1;
                                                return hasExtension;
                                            });
                                            
                                            console.log('📄 Files after filtering:', fileList.length);
                                            
                                            if (fileList.length > 0) {
                                                // Remove prefix from file names for display
                                                const processedFiles = fileList.map(file => ({
                                                    ...file,
                                                    name: file.name.startsWith(prefix) ? file.name.substring(prefix.length) : file.name,
                                                    originalName: file.name
                                                }));
                                                
                                                // Continue with image processing
                                                const images = processedFiles.map(file => {
                                                    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${file.originalName}`;
                                                    const fileName = file.name || '';
                                                    const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                                    
                                                    let fileType = 'image/jpeg';
                                                    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
                                                        fileType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                                                    } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
                                                        fileType = `video/${ext}`;
                                                    }
                                                    
                                                    let displayName = fileName;
                                                    const nameParts = fileName.split('_');
                                                    if (nameParts.length >= 3 && /^\d+$/.test(nameParts[2].split('.')[0])) {
                                                        displayName = nameParts.slice(3).join('_');
                                                    }
                                                    
                                                    return {
                                                        name: displayName || fileName,
                                                        originalName: file.originalName,
                                                        url: publicUrl,
                                                        type: fileType,
                                                        size: file.metadata?.size || file.size || 0,
                                                        created_at: file.created_at
                                                    };
                                                });
                                                
                                                console.log('✅ Loaded images from root listing:', images);
                                                displaySyncImages(images);
                                                return;
                                            }
                                        }
                                        
                                        // No files for this session
                                        imagesListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">暂无上传的图片</div>';
                                        return;
                                    } else {
                                        // Root listing also failed - this confirms it's a policy/access issue
                                        const rootError = await rootResponse.json().catch(() => ({ error: 'Unknown error' }));
                                        console.error('❌ Root listing also failed:', rootError);
                                        
                                        // Provide detailed error message
                                        let errorMsg = '存储桶访问被拒绝。';
                                        if (rootError.error === 'Bucket not found' || rootError.message === 'Bucket not found') {
                                            errorMsg += '即使策略已配置，API 仍然返回 "Bucket not found"。';
                                            errorMsg += '请检查：1) 策略是否已保存并生效 2) 策略的 USING 子句是否正确 3) 等待几秒钟让策略生效后重试';
                                        } else {
                                            errorMsg += `错误: ${rootError.error || rootError.message || 'Unknown'}`;
                                        }
                                        
                                        throw new Error(errorMsg);
                                    }
                                }
                                
                                // If folder doesn't exist (404), that's okay
                                if (response.status === 404) {
                                    imagesListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">暂无上传的图片</div>';
                                    return;
                                }
                                
                                throw new Error(`读取文件失败: ${errorData.error || errorData.message || 'HTTP ' + response.status}`);
                            }
                            
                            // Success! Parse the response
                            let data = null;
                            try {
                                data = await response.json();
                                console.log('✅ API call successful, received data type:', Array.isArray(data) ? 'array' : typeof data);
                                console.log('✅ Data length/size:', Array.isArray(data) ? data.length : Object.keys(data || {}).length);
                            } catch (err) {
                                console.error('❌ Failed to parse JSON response:', err);
                                imagesListEl.innerHTML = '<div style="color: #ff4444; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">响应解析失败</div>';
                                return;
                            }
                            
                            // Handle different response formats
                            let fileList = [];
                            if (Array.isArray(data)) {
                                fileList = data;
                            } else if (data && Array.isArray(data.files)) {
                                fileList = data.files;
                            } else if (data && Array.isArray(data.items)) {
                                fileList = data.items;
                            } else {
                                console.warn('⚠️ Unexpected response format:', data);
                                fileList = [];
                            }
                            
                            // If we got root listing (Format 4), filter by session prefix
                            if (listUrl === `${supabaseUrl}/storage/v1/object/list/${supabaseBucket}`) {
                                console.log('📦 Root listing successful, filtering by session:', sessionId);
                                const beforeFilter = fileList.length;
                                fileList = fileList.filter(f => {
                                    if (!f || !f.name) return false;
                                    return f.name.startsWith(prefix);
                                });
                                console.log('🔍 Filtered from', beforeFilter, 'to', fileList.length, 'files for session');
                            }
                            
                            // Filter out folders (only get files with extensions)
                            fileList = fileList.filter(file => {
                                if (!file || !file.name) return false;
                                const hasExtension = file.name.includes('.') && file.name.split('.').length > 1;
                                return hasExtension;
                            });
                            
                            console.log('📄 Files after filtering:', fileList.length);
                            
                            if (fileList.length === 0) {
                                imagesListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">暂无上传的图片</div>';
                                return;
                            }
                            
                            // Process files for display
                            const processedFiles = fileList.map(file => {
                                const fullPath = file.name || '';
                                // Remove prefix from file names for display
                                const displayName = fullPath.startsWith(prefix) 
                                    ? fullPath.substring(prefix.length) 
                                    : fullPath;
                                
                                return {
                                    ...file,
                                    name: displayName,
                                    originalName: fullPath
                                };
                            });
                            
                            // Get public URLs and prepare image data
                            const images = processedFiles.map(file => {
                                // Construct public URL - use full path from originalName
                                const publicUrl = `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${file.originalName}`;
                                
                                // Determine file type
                                let fileType = 'image/jpeg';
                                const fileName = file.name || '';
                                const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                
                                if (file.metadata && file.metadata.mimetype) {
                                    fileType = file.metadata.mimetype;
                                } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
                                    fileType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                                } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
                                    fileType = `video/${ext}`;
                                }
                                
                                // Extract display name (remove session prefix and timestamp if present)
                                let displayName = fileName;
                                const nameParts = fileName.split('_');
                                if (nameParts.length >= 3) {
                                    // Check if third part looks like a number (timestamp)
                                    const thirdPart = nameParts[2];
                                    if (/^\d+$/.test(thirdPart.split('.')[0])) {
                                        // Skip session ID and timestamp, use rest
                                        displayName = nameParts.slice(3).join('_');
                                    } else {
                                        // Just skip session ID
                                        displayName = nameParts.slice(1).join('_');
                                    }
                                }
                                
                                // If display name is empty or too short, use original name
                                if (!displayName || displayName.length < 3) {
                                    displayName = fileName;
                                }
                                
                                return {
                                    name: displayName,
                                    originalName: file.originalName,
                                    url: publicUrl,
                                    type: fileType,
                                    isVideo: ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext),
                                    size: file.metadata?.size || file.size || 0,
                                    created_at: file.created_at
                                };
                            });
                            
                            console.log('✅ Loaded images:', images);
                            displaySyncImages(images);
                        } catch (error) {
                            console.error('❌ Load sync images error:', error);
                            console.error('Error type:', typeof error);
                            console.error('Error details:', {
                                message: error?.message,
                                error: error?.error,
                                type: error?.type,
                                target: error?.target,
                                toString: String(error)
                            });
                            
                            // Handle different error types
                            let errorMsg = '未知错误';
                            if (error instanceof Error) {
                                errorMsg = error.message;
                            } else if (error?.message) {
                                errorMsg = error.message;
                            } else if (error?.error?.message) {
                                errorMsg = error.error.message;
                            } else if (typeof error === 'string') {
                                errorMsg = error;
                            } else if (error?.type) {
                                // Event object
                                errorMsg = `加载失败 (${error.type})。请检查：1) Supabase 配置是否正确 2) 网络连接是否正常 3) 浏览器控制台是否有 CSP 错误`;
                            } else {
                                errorMsg = String(error) || '未知错误';
                            }
                            
                            imagesListEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">加载图片失败: ' + errorMsg + '</div>';
                        }
                    });
                } catch (error) {
                    console.error('❌ Load sync images error:', error);
                    imagesListEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">加载图片失败</div>';
                }
            }
            
            // Display uploaded images
            function displaySyncImages(images) {
                const imagesListEl = content.querySelector('#sync-images-list');
                if (!imagesListEl) return;
                
                if (!images || images.length === 0) {
                    imagesListEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">暂无上传的图片</div>';
                    return;
                }
                
                let html = '';
                images.forEach((image, index) => {
                    const isVideo = image.type && image.type.startsWith('video/');
                    html += `
                        <div style="
                            position: relative;
                            background: rgba(255,255,255,0.1);
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 8px;
                            overflow: hidden;
                            aspect-ratio: 1;
                        ">
                            ${isVideo ? `
                                <video 
                                    src="${image.url}" 
                                    style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                                    onclick="window.openSyncImageModal('${image.url}', '${image.name || 'video'}', true)"
                                ></video>
                            ` : `
                                <img 
                                    src="${image.url}" 
                                    alt="${image.name || 'image'}"
                                    style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                                    onclick="window.openSyncImageModal('${image.url}', '${image.name || 'image'}', false)"
                                />
                            `}
                            <div style="
                                position: absolute;
                                bottom: 0;
                                left: 0;
                                right: 0;
                                background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
                                padding: 8px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            ">
                                <span style="
                                    font-size: 11px;
                                    color: #fff;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                    flex: 1;
                                ">${image.name || '未命名'}</span>
                                <button 
                                    onclick="event.stopPropagation(); window.downloadSyncImage('${image.url}', '${image.name || 'download'}')"
                                    style="
                                        background: rgba(255,255,255,0.2);
                                        border: none;
                                        color: #fff;
                                        padding: 4px 8px;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 10px;
                                        margin-left: 5px;
                                    "
                                    onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                                    onmouseout="this.style.background='rgba(255,255,255,0.2)'"
                                >下载</button>
                            </div>
                        </div>
                    `;
                });
                imagesListEl.innerHTML = html;
            }
            
            // Open image modal for viewing
            window.openSyncImageModal = function(url, name, isVideo) {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.9);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                `;
                
                const content = document.createElement('div');
                content.style.cssText = `
                    max-width: 90%;
                    max-height: 90%;
                    position: relative;
                `;
                
                if (isVideo) {
                    const video = document.createElement('video');
                    video.src = url;
                    video.controls = true;
                    video.style.cssText = 'max-width: 100%; max-height: 100%;';
                    content.appendChild(video);
                } else {
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = name;
                    img.style.cssText = 'max-width: 100%; max-height: 100%;';
                    content.appendChild(img);
                }
                
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '×';
                closeBtn.style.cssText = `
                    position: absolute;
                    top: -40px;
                    right: 0;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: #fff;
                    font-size: 30px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    document.body.removeChild(modal);
                };
                content.appendChild(closeBtn);
                
                modal.appendChild(content);
                modal.onclick = (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                    }
                };
                
                document.body.appendChild(modal);
            };
            
            // Download image
            window.downloadSyncImage = function(url, name) {
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            
            if (syncImageBtn && syncImageCard) {
                syncImageBtn.addEventListener('click', () => {
                    console.log('📷 Toggle Sync Image Tool');
                    
                    isSyncImageToolOpen = !isSyncImageToolOpen;
                    
                    if (isSyncImageToolOpen) {
                        // Hide other cards
                        if (translationCard) {
                            translationCard.style.display = 'none';
                        }
                        if (qrcodeCard) {
                            qrcodeCard.style.display = 'none';
                        }
                        if (cookieCard) {
                            cookieCard.style.display = 'none';
                        }
                        const shipAddressCardEl = content.querySelector('#ship-address-card');
                        if (shipAddressCardEl) {
                            shipAddressCardEl.style.display = 'none';
                        }
                        
                        // Hide other buttons - only show Sync Image
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'none';
                        }
                        if (qrBtn) {
                            qrBtn.style.display = 'none';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'none';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'none';
                        }
                        
                        // Show Sync Image card
                        syncImageCard.style.display = 'block';
                        
                        // Show Back button
                        if (translationBackBtn) {
                            translationBackBtn.style.display = 'block';
                        }
                        
                        // Generate new session ID and QR code
                        currentSyncSessionId = generateSessionId();
                        const sessionIdValueEl = content.querySelector('#sync-session-id-value');
                        if (sessionIdValueEl) {
                            sessionIdValueEl.textContent = currentSyncSessionId;
                        }
                        generateSyncQRCode(currentSyncSessionId);
                        
                        // Load existing images
                        loadSyncImages(currentSyncSessionId);
                        
                        // Hide other content
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
                        // Hide Sync Image card
                        syncImageCard.style.display = 'none';
                        
                        // Show other buttons again
                        const translationBtn = content.querySelector('#open-translation-tool-btn');
                        const qrBtn = content.querySelector('#qrcode-btn');
                        const cookieBtnEl = content.querySelector('#cookie-btn');
                        const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                        if (translationBtn) {
                            translationBtn.style.display = 'flex';
                        }
                        if (qrBtn) {
                            qrBtn.style.display = 'flex';
                        }
                        if (cookieBtnEl) {
                            cookieBtnEl.style.display = 'flex';
                        }
                        if (shipAddressBtnEl) {
                            shipAddressBtnEl.style.display = 'flex';
                        }
                        
                        // Hide Back button
                        if (translationBackBtn) {
                            translationBackBtn.style.display = 'none';
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
                
                // Add Refresh Images button event listener
                const refreshSyncImagesBtn = content.querySelector('#refresh-sync-images-btn');
                if (refreshSyncImagesBtn) {
                    refreshSyncImagesBtn.addEventListener('click', () => {
                        console.log('🔄 Refreshing sync images...');
                        if (currentSyncSessionId) {
                            loadSyncImages(currentSyncSessionId);
                        }
                    });
                }
                
                // Listen for messages from upload.html (when files are uploaded)
                window.addEventListener('message', (event) => {
                    // Accept messages from any origin (upload.html might be on different domain)
                    if (event.data && event.data.type === 'sync_images_uploaded') {
                        const { sessionId, images } = event.data;
                        console.log('📨 Received postMessage for session:', sessionId);
                        
                        // Save to chrome.storage
                        const storageKey = `sync_images_${sessionId}`;
                        chrome.storage.local.set({ [storageKey]: images }, () => {
                            console.log('💾 Saved', images.length, 'images from postMessage');
                        });
                        
                        // If this is the current session, refresh the display
                        if (sessionId === currentSyncSessionId) {
                            console.log('🔄 Refreshing display for current session');
                            loadSyncImages(sessionId);
                        }
                    }
                });
                
                // Also listen for BroadcastChannel messages (for same-origin communication)
                try {
                    const channel = new BroadcastChannel('sync_images_channel');
                    channel.addEventListener('message', (event) => {
                        if (event.data && event.data.type === 'sync_images_uploaded') {
                            const { sessionId, images } = event.data;
                            console.log('📨 Received BroadcastChannel message for session:', sessionId);
                            
                            // Save to chrome.storage
                            const storageKey = `sync_images_${sessionId}`;
                            chrome.storage.local.set({ [storageKey]: images }, () => {
                                console.log('💾 Saved', images.length, 'images from BroadcastChannel');
                            });
                            
                            // If this is the current session, refresh the display
                            if (sessionId === currentSyncSessionId) {
                                console.log('🔄 Refreshing display for current session');
                                loadSyncImages(sessionId);
                            }
                        }
                    });
                    console.log('✅ BroadcastChannel listener set up');
                } catch (e) {
                    console.log('⚠️ BroadcastChannel not available:', e);
                }
                
                console.log('✓ Sync Image button event listener added');
            }
            
            // Add Back button event listener for Translation, QR Code and Cookie
            const translationBackBtn = content.querySelector('#translation-back-btn');
            if (translationBackBtn) {
                translationBackBtn.addEventListener('click', () => {
                    console.log('← Back button clicked');
                    
                    // Hide all cards
                    if (translationCard) {
                        translationCard.style.display = 'none';
                    }
                    if (qrcodeCard) {
                        qrcodeCard.style.display = 'none';
                    }
                    if (cookieCard) {
                        cookieCard.style.display = 'none';
                    }
                    const shipAddressCardEl = content.querySelector('#ship-address-card');
                    if (shipAddressCardEl) {
                        shipAddressCardEl.style.display = 'none';
                    }
                    const syncImageCardEl = content.querySelector('#sync-image-card');
                    if (syncImageCardEl) {
                        syncImageCardEl.style.display = 'none';
                    }
                    
                    // Show all buttons again
                    const translationBtn = content.querySelector('#open-translation-tool-btn');
                    const qrBtn = content.querySelector('#qrcode-btn');
                    const cookieBtnEl = content.querySelector('#cookie-btn');
                    const shipAddressBtnEl = content.querySelector('#ship-address-btn');
                    const syncImageBtn = content.querySelector('#sync-image-btn');
                    
                    if (translationBtn) {
                        translationBtn.style.display = 'flex';
                    }
                    if (qrBtn) {
                        qrBtn.style.display = 'flex';
                    }
                    if (cookieBtnEl) {
                        cookieBtnEl.style.display = 'flex';
                    }
                    if (shipAddressBtnEl) {
                        shipAddressBtnEl.style.display = 'flex';
                    }
                    if (syncImageBtn) {
                        syncImageBtn.style.display = 'flex';
                    }
                    
                    // Hide Back button
                    translationBackBtn.style.display = 'none';
                    
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
                    
                    // Reset states
                    isTranslationToolOpen = false;
                    isQRCodeToolOpen = false;
                    isCookieToolOpen = false;
                    if (typeof isShipAddressToolOpen !== 'undefined') {
                        isShipAddressToolOpen = false;
                    }
                    if (typeof isSyncImageToolOpen !== 'undefined') {
                        isSyncImageToolOpen = false;
                    }
                });
                
                console.log('✓ Back button event listener added');
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
                padding: 6px;
            ">
                <!-- Header with Translation label, QRcode button and Back button -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0;
                ">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; flex: 1;">
                        <div 
                            id="open-translation-tool-btn"
                            title="Translation"
                            style="
                                background: rgba(255, 235, 59, 0.2);
                                color: #ffeb3b;
                                border: 1px solid rgba(255, 235, 59, 0.4);
                                padding: 8px;
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 32px;
                                height: 32px;
                            "
                            onmouseover="this.style.background='rgba(255, 235, 59, 0.35)'; this.style.borderColor='rgba(255, 235, 59, 0.6)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';"
                            onmouseout="this.style.background='rgba(255, 235, 59, 0.2)'; this.style.borderColor='rgba(255, 235, 59, 0.4)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 8l6 6"></path>
                                <path d="M4 14l6-6 2-3"></path>
                                <path d="M2 5h12"></path>
                                <path d="M7 2h1"></path>
                                <path d="M22 22l-5-10-5 10"></path>
                                <path d="M14 18h6"></path>
                            </svg>
                        </div>
                        
                        <div 
                            id="qrcode-btn"
                            title="QRcode"
                            style="
                                background: rgba(255, 235, 59, 0.2);
                                color: #ffeb3b;
                                border: 1px solid rgba(255, 235, 59, 0.4);
                                padding: 8px;
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 32px;
                                height: 32px;
                            "
                            onmouseover="this.style.background='rgba(255, 235, 59, 0.35)'; this.style.borderColor='rgba(255, 235, 59, 0.6)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';"
                            onmouseout="this.style.background='rgba(255, 235, 59, 0.2)'; this.style.borderColor='rgba(255, 235, 59, 0.4)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="5" height="5"></rect>
                                <rect x="16" y="3" width="5" height="5"></rect>
                                <rect x="3" y="16" width="5" height="5"></rect>
                                <path d="M21 16h-3a2 2 0 0 1-2-2v-3"></path>
                            </svg>
                        </div>
                        
                        <div 
                            id="cookie-btn"
                            title="Cookie"
                            style="
                                background: rgba(255, 235, 59, 0.2);
                                color: #ffeb3b;
                                border: 1px solid rgba(255, 235, 59, 0.4);
                                padding: 8px;
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 32px;
                                height: 32px;
                            "
                            onmouseover="this.style.background='rgba(255, 235, 59, 0.35)'; this.style.borderColor='rgba(255, 235, 59, 0.6)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';"
                            onmouseout="this.style.background='rgba(255, 235, 59, 0.2)'; this.style.borderColor='rgba(255, 235, 59, 0.4)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
                                <path d="M8.5 8.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z"></path>
                                <path d="M16 15a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z"></path>
                            </svg>
                        </div>
                        
                        <div 
                            id="ship-address-btn"
                            title="ShipAddress"
                            style="
                                background: rgba(255, 235, 59, 0.2);
                                color: #ffeb3b;
                                border: 1px solid rgba(255, 235, 59, 0.4);
                                padding: 8px;
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 32px;
                                height: 32px;
                            "
                            onmouseover="this.style.background='rgba(255, 235, 59, 0.35)'; this.style.borderColor='rgba(255, 235, 59, 0.6)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';"
                            onmouseout="this.style.background='rgba(255, 235, 59, 0.2)'; this.style.borderColor='rgba(255, 235, 59, 0.4)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                        
                        <div 
                            id="sync-image-btn"
                            title="Sync Image"
                            style="
                                background: rgba(255, 235, 59, 0.2);
                                color: #ffeb3b;
                                border: 1px solid rgba(255, 235, 59, 0.4);
                                padding: 8px;
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 32px;
                                height: 32px;
                            "
                            onmouseover="this.style.background='rgba(255, 235, 59, 0.35)'; this.style.borderColor='rgba(255, 235, 59, 0.6)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';"
                            onmouseout="this.style.background='rgba(255, 235, 59, 0.2)'; this.style.borderColor='rgba(255, 235, 59, 0.4)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </div>

                        <div 
                            id="knowledge-base-btn"
                            title="Knowledge Base"
                            style="
                                background: rgba(255, 235, 59, 0.2);
                                color: #ffeb3b;
                                border: 1px solid rgba(255, 235, 59, 0.4);
                                padding: 8px;
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 32px;
                                height: 32px;
                            "
                            onmouseover="this.style.background='rgba(255, 235, 59, 0.35)'; this.style.borderColor='rgba(255, 235, 59, 0.6)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';"
                            onmouseout="this.style.background='rgba(255, 235, 59, 0.2)'; this.style.borderColor='rgba(255, 235, 59, 0.4)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                        </div>
                    </div>
                    
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
                
                <!-- QR Code Card (hidden by default) -->
                <div id="qrcode-card" style="display: none; padding: 0; margin-top: 15px;">
                    
                    <!-- Input Section -->
                    <div style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 10px;
                    ">
                        <div style="
                            font-size: 14px;
                            font-weight: bold;
                            color: #fff;
                            margin-bottom: 8px;
                        ">Enter Your Data</div>
                        
                        <textarea 
                            id="qrcode-input"
                            placeholder="Enter text or URL to generate QR code..."
                            style="
                                width: 100%;
                                min-height: 50px;
                                padding: 10px;
                                border: 1px solid rgba(255,255,255,0.2);
                                border-radius: 6px;
                                font-size: 13px;
                                resize: vertical;
                                box-sizing: border-box;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                outline: none;
                                margin-bottom: 10px;
                            "
                        ></textarea>
                        
                        <!-- Buttons -->
                        <div style="display: flex; gap: 8px;">
                            <button 
                                id="generate-qrcode-btn"
                                style="
                                    flex: 1;
                                    background: #a855f7;
                                    color: #fff;
                                    border: none;
                                    padding: 8px 16px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 13px;
                                    font-weight: bold;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                "
                                onmouseover="this.style.background='#9333ea'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                                onmouseout="this.style.background='#a855f7'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                            >Gen QRCode</button>
                            
                            <button 
                                id="clear-qrcode-btn"
                                style="
                                    flex: 1;
                                    background: rgba(255,255,255,0.2);
                                    color: #fff;
                                    border: 1px solid rgba(255,255,255,0.3);
                                    padding: 8px 16px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 13px;
                                    font-weight: bold;
                                    transition: all 0.2s ease;
                                "
                                onmouseover="this.style.background='rgba(255,255,255,0.3)';"
                                onmouseout="this.style.background='rgba(255,255,255,0.2)';"
                            >Clear</button>
                        </div>
                    </div>
                    
                    <!-- QR Code Display Section -->
                    <div 
                        id="qrcode-display"
                        style="
                            background: #fff;
                            border-radius: 8px;
                            padding: 20px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 280px;
                            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                            margin-bottom: 10px;
                        "
                    >
                        <div style="
                            color: #999;
                            font-size: 14px;
                            text-align: center;
                        ">Generating QR code...</div>
                    </div>
                </div>
                
                <!-- Cookie Management Card (hidden by default) -->
                <div id="cookie-card" style="display: none; padding: 0; margin-top: 15px;">
                    
                    <!-- Add New Cookie Section -->
                    <div style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 18px;
                        margin-bottom: 15px;
                    ">
                        <div style="
                            font-size: 16px;
                            font-weight: bold;
                            color: #fff;
                            margin-bottom: 15px;
                        ">Add New Cookie</div>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: rgba(255,255,255,0.9);
                                    margin-bottom: 6px;
                                    font-weight: 500;
                                ">Key</label>
                                <input 
                                    type="text" 
                                    id="new-cookie-key"
                                    placeholder="key"
                                    style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border: 1px solid rgba(255,255,255,0.3);
                                        border-radius: 6px;
                                        background: rgba(255,255,255,0.1);
                                        color: #fff;
                                        font-size: 13px;
                                        outline: none;
                                        box-sizing: border-box;
                                    "
                                    onfocus="this.style.borderColor='#ffeb3b'; this.style.background='rgba(255,255,255,0.15)';"
                                    onblur="this.style.borderColor='rgba(255,255,255,0.3)'; this.style.background='rgba(255,255,255,0.1)';"
                                />
                            </div>
                            
                            <div style="flex: 1;">
                                <label style="
                                    display: block;
                                    font-size: 13px;
                                    color: rgba(255,255,255,0.9);
                                    margin-bottom: 6px;
                                    font-weight: 500;
                                ">Value</label>
                                <input 
                                    type="text" 
                                    id="new-cookie-value"
                                    placeholder="value"
                                    style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border: 1px solid rgba(255,255,255,0.3);
                                        border-radius: 6px;
                                        background: rgba(255,255,255,0.1);
                                        color: #fff;
                                        font-size: 13px;
                                        outline: none;
                                        box-sizing: border-box;
                                    "
                                    onfocus="this.style.borderColor='#ffeb3b'; this.style.background='rgba(255,255,255,0.15)';"
                                    onblur="this.style.borderColor='rgba(255,255,255,0.3)'; this.style.background='rgba(255,255,255,0.1)';"
                                />
                            </div>
                        </div>
                        
                        <button 
                            id="add-cookie-btn"
                            style="
                                width: 100%;
                                background: #ffeb3b;
                                color: #333;
                                border: none;
                                padding: 10px 16px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: bold;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            "
                            onmouseover="this.style.background='#ffd700'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                            onmouseout="this.style.background='#ffeb3b'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                        >Add Cookie</button>
                    </div>
                    
                    <!-- Existing Cookies Section -->
                    <div style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 18px;
                    ">
                        <div style="
                            font-size: 16px;
                            font-weight: bold;
                            color: #fff;
                            margin-bottom: 15px;
                        ">Existing Cookies</div>
                        
                        <!-- Cookie List Display -->
                        <div 
                            id="cookie-list"
                            style="
                                max-height: 350px;
                                overflow-y: auto;
                                font-size: 12px;
                                color: #fff;
                            "
                        >
                            <div style="color: #999; text-align: center; padding: 20px;">Loading cookies...</div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display: flex; gap: 8px; margin-top: 15px;">
                            <button 
                                id="refresh-cookies-btn"
                                style="
                                    flex: 1;
                                    background: #10b981;
                                    color: #fff;
                                    border: none;
                                    padding: 10px 16px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 13px;
                                    font-weight: bold;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                "
                                onmouseover="this.style.background='#059669'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                                onmouseout="this.style.background='#10b981'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                            >Refresh</button>
                            
                            <button 
                                id="export-cookies-btn"
                                style="
                                    flex: 1;
                                    background: #3b82f6;
                                    color: #fff;
                                    border: none;
                                    padding: 10px 16px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 13px;
                                    font-weight: bold;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                "
                                onmouseover="this.style.background='#2563eb'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                                onmouseout="this.style.background='#3b82f6'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                            >Copy All</button>
                        </div>
                    </div>
                </div>
                
                <!-- ShipAddress Card (hidden by default) -->
                <div id="ship-address-card" style="display: none; padding: 0; margin-top: 15px;">
                    
                    <!-- Address Display Section -->
                    <div style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                    ">
                        <div style="
                            font-size: 14px;
                            font-weight: bold;
                            color: #fff;
                            margin-bottom: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        ">
                            <span>Shipping Addresses</span>
                            <button 
                                id="refresh-addresses-btn"
                                style="
                                    background: #10b981;
                                    color: #fff;
                                    border: none;
                                    padding: 6px 12px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: bold;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                "
                                onmouseover="this.style.background='#059669'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                                onmouseout="this.style.background='#10b981'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                            >Refresh</button>
                        </div>
                        
                        <!-- Address List Display -->
                        <div 
                            id="address-list"
                            style="
                                font-size: 13px;
                                color: #fff;
                                display: flex;
                                flex-direction: row;
                                flex-wrap: wrap;
                                gap: 10px;
                            "
                        >
                            <div style="color: #999; text-align: center; padding: 20px; width: 100%;">Generating addresses...</div>
                        </div>
                    </div>
                </div>
                
                <!-- Sync Image Card (hidden by default) -->
                <div id="sync-image-card" style="display: none; padding: 0; margin-top: 15px;">
                    
                    <!-- QR Code Section -->
                    <div style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                    ">
                        <div style="
                            font-size: 14px;
                            font-weight: bold;
                            color: #fff;
                            margin-bottom: 10px;
                            text-align: center;
                        ">扫描二维码上传图片/视频</div>
                        
                        <div 
                            id="sync-qrcode-display"
                            style="
                                background: #fff;
                                border-radius: 8px;
                                padding: 20px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 280px;
                                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                            "
                        >
                            <div style="
                                color: #999;
                                font-size: 14px;
                                text-align: center;
                            ">正在生成二维码...</div>
                        </div>
                        
                        <div style="
                            font-size: 12px;
                            color: rgba(255,255,255,0.7);
                            text-align: center;
                            margin-top: 10px;
                        " id="sync-session-id">会话ID: <span id="sync-session-id-value">-</span></div>
                    </div>
                    
                    <!-- Uploaded Images Section -->
                    <div style="
                        background: rgba(255,255,255,0.15);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                    ">
                        <div style="
                            font-size: 14px;
                            font-weight: bold;
                            color: #fff;
                            margin-bottom: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        ">
                            <span>已上传的图片/视频</span>
                            <button 
                                id="refresh-sync-images-btn"
                                style="
                                    background: #10b981;
                                    color: #fff;
                                    border: none;
                                    padding: 6px 12px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: bold;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                "
                                onmouseover="this.style.background='#059669'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';"
                                onmouseout="this.style.background='#10b981'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';"
                            >刷新</button>
                        </div>
                        
                        <div 
                            id="sync-images-list"
                            style="
                                display: grid;
                                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                                gap: 10px;
                            "
                        >
                            <div style="color: #999; text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;">暂无上传的图片</div>
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

        if (message.type === 'SHOW_FLOATING_MINIMIZED') {
            showFloatingMinimized();
            sendResponse({ success: true });
        }
        
        return true;
    });
    
})();
} // End of isSupportedDomain() check
