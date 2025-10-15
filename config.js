// Unified configuration for Cafepress QA Tools
// All domain and base URL configurations are centralized here

const CONFIG = {
    // Frontend site domains by region and environment
    SITES: {
        US: {
            PRE: 'cafus-cpsw-web.pre.planetart.com',
            STAGE: 'cafus-cpsw-web.stage.planetart.com',
            LIVE: 'www.cafepress.com',
            LIVE_ALT: 'cafepress.com'  // Alternative domain without www
        },
        CA: {
            PRE: 'cafca-cpsw-web.pre.planetart.com',
            STAGE: 'cafca-cpsw-web.stage.planetart.com',
            LIVE: 'www.cafepress.ca',
            LIVE_ALT: 'cafepress.ca'
        },
        UK: {
            PRE: 'cafuk-cpsw-web.pre.planetart.com',
            STAGE: 'cafuk-cpsw-web.stage.planetart.com',
            LIVE: 'www.cafepress.co.uk',
            LIVE_ALT: 'cafepress.co.uk'
        },
        AU: {
            PRE: 'cafau-cpsw-web.pre.planetart.com',
            STAGE: 'cafau-cpsw-web.stage.planetart.com',
            LIVE: 'www.cafepress.com.au',
            LIVE_ALT: 'cafepress.com.au'
        }
    },
    
    // Admin backend domains by environment
    ADMIN: {
        PRE: 'https://admin-cpsw-web.pre.planetart.com',
        STAGE: 'https://admin-cpsw-web.stage.planetart.com',
        LIVE: 'https://admin.planetart.com'
    },
    
    // Authentication related domains
    AUTH: {
        LOGIN_DOMAIN: 'https://login.planetart.com',
        SSO_URL: 'https://login.planetart.com/sso'
    },
    
    // Site ID mapping by region
    SITE_IDS: {
        US: '170',
        CA: '173',
        UK: '172',
        AU: '171'
    },
    
    // Admin API endpoints
    API_ENDPOINTS: {
        APPROVE_IMAGE: '/ajax/ajax_cp_cup_tool_approve.php',
        SELLER_STORE: '/ajax/ajax_cp_seller_store.php',
        ORDER_TAB_INDEX: '/orders/order_tab_index.php',
        ORDER_TAB_OVERVIEW: '/orders/order_tab_overview.php',
        ORDER_TAB_ITEMS: '/orders/order_tab_items.php',
        ORDER_TAB_ITEM_AJAX: '/orders/order_tab_item_ajax.php',
        ORDER_TAB_CUSTOMER: '/orders/order_tab_customer.php'
    },
    
    // Helper methods
    
    /**
     * Get all supported domains for manifest permissions
     * @returns {Array<string>} Array of domain patterns
     */
    getAllDomainPatterns() {
        const domains = [];
        
        // Add all site domains
        Object.values(this.SITES).forEach(region => {
            domains.push(`*://${region.PRE}/*`);
            domains.push(`*://${region.STAGE}/*`);
            domains.push(`*://${region.LIVE}/*`);
            domains.push(`*://${region.LIVE_ALT}/*`);
        });
        
        // Add admin domains
        domains.push('*://admin-cpsw-web.pre.planetart.com/*');
        domains.push('*://admin-cpsw-web.stage.planetart.com/*');
        domains.push('*://admin.planetart.com/*');
        domains.push('*://login.planetart.com/*');
        
        return domains;
    },
    
    /**
     * Get all supported domains for content script matches
     * @returns {Array<string>} Array of domain patterns (excluding admin)
     */
    getContentScriptMatches() {
        const domains = [];
        
        // Add only site domains (not admin)
        Object.values(this.SITES).forEach(region => {
            domains.push(`*://${region.PRE}/*`);
            domains.push(`*://${region.STAGE}/*`);
            domains.push(`*://${region.LIVE}/*`);
            domains.push(`*://${region.LIVE_ALT}/*`);
        });
        
        return domains;
    },
    
    /**
     * Get all supported domain names (without protocol and path)
     * @returns {Array<string>} Array of domain names
     */
    getSupportedDomains() {
        const domains = [];
        
        Object.values(this.SITES).forEach(region => {
            domains.push(region.PRE);
            domains.push(region.STAGE);
            domains.push(region.LIVE);
            domains.push(region.LIVE_ALT);
        });
        
        return domains;
    },
    
    /**
     * Detect environment from hostname
     * @param {string} hostname - The hostname to check
     * @returns {string} Environment name: 'pre', 'stage', or 'live'
     */
    detectEnvironment(hostname) {
        if (hostname.includes('pre.planetart.com')) {
            return 'pre';
        } else if (hostname.includes('stage.planetart.com')) {
            return 'stage';
        } else {
            return 'live';
        }
    },
    
    /**
     * Get Admin API base URL for given environment
     * @param {string} environment - Environment name ('pre', 'stage', 'live')
     * @returns {string} Admin base URL
     */
    getAdminBaseUrl(environment) {
        const envKey = environment.toUpperCase();
        return this.ADMIN[envKey] || this.ADMIN.LIVE;
    },
    
    /**
     * Get full Admin API URL
     * @param {string} environment - Environment name
     * @param {string} endpoint - API endpoint path
     * @returns {string} Full API URL
     */
    getAdminApiUrl(environment, endpoint) {
        return this.getAdminBaseUrl(environment) + endpoint;
    },
    
    /**
     * Detect region from URL
     * @param {string} url - URL to check
     * @returns {string|null} Region code ('US', 'CA', 'UK', 'AU') or null
     */
    detectRegion(url) {
        if (url.includes('cafus-cpsw-web') || 
            (url.includes('cafepress.com') && !url.includes('cafepress.ca') && 
             !url.includes('cafepress.co.uk') && !url.includes('cafepress.com.au'))) {
            return 'US';
        } else if (url.includes('cafca-cpsw-web') || url.includes('cafepress.ca')) {
            return 'CA';
        } else if (url.includes('cafuk-cpsw-web') || url.includes('cafepress.co.uk')) {
            return 'UK';
        } else if (url.includes('cafau-cpsw-web') || url.includes('cafepress.com.au')) {
            return 'AU';
        }
        return null;
    },
    
    /**
     * Get Site ID for a region
     * @param {string} region - Region code ('US', 'CA', 'UK', 'AU')
     * @returns {string} Site ID
     */
    getSiteId(region) {
        return this.SITE_IDS[region] || 'N/A';
    },
    
    /**
     * Get site name for display
     * @param {string} region - Region code
     * @returns {string} Site name (e.g., 'CAFUS', 'CAFCA')
     */
    getSiteName(region) {
        if (!region) return 'ENV';
        return 'CAF' + region;
    },
    
    /**
     * Get site configuration for a region
     * @param {string} region - Region code ('US', 'CA', 'UK', 'AU')
     * @returns {Object} Site configuration object
     */
    getSiteConfig(region) {
        return this.SITES[region] || null;
    }
};

// For use in content scripts and service workers
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// For use in service workers (background.js)
if (typeof self !== 'undefined' && typeof ServiceWorkerGlobalScope !== 'undefined') {
    self.CONFIG = CONFIG;
}

// For module exports (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

