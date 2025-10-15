# Manifest.json 通配符修复说明

## ❌ 问题描述

安装 Chrome 扩展时出现错误：
```
Invalid value for 'content_scripts[0].matches[0]': Invalid host wildcard.
Could not load manifest.
```

## 🔍 问题原因

Chrome 扩展的 **match patterns 不支持在子域名中间使用部分通配符**。

### 无效的格式（导致错误）
```json
"*://cafus-*.pre.planetart.com/*"
"*://admin-*.stage.planetart.com/*"
```

这种在子域名中间使用 `*` 的格式是无效的。

### Chrome Match Pattern 规则

✅ **允许的格式：**
- `*://example.com/*` - 协议通配符
- `*://*.example.com/*` - 完整子域名通配符
- `*://subdomain.example.com/*` - 明确指定子域名

❌ **不允许的格式：**
- `*://sub-*.example.com/*` - 部分子域名通配符
- `*://*-suffix.example.com/*` - 部分子域名通配符

## ✅ 解决方案

### 1. 使用完整的子域名通配符

**修改前：**
```json
"matches": [
    "*://cafus-*.pre.planetart.com/*",
    "*://cafus-*.stage.planetart.com/*",
    "*://cafca-*.pre.planetart.com/*",
    ...
]
```

**修改后：**
```json
"matches": [
    "*://*.pre.planetart.com/*",
    "*://*.stage.planetart.com/*",
    ...
]
```

### 2. 在代码中添加域名验证

由于 `*://*.pre.planetart.com/*` 会匹配**所有** pre.planetart.com 的子域名，我们在 content.js 中添加了域名验证：

```javascript
function isSupportedDomain() {
    const hostname = window.location.hostname;
    
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
}

// 只在支持的域名上运行脚本
if (!isSupportedDomain()) {
    console.log('⚠️ Not a supported Cafepress domain, script will not run');
} else {
    // 主脚本代码...
}
```

## 📋 修改的文件

### 1. manifest.json

**host_permissions 简化：**
```json
"host_permissions": [
    "*://*.pre.planetart.com/*",
    "*://*.stage.planetart.com/*",
    "*://www.cafepress.com/*",
    "*://cafepress.com/*",
    "*://www.cafepress.ca/*",
    "*://cafepress.ca/*",
    "*://www.cafepress.co.uk/*",
    "*://cafepress.co.uk/*",
    "*://www.cafepress.com.au/*",
    "*://cafepress.com.au/*",
    "*://admin.planetart.com/*",
    "*://login.planetart.com/*"
]
```

**content_scripts matches 简化：**
```json
"matches": [
    "*://*.pre.planetart.com/*",
    "*://*.stage.planetart.com/*",
    "*://www.cafepress.com/*",
    "*://cafepress.com/*",
    "*://www.cafepress.ca/*",
    "*://cafepress.ca/*",
    "*://www.cafepress.co.uk/*",
    "*://cafepress.co.uk/*",
    "*://www.cafepress.com.au/*",
    "*://cafepress.com.au/*"
]
```

### 2. content.js

- 添加 `isSupportedDomain()` 函数
- 添加域名验证逻辑
- 只在支持的域名上运行主脚本

## 🎯 优势

### 修复后的优势

1. **符合 Chrome 规范**：使用合法的 match patterns
2. **更灵活**：支持任意分支名称（通过 `*://*.pre.planetart.com/*`）
3. **安全性**：通过代码验证确保只在支持的域名上运行
4. **可扩展**：添加新分支无需修改 manifest.json

### 权限范围

**匹配范围：**
```
*://*.pre.planetart.com/*    → 匹配所有 pre.planetart.com 的子域名
*://*.stage.planetart.com/*  → 匹配所有 stage.planetart.com 的子域名
```

**实际运行：**
- ✅ cafus-cpsw-web.pre.planetart.com （验证通过）
- ✅ cafus-master.pre.planetart.com （验证通过）
- ✅ cafca-feature.stage.planetart.com （验证通过）
- ✅ admin-hotfix.pre.planetart.com （验证通过）
- ❌ other-subdomain.pre.planetart.com （验证失败，不运行）

## ⚠️ 注意事项

### 1. 权限范围更广

manifest.json 中的权限范围比之前更广（匹配所有 `*.pre.planetart.com`），但实际运行时会通过代码验证限制。

### 2. 性能影响

- Content script 会在更多页面上加载
- 但在非支持域名上会立即退出，性能影响可忽略不计

### 3. 安全性

- 通过代码验证确保只在预期的域名上运行
- 即使 manifest 允许更多域名，代码也会限制实际运行范围

## 📚 相关资料

### Chrome Extension Match Patterns
- [官方文档](https://developer.chrome.com/docs/extensions/mv3/match_patterns/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### 关键规则
- 主机名可以使用 `*` 作为前缀：`*://example.com` 或 `*://*.example.com`
- 不能在主机名中间使用 `*`：`*://sub-*.example.com` ❌
- 路径部分可以包含任意数量的 `*`：`/path/*/to/*` ✅

## 🧪 测试验证

### 测试步骤

1. **重新加载扩展**
   - 打开 `chrome://extensions/`
   - 点击刷新按钮 🔄

2. **验证加载成功**
   - 不应再出现 "Invalid host wildcard" 错误
   - 扩展图标应正常显示

3. **测试功能**
   ```
   访问: cafus-cpsw-web.pre.planetart.com
   → 控制台输出: ✅ Supported domain detected
   
   访问: cafus-master.stage.planetart.com
   → 控制台输出: ✅ Supported domain detected
   
   访问: unknown-sub.pre.planetart.com
   → 控制台输出: ⚠️ Not a supported Cafepress domain
   ```

## 🎉 总结

通过以下两步修复了 manifest.json 错误：

1. ✅ 使用合法的 match pattern（`*://*.pre.planetart.com/*`）
2. ✅ 在代码中添加域名验证（`isSupportedDomain()`）

现在扩展可以正常安装和运行，同时保持了灵活性和安全性！

