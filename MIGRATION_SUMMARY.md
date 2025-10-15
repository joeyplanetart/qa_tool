# 域名配置统一整理 - 迁移总结

## 📊 项目概述

本次重构将项目中所有分散的域名和 Base URL 配置统一整理到 `config.js` 文件中，实现了配置的集中化管理。

## 🎯 重构目标

✅ 统一管理所有域名配置  
✅ 消除硬编码的 URL  
✅ 提高代码可维护性  
✅ 便于未来扩展新环境  

## 📁 新增文件

### 1. config.js
- **用途**：统一配置文件
- **内容**：
  - 所有站点域名（US, CA, UK, AU × Pre, Stage, Live）
  - Admin 后台域名（Pre, Stage, Live）
  - 认证相关域名（Login, SSO）
  - Site ID 映射
  - API 端点路径
  - 辅助方法（环境检测、URL 构建等）

### 2. CONFIG_GUIDE.md
- **用途**：配置文件使用指南
- **内容**：详细的配置说明和使用示例

### 3. MIGRATION_SUMMARY.md
- **用途**：迁移总结文档（本文件）

## 🔄 修改的文件

### manifest.json
**修改内容**：
- ✅ 在 `content_scripts` 的 `js` 数组中添加了 `config.js`
- ✅ 将 config.js 作为第一个加载的脚本

**变更位置**：第 55 行
```json
"js": ["config.js", "content.js"]
```

---

### background.js
**修改内容**：
1. ✅ 添加 `importScripts('config.js')` 导入配置
2. ✅ 替换订单查询默认 URL（第 13 行）
3. ✅ 替换图片审核 API URL 配置（第 67 行）
4. ✅ 替换 Store 搜索 API URL 配置（第 144 行）
5. ✅ 替换支持的域名列表（第 225 行）

**使用的新方法**：
- `CONFIG.ADMIN.LIVE`
- `CONFIG.API_ENDPOINTS.*`
- `CONFIG.getAdminApiUrl()`
- `CONFIG.getSupportedDomains()`

---

### content.js
**修改内容**：
1. ✅ 替换 SSO 登录 URL（第 2086 行）
2. ✅ 简化 Site ID 检测逻辑（第 2515 行）
3. ✅ 简化环境检测函数（第 3611 行）
4. ✅ 简化 Admin API URL 获取函数（第 3615 行）
5. ✅ 替换所有订单查询 URL（多处）
   - ORDER_TAB_INDEX（第 4465 行）
   - ORDER_TAB_OVERVIEW（第 4529 行）
   - ORDER_TAB_ITEMS（第 4704 行）
   - ORDER_TAB_ITEM_AJAX（第 4724 行）
   - ORDER_TAB_CUSTOMER（第 4834 行）
6. ✅ 简化站点名称检测（第 5010 行）
7. ✅ 简化环境切换配置（第 5170 行）

**使用的新方法**：
- `CONFIG.AUTH.SSO_URL`
- `CONFIG.detectRegion()`
- `CONFIG.getSiteId()`
- `CONFIG.detectEnvironment()`
- `CONFIG.getAdminBaseUrl()`
- `CONFIG.ADMIN.LIVE`
- `CONFIG.API_ENDPOINTS.*`
- `CONFIG.getSiteName()`
- `CONFIG.getSiteConfig()`

---

### popup.js
**修改内容**：
1. ✅ 替换 Cookie 检查域名（第 69-94 行）
2. ✅ 简化 Site ID 检测逻辑（第 266 行）

**使用的新方法**：
- `CONFIG.ADMIN.LIVE`
- `CONFIG.AUTH.LOGIN_DOMAIN`
- `CONFIG.detectRegion()`
- `CONFIG.getSiteId()`

---

### popup.html
**修改内容**：
- ✅ 在 `popup.js` 之前添加 `config.js` 的引用（第 459 行）

```html
<script src="config.js"></script>
<script src="popup.js"></script>
```

## 📈 重构统计

### 代码简化对比

| 文件 | 重构前代码行数 | 重构后代码行数 | 减少行数 |
|------|--------------|--------------|---------|
| background.js | ~270 | ~230 | ~40 |
| content.js | ~5350 | ~5300 | ~50 |
| popup.js | ~1108 | ~1100 | ~8 |

### 配置集中度

| 类型 | 重构前 | 重构后 |
|-----|--------|--------|
| 域名配置位置 | 4个文件分散 | 1个文件集中 |
| 硬编码 URL 数量 | 50+ | 0 |
| 域名列表重复次数 | 3次 | 1次 |

## ✨ 重构优势

### 1. 维护性提升
- **重构前**：修改域名需要在 4 个文件中分别修改
- **重构后**：只需修改 `config.js` 一个文件

### 2. 一致性保证
- **重构前**：多处硬编码，容易出现不一致
- **重构后**：统一配置源，保证一致性

### 3. 可扩展性增强
- **重构前**：添加新环境需要修改多个文件
- **重构后**：只需在 `config.js` 中添加配置

### 4. 代码可读性
- **重构前**：大量 if-else 判断和硬编码 URL
- **重构后**：语义化的方法调用，代码更清晰

## 🔍 配置覆盖范围

### 前端站点域名（4个地区 × 3个环境 = 12个配置）
- ✅ US (cafus-cpsw-web)：Pre, Stage, Live
- ✅ CA (cafca-cpsw-web)：Pre, Stage, Live
- ✅ UK (cafuk-cpsw-web)：Pre, Stage, Live
- ✅ AU (cafau-cpsw-web)：Pre, Stage, Live

### Admin 后台域名（3个环境）
- ✅ Pre: admin-cpsw-web.pre.planetart.com
- ✅ Stage: admin-cpsw-web.stage.planetart.com
- ✅ Live: admin.planetart.com

### 认证域名（2个）
- ✅ Login: login.planetart.com
- ✅ SSO: login.planetart.com/sso

### API 端点（7个）
- ✅ APPROVE_IMAGE
- ✅ SELLER_STORE
- ✅ ORDER_TAB_INDEX
- ✅ ORDER_TAB_OVERVIEW
- ✅ ORDER_TAB_ITEMS
- ✅ ORDER_TAB_ITEM_AJAX
- ✅ ORDER_TAB_CUSTOMER

### Site ID 映射（4个）
- ✅ US: 170
- ✅ CA: 173
- ✅ UK: 172
- ✅ AU: 171

## 🧪 测试建议

### 1. 基础功能测试
- [ ] 扩展程序能否正常加载
- [ ] config.js 是否正确加载
- [ ] 各个页面是否正常显示

### 2. 环境切换测试
- [ ] Pre 环境功能是否正常
- [ ] Stage 环境功能是否正常
- [ ] Live 环境功能是否正常

### 3. 地区测试
- [ ] US 站点功能是否正常
- [ ] CA 站点功能是否正常
- [ ] UK 站点功能是否正常
- [ ] AU 站点功能是否正常

### 4. API 调用测试
- [ ] 订单查询功能
- [ ] 图片审核功能
- [ ] Store 搜索功能
- [ ] SSO 登录功能

## 📝 后续维护指南

### 添加新域名
在 `config.js` 的相应部分添加：
```javascript
SITES: {
    NEW_REGION: {
        PRE: 'new-region.pre.planetart.com',
        STAGE: 'new-region.stage.planetart.com',
        LIVE: 'www.newregion.com'
    }
}
```

### 添加新 API 端点
在 `config.js` 中添加：
```javascript
API_ENDPOINTS: {
    NEW_ENDPOINT: '/path/to/new/endpoint.php'
}
```

### 添加新环境
在各个配置对象中添加新环境键：
```javascript
ADMIN: {
    DEV: 'https://admin-cpsw-web.dev.planetart.com',
    // 现有环境...
}
```

## 🎉 总结

本次重构成功将项目中所有域名和 Base URL 配置统一整理到 `config.js` 文件中：

- ✅ **创建了 1 个新文件**（config.js）
- ✅ **修改了 5 个文件**（manifest.json, background.js, content.js, popup.js, popup.html）
- ✅ **新增了 2 个文档**（CONFIG_GUIDE.md, MIGRATION_SUMMARY.md）
- ✅ **消除了 50+ 处硬编码 URL**
- ✅ **减少了约 100 行重复代码**
- ✅ **提供了 10+ 个便捷的辅助方法**
- ✅ **通过了 Linter 检查，无错误**

项目现在拥有更好的可维护性、可扩展性和一致性！🚀

