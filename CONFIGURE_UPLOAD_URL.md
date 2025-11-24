# 配置上传页面 URL

## 方法：通过 Chrome Storage（推荐）

### 步骤 1：打开浏览器 Console

1. 打开任意网页（例如：cafepress.com）
2. 按 `F12` 或右键选择"检查"打开开发者工具
3. 切换到 **Console** 标签页

### 步骤 2：运行配置脚本

在 Console 中复制粘贴以下代码并回车：

```javascript
chrome.storage.local.set({
  uploadPageUrl: 'https://cp-qa-tool.vercel.app/upload.html'
}, () => {
  console.log('✅ 上传页面 URL 配置成功！');
  console.log('URL: https://cp-qa-tool.vercel.app/upload.html');
  
  // 验证配置
  chrome.storage.local.get(['uploadPageUrl'], (result) => {
    console.log('当前配置:', result);
  });
});
```

### 步骤 3：验证配置

运行后，你应该看到：
```
✅ 上传页面 URL 配置成功！
URL: https://cp-qa-tool.vercel.app/upload.html
当前配置: {uploadPageUrl: "https://cp-qa-tool.vercel.app/upload.html"}
```

### 步骤 4：测试功能

1. 刷新页面（如果扩展已加载）
2. 点击扩展中的同步图片图标 📷
3. 应该能看到二维码
4. 扫描二维码应该能打开上传页面

## 验证配置是否生效

在 Console 中运行以下代码来检查当前配置：

```javascript
chrome.storage.local.get(['uploadPageUrl'], (result) => {
  console.log('当前上传页面 URL:', result.uploadPageUrl || '未配置');
});
```

## 可选：同时配置 Supabase 设置

如果你需要覆盖默认的 Supabase 配置，可以运行：

```javascript
chrome.storage.local.set({
  uploadPageUrl: 'https://cp-qa-tool.vercel.app/upload.html',
  supabaseUrl: 'https://hgjmoyhmlanlrgbvttax.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnam1veWhtbGFubHJnYnZ0dGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTI2MTIsImV4cCI6MjA3NjgyODYxMn0.iaZarnzuQMBNoPDj4iyhMqmJ08x-OXWiAhZF7RiOleI',
  supabaseBucket: 'sync-images'
}, () => {
  console.log('✅ 所有配置完成！');
});
```

## 注意事项

- 配置会保存在 Chrome 的本地存储中
- 即使关闭浏览器，配置也会保留
- 如果需要更改 URL，只需重新运行配置脚本即可
- 如果 `content.js` 中已有默认值，即使不配置也能工作，但建议显式配置以确保一致性

## 故障排除

### 如果看到 "chrome is not defined" 错误

确保你在网页的 Console 中运行，而不是在扩展的 background script 或 content script 中。

### 如果配置后仍然不工作

1. 检查 URL 是否正确（注意末尾的 `/upload.html`）
2. 确认 Vercel 部署是否成功（访问 https://cp-qa-tool.vercel.app/ 测试）
3. 刷新页面后重试
4. 检查 Console 中是否有错误信息

### 清除配置（如果需要）

```javascript
chrome.storage.local.remove('uploadPageUrl', () => {
  console.log('配置已清除');
});
```

