# Cafepress QA Tools Chrome插件

这是一个为Cafepress QA团队开发的Chrome插件，提供产品信息提取、订单查询、图片审核和店铺搜索等多功能工具。

## 功能特性

### 📦 产品信息提取
- 🔍 自动检测并提取产品详细信息
  - Designer（设计师）及链接
  - DesignId（设计ID）
  - Category ID（分类ID）
  - Stock Status（库存状态）
  - CP Product Type（产品类型）
  - Default Overlay ID（默认覆盖层ID）
  - Option ID（选项ID）
  - Site ID（站点ID）
  - SKU ID（SKU ID）
  - Vendor ID（供应商ID）
  - Seller ID/Customer ID（卖家/客户ID）
  - Store ID（店铺ID）
  - SW Product ID（SW产品ID）
  - Is Virtual（是否虚拟产品）
  - Product Image ID（产品图片ID）
  - CP Product ID（CP产品ID）
- 🌍 环境切换（Pre/Stage/Live）
- 🔄 支持SPA页面的URL变化检测
- 📊 实时刷新产品数据

### 🔍 订单查询功能
- 通过Order ID查询订单详细信息
- 自动从Admin系统提取订单数据
- 显示订单摘要（Order Summary）：
  - Order Date（订单日期）
  - Status（状态）
  - Customer Name（客户姓名）
  - Email（邮箱）
  - Subtotal（小计）
  - S&H（运费）
  - TOTAL（总计）
  - Sales Tax（销售税）
  - GRAND TOTAL（总金额）
  - Promo Code（促销码）
  - Sale Discount（折扣）
- 显示运输与付款（Ship & Payment）：
  - Ship To（收货地址）
  - Ship Method（运输方式）
- 显示订单商品（Order Items）：
  - Item ID（商品ID）
  - Design（设计）
  - Qty（数量）
  - Unit Price Paid（单价）
  - Amount（金额）
- 🔐 需要SSO登录Admin系统

### 🖼️ 图片审核功能
- 通过Image ID快速审核图片
- 支持Approve（批准）和Block（屏蔽）操作
- 多环境支持（Pre/Stage/Live）
- 实时反馈操作结果
- 一键清空输入

### 🏪 店铺搜索功能
- 通过Email或SW Customer ID搜索店铺
- 支持单条件或组合搜索
- 显示店铺详细信息：
  - Store Name（店铺名称）
  - Store ID（店铺ID）
  - CP Member No（CP会员号）
  - SW Customer ID（SW客户ID）
- 多环境支持（Pre/Stage/Live）
- 按邮箱分组显示结果

### 🔐 SSO登录集成
- 一键跳转Admin SSO登录
- 自动检测登录状态
- 显示当前登录用户信息
- 需要登录时自动提示

### 📌 窗口固定功能
- 可将浮动窗口固定显示
- 跨页面保持打开状态
- 记住用户偏好设置

## 支持的产品URL格式

插件能够识别以下三种产品URL格式：

### 1. SEO友好格式
```
/+{seo-slug},{productId}
```
示例：
- `https://cafus-cpsw-web.pre.planetart.com/+,78765606`
- `https://cafus-cpsw-web.pre.planetart.com/+wear-your-smile-womens-value-t-shirt,1125703148`

### 2. Marketplace格式（productId参数）
```
/mf/{designId}/_xxx?productId={productId}
```
示例：
- `https://cafus-cpsw-web.pre.planetart.com/mf/110425555/_tshirt?productId=78765606`

### 3. Marketplace格式（fromProductId参数）
```
/mf/{designId}/xxx?fromProductId={productId}
```
示例：
- `https://cafus-cpsw-web.pre.planetart.com/mf/80826596/large-puzzle?fromProductId=538485120&desired_product_type=1498`

## 支持的环境

插件支持以下四个站点的三个环境：

### 站点：
- **CAFUS**（美国）：cafepress.com / cafus-cpsw-web
- **CAFCA**（加拿大）：cafepress.ca / cafca-cpsw-web
- **CAFUK**（英国）：cafepress.co.uk / cafuk-cpsw-web
- **CAFAU**（澳大利亚）：cafepress.com.au / cafau-cpsw-web

### 环境：
- **Pre**（预发布环境）
- **Stage**（测试环境）
- **Live**（生产环境）

## 安装步骤

### 1. 下载插件文件

确保您有以下文件：
- `manifest.json` - 插件配置文件
- `content.js` - 内容脚本，负责页面数据提取
- `popup.html` - 弹出窗口界面
- `popup.js` - 弹出窗口逻辑
- `background.js` - 后台脚本，处理跨域请求
- 图标文件（icon16.png, icon48.png, icon128.png等）

### 2. 加载插件

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择包含插件文件的文件夹

### 3. 使用插件

#### 产品信息查看：
1. 访问任意Cafepress产品页面
2. 点击浏览器工具栏中的插件图标
3. 查看自动提取的产品信息
4. 可点击不同环境按钮切换站点

#### 订单查询：
1. 点击"SSO Login"按钮登录Admin系统
2. 在Search输入框中输入Order ID
3. 点击"Search"按钮或按Enter键
4. 查看订单详细信息

#### 图片审核：
1. 确保已登录Admin系统
2. 在"Enter Image ID"输入框中输入图片ID
3. 点击"Approve"批准或"Block"屏蔽
4. 查看操作结果提示

#### 店铺搜索：
1. 确保已登录Admin系统
2. 输入Email或SW Customer ID（至少一个）
3. 点击"Search Store"按钮
4. 查看店铺搜索结果

## 文件说明

### 核心文件
- `manifest.json` - Chrome插件配置文件（Manifest V3）
- `content.js` - 内容脚本，负责：
  - 产品信息提取
  - 浮动窗口UI
  - 订单/店铺搜索界面
  - 图片审核界面
- `popup.html` - 浏览器工具栏弹出窗口界面
- `popup.js` - 弹出窗口逻辑和登录状态检测
- `background.js` - 后台服务脚本，负责：
  - 跨域API请求代理
  - Admin系统数据获取
  - 图片审核API调用
  - 店铺搜索API调用

### 资源文件
- `icon16.png` - 16x16像素图标
- `icon48.png` - 48x48像素图标
- `icon128.png` - 128x128像素图标
- `icon256.png` - 256x256像素图标
- `icon512.png` - 512x512像素图标

## 技术特性

- ✅ Manifest V3兼容
- ✅ 内容脚本隔离与页面脚本注入
- ✅ 跨域请求通过后台脚本代理
- ✅ HTML解析与DOM数据提取
- ✅ 本地存储（localStorage + chrome.storage.local）
- ✅ 实时消息通信（chrome.runtime.sendMessage）
- ✅ Cookie管理和登录状态检测
- ✅ 动态URL模式匹配
- ✅ 多环境API自动切换
- ✅ Toast通知系统
- ✅ 错误处理和用户反馈
- ✅ 窗口固定功能（持久化状态）

## 权限说明

插件需要以下权限：

- `storage` - 保存用户偏好和历史数据
- `activeTab` - 访问当前标签页内容
- `scripting` - 注入脚本提取产品信息
- `cookies` - 读取登录状态
- `host_permissions` - 访问以下域名：
  - `*://*.planetart.com/*` - Cafepress产品站点和Admin系统
  - `*://*.cafepress.com/*` - Cafepress美国站
  - `*://*.cafepress.ca/*` - Cafepress加拿大站
  - `*://*.cafepress.co.uk/*` - Cafepress英国站
  - `*://*.cafepress.com.au/*` - Cafepress澳大利亚站

## API端点

### Admin系统API：
- **订单查询**：
  - `{env}/orders/order_tab_index.php?order_id={orderId}` - 基本信息
  - `{env}/orders/order_tab_overview.php?order_id={orderId}` - 财务和运输信息
  - `{env}/orders/order_tab_customer.php?order_id={orderId}` - 客户信息
  - `{env}/orders/order_tab_items.php?order_id={orderId}` - 订单商品
  - `{env}/orders/order_tab_item_ajax.php?order_id={orderId}&item_no={itemNo}` - 单个商品详情

- **图片审核**：
  - `{env}/ajax/ajax_cp_cup_tool_approve.php` - 批准/屏蔽图片

- **店铺搜索**：
  - `{env}/ajax/ajax_cp_seller_store.php` - 搜索店铺

### 环境映射：
- **Pre**: `https://admin-cpsw-web.pre.planetart.com`
- **Stage**: `https://admin-cpsw-web.stage.planetart.com`
- **Live**: `https://admin.planetart.com`

## 版本历史

- **v1.5.2** - 支持不同product链接解析及UI优化
- **v1.5.1** - 修复Product URL识别（支持无SEO slug格式）
- **v1.5** - 新增店铺搜索功能
- **v1.4** - 新增图片审核功能
- **v1.3** - 新增窗口固定功能
- **v1.2.1** - 插件更名为"Cafepress QA Tools"
- **v1.2** - 优化Product Info显示逻辑
- **v1.1** - 新增订单查询功能
- **v1.0** - 初始版本，产品信息提取

## 故障排除

### 1. 插件无法加载
- 检查manifest.json语法是否正确
- 确认所有必需文件都存在
- 查看chrome://extensions/页面的错误信息

### 2. 无法提取产品信息
- 确认URL格式符合三种支持格式之一
- 检查页面是否完全加载
- 打开浏览器控制台查看错误信息
- 尝试点击"Refresh Check"重新提取

### 3. 订单查询失败
- 确认已通过SSO登录Admin系统
- 检查Order ID是否正确
- 确认网络连接正常
- 查看浏览器控制台的详细错误信息

### 4. 图片审核失败
- 确认已登录Admin系统
- 检查Image ID是否正确
- 确认当前环境的Admin API可访问
- 查看Toast提示的错误信息

### 5. 店铺搜索无结果
- 确认至少输入了Email或SW Customer ID之一
- 检查输入格式是否正确
- 确认Admin系统中存在对应数据
- 尝试切换不同环境搜索

### 6. 登录状态检测失败
- 手动访问Admin系统确认是否已登录
- 清除浏览器Cookie后重新登录
- 检查Cookie权限是否被浏览器限制

## 开发说明

### 调试模式
- 打开浏览器控制台（F12）
- 查看以带emoji的日志输出
- 使用"Debug Page"按钮注入调试脚本

### 修改代码后重新加载
1. 在`chrome://extensions/`页面
2. 找到"Cafepress QA Tools"
3. 点击刷新图标（🔄）
4. 刷新测试页面

### Git版本管理
```bash
# 查看当前版本
git tag

# 查看提交历史
git log --oneline

# 创建新版本标签
git tag -a v1.x.x -m "版本说明"
```

## 注意事项

- 插件仅在Cafepress相关域名下工作
- 订单查询、图片审核和店铺搜索功能需要Admin系统登录权限
- Live环境可能运行旧版本代码，部分功能可能不可用
- 建议在Pre或Stage环境进行测试
- 窗口固定状态会持久化保存，跨浏览器会话保持

## 联系与支持

如有问题或建议，请联系QA团队。

---

**最后更新**: v1.5.2 (2025-01)
