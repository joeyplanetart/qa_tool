# 配置文件使用指南

## 📁 文件说明

本项目已经统一整理了所有域名和 Base URL 配置，集中在 `config.js` 文件中管理。

## 🎯 主要配置文件

### config.js
统一配置文件，包含所有域名、API 端点和相关配置。

## 📋 配置结构

### 1. 前端站点域名 (CONFIG.SITES)

按地区和环境组织的所有 Cafepress 站点域名：

```javascript
CONFIG.SITES = {
    US: {
        PRE: 'cafus-cpsw-web.pre.planetart.com',
        STAGE: 'cafus-cpsw-web.stage.planetart.com',
        LIVE: 'www.cafepress.com',
        LIVE_ALT: 'cafepress.com'
    },
    CA: { ... },  // 加拿大站点
    UK: { ... },  // 英国站点
    AU: { ... }   // 澳大利亚站点
}
```

### 2. Admin 后台域名 (CONFIG.ADMIN)

```javascript
CONFIG.ADMIN = {
    PRE: 'https://admin-cpsw-web.pre.planetart.com',
    STAGE: 'https://admin-cpsw-web.stage.planetart.com',
    LIVE: 'https://admin.planetart.com'
}
```

### 3. 认证相关域名 (CONFIG.AUTH)

```javascript
CONFIG.AUTH = {
    LOGIN_DOMAIN: 'https://login.planetart.com',
    SSO_URL: 'https://login.planetart.com/sso'
}
```

### 4. Site ID 映射 (CONFIG.SITE_IDS)

```javascript
CONFIG.SITE_IDS = {
    US: '170',
    CA: '173',
    UK: '172',
    AU: '171'
}
```

### 5. Admin API 端点 (CONFIG.API_ENDPOINTS)

```javascript
CONFIG.API_ENDPOINTS = {
    APPROVE_IMAGE: '/ajax/ajax_cp_cup_tool_approve.php',
    SELLER_STORE: '/ajax/ajax_cp_seller_store.php',
    ORDER_TAB_INDEX: '/orders/order_tab_index.php',
    ORDER_TAB_OVERVIEW: '/orders/order_tab_overview.php',
    ORDER_TAB_ITEMS: '/orders/order_tab_items.php',
    ORDER_TAB_ITEM_AJAX: '/orders/order_tab_item_ajax.php',
    ORDER_TAB_CUSTOMER: '/orders/order_tab_customer.php'
}
```

## 🔧 辅助方法

### 域名相关

```javascript
// 获取所有支持的域名
CONFIG.getSupportedDomains()

// 获取 manifest 权限所需的域名模式
CONFIG.getAllDomainPatterns()

// 获取 content script 匹配所需的域名模式
CONFIG.getContentScriptMatches()
```

### 环境检测

```javascript
// 从 hostname 检测环境
CONFIG.detectEnvironment(hostname)  // 返回 'pre', 'stage', 或 'live'

// 从 URL 检测地区
CONFIG.detectRegion(url)  // 返回 'US', 'CA', 'UK', 'AU' 或 null
```

### API URL 构建

```javascript
// 获取 Admin 基础 URL
CONFIG.getAdminBaseUrl(environment)

// 获取完整的 Admin API URL
CONFIG.getAdminApiUrl(environment, endpoint)

// 示例：
const apiUrl = CONFIG.getAdminApiUrl('pre', CONFIG.API_ENDPOINTS.APPROVE_IMAGE)
// 结果: https://admin-cpsw-web.pre.planetart.com/ajax/ajax_cp_cup_tool_approve.php
```

### 站点信息

```javascript
// 获取 Site ID
CONFIG.getSiteId(region)  // 例如：CONFIG.getSiteId('US') 返回 '170'

// 获取站点名称
CONFIG.getSiteName(region)  // 例如：CONFIG.getSiteName('US') 返回 'CAFUS'

// 获取站点配置
CONFIG.getSiteConfig(region)  // 返回该地区的完整配置对象
```

## 📝 使用示例

### 示例 1：在 background.js 中使用

```javascript
// 旧代码
const adminUrl = `https://admin.planetart.com/orders/order_tab_overview.php?order_id=${orderId}`;

// 新代码
const adminUrl = `${CONFIG.ADMIN.LIVE}${CONFIG.API_ENDPOINTS.ORDER_TAB_OVERVIEW}?order_id=${orderId}`;
```

### 示例 2：在 content.js 中检测环境

```javascript
// 旧代码
function detectEnvironment() {
    const hostname = window.location.hostname;
    if (hostname.includes('pre.planetart.com')) return 'pre';
    else if (hostname.includes('stage.planetart.com')) return 'stage';
    else return 'live';
}

// 新代码
function detectEnvironment() {
    return CONFIG.detectEnvironment(window.location.hostname);
}
```

### 示例 3：在 popup.js 中获取 Site ID

```javascript
// 旧代码
let calculatedSiteId = 'Not found';
if (currentUrl.includes('cafus-cpsw-web') || ...) {
    calculatedSiteId = '170'; // US site
} else if (...) {
    // 更多条件判断
}

// 新代码
const region = CONFIG.detectRegion(currentUrl);
const calculatedSiteId = region ? CONFIG.getSiteId(region) : 'Not found';
```

## 🔄 更新配置

当需要添加新环境或修改域名时：

1. **只需修改 `config.js` 文件**
2. 所有其他文件会自动使用新配置
3. 无需在多个文件中重复修改

## ✅ 已重构的文件

- ✅ `config.js` - 统一配置文件（新建）
- ✅ `manifest.json` - 包含 config.js 引用
- ✅ `background.js` - 使用统一配置
- ✅ `content.js` - 使用统一配置
- ✅ `popup.js` - 使用统一配置
- ✅ `popup.html` - 引入 config.js

## 🎨 优势

1. **集中管理**：所有配置在一个文件中
2. **易于维护**：修改配置只需改一处
3. **减少错误**：避免硬编码导致的不一致
4. **可扩展性**：轻松添加新环境或地区
5. **代码清晰**：使用语义化的方法名

## 📌 注意事项

- 所有域名配置都应该通过 `CONFIG` 对象访问
- 不要在代码中硬编码域名或 URL
- 添加新功能时优先使用提供的辅助方法
- 如需扩展配置，在 `config.js` 中统一添加

## 🆕 添加新环境示例

如果需要添加开发环境（dev）：

```javascript
// 在 config.js 中添加
SITES: {
    US: {
        DEV: 'cafus-cpsw-web.dev.planetart.com',
        PRE: 'cafus-cpsw-web.pre.planetart.com',
        // ...
    }
}

ADMIN: {
    DEV: 'https://admin-cpsw-web.dev.planetart.com',
    PRE: 'https://admin-cpsw-web.pre.planetart.com',
    // ...
}
```

其他文件会自动适配新环境！

