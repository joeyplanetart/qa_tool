# Vercel 部署指南

## 方法一：通过 Vercel CLI 部署（推荐）

### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 在项目目录中部署

```bash
# 进入项目目录
cd /Users/joey/qa_tool

# 部署到生产环境
vercel --prod
```

首次部署时，Vercel 会询问一些问题：
- **Set up and deploy?** → 输入 `Y`
- **Which scope?** → 选择你的账户
- **Link to existing project?** → 输入 `N`（首次部署）
- **Project name?** → 输入项目名称，例如 `sync-image-upload`
- **Directory?** → 直接回车（使用当前目录）
- **Override settings?** → 输入 `N`

### 4. 获取部署 URL

部署成功后，Vercel 会显示你的项目 URL，例如：
```
https://sync-image-upload.vercel.app
```

你的上传页面 URL 将是：
```
https://sync-image-upload.vercel.app/upload.html
```

或者直接访问根路径（已配置重定向）：
```
https://sync-image-upload.vercel.app/
```

## 方法二：通过 GitHub 部署（推荐用于持续部署）

### 1. 创建 GitHub 仓库

```bash
# 初始化 git（如果还没有）
git init

# 创建 .gitignore（如果还没有）
echo "node_modules/" >> .gitignore
echo ".vercel/" >> .gitignore

# 添加文件
git add upload.html vercel.json package.json .vercelignore

# 提交
git commit -m "Add upload page for Vercel deployment"

# 创建 GitHub 仓库并推送
# 在 GitHub 上创建新仓库，然后：
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. 在 Vercel 中导入项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择你的 GitHub 仓库
4. 配置项目：
   - **Framework Preset**: Other
   - **Root Directory**: `./`（默认）
   - **Build Command**: 留空（静态文件不需要构建）
   - **Output Directory**: 留空
5. 点击 "Deploy"

### 3. 获取部署 URL

部署完成后，Vercel 会提供一个 URL，例如：
```
https://your-project-name.vercel.app
```

## 方法三：通过 Vercel Dashboard 直接上传

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择 "Upload" 选项
4. 上传以下文件：
   - `upload.html`
   - `vercel.json`（可选）
5. 点击 "Deploy"

## 配置 Chrome 扩展

部署完成后，需要在 Chrome 扩展中配置上传页面 URL：

### 方法1：通过 Chrome DevTools Console

1. 打开任意网页
2. 按 F12 打开开发者工具
3. 在 Console 中运行：

```javascript
chrome.storage.local.set({
  uploadPageUrl: 'https://your-project-name.vercel.app/upload.html'
}, () => {
  console.log('Upload page URL configured!');
});
```

### 方法2：在 content.js 中更新默认值

编辑 `content.js`，找到 `generateSyncQRCode` 函数，更新默认 URL：

```javascript
let uploadUrl;
if (result.uploadPageUrl && result.uploadPageUrl !== '') {
    uploadUrl = `${result.uploadPageUrl}?session=${sessionId}`;
} else {
    // 更新为你的 Vercel 部署 URL
    uploadUrl = `https://your-project-name.vercel.app/upload.html?session=${sessionId}`;
}
```

## 验证部署

1. 访问你的 Vercel 部署 URL
2. 应该能看到上传页面
3. 测试上传功能是否正常工作

## 自定义域名（可选）

如果你有自己的域名，可以在 Vercel Dashboard 中：
1. 进入项目设置
2. 选择 "Domains"
3. 添加你的自定义域名
4. 按照提示配置 DNS 记录

## 注意事项

- Vercel 免费版有使用限制，但对于个人使用通常足够
- 上传的文件存储在 Supabase，不占用 Vercel 的存储空间
- 确保 Supabase 存储桶已创建并设置为公开访问
- 如果遇到 CORS 问题，`vercel.json` 中已配置了 CORS 头

## 故障排除

### 部署失败
- 检查 `vercel.json` 配置是否正确
- 确保 `upload.html` 文件存在
- 查看 Vercel 部署日志中的错误信息

### 页面无法访问
- 检查部署是否成功完成
- 确认 URL 是否正确
- 检查浏览器控制台是否有错误

### CORS 错误
- `vercel.json` 中已配置 CORS 头
- 如果仍有问题，检查 Supabase 的 CORS 设置

