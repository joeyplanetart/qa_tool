# Cafepress QA Tools Chrome插件

这是一个为Cafepress QA团队开发的Chrome插件，提供产品信息提取和订单查询功能。

## 功能特性

- 🔍 自动检测并提取产品信息（Designer、DesignId、CP Product ID等）
- 📦 订单查询功能（通过Admin系统）
- 🌍 环境切换（Pre/Stage/Live）
- 📊 实时显示产品和订单数据
- 💾 自动保存提取历史
- 🔄 支持SPA页面的URL变化检测
- 🔐 SSO登录集成

## 支持的URL格式

插件能够从以下格式的URL中提取ProductId：

1. `https://cafus-cpsw-web.pre.planetart.com/+,735667399`
2. `https://cafus-cpsw-web.pre.planetart.com/+kicking-asphalt-challenger-infant-bodysuit,431753338?attr2=4438`

提取规则：逗号后面大于5位数的数字

## 安装步骤

### 1. 准备图标文件

由于技术限制，需要手动添加图标文件。请创建以下尺寸的PNG图标：

- `icon16.png` (16x16 像素)
- `icon48.png` (48x48 像素)  
- `icon128.png` (128x128 像素)

图标建议使用购物车或产品相关的图案。

### 2. 加载插件

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择包含插件文件的文件夹

### 3. 使用插件

1. 访问目标网站：`https://cafus-cpsw-web.pre.planetart.com/`
2. 点击浏览器工具栏中的插件图标
3. 查看提取的ProductId信息

## 文件说明

- `manifest.json` - 插件配置文件
- `content.js` - 内容脚本，负责提取ProductId
- `popup.html` - 弹出窗口界面
- `popup.js` - 弹出窗口逻辑

## 技术特性

- ✅ Manifest V3兼容
- ✅ 支持SPA应用的URL变化检测
- ✅ 本地存储提取历史
- ✅ 实时消息通信
- ✅ 错误处理和用户反馈

## 快速图标创建方法

如果需要快速创建图标，可以：

1. 使用在线图标生成器
2. 从免费图标库下载（如：Flaticon, Icons8）
3. 使用AI工具生成简单图标
4. 或者暂时删除manifest.json中的图标引用，插件仍可正常工作

## 故障排除

1. **插件无法加载**：检查manifest.json语法是否正确
2. **无法提取ProductId**：确认URL格式符合要求
3. **弹窗不显示数据**：检查浏览器控制台是否有错误信息

## 注意事项

- 插件仅在指定域名下工作
- 需要逗号后至少6位数字才会识别为ProductId
- 插件会自动清除不符合格式的旧数据
