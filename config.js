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
        AU: 'cafau',
        CPB: 'cpbus',
        PCRUS: 'pcrus',
        STIUS: 'stius'
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
            },
            CPB: {
                PRE: `${this.REGION_PREFIX.CPB}-${branch}.${this.BASE_DOMAIN.PRE}`,
                STAGE: `${this.REGION_PREFIX.CPB}-${branch}.${this.BASE_DOMAIN.STAGE}`,
                LIVE: 'www.cafepress.com',
                LIVE_ALT: 'cafepress.com',
                LIVE_PATH_PREFIX: '/business'
            },
            PCRUS: {
                PRE: `${this.REGION_PREFIX.PCRUS}-${branch}.${this.BASE_DOMAIN.PRE}`,
                STAGE: `${this.REGION_PREFIX.PCRUS}-${branch}.${this.BASE_DOMAIN.STAGE}`,
                LIVE: 'www.personalcreations.com',
                LIVE_ALT: 'personalcreations.com'
            },
            STIUS: {
                PRE: `${this.REGION_PREFIX.STIUS}-${branch}.${this.BASE_DOMAIN.PRE}`,
                STAGE: `${this.REGION_PREFIX.STIUS}-${branch}.${this.BASE_DOMAIN.STAGE}`,
                LIVE: 'www.simplytoimpress.com',
                LIVE_ALT: 'simplytoimpress.com'
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
    
    // Authentication related domains (dynamic based on environment)
    // 认证域名（根据环境动态生成）
    // Note: All environments use /login page which redirects to ADFS, then back to respective environment
    get AUTH() {
        const branch = this.BRANCH.CURRENT;
        return {
            // Pre/Stage environments use branch-specific login domains
            PRE_LOGIN_DOMAIN: `https://login-${branch}.${this.BASE_DOMAIN.PRE}`,
            PRE_LOGIN_URL: `https://login-${branch}.${this.BASE_DOMAIN.PRE}/login`,
            STAGE_LOGIN_DOMAIN: `https://login-${branch}.${this.BASE_DOMAIN.STAGE}`,
            STAGE_LOGIN_URL: `https://login-${branch}.${this.BASE_DOMAIN.STAGE}/login`,
            // Live environment
            LIVE_LOGIN_DOMAIN: 'https://login.planetart.com',
            LIVE_LOGIN_URL: 'https://login.planetart.com/login'
        };
    },
    
    // Site ID mapping by region
    SITE_IDS: {
        US: '170',
        CA: '173',
        UK: '172',
        AU: '171',
        CPB: '169',
        PCRUS: '163',
        STIUS: '1'
    },
    
    // Admin API endpoints
    API_ENDPOINTS: {
        APPROVE_IMAGE: '/ajax/ajax_cp_cup_tool_approve.php',
        SELLER_STORE: '/ajax/ajax_cp_seller_store.php',
        ORDER_TAB_INDEX: '/orders/order_tab_index.php',
        ORDER_TAB_OVERVIEW: '/orders/order_tab_overview.php',
        ORDER_TAB_ITEMS: '/orders/order_tab_items.php',
        ORDER_TAB_ITEM_AJAX: '/orders/order_tab_item_ajax.php',
        ORDER_TAB_CUSTOMER: '/orders/order_tab_customer.php',
        EDIT_ORDER_AJAX: '/orders/edit_order_ajax.php'
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
            /^admin-.*\.pre\.planetart\.com$/,
            /^admin-.*\.stage\.planetart\.com$/,
            /^admin\.planetart\.com$/,
            /^cafus-.*\.pre\.planetart\.com$/,
            /^cafus-.*\.stage\.planetart\.com$/,
            /^cafca-.*\.pre\.planetart\.com$/,
            /^cafca-.*\.stage\.planetart\.com$/,
            /^cafuk-.*\.pre\.planetart\.com$/,
            /^cafuk-.*\.stage\.planetart\.com$/,
            /^cafau-.*\.pre\.planetart\.com$/,
            /^cafau-.*\.stage\.planetart\.com$/,
            /^cpbus-.*\.pre\.planetart\.com$/,
            /^cpbus-.*\.stage\.planetart\.com$/,
            /^pcrus-.*\.pre\.planetart\.com$/,
            /^pcrus-.*\.stage\.planetart\.com$/,
            /^stius-.*\.pre\.planetart\.com$/,
            /^stius-.*\.stage\.planetart\.com$/,
            /^(www\.)?cafepress\.com$/,
            /^(www\.)?cafepress\.ca$/,
            /^(www\.)?cafepress\.co\.uk$/,
            /^(www\.)?cafepress\.com\.au$/,
            /^(www\.)?personalcreations\.com$/,
            /^(www\.)?simplytoimpress\.com$/
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
        const cpbPattern = /^cpbus-([^.]+)\.(pre|stage)\.planetart\.com$/;
        const pcrusPattern = /^pcrus-([^.]+)\.(pre|stage)\.planetart\.com$/;
        const stiusPattern = /^stius-([^.]+)\.(pre|stage)\.planetart\.com$/;
        const adminPattern = /^admin-([^.]+)\.(pre|stage)\.planetart\.com$/;
        
        let match = hostname.match(preStagePattern);
        if (match) {
            return match[1]; // 返回分支名称
        }
        
        match = hostname.match(cpbPattern);
        if (match) {
            return match[1];
        }
        
        match = hostname.match(pcrusPattern);
        if (match) {
            return match[1];
        }
        
        match = hostname.match(stiusPattern);
        if (match) {
            return match[1];
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
        const siteConfig = this.SITES[region];
        
        if (env === 'live') {
            return siteConfig ? siteConfig.LIVE : null;
        } else if (env === 'pre') {
            return `${regionPrefix}-${branch}.${this.BASE_DOMAIN.PRE}`;
        } else if (env === 'stage') {
            return `${regionPrefix}-${branch}.${this.BASE_DOMAIN.STAGE}`;
        }
        
        console.error(`Invalid environment: ${environment}`);
        return null;
    },
    
    /**
     * Build live URL path prefix for a region (e.g. CPB uses /business)
     */
    getLivePathPrefix(region) {
        const siteConfig = this.SITES[region];
        return siteConfig?.LIVE_PATH_PREFIX || '';
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
        
        // CPB (CafePress Business)
        if (/cpbus-[^.]+\.(pre|stage)\.planetart\.com/.test(url) ||
            /cafepress\.com\/business(\/|$|\?)/.test(url)) {
            return 'CPB';
        }
        
        // PCRUS (Personal Creations US)
        if (/pcrus-[^.]+\.(pre|stage)\.planetart\.com/.test(url) ||
            /personalcreations\.com/.test(url)) {
            return 'PCRUS';
        }
        
        // STIUS (Simply to Impress US)
        if (/stius-[^.]+\.(pre|stage)\.planetart\.com/.test(url) ||
            /simplytoimpress\.com/.test(url)) {
            return 'STIUS';
        }
        
        // Check for pre/stage environment domains with any branch name
        if (/cafus-[^.]+\.(pre|stage)\.planetart\.com/.test(url) || 
            (url.includes('cafepress.com') && !url.includes('cafepress.ca') && 
             !url.includes('cafepress.co.uk') && !url.includes('cafepress.com.au') &&
             !url.includes('cafepress.com/business'))) {
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
        if (region === 'CPB') return 'CPBUS';
        if (region === 'PCRUS') return 'PCRUS';
        if (region === 'STIUS') return 'STIUS';
        return 'CAF' + region;
    },
    
    /**
     * Get site configuration for a region
     * @param {string} region - Region code ('US', 'CA', 'UK', 'AU')
     * @returns {Object} Site configuration object
     */
    getSiteConfig(region) {
        return this.SITES[region] || null;
    },
    
    /**
     * Get SSO configuration (login URL) based on current environment
     * 根据当前环境获取 SSO 登录配置
     * Each environment has its own /login page which handles ADFS authentication
     * and maintains separate login sessions
     * @param {string} hostname - Optional hostname (uses window.location.hostname if not provided)
     * @returns {Object} { loginUrl, environment, branch }
     */
    getSsoConfig(hostname = null) {
        // Auto-detect environment and branch
        if (!hostname && typeof window !== 'undefined') {
            hostname = window.location.hostname;
        }
        
        const detectedEnv = this.detectEnvironment(hostname || '');
        const detectedBranch = this.autoDetectBranch(hostname) || this.BRANCH.CURRENT;
        
        let loginUrl;
        
        if (detectedEnv === 'live') {
            // Live environment
            loginUrl = this.AUTH.LIVE_LOGIN_URL;
        } else if (detectedEnv === 'pre') {
            // Pre environment - use detected branch
            loginUrl = `https://login-${detectedBranch}.${this.BASE_DOMAIN.PRE}/login`;
        } else if (detectedEnv === 'stage') {
            // Stage environment - use detected branch
            loginUrl = `https://login-${detectedBranch}.${this.BASE_DOMAIN.STAGE}/login`;
        } else {
            // Fallback to Pre with current branch
            console.warn(`Unknown environment, falling back to Pre with branch: ${this.BRANCH.CURRENT}`);
            loginUrl = this.AUTH.PRE_LOGIN_URL;
        }
        
        return {
            loginUrl,
            environment: detectedEnv,
            branch: detectedBranch
        };
    },
    
    /**
     * Test Links Configuration
     * 测试链接配置
     * 可以在这里添加、编辑或删除测试链接
     */
    TEST_LINKS: {
        categories: [
            {
                name: 'SW Tools',
                links: [
                    {
                        title: 'Dev Tools',
                        urls: {
                            live: 'https://devtools.planetart.com/',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'DB Tools',
                        urls: {
                            live: 'https://db.planetart.com/',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'Splunk',
                        urls: {
                            live: 'https://planetart.splunkcloud.com/en-US/app/search/search',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'argocd',
                        urls: {
                            live: 'https://argocd.planetartnet.com/applications',
                            pre: null,
                            stage: null
                        }
                    }
                ]
            },
            {
                name: 'Vendorlibs',
                links: [
                    {
                        title: 'VL admin',
                        urls: {
                            live: 'https://vendorlib-admin.planetart.com/admin/',
                            pre: null,
                            stage: 'https://vvdr-master-api.yastage.planetart.com/admin/login'
                        }
                    }
                ]
            },
            {
                name: 'Chatbot',
                links: [
                    {
                        title: 'View Chat',
                        urls: {
                            live: 'https://ai-pri.planetart.com/admin2/chat-viewer/cp-1-2b040c0a-cc01-4a8f-9eee-c11b14d8428a-cpus',
                            pre: null,
                            stage: null
                        }
                    }
                ]
            },
            {
                name: 'PLP',
                links: [
                    {
                        title: 'PLP Tool',
                        urls: {
                            live: 'https://plptool-live.cafepress.io/',
                            pre: null,
                            stage: 'https://plptool-stage.cafepress.io/'
                        }
                    }
                ]
            },
            {
                name: 'Third Party',
                links: [
                    {
                        title: 'OneTrust',
                        urls: {
                            live: 'https://app.onetrust.com/cookies/script-integration',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'Google Analytics',
                        urls: {
                            live: 'https://analytics.google.com/analytics/web/#/a93335189p431296353/reports/intelligenthome',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'Google Tag Manager',
                        urls: {
                            live: 'https://tagmanager.google.com/#/home',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'Cordial',
                        urls: {
                            live: 'https://admin.cordial.io/#login',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'Kount',
                        urls: {
                            live: 'https://portal.kount.net/portal/login',
                            pre: null,
                            stage: 'https://awc.test.kount.net/'
                        }
                    }
                ]
            },
            {
                name: 'Sites Url',
                links: [
                    {
                        title: 'stius',
                        urls: {
                            live: 'https://www.simplytoimpress.com/',
                            pre: 'https://stius-master.pre.planetart.com/',
                            stage: 'https://stius-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'stiuk',
                        urls: {
                            live: null,
                            pre: 'https://stiuk-master.pre-eu.planetart.com/',
                            stage: 'https://stiuk-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'photo',
                        urls: {
                            live: null,
                            pre: 'https://photo-master.pre.planetart.com/',
                            stage: 'https://photo-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'canvs',
                        urls: {
                            live: null,
                            pre: 'https://canvs-master.pre.planetart.com/',
                            stage: 'https://canvs-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'mccus',
                        urls: {
                            live: null,
                            pre: 'https://mccus-master.pre.planetart.com/',
                            stage: 'https://mccus-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'llane',
                        urls: {
                            live: 'https://www.legacylane.com/',
                            pre: 'https://llane-master.pre.planetart.com/',
                            stage: 'https://llane-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'pkpip',
                        urls: {
                            live: 'https://www.parkerandpip.com/',
                            pre: 'https://pkpip-master.pre.planetart.com/',
                            stage: 'https://pkpip-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'gifts',
                        urls: {
                            live: 'https://www.gifts.com/',
                            pre: 'https://gifts-master.pre.planetart.com/',
                            stage: 'https://gifts-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'bauuk',
                        urls: {
                            live: 'https://www.baubles.co.uk/',
                            pre: 'https://bauuk-master.pre.planetart.com/',
                            stage: 'https://bauuk-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'stkus',
                        urls: {
                            live: 'https://www.stockingshop.com/',
                            pre: 'https://stkus-master.pre.planetart.com/',
                            stage: 'https://stkus-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'stkuk',
                        urls: {
                            live: 'https://www.stockingshop.com/',
                            pre: 'https://stkuk-master.pre.planetart.com/',
                            stage: 'https://stkuk-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'ornus',
                        urls: {
                            live: 'https://www.ornamentstreet.com/',
                            pre: 'https://owdus-master.pre.planetart.com/',
                            stage: 'https://owdus-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'pcrus',
                        urls: {
                            live: 'https://www.personalcreations.com/',
                            pre: 'https://pcrus-master.pre.planetart.com/',
                            stage: 'https://pcrus-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'pcruk',
                        urls: {
                            live: 'https://www.personalcreations.com/',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'cpbus',
                        urls: {
                            live: 'https://www.cafepress.com/business/',
                            pre: 'https://cpbus-master.pre.planetart.com/',
                            stage: 'https://cpbus-master.stage.planetart.com/'
                        }
                    },
                    {
                        title: 'bou',
                        urls: {
                            live: 'https://www.bookofus.com/',
                            pre: null,
                            stage: null
                        }
                    },
                    {
                        title: 'admin',
                        urls: {
                            live: null,
                            pre: 'https://admin-master.pre.planetart.com/',
                            stage: 'https://admin-master.stage.planetart.com/'
                        }
                    }
                ]
            }
        ]
    },

    // Local knowledge base handbook path (override via chrome.storage.local.knowledgeBasePath)
    KNOWLEDGE_BASE: {
        DEFAULT_PATH: '/Users/joey/Joey_work/Knowledge base/planetart-pc-cpb-cp-handbook.html',
        STORAGE_KEY: 'knowledgeBasePath'
    },

    // Side panel open behavior when clicking extension icon
    SIDE_PANEL: {
        STORAGE_KEY: 'sidePanelEnabled',
        DEFAULT_ENABLED: true
    },

    // LLM provider configuration for AI assistant side panel
    LLM: {
        DEFAULT_PROVIDER: 'deepseek',
        SETTINGS_KEY: 'aiSettings',
        PROVIDERS: {
            deepseek: {
                label: 'DeepSeek',
                baseUrl: 'https://api.deepseek.com/v1',
                models: [
                    'deepseek-v4-flash',
                    'deepseek-v4-pro',
                    'deepseek-v4-flash-vision-exp'
                ]
            },
            openai: {
                label: 'OpenAI',
                baseUrl: 'https://api.openai.com/v1',
                models: ['gpt-4o', 'gpt-4o-mini']
            },
            anthropic: {
                label: 'Claude',
                baseUrl: 'https://api.anthropic.com/v1',
                models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
            }
        }
    },

    RAG: {
        CHUNK_SIZE: 600,
        CHUNK_OVERLAP: 80,
        TOP_K: 5
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

