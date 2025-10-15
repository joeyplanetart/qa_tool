# 配置快速参考

## 🚀 常用配置速查

### 📍 域名配置

```javascript
// Admin 域名
CONFIG.ADMIN.PRE      // https://admin-cpsw-web.pre.planetart.com
CONFIG.ADMIN.STAGE    // https://admin-cpsw-web.stage.planetart.com
CONFIG.ADMIN.LIVE     // https://admin.planetart.com

// 认证域名
CONFIG.AUTH.LOGIN_DOMAIN  // https://login.planetart.com
CONFIG.AUTH.SSO_URL       // https://login.planetart.com/sso

// 前端站点
CONFIG.SITES.US.PRE       // cafus-cpsw-web.pre.planetart.com
CONFIG.SITES.US.STAGE     // cafus-cpsw-web.stage.planetart.com
CONFIG.SITES.US.LIVE      // www.cafepress.com
CONFIG.SITES.CA.*         // 加拿大站点
CONFIG.SITES.UK.*         // 英国站点
CONFIG.SITES.AU.*         // 澳大利亚站点
```

### 🔗 API 端点

```javascript
CONFIG.API_ENDPOINTS.APPROVE_IMAGE      // /ajax/ajax_cp_cup_tool_approve.php
CONFIG.API_ENDPOINTS.SELLER_STORE       // /ajax/ajax_cp_seller_store.php
CONFIG.API_ENDPOINTS.ORDER_TAB_INDEX    // /orders/order_tab_index.php
CONFIG.API_ENDPOINTS.ORDER_TAB_OVERVIEW // /orders/order_tab_overview.php
CONFIG.API_ENDPOINTS.ORDER_TAB_ITEMS    // /orders/order_tab_items.php
CONFIG.API_ENDPOINTS.ORDER_TAB_ITEM_AJAX // /orders/order_tab_item_ajax.php
CONFIG.API_ENDPOINTS.ORDER_TAB_CUSTOMER  // /orders/order_tab_customer.php
```

### 🆔 Site ID

```javascript
CONFIG.SITE_IDS.US  // '170'
CONFIG.SITE_IDS.CA  // '173'
CONFIG.SITE_IDS.UK  // '172'
CONFIG.SITE_IDS.AU  // '171'
```

## 🛠️ 常用方法

### 环境检测

```javascript
// 检测环境（返回 'pre', 'stage', 或 'live'）
const env = CONFIG.detectEnvironment(window.location.hostname);

// 检测地区（返回 'US', 'CA', 'UK', 'AU' 或 null）
const region = CONFIG.detectRegion(url);
```

### URL 构建

```javascript
// 获取 Admin 基础 URL
const adminBaseUrl = CONFIG.getAdminBaseUrl('pre');
// 结果: https://admin-cpsw-web.pre.planetart.com

// 获取完整 API URL
const apiUrl = CONFIG.getAdminApiUrl('pre', CONFIG.API_ENDPOINTS.APPROVE_IMAGE);
// 结果: https://admin-cpsw-web.pre.planetart.com/ajax/ajax_cp_cup_tool_approve.php
```

### 站点信息

```javascript
// 获取 Site ID
const siteId = CONFIG.getSiteId('US');  // '170'

// 获取站点名称
const siteName = CONFIG.getSiteName('US');  // 'CAFUS'

// 获取站点配置
const siteConfig = CONFIG.getSiteConfig('US');
// { PRE: '...', STAGE: '...', LIVE: '...', LIVE_ALT: '...' }
```

### 域名列表

```javascript
// 获取所有支持的域名（不含协议和路径）
const domains = CONFIG.getSupportedDomains();
// ['cafus-cpsw-web.pre.planetart.com', 'www.cafepress.com', ...]

// 获取 manifest 所需的域名模式
const patterns = CONFIG.getAllDomainPatterns();
// ['*://cafus-cpsw-web.pre.planetart.com/*', ...]

// 获取 content script 匹配模式
const matches = CONFIG.getContentScriptMatches();
```

## 💡 使用示例

### 示例 1：构建订单查询 URL

```javascript
// ❌ 旧方式（硬编码）
const url = `https://admin.planetart.com/orders/order_tab_overview.php?order_id=${orderId}`;

// ✅ 新方式（使用配置）
const url = `${CONFIG.ADMIN.LIVE}${CONFIG.API_ENDPOINTS.ORDER_TAB_OVERVIEW}?order_id=${orderId}`;
```

### 示例 2：根据环境构建 API URL

```javascript
const environment = CONFIG.detectEnvironment(window.location.hostname);
const apiUrl = CONFIG.getAdminApiUrl(environment, CONFIG.API_ENDPOINTS.SELLER_STORE);
```

### 示例 3：获取当前页面的 Site ID

```javascript
const currentUrl = window.location.href;
const region = CONFIG.detectRegion(currentUrl);
const siteId = region ? CONFIG.getSiteId(region) : 'N/A';
```

### 示例 4：环境切换

```javascript
const region = CONFIG.detectRegion(currentUrl);
const siteConfig = CONFIG.getSiteConfig(region);

const preUrl = `https://${siteConfig.PRE}${path}`;
const stageUrl = `https://${siteConfig.STAGE}${path}`;
const liveUrl = `https://${siteConfig.LIVE}${path}`;
```

## 📋 替换映射表

| 旧代码（硬编码） | 新代码（使用配置） |
|----------------|------------------|
| `'https://admin.planetart.com'` | `CONFIG.ADMIN.LIVE` |
| `'https://login.planetart.com/sso'` | `CONFIG.AUTH.SSO_URL` |
| `'/ajax/ajax_cp_cup_tool_approve.php'` | `CONFIG.API_ENDPOINTS.APPROVE_IMAGE` |
| `'170'` (US Site ID) | `CONFIG.SITE_IDS.US` |
| `'cafus-cpsw-web.pre.planetart.com'` | `CONFIG.SITES.US.PRE` |

## 🔍 查找配置

### 按用途查找

| 用途 | 配置路径 |
|-----|---------|
| Admin 后台 | `CONFIG.ADMIN.*` |
| 登录/认证 | `CONFIG.AUTH.*` |
| 前端站点 | `CONFIG.SITES.*` |
| API 端点 | `CONFIG.API_ENDPOINTS.*` |
| Site ID | `CONFIG.SITE_IDS.*` |

### 按环境查找

| 环境 | 配置示例 |
|-----|---------|
| Pre | `CONFIG.ADMIN.PRE`, `CONFIG.SITES.US.PRE` |
| Stage | `CONFIG.ADMIN.STAGE`, `CONFIG.SITES.US.STAGE` |
| Live | `CONFIG.ADMIN.LIVE`, `CONFIG.SITES.US.LIVE` |

### 按地区查找

| 地区 | 配置路径 |
|-----|---------|
| 美国 | `CONFIG.SITES.US.*`, `CONFIG.SITE_IDS.US` |
| 加拿大 | `CONFIG.SITES.CA.*`, `CONFIG.SITE_IDS.CA` |
| 英国 | `CONFIG.SITES.UK.*`, `CONFIG.SITE_IDS.UK` |
| 澳大利亚 | `CONFIG.SITES.AU.*`, `CONFIG.SITE_IDS.AU` |

## ⚠️ 注意事项

1. **始终使用配置对象**，避免硬编码 URL
2. **环境变量区分大小写**：`'pre'`, `'stage'`, `'live'`（小写）
3. **地区代码使用大写**：`'US'`, `'CA'`, `'UK'`, `'AU'`
4. **Site ID 返回字符串**：`'170'` 而不是 `170`
5. **API 端点以 `/` 开头**，使用时需要配合基础 URL

## 📚 更多信息

- 详细说明：查看 `CONFIG_GUIDE.md`
- 迁移总结：查看 `MIGRATION_SUMMARY.md`
- 源代码：查看 `config.js`

