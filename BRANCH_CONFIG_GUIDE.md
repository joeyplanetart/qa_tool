# 分支配置使用指南

## 🎯 概述

从 v1.6.2 开始，配置系统支持灵活的分支名称配置。您可以轻松切换不同的分支环境，无需修改多个文件。

## 📝 配置结构

### 核心配置项

```javascript
// config.js
CONFIG.BRANCH.CURRENT = 'cpsw-web'  // 当前使用的分支名称
```

### 域名生成规则

**前端站点域名格式：**
```
{region}-{branch}.{environment}.planetart.com
```

**示例：**
- US PRE: `cafus-cpsw-web.pre.planetart.com`
- CA STAGE: `cafca-cpsw-web.stage.planetart.com`
- UK PRE: `cafuk-feature-web.pre.planetart.com`

**Admin 域名格式：**
```
https://admin-{branch}.{environment}.planetart.com
```

**示例：**
- PRE: `https://admin-cpsw-web.pre.planetart.com`
- STAGE: `https://admin-feature-web.stage.planetart.com`

## 🔧 如何切换分支

### 方法 1：直接修改配置文件（推荐用于长期切换）

打开 `config.js` 文件，修改第 8 行：

```javascript
BRANCH: {
    CURRENT: 'your-branch-name',  // 改成您的分支名称
}
```

**常见分支名称示例：**
- `cpsw-web` - 默认分支
- `feature-web` - 功能分支
- `hotfix-web` - 热修复分支
- `release-web` - 发布分支
- `dev-web` - 开发分支

### 方法 2：运行时动态切换（推荐用于临时测试）

在浏览器控制台中执行：

```javascript
// 切换到新分支
CONFIG.setBranch('feature-web');

// 验证切换结果
console.log('Current branch:', CONFIG.getCurrentBranch());
console.log('US PRE domain:', CONFIG.SITES.US.PRE);
console.log('Admin PRE domain:', CONFIG.ADMIN.PRE);
```

### 方法 3：使用自定义分支构建域名

```javascript
// 临时构建特定分支的域名，不改变全局配置
const customDomain = CONFIG.buildDomain('US', 'pre', 'test-branch-web');
// 结果: cafus-test-branch-web.pre.planetart.com

const customAdminUrl = CONFIG.buildAdminDomain('pre', 'test-branch-web');
// 结果: https://admin-test-branch-web.pre.planetart.com
```

## 📋 新增的配置项

### 基础配置

```javascript
// 分支名称
CONFIG.BRANCH.CURRENT         // 当前分支名称

// 基础域名
CONFIG.BASE_DOMAIN.PRE        // 'pre.planetart.com'
CONFIG.BASE_DOMAIN.STAGE      // 'stage.planetart.com'
CONFIG.BASE_DOMAIN.LIVE       // 'planetart.com'

// 地区前缀
CONFIG.REGION_PREFIX.US       // 'cafus'
CONFIG.REGION_PREFIX.CA       // 'cafca'
CONFIG.REGION_PREFIX.UK       // 'cafuk'
CONFIG.REGION_PREFIX.AU       // 'cafau'
```

## 🛠️ 新增的方法

### 1. setBranch(branchName)
设置当前分支名称

```javascript
CONFIG.setBranch('feature-web');
// ✅ Branch switched to: feature-web
// 📍 Example domains:
//    - US PRE: cafus-feature-web.pre.planetart.com
//    - Admin PRE: https://admin-feature-web.pre.planetart.com
```

### 2. getCurrentBranch()
获取当前分支名称

```javascript
const branch = CONFIG.getCurrentBranch();
console.log(branch);  // 'cpsw-web'
```

### 3. buildDomain(region, environment, branchName)
构建自定义域名

**参数：**
- `region`: 地区代码 ('US', 'CA', 'UK', 'AU')
- `environment`: 环境 ('pre', 'stage', 'live')
- `branchName`: 分支名称（可选，默认使用当前分支）

**示例：**
```javascript
// 使用当前分支
CONFIG.buildDomain('US', 'pre');
// cafus-cpsw-web.pre.planetart.com

// 使用指定分支
CONFIG.buildDomain('CA', 'stage', 'hotfix-web');
// cafca-hotfix-web.stage.planetart.com

// Live 环境
CONFIG.buildDomain('UK', 'live');
// www.cafepress.co.uk
```

### 4. buildAdminDomain(environment, branchName)
构建 Admin 域名

**参数：**
- `environment`: 环境 ('pre', 'stage', 'live')
- `branchName`: 分支名称（可选，默认使用当前分支）

**示例：**
```javascript
// 使用当前分支
CONFIG.buildAdminDomain('pre');
// https://admin-cpsw-web.pre.planetart.com

// 使用指定分支
CONFIG.buildAdminDomain('stage', 'release-web');
// https://admin-release-web.stage.planetart.com

// Live 环境
CONFIG.buildAdminDomain('live');
// https://admin.planetart.com
```

## 🔍 域名匹配规则

### Manifest 配置（支持通配符）

`manifest.json` 已更新为支持任意分支名称：

```json
"host_permissions": [
    "*://cafus-*-web.pre.planetart.com/*",
    "*://cafus-*-web.stage.planetart.com/*",
    "*://admin-*-web.pre.planetart.com/*",
    ...
]
```

**通配符说明：**
- `*` 匹配任意字符
- `cafus-*-web` 可以匹配：
  - `cafus-cpsw-web`
  - `cafus-feature-web`
  - `cafus-hotfix-web`
  - `cafus-任意名称-web`

## 💡 使用场景

### 场景 1：切换到新功能分支进行测试

```javascript
// 1. 切换分支
CONFIG.setBranch('feature-new-ui-web');

// 2. 验证域名
console.log(CONFIG.SITES.US.PRE);
// cafus-feature-new-ui-web.pre.planetart.com

// 3. 正常使用扩展功能
// 所有 API 调用会自动使用新的分支域名
```

### 场景 2：多分支对比测试

```javascript
// 测试分支 A
const domainA = CONFIG.buildDomain('US', 'pre', 'feature-a-web');
// cafus-feature-a-web.pre.planetart.com

// 测试分支 B
const domainB = CONFIG.buildDomain('US', 'pre', 'feature-b-web');
// cafus-feature-b-web.pre.planetart.com

// 在不同分支间对比功能
```

### 场景 3：临时测试热修复分支

```javascript
// 不改变全局配置，只构建特定 URL
const hotfixUrl = CONFIG.buildAdminDomain('pre', 'hotfix-123-web');
// https://admin-hotfix-123-web.pre.planetart.com

// 用于一次性 API 调用
fetch(hotfixUrl + '/orders/order_tab_overview.php?order_id=123');
```

## ⚠️ 注意事项

### 1. 分支名称格式要求
- 分支名称必须以 `-web` 结尾
- 只能包含字母、数字和连字符
- 建议使用小写字母

**✅ 正确格式：**
- `cpsw-web`
- `feature-web`
- `hotfix-123-web`
- `release-v2-web`

**❌ 错误格式：**
- `cpsw` (缺少 -web 后缀)
- `feature_web` (使用下划线)
- `FEATURE-WEB` (大写字母可能导致问题)

### 2. Live 环境不受分支影响
Live 环境始终使用固定的生产域名：
- `www.cafepress.com`
- `www.cafepress.ca`
- `www.cafepress.co.uk`
- `www.cafepress.com.au`
- `https://admin.planetart.com`

### 3. 运行时切换的持久性
使用 `CONFIG.setBranch()` 进行的运行时切换：
- ✅ 立即生效
- ❌ 刷新页面后会恢复到配置文件中的默认值
- 📝 如需永久切换，请直接修改 `config.js` 文件

### 4. 扩展重新加载
修改 `config.js` 文件后，需要重新加载扩展：
1. 打开 `chrome://extensions/`
2. 找到 "Cafepress QA Tools"
3. 点击刷新图标 🔄

## 📊 配置前后对比

### 重构前（硬编码）
```javascript
// 每次切换分支需要修改多处
const preDomain = 'cafus-cpsw-web.pre.planetart.com';
const adminUrl = 'https://admin-cpsw-web.pre.planetart.com';

// 切换到新分支需要：
// 1. 修改 config.js
// 2. 修改 background.js
// 3. 修改 content.js
// 4. 修改 manifest.json
// 5. 检查所有文件中的硬编码
```

### 重构后（灵活配置）
```javascript
// 只需修改一处
CONFIG.BRANCH.CURRENT = 'feature-web';

// 所有域名自动更新
CONFIG.SITES.US.PRE        // cafus-feature-web.pre.planetart.com
CONFIG.ADMIN.PRE           // https://admin-feature-web.pre.planetart.com
```

## 🎓 最佳实践

### 1. 使用有意义的分支名称
```javascript
// ✅ 推荐
'feature-user-profile-web'
'hotfix-order-bug-web'
'release-v2.0-web'

// ❌ 不推荐
'test-web'
'temp-web'
'abc-web'
```

### 2. 在配置文件中记录分支历史
```javascript
BRANCH: {
    CURRENT: 'cpsw-web',
    // 历史分支记录（可选）
    // 'feature-checkout-web' - 2024-01-15 测试新结账流程
    // 'hotfix-payment-web' - 2024-01-20 修复支付问题
}
```

### 3. 使用控制台验证切换结果
```javascript
// 切换分支后始终验证
CONFIG.setBranch('new-branch-web');

// 验证关键域名
console.table({
    'US PRE': CONFIG.SITES.US.PRE,
    'CA STAGE': CONFIG.SITES.CA.STAGE,
    'Admin PRE': CONFIG.ADMIN.PRE,
    'Current Branch': CONFIG.getCurrentBranch()
});
```

## 🔗 相关文档

- [配置快速参考](CONFIG_QUICK_REFERENCE.md)
- [配置使用指南](CONFIG_GUIDE.md)
- [迁移总结](MIGRATION_SUMMARY.md)

## 📞 问题反馈

如果在使用过程中遇到问题，请检查：
1. 分支名称格式是否正确
2. 是否重新加载了扩展
3. 浏览器控制台是否有错误信息

