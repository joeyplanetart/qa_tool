// Unified configuration for Cafepress QA Tools
// All domain and base URL configurations are centralized here

const CONFIG = {
    // Branch name configuration (can be changed flexibly)
    // 分支名称配置（可灵活修改）
    BRANCH: {
        CURRENT: 'cpsw-web',  // 当前使用的分支名称，如需切换分支请修改此处
        // 其他可能的分支示例：'master', 'cpsw-web', 'feature-branch', 'hotfix-123' 等
    },
    
    // Base domain configuration
    // 基础域名配置
    BASE_DOMAIN: {
        PRE: 'pre.planetart.com',
        STAGE: 'stage.planetart.com',
        LIVE: 'planetart.com'
    },
    
    // Region prefixes
    // 地区前缀
    REGION_PREFIX: {
        US: 'cafus',
        CA: 'cafca',
        UK: 'cafuk',
        AU: 'cafau'
    },
    
    // Frontend site domains by region and environment
    // 自动生成的站点域名（基于上述配置）
    get SITES() {
        const branch = this.BRANCH.CURRENT;
        return {
            US: {
                PRE: `${this.REGION_PREFIX.US}-${branch}.${this.BASE_DOMAIN.PRE}`,
                STAGE: `${this.REGION_PREFIX.US}-${branch}.${this.BASE_DOMAIN.STAGE}`,
                LIVE: 'www.cafepress.com',
                LIVE_ALT: 'cafepress.com'
            },
            CA: {
                PRE: `${this.REGION_PREFIX.CA}-${branch}.${this.BASE_DOMAIN.PRE}`,
                STAGE: `${this.REGION_PREFIX.CA}-${branch}.${this.BASE_DOMAIN.STAGE}`,
                LIVE: 'www.cafepress.ca',
                LIVE_ALT: 'cafepress.ca'
            },
            UK: {
                PRE: `${this.REGION_PREFIX.UK}-${branch}.${this.BASE_DOMAIN.PRE}`,
                STAGE: `${this.REGION_PREFIX.UK}-${branch}.${this.BASE_DOMAIN.STAGE}`,
                LIVE: 'www.cafepress.co.uk',
                LIVE_ALT: 'cafepress.co.uk'
            },
            AU: {
                PRE: `${this.REGION_PREFIX.AU}-${branch}.${this.BASE_DOMAIN.PRE}`,
                STAGE: `${this.REGION_PREFIX.AU}-${branch}.${this.BASE_DOMAIN.STAGE}`,
                LIVE: 'www.cafepress.com.au',
                LIVE_ALT: 'cafepress.com.au'
            }
        };
    },
    
    // Admin backend domains by environment
    // 自动生成的 Admin 域名（基于分支配置）
    get ADMIN() {
        const branch = this.BRANCH.CURRENT;
        return {
            PRE: `https://admin-${branch}.${this.BASE_DOMAIN.PRE}`,
            STAGE: `https://admin-${branch}.${this.BASE_DOMAIN.STAGE}`,
            LIVE: 'https://admin.planetart.com'
        };
    },
    
    // Authentication related domains
    // Using Pre environment (master branch) as Live is not yet released
    AUTH: {
        LOGIN_DOMAIN: 'https://login-master.pre.planetart.com',
        SSO_URL: 'https://login-master.pre.planetart.com/sso'
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
     * Check if a hostname matches supported domain patterns
     * 检查主机名是否匹配支持的域名模式
     * @param {string} hostname - Hostname to check
     * @returns {boolean} True if supported
     */
    isSupportedHostname(hostname) {
        if (!hostname) return false;
        
        const supportedPatterns = [
            /^cafus-.*\.pre\.planetart\.com$/,
            /^cafus-.*\.stage\.planetart\.com$/,
            /^cafca-.*\.pre\.planetart\.com$/,
            /^cafca-.*\.stage\.planetart\.com$/,
            /^cafuk-.*\.pre\.planetart\.com$/,
            /^cafuk-.*\.stage\.planetart\.com$/,
            /^cafau-.*\.pre\.planetart\.com$/,
            /^cafau-.*\.stage\.planetart\.com$/,
            /^(www\.)?cafepress\.com$/,
            /^(www\.)?cafepress\.ca$/,
            /^(www\.)?cafepress\.co\.uk$/,
            /^(www\.)?cafepress\.com\.au$/
        ];
        
        return supportedPatterns.some(pattern => pattern.test(hostname));
    },
    
    /**
     * Auto-detect branch name from hostname
     * 从主机名自动检测分支名称
     * @param {string} hostname - Optional hostname (uses window.location.hostname if not provided)
     * @returns {string|null} Detected branch name or null if not found
     */
    autoDetectBranch(hostname = null) {
        // If no hostname provided, try to get from window
        if (!hostname && typeof window !== 'undefined') {
            hostname = window.location.hostname;
        }
        
        if (!hostname) return null;
        
        // Pattern: {region}-{branch}.{environment}.planetart.com
        // Examples: cafus-cpsw-web.pre.planetart.com, cafca-master.stage.planetart.com
        const preStagePattern = /^caf(?:us|ca|uk|au)-([^.]+)\.(pre|stage)\.planetart\.com$/;
        const adminPattern = /^admin-([^.]+)\.(pre|stage)\.planetart\.com$/;
        
        let match = hostname.match(preStagePattern);
        if (match) {
            return match[1]; // 返回分支名称
        }
        
        match = hostname.match(adminPattern);
        if (match) {
            return match[1]; // 返回分支名称
        }
        
        return null; // Live 环境或无法识别的域名
    },
    
    /**
     * Set current branch name (dynamically change branch)
     * 设置当前分支名称（动态切换分支）
     * @param {string} branchName - Branch name (e.g., 'cpsw-web', 'master')
     * @example CONFIG.setBranch('master')
     */
    setBranch(branchName) {
        this.BRANCH.CURRENT = branchName;
        console.log(`✅ Branch switched to: ${branchName}`);
        console.log(`📍 Example domains:`);
        console.log(`   - US PRE: ${this.SITES.US.PRE}`);
        console.log(`   - Admin PRE: ${this.ADMIN.PRE}`);
    },
    
    /**
     * Auto-detect and set branch from current URL
     * 自动检测并设置当前 URL 的分支
     * @param {boolean} updateConfig - Whether to update CONFIG.BRANCH.CURRENT (default: false)
     * @returns {string|null} Detected branch name or null
     */
    detectAndSetBranch(updateConfig = false) {
        const detectedBranch = this.autoDetectBranch();
        
        if (detectedBranch) {
            console.log(`🔍 Auto-detected branch: ${detectedBranch}`);
            
            if (updateConfig) {
                this.BRANCH.CURRENT = detectedBranch;
                console.log(`✅ Config updated to use detected branch: ${detectedBranch}`);
            } else {
                console.log(`ℹ️ Detected branch: ${detectedBranch} (config not updated, using: ${this.BRANCH.CURRENT})`);
            }
            
            return detectedBranch;
        } else {
            console.log(`ℹ️ Could not auto-detect branch from URL: ${window.location.hostname}`);
            console.log(`📌 Using configured branch: ${this.BRANCH.CURRENT}`);
            return null;
        }
    },
    
    /**
     * Get current branch name
     * 获取当前分支名称
     * @returns {string} Current branch name
     */
    getCurrentBranch() {
        return this.BRANCH.CURRENT;
    },
    
    /**
     * Build custom domain with specific branch
     * 使用指定分支构建自定义域名
     * @param {string} region - Region code ('US', 'CA', 'UK', 'AU')
     * @param {string} environment - Environment ('pre', 'stage', 'live')
     * @param {string} branchName - Optional branch name (uses current if not specified)
     * @returns {string} Generated domain
     * @example CONFIG.buildDomain('US', 'pre', 'feature-web') // cafus-feature-web.pre.planetart.com
     */
    buildDomain(region, environment, branchName = null) {
        const branch = branchName || this.BRANCH.CURRENT;
        const regionPrefix = this.REGION_PREFIX[region];
        
        if (!regionPrefix) {
            console.error(`Invalid region: ${region}`);
            return null;
        }
        
        const env = environment.toLowerCase();
        
        if (env === 'live') {
            // Live environment uses production domains
            return this.SITES[region].LIVE;
        } else if (env === 'pre') {
            return `${regionPrefix}-${branch}.${this.BASE_DOMAIN.PRE}`;
        } else if (env === 'stage') {
            return `${regionPrefix}-${branch}.${this.BASE_DOMAIN.STAGE}`;
        }
        
        console.error(`Invalid environment: ${environment}`);
        return null;
    },
    
    /**
     * Build admin domain with specific branch
     * 使用指定分支构建 Admin 域名
     * @param {string} environment - Environment ('pre', 'stage', 'live')
     * @param {string} branchName - Optional branch name (uses current if not specified)
     * @returns {string} Generated admin URL
     * @example CONFIG.buildAdminDomain('pre', 'feature-web') // https://admin-feature-web.pre.planetart.com
     */
    buildAdminDomain(environment, branchName = null) {
        const branch = branchName || this.BRANCH.CURRENT;
        const env = environment.toLowerCase();
        
        if (env === 'live') {
            return 'https://admin.planetart.com';
        } else if (env === 'pre') {
            return `https://admin-${branch}.${this.BASE_DOMAIN.PRE}`;
        } else if (env === 'stage') {
            return `https://admin-${branch}.${this.BASE_DOMAIN.STAGE}`;
        }
        
        console.error(`Invalid environment: ${environment}`);
        return null;
    },
    
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
     * Detect region from URL or hostname
     * @param {string} url - URL or hostname to check
     * @returns {string|null} Region code ('US', 'CA', 'UK', 'AU') or null
     */
    detectRegion(url) {
        if (!url) return null;
        
        // Check for pre/stage environment domains with any branch name
        if (/cafus-[^.]+\.(pre|stage)\.planetart\.com/.test(url) || 
            (url.includes('cafepress.com') && !url.includes('cafepress.ca') && 
             !url.includes('cafepress.co.uk') && !url.includes('cafepress.com.au'))) {
            return 'US';
        } else if (/cafca-[^.]+\.(pre|stage)\.planetart\.com/.test(url) || url.includes('cafepress.ca')) {
            return 'CA';
        } else if (/cafuk-[^.]+\.(pre|stage)\.planetart\.com/.test(url) || url.includes('cafepress.co.uk')) {
            return 'UK';
        } else if (/cafau-[^.]+\.(pre|stage)\.planetart\.com/.test(url) || url.includes('cafepress.com.au')) {
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

