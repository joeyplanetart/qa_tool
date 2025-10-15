# v1.6.2 更新日志

## 🎯 更新概述

本次更新针对分支配置进行了重大优化，使域名配置更加灵活，支持快速切换不同的分支环境。

## ✨ 新增功能

### 1. 灵活的分支配置系统

**核心配置项：**
```javascript
CONFIG.BRANCH.CURRENT = 'cpsw-web'  // 可灵活修改
CONFIG.BASE_DOMAIN.PRE = 'pre.planetart.com'
CONFIG.BASE_DOMAIN.STAGE = 'stage.planetart.com'
CONFIG.REGION_PREFIX.US = 'cafus'
// ... 更多配置
```

**自动生成域名：**
- 前端站点：`{region}-{branch}.{environment}.planetart.com`
- Admin 后台：`https://admin-{branch}.{environment}.planetart.com`

### 2. 新增方法

#### setBranch(branchName)
运行时动态切换分支
```javascript
CONFIG.setBranch('feature-web');
// ✅ Branch switched to: feature-web
```

#### getCurrentBranch()
获取当前分支名称
```javascript
const branch = CONFIG.getCurrentBranch();  // 'cpsw-web'
```

#### buildDomain(region, environment, branchName)
构建自定义域名
```javascript
CONFIG.buildDomain('US', 'pre', 'hotfix-web');
// cafus-hotfix-web.pre.planetart.com
```

#### buildAdminDomain(environment, branchName)
构建 Admin 域名
```javascript
CONFIG.buildAdminDomain('stage', 'release-web');
// https://admin-release-web.stage.planetart.com
```

### 3. 通配符域名支持

**manifest.json 更新：**
```json
"host_permissions": [
    "*://cafus-*-web.pre.planetart.com/*",
    "*://admin-*-web.pre.planetart.com/*",
    ...
]
```

现在支持任意分支名称，无需每次修改 manifest.json！

## 📝 文件变更

### 新增文件
- ✅ `BRANCH_CONFIG_GUIDE.md` (+346 行) - 详细的分支配置使用指南

### 修改文件
- ✅ `config.js` (+170 行)
  - 新增 BRANCH、BASE_DOMAIN、REGION_PREFIX 配置
  - 使用 getter 方法动态生成 SITES 和 ADMIN
  - 新增 4 个分支管理方法
  
- ✅ `manifest.json` (重构)
  - host_permissions 改用通配符
  - content_scripts matches 改用通配符
  - 支持任意分支名称
  
- ✅ `README.md` (+36 行)
  - 添加版本信息
  - 添加分支配置快速指南

## 🔄 升级对比

### 重构前
```javascript
// 硬编码，每次切换分支需要修改多个文件
SITES: {
    US: {
        PRE: 'cafus-cpsw-web.pre.planetart.com',
        STAGE: 'cafus-cpsw-web.stage.planetart.com',
        // ...
    }
}

// manifest.json 也需要修改
"host_permissions": [
    "*://cafus-cpsw-web.pre.planetart.com/*",
    // ...
]
```

**问题：**
- ❌ 切换分支需要修改 config.js、manifest.json
- ❌ 容易遗漏某些配置
- ❌ 不支持运行时切换
- ❌ 每次都要重新打包扩展

### 重构后
```javascript
// 灵活配置，只需修改一处
CONFIG.BRANCH.CURRENT = 'feature-web';

// 所有域名自动更新
CONFIG.SITES.US.PRE  // cafus-feature-web.pre.planetart.com
CONFIG.ADMIN.PRE     // https://admin-feature-web.pre.planetart.com

// manifest.json 使用通配符，无需修改
"host_permissions": [
    "*://cafus-*-web.pre.planetart.com/*",
    // ...
]
```

**优势：**
- ✅ 只需修改一处配置
- ✅ 支持运行时动态切换
- ✅ manifest.json 无需修改
- ✅ 支持临时测试多个分支

## 💡 使用场景

### 场景 1：切换到新功能分支
```javascript
// 方法 1：修改配置文件（永久）
CONFIG.BRANCH.CURRENT = 'feature-checkout-web';

// 方法 2：运行时切换（临时）
CONFIG.setBranch('feature-checkout-web');
```

### 场景 2：多分支对比测试
```javascript
const branchA = CONFIG.buildDomain('US', 'pre', 'feature-a-web');
const branchB = CONFIG.buildDomain('US', 'pre', 'feature-b-web');
// 同时测试两个分支
```

### 场景 3：临时测试热修复
```javascript
const hotfixUrl = CONFIG.buildAdminDomain('pre', 'hotfix-123-web');
// 不改变全局配置，只构建临时 URL
```

## 📊 统计数据

### 代码变更
```
4 个文件修改
+541 行新增
-47 行删除
净增加：494 行
```

### 功能增强
- ✅ 4 个新方法
- ✅ 3 个新配置项
- ✅ 动态域名生成
- ✅ 通配符支持
- ✅ 运行时切换

## 🎓 最佳实践

### 1. 分支命名规范
```javascript
// ✅ 推荐格式
'cpsw-web'           // 默认分支
'master'             // 主分支
'feature-xxx'        // 功能分支
'hotfix-xxx'         // 热修复分支
'release-vX.X'       // 发布分支

// ❌ 不推荐
'feature_branch'     // 使用下划线
'FEATURE-WEB'        // 大写字母
```

### 2. 切换分支流程
```javascript
// Step 1: 切换分支
CONFIG.setBranch('master');

// Step 2: 验证配置
console.log('Current branch:', CONFIG.getCurrentBranch());
console.log('US PRE:', CONFIG.SITES.US.PRE);

// Step 3: 重新加载扩展
// 打开 chrome://extensions/ 点击刷新
```

### 3. 验证域名生成
```javascript
// 切换后验证所有关键域名
console.table({
    'US PRE': CONFIG.SITES.US.PRE,
    'CA STAGE': CONFIG.SITES.CA.STAGE,
    'Admin PRE': CONFIG.ADMIN.PRE,
    'Branch': CONFIG.getCurrentBranch()
});
```

## ⚠️ 注意事项

### 1. 分支名称格式
- 分支名称是完整的分支标识符（如 `cpsw-web`, `master`）
- **推荐**使用小写字母
- **只能**包含字母、数字和连字符

### 2. Live 环境
Live 环境域名固定，不受分支配置影响：
- `www.cafepress.com`
- `https://admin.planetart.com`

### 3. 运行时切换持久性
- 使用 `CONFIG.setBranch()` 的切换仅在当前会话有效
- 刷新页面后恢复为配置文件中的默认值
- 如需永久切换，请直接修改 `config.js`

### 4. 扩展重新加载
修改配置文件后，必须重新加载扩展才能生效。

## 📚 相关文档

- [分支配置使用指南](BRANCH_CONFIG_GUIDE.md) - 详细使用说明
- [配置快速参考](CONFIG_QUICK_REFERENCE.md) - 快速查询
- [配置使用指南](CONFIG_GUIDE.md) - 完整配置说明
- [迁移总结](MIGRATION_SUMMARY.md) - v1.6.1 重构记录

## 🚀 升级建议

### 从 v1.6.1 升级

**如果您使用默认分支 (cpsw-web)：**
- ✅ 无需任何操作
- ✅ 所有功能向后兼容

**如果您使用自定义分支：**
1. 打开 `config.js`
2. 修改第 8 行：`CURRENT: 'your-branch-name'`
3. 重新加载扩展

**推荐操作：**
- 📖 阅读 [分支配置使用指南](BRANCH_CONFIG_GUIDE.md)
- 🧪 在控制台测试 `CONFIG.setBranch()` 功能
- ✅ 验证域名生成是否正确

## 🎉 总结

v1.6.2 版本通过引入灵活的分支配置系统，大大提升了配置的灵活性和可维护性：

- **配置更简单**：只需修改一处
- **切换更快速**：支持运行时切换
- **维护更方便**：通配符自动匹配
- **测试更灵活**：支持临时构建域名

这是继 v1.6.1 统一配置管理后的又一次重要优化！🚀

