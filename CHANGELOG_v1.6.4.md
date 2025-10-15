# Changelog v1.6.4 - 站点信息显示优化

## 🎯 更新概述

重构了浮动窗口顶部的站点信息显示区域，使其独立于 Product Info，提供更清晰、更完整的站点信息展示。

## ✨ 主要改进

### 1. 独立信息显示
- **之前**：站点环境切换按钮仅在产品页面显示，且依赖 Product Info 数据
- **现在**：站点信息始终显示，完全独立于 Product Info

### 2. 完整信息展示

新的信息布局包含四个核心要素：

#### 🏢 站点名称
- 显示：`CAFUS` / `CAFCA` / `CAFUK` / `CAFAU`
- 样式：浅紫色背景，加粗显示
- 自动检测：基于当前 URL 识别站点

#### 🔢 站点 ID
- 显示：`ID: 170` / `ID: 173` / `ID: 172` / `ID: 171`
- 样式：黄色高亮标签
- 对应关系：
  - CAFUS → 170
  - CAFCA → 173
  - CAFUK → 172
  - CAFAU → 171

#### 🔱 分支名称
- 显示：如 `cpsw-web-restore`、`master`、`cpsw-web`
- 样式：绿色标签，带边框
- 智能检测：
  - Pre/Stage 环境自动提取分支名
  - Live 环境不显示（无分支概念）
  - 支持多连字符分支名

#### 🌍 当前环境
- 显示：`Live` / `Pre` / `Stage`
- 样式：不同颜色区分
  - **Live** - 🟠 橙色（生产环境）
  - **Stage** - 🟣 紫色（预发布环境）
  - **Pre** - 🔵 蓝色（开发环境）

## 📊 视觉效果

### 显示示例

**Pre 环境 + 分支**
```
[CAFUS] [ID: 170] [🔱 cpsw-web-restore] [Pre]
```

**Stage 环境 + 分支**
```
[CAFCA] [ID: 173] [🔱 master] [Stage]
```

**Live 环境（无分支）**
```
[CAFUK] [ID: 172] [Live]
```

## 🎨 设计特点

1. **标签化设计**：每个信息项都是独立的标签卡片
2. **颜色编码**：不同类型信息使用不同颜色，一目了然
3. **自适应布局**：信息项可自动换行适应窗口宽度
4. **视觉层次**：通过大小、颜色、边框区分重要性

## 🔧 技术实现

### 修改文件
- `content.js` - `createEnvironmentSwitcher()` 函数

### 核心逻辑
```javascript
// 自动检测站点信息
const region = CONFIG.detectRegion(currentUrl);
const siteName = CONFIG.getSiteName(region);
const siteId = CONFIG.getSiteId(region);
const detectedBranch = CONFIG.autoDetectBranch(hostname);

// 检测环境
let currentEnv = 'Live';
if (hostname.includes('.pre.planetart.com')) {
    currentEnv = 'Pre';
} else if (hostname.includes('.stage.planetart.com')) {
    currentEnv = 'Stage';
}
```

## 📝 使用场景

### 适用于所有页面
- ✅ 产品页面
- ✅ 搜索页面
- ✅ 分类页面
- ✅ 店铺页面
- ✅ 任何支持的 Cafepress 页面

### 信息始终可见
- 不需要先查看 Product Info
- 不依赖页面类型
- 打开浮动窗口即可看到站点信息

## 🆚 对比变化

### 之前的设计问题
1. ❌ 只在产品页面显示环境切换按钮
2. ❌ 依赖 `getEnvironmentInfo()` 复杂逻辑
3. ❌ 需要构建完整的 URL 才能显示
4. ❌ 与 Product Info 耦合

### 现在的优势
1. ✅ 所有页面都显示站点信息
2. ✅ 使用 CONFIG 统一方法获取信息
3. ✅ 只依赖当前 URL 即可检测
4. ✅ 完全独立，不依赖其他数据

## 🔍 测试建议

### 测试场景
1. **不同站点**
   - [ ] 测试 CAFUS（美国站）
   - [ ] 测试 CAFCA（加拿大站）
   - [ ] 测试 CAFUK（英国站）
   - [ ] 测试 CAFAU（澳大利亚站）

2. **不同环境**
   - [ ] Live 环境（生产）
   - [ ] Pre 环境（开发）
   - [ ] Stage 环境（预发布）

3. **不同分支**
   - [ ] 单词分支：`master`
   - [ ] 短横线分支：`cpsw-web`
   - [ ] 多连字符：`cpsw-web-restore`
   - [ ] 其他命名：`feature-test`

4. **不同页面类型**
   - [ ] 产品详情页
   - [ ] 搜索结果页
   - [ ] 首页
   - [ ] 分类页

### 验证要点
- 站点名称显示正确
- 站点 ID 匹配站点
- 分支名称正确提取（Pre/Stage）
- 环境标签颜色正确
- Live 环境不显示分支标签

## 📦 版本信息

- **版本号**：v1.6.4
- **发布日期**：2025-10-15
- **向后兼容**：✅ 是（不影响现有功能）
- **依赖版本**：需要 config.js v1.6.3+

## 🔗 相关版本

- v1.6.3 - 统一域名检测逻辑
- v1.6.2 - 修复多连字符分支名称匹配
- v1.6.1 - 灵活分支配置和自动检测

## 💡 后续建议

### 可能的增强
1. 点击环境标签显示详细信息
2. 添加环境切换快捷按钮（跳转到其他环境）
3. 支持自定义显示/隐藏某些信息项
4. 添加站点信息复制功能

### 已知限制
- 不支持本地开发环境检测
- 需要在已支持的域名下才能正确显示

---

**更新负责人**: AI Assistant  
**测试状态**: ⏳ 待测试  
**文档更新**: ✅ 已完成

