# 统一域名检测说明

## 🎯 问题描述

之前三个地方（config.js、content.js、background.js、popup.js）都有各自的域名检测逻辑，导致：
- 代码重复
- 逻辑可能不一致
- 维护困难
- 可能出现某些地方检测成功，某些地方检测失败的情况

## ✅ 解决方案

### 统一的域名检测方法

在 `config.js` 中创建统一的域名检测方法，所有其他文件都使用这些方法：

#### 1. `CONFIG.isSupportedHostname(hostname)`

**功能：** 检查主机名是否为支持的域名

**使用：**
```javascript
const isSupported = CONFIG.isSupportedHostname('cafus-cpsw-web-restore.pre.planetart.com');
// 返回: true
```

**支持的域名模式：**
- `cafus-*.pre.planetart.com`
- `cafus-*.stage.planetart.com`
- `cafca-*.pre.planetart.com`
- `cafca-*.stage.planetart.com`
- `cafuk-*.pre.planetart.com`
- `cafuk-*.stage.planetart.com`
- `cafau-*.pre.planetart.com`
- `cafau-*.stage.planetart.com`
- `(www.)?cafepress.com`
- `(www.)?cafepress.ca`
- `(www.)?cafepress.co.uk`
- `(www.)?cafepress.com.au`

#### 2. `CONFIG.autoDetectBranch(hostname)`

**功能：** 从主机名自动检测分支名称

**使用：**
```javascript
// 方式 1: 提供主机名
const branch = CONFIG.autoDetectBranch('cafus-cpsw-web-restore.pre.planetart.com');
// 返回: 'cpsw-web-restore'

// 方式 2: 不提供参数，自动使用 window.location.hostname
const branch = CONFIG.autoDetectBranch();
// 返回: 当前页面的分支名称
```

## 📝 使用位置

### 1. content.js

**之前：** 自己定义 `isSupportedDomain()` 函数
```javascript
// ❌ 旧代码
function isSupportedDomain() {
    const supportedPatterns = [ ... ];
    return supportedPatterns.some(pattern => pattern.test(hostname));
}
```

**现在：** 使用统一方法
```javascript
// ✅ 新代码
if (typeof CONFIG !== 'undefined' && !CONFIG.isSupportedHostname(window.location.hostname)) {
    console.log('⚠️ Not a supported Cafepress domain');
}
```

### 2. background.js

**之前：** 自己定义域名检查逻辑
```javascript
// ❌ 旧代码
function isSupportedUrl(url) {
    const supportedPatterns = [ ... ];
    return supportedPatterns.some(pattern => pattern.test(hostname));
}
```

**现在：** 使用统一方法
```javascript
// ✅ 新代码
function isSupportedUrl(url) {
    const hostname = new URL(url).hostname;
    return CONFIG.isSupportedHostname(hostname);
}
```

### 3. popup.js

**之前：** 自己定义正则表达式检查
```javascript
// ❌ 旧代码
const preStagePattern = /^caf(?:us|ca|uk|au|)-([^.]+)\.(pre|stage)\.planetart\.com$/;
let match = hostname.match(preStagePattern);
```

**现在：** 使用统一方法
```javascript
// ✅ 新代码
if (CONFIG.isSupportedHostname(hostname)) {
    const detectedBranch = CONFIG.autoDetectBranch(hostname);
}
```

## 🎨 优势

### 1. 单一数据源
- 所有域名模式定义在一个地方（config.js）
- 修改时只需要改一处
- 保证所有地方的逻辑完全一致

### 2. 易于维护
- 添加新的域名模式：只需在 config.js 中添加
- 修复 bug：只需修改一处
- 代码更简洁，减少重复

### 3. 一致性保证
- content.js、background.js、popup.js 都使用相同的逻辑
- 不会出现某处检测通过，某处检测失败的情况
- 行为完全可预测

### 4. 更好的可测试性
- 可以独立测试 `isSupportedHostname()` 和 `autoDetectBranch()`
- 不依赖于特定的执行环境
- 易于编写单元测试

## 🧪 测试验证

### 测试用例

```javascript
// 测试域名检测
console.log(CONFIG.isSupportedHostname('cafus-cpsw-web-restore.pre.planetart.com')); 
// ✅ true

console.log(CONFIG.isSupportedHostname('unknown.pre.planetart.com')); 
// ❌ false

// 测试分支检测
console.log(CONFIG.autoDetectBranch('cafus-cpsw-web-restore.pre.planetart.com')); 
// 'cpsw-web-restore'

console.log(CONFIG.autoDetectBranch('cafus-master.stage.planetart.com')); 
// 'master'

console.log(CONFIG.autoDetectBranch('www.cafepress.com')); 
// null (Live 环境无分支)
```

### 验证清单

- [x] content.js 使用统一方法
- [x] background.js 使用统一方法
- [x] popup.js 使用统一方法
- [x] 所有测试用例通过
- [x] 无 linter 错误

## 📊 代码统计

### 重构前
- 域名模式定义：3 处（content.js, background.js, popup.js）
- 总代码行数：~60 行（重复代码）

### 重构后
- 域名模式定义：1 处（config.js）
- 总代码行数：~30 行
- 减少代码：~50%

## 🔄 迁移指南

### 如果需要添加新的支持域名

**只需修改 config.js：**
```javascript
isSupportedHostname(hostname) {
    const supportedPatterns = [
        // ... 现有模式
        /^new-region-.*\.pre\.planetart\.com$/,  // 添加这一行
    ];
    return supportedPatterns.some(pattern => pattern.test(hostname));
}
```

**无需修改其他文件！** ✨

### 如果需要修改分支检测逻辑

**只需修改 config.js 中的 `autoDetectBranch()` 方法：**
```javascript
autoDetectBranch(hostname = null) {
    // 修改正则表达式
    const preStagePattern = /新的正则表达式/;
    // ...
}
```

**无需修改其他文件！** ✨

## 💡 最佳实践

### 1. 始终使用统一方法
```javascript
// ✅ 推荐
if (CONFIG.isSupportedHostname(hostname)) {
    // ...
}

// ❌ 不推荐
if (hostname.includes('planetart.com')) {
    // ...
}
```

### 2. 传入 hostname 参数
```javascript
// ✅ 推荐（更灵活，可测试）
const branch = CONFIG.autoDetectBranch(hostname);

// ⚠️ 可以（但依赖 window 对象）
const branch = CONFIG.autoDetectBranch();
```

### 3. 添加错误处理
```javascript
// ✅ 推荐
try {
    const url = new URL(tabUrl);
    if (CONFIG.isSupportedHostname(url.hostname)) {
        // ...
    }
} catch (e) {
    console.error('Error parsing URL:', e);
}
```

## 🔗 相关文档

- [自动检测功能指南](AUTO_DETECT_GUIDE.md)
- [多连字符修复说明](BUGFIX_MULTI_HYPHEN.md)
- [Manifest 修复说明](MANIFEST_FIX.md)

## ✅ 总结

通过统一域名检测逻辑：
- ✅ 代码更简洁（减少 50% 重复代码）
- ✅ 逻辑更一致（所有地方使用相同的检测方法）
- ✅ 维护更简单（只需修改一处）
- ✅ 更易测试（独立的、可测试的方法）
- ✅ 更可靠（不会出现检测结果不一致的情况）

现在所有的域名检测都通过 `CONFIG.isSupportedHostname()` 进行，保证了完全的一致性！🎉

