# 自动分支检测功能指南

## 🎯 功能概述

从 **v1.6.3** 开始，系统支持**自动检测当前页面的分支名称**，无需手动修改配置文件！

## ✨ 工作原理

### 自动检测规则

系统会从当前访问的 URL 中自动提取分支名称：

**URL 模式识别：**
```
前端站点: {region}-{branch}.{environment}.planetart.com
Admin:    admin-{branch}.{environment}.planetart.com
```

**示例：**
- `cafus-cpsw-web.pre.planetart.com` → 检测到分支：`cpsw-web`
- `cafca-master.stage.planetart.com` → 检测到分支：`master`
- `admin-hotfix-123.pre.planetart.com` → 检测到分支：`hotfix-123`

### 自动检测时机

1. **页面加载时**：content.js 自动检测并更新配置
2. **打开 Popup 时**：popup.js 从当前标签页检测分支
3. **手动调用时**：通过 API 方法主动检测

## 📋 使用方式

### 方式 1：完全自动（推荐）✨

**无需任何操作！**

访问任何分支的页面，系统会自动检测：

```javascript
// 访问 cafus-master.pre.planetart.com
// 系统自动检测到: master

// 访问 cafca-cpsw-web.stage.planetart.com  
// 系统自动检测到: cpsw-web

// 访问 admin-feature-x.pre.planetart.com
// 系统自动检测到: feature-x
```

**控制台输出：**
```
📌 Configured branch: cpsw-web
🔍 Auto-detected branch: master
✅ Config updated to use detected branch: master
✅ Using auto-detected branch: master
```

### 方式 2：手动检测

在浏览器控制台中：

```javascript
// 检测当前 URL 的分支（不更新配置）
const branch = CONFIG.autoDetectBranch();
console.log('Detected:', branch);

// 检测并显示信息（不更新配置）
CONFIG.detectAndSetBranch(false);

// 检测并更新配置
CONFIG.detectAndSetBranch(true);
```

### 方式 3：混合模式

**配置默认分支 + 自动检测：**

```javascript
// config.js 中设置默认分支
BRANCH: {
    CURRENT: 'cpsw-web'  // 默认分支
}

// 访问其他分支时，自动检测会覆盖默认值
// 访问 Live 环境时，使用默认分支
```

## 🔧 API 方法

### 1. autoDetectBranch()

**纯检测，不修改配置**

```javascript
const branch = CONFIG.autoDetectBranch();

if (branch) {
    console.log('检测到分支:', branch);
} else {
    console.log('无法检测（可能是 Live 环境）');
}
```

**返回值：**
- `string` - 检测到的分支名称
- `null` - 无法检测（Live 环境或无法识别的域名）

### 2. detectAndSetBranch(updateConfig)

**检测并可选更新配置**

```javascript
// 只检测，不更新配置
CONFIG.detectAndSetBranch(false);

// 检测并更新配置
CONFIG.detectAndSetBranch(true);
```

**参数：**
- `updateConfig` (boolean) - 是否更新 `CONFIG.BRANCH.CURRENT`
  - `true` - 更新配置（推荐用于自动模式）
  - `false` - 只检测不更新（推荐用于查询）

**返回值：**
- `string` - 检测到的分支名称
- `null` - 无法检测

### 3. getCurrentBranch()

**获取当前使用的分支**

```javascript
const current = CONFIG.getCurrentBranch();
console.log('当前分支:', current);
```

## 📊 使用场景

### 场景 1：多分支测试

**无需修改配置，直接访问不同分支：**

1. 访问 `cafus-cpsw-web.pre.planetart.com`
   - 自动使用 `cpsw-web` 分支

2. 访问 `cafus-master.pre.planetart.com`
   - 自动切换到 `master` 分支

3. 访问 `cafus-feature-x.stage.planetart.com`
   - 自动切换到 `feature-x` 分支

**所有操作都自动完成！** ✨

### 场景 2：开发调试

```javascript
// 检查当前检测到的分支
console.log('Detected:', CONFIG.autoDetectBranch());
console.log('Current:', CONFIG.getCurrentBranch());

// 验证域名生成
console.log('US PRE:', CONFIG.SITES.US.PRE);
console.log('Admin:', CONFIG.ADMIN.PRE);
```

### 场景 3：跨分支对比

打开多个标签页，每个标签页自动使用对应的分支：

```
标签 1: cafus-master.pre.planetart.com    → 使用 master
标签 2: cafus-cpsw-web.pre.planetart.com → 使用 cpsw-web
标签 3: cafus-hotfix.pre.planetart.com   → 使用 hotfix
```

每个标签页独立工作，互不干扰！

## ⚠️ 注意事项

### 1. Live 环境

Live 环境无法检测分支（因为域名不包含分支信息）：

```
www.cafepress.com       → 无法检测，使用配置的默认分支
admin.planetart.com     → 无法检测，使用配置的默认分支
```

### 2. 配置优先级

```
自动检测 > 配置文件

如果能检测到分支：使用检测到的分支
如果检测失败：使用配置文件中的默认分支
```

### 3. 检测范围

**可以检测：**
- ✅ Pre 环境：`cafus-*.pre.planetart.com`
- ✅ Stage 环境：`cafus-*.stage.planetart.com`
- ✅ Admin Pre：`admin-*.pre.planetart.com`
- ✅ Admin Stage：`admin-*.stage.planetart.com`

**无法检测：**
- ❌ Live 环境：`www.cafepress.com`
- ❌ Admin Live：`admin.planetart.com`
- ❌ 其他域名

### 4. 配置文件的作用

即使有自动检测，配置文件仍然重要：

```javascript
BRANCH: {
    CURRENT: 'cpsw-web'  // 作为默认值和后备方案
}
```

**用途：**
- Live 环境的后备分支
- 无法检测时的默认值
- 手动构建域名时的参考

## 🎓 最佳实践

### 推荐配置

```javascript
// config.js
BRANCH: {
    CURRENT: 'cpsw-web',  // 设置最常用的分支作为默认
}

// 然后就可以自由访问任何分支的页面了！
// 系统会自动检测并使用正确的分支
```

### 验证自动检测

访问页面后，在控制台查看：

```javascript
// 查看检测结果
console.log('Detected:', CONFIG.autoDetectBranch());
console.log('Current:', CONFIG.getCurrentBranch());

// 验证域名生成
console.table({
    'Detected Branch': CONFIG.autoDetectBranch(),
    'Current Branch': CONFIG.getCurrentBranch(),
    'US PRE': CONFIG.SITES.US.PRE,
    'Admin PRE': CONFIG.ADMIN.PRE
});
```

### 混合使用

```javascript
// 大多数情况：让系统自动检测
// 特殊情况：手动指定分支

// 例如：测试特定分支的域名生成
const customUrl = CONFIG.buildDomain('US', 'pre', 'test-branch');
```

## 🔄 迁移指南

### 从手动配置迁移到自动检测

**之前（v1.6.2 及更早）：**
```javascript
// 需要手动修改配置文件
CONFIG.BRANCH.CURRENT = 'master';
// 重新加载扩展
```

**现在（v1.6.3+）：**
```javascript
// 什么都不用做！
// 直接访问任何分支的页面
// 系统自动检测并使用正确的分支 ✨
```

### 向后兼容

自动检测功能完全向后兼容：

- ✅ 现有的手动配置仍然有效
- ✅ `setBranch()` 方法仍然可用
- ✅ `buildDomain()` 方法仍然可用
- ✅ 所有 API 保持不变

## 📚 相关文档

- [分支配置使用指南](BRANCH_CONFIG_GUIDE.md) - 分支配置详细说明
- [配置快速参考](CONFIG_QUICK_REFERENCE.md) - API 快速查询
- [配置使用指南](CONFIG_GUIDE.md) - 完整配置说明

## 💡 常见问题

### Q: 自动检测会影响性能吗？
A: 不会。检测只在页面加载时执行一次，非常快速。

### Q: 可以禁用自动检测吗？
A: 可以。注释掉 content.js 和 popup.js 中的自动检测代码即可。

### Q: Live 环境怎么办？
A: Live 环境使用配置文件中的默认分支，这是合理的设计。

### Q: 可以同时访问多个分支吗？
A: 可以！每个标签页独立检测，互不影响。

### Q: 如何确认自动检测是否工作？
A: 查看控制台输出，会显示检测到的分支信息。

## 🎉 总结

自动分支检测让使用更加便捷：

- ✅ **零配置**：无需手动修改文件
- ✅ **智能化**：自动识别当前分支
- ✅ **灵活性**：支持手动覆盖
- ✅ **兼容性**：完全向后兼容

现在您可以自由访问任何分支的页面，系统会自动处理一切！🚀

