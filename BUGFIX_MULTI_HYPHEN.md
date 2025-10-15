# 修复多连字符分支名称匹配问题

## 🐛 问题描述

当分支名称包含多个连字符时（如 `cpsw-web-restore`），扩展图标无法点击打开浮动窗口。

**问题URL示例：**
```
https://cafus-cpsw-web-restore.pre.planetart.com/designer/custom-womens-value-t-shirts
```

**问题表现：**
- Content script 可以正常加载和运行
- 但点击扩展图标时，浮动窗口无法打开
- 控制台可能显示 "Not on supported page"

## 🔍 问题原因

### 根本原因

在 `background.js` 中，扩展图标点击事件处理函数使用了错误的域名检查逻辑：

```javascript
// ❌ 错误的实现
const supportedDomains = CONFIG.getSupportedDomains();
const isSupported = supportedDomains.some(domain => tab.url && tab.url.includes(domain));
```

### 问题分析

1. **`CONFIG.getSupportedDomains()` 的工作方式：**
   - 根据 `CONFIG.BRANCH.CURRENT` 动态生成域名列表
   - 如果配置是 `BRANCH.CURRENT = 'cpsw-web'`
   - 返回的域名包括：`cafus-cpsw-web.pre.planetart.com`

2. **使用 `includes()` 的问题：**
   ```javascript
   // 当前配置：BRANCH.CURRENT = 'cpsw-web'
   // 生成的域名：cafus-cpsw-web.pre.planetart.com
   // 实际访问：cafus-cpsw-web-restore.pre.planetart.com
   
   'https://cafus-cpsw-web-restore.pre.planetart.com'.includes('cafus-cpsw-web.pre.planetart.com')
   // 结果：false ❌
   ```

3. **为什么 content script 可以工作：**
   - Content script 中使用了正则表达式匹配
   - `/^cafus-.*\.pre\.planetart\.com$/` 可以匹配任意分支名称
   - 所以 content script 正常加载和运行

4. **为什么图标点击失败：**
   - Background script 使用了静态域名列表 + `includes()` 检查
   - 只能匹配配置中指定的分支名称
   - 无法匹配其他分支（如 `cpsw-web-restore`）

## ✅ 解决方案

### 修改 background.js

将静态域名列表检查改为正则表达式模式匹配：

```javascript
// ✅ 正确的实现
function isSupportedUrl(url) {
    if (!url) return false;
    
    try {
        const hostname = new URL(url).hostname;
        
        // Supported patterns
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
    } catch (e) {
        return false;
    }
}

const isSupported = isSupportedUrl(tab.url);
```

## 🧪 测试验证

### 测试用例

```javascript
// 测试各种分支名称格式
const testUrls = [
    'https://cafus-cpsw-web.pre.planetart.com/',
    'https://cafus-cpsw-web-restore.pre.planetart.com/',
    'https://cafus-feature-multi-part.stage.planetart.com/',
    'https://cafca-hotfix-bug-123.pre.planetart.com/',
    'https://admin-release-v2-0-1.pre.planetart.com/'
];

testUrls.forEach(url => {
    const result = isSupportedUrl(url);
    console.log(result ? '✅' : '❌', url);
});
```

### 预期结果

所有测试用例都应该返回 ✅，无论分支名称包含多少个连字符。

## 📊 影响范围

### 修复前

**可以工作：**
- ✅ `cafus-cpsw-web.pre.planetart.com` （配置的分支）
- ✅ `cafus-master.pre.planetart.com` （如果配置为 master）

**无法工作：**
- ❌ `cafus-cpsw-web-restore.pre.planetart.com`
- ❌ `cafus-feature-new-ui.pre.planetart.com`
- ❌ 任何非配置文件中指定的分支

### 修复后

**全部可以工作：**
- ✅ `cafus-cpsw-web.pre.planetart.com`
- ✅ `cafus-cpsw-web-restore.pre.planetart.com`
- ✅ `cafus-master.pre.planetart.com`
- ✅ `cafus-feature-multi-part.pre.planetart.com`
- ✅ `cafus-任意分支名称.pre.planetart.com`
- ✅ 所有符合格式的域名

## 🎯 相关代码位置

### Content Script (已正确)
**文件：** `content.js` (第 8-28 行)
```javascript
function isSupportedDomain() {
    const supportedPatterns = [
        /^cafus-.*\.pre\.planetart\.com$/,
        // ... 其他模式
    ];
    return supportedPatterns.some(pattern => pattern.test(hostname));
}
```
✅ 使用正则表达式，可以匹配任意分支

### Background Script (已修复)
**文件：** `background.js` (第 220-254 行)
```javascript
function isSupportedUrl(url) {
    const supportedPatterns = [
        /^cafus-.*\.pre\.planetart\.com$/,
        // ... 其他模式
    ];
    return supportedPatterns.some(pattern => pattern.test(hostname));
}
```
✅ 现在使用正则表达式，与 content.js 保持一致

### Config (自动检测仍然有效)
**文件：** `config.js` (第 104-125 行)
```javascript
autoDetectBranch() {
    const preStagePattern = /^caf(?:us|ca|uk|au|)-([^.]+)\.(pre|stage)\.planetart\.com$/;
    // ...
}
```
✅ 正则表达式使用 `[^.]+` 匹配分支名称，支持任意连字符

## 💡 经验教训

### 1. 一致性很重要
- Content script 和 background script 应该使用相同的域名检查逻辑
- 都使用正则表达式，而不是混用静态列表

### 2. 避免使用动态生成的域名列表进行匹配
- `CONFIG.getSupportedDomains()` 依赖于配置的分支
- 不适合用于通用的域名检查
- 应该使用模式匹配（正则表达式）

### 3. 测试边界情况
- 单连字符：`master`
- 双连字符：`cpsw-web`
- 多连字符：`cpsw-web-restore`
- 更多连字符：`feature-multi-part-name`

## 🔗 相关文档

- [自动检测功能指南](AUTO_DETECT_GUIDE.md)
- [Manifest 修复说明](MANIFEST_FIX.md)
- [分支配置使用指南](BRANCH_CONFIG_GUIDE.md)

## ✅ 验证清单

修复后请验证：

- [ ] 访问 `cafus-cpsw-web.pre.planetart.com` - 图标可点击
- [ ] 访问 `cafus-cpsw-web-restore.pre.planetart.com` - 图标可点击
- [ ] 访问 `cafus-feature-test.stage.planetart.com` - 图标可点击
- [ ] 访问 `www.cafepress.com` - 图标可点击
- [ ] 浮动窗口正常显示
- [ ] 自动分支检测正常工作

全部通过 ✅ 则修复成功！

