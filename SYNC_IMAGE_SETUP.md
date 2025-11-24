# 同步图片功能配置指南

## 功能说明

同步图片功能允许您通过扫描二维码从手机上传图片/视频到电脑。上传的文件会存储在Supabase对象存储中，并自动在1天后过期。

## 配置步骤

### 1. 创建Supabase项目

1. 访问 [Supabase](https://supabase.com) 并登录
2. 创建一个新项目
3. 记录您的项目URL和anon key（在项目设置 > API中）

### 2. 创建存储桶（Bucket）

1. 在Supabase项目中，进入 Storage
2. 点击 "New bucket"
3. 创建名为 `sync-images` 的存储桶
4. 设置为 Public bucket（公开访问）

### 3. 配置存储策略（可选，用于自动过期）

如果需要自动删除1天后的文件，可以设置存储策略：

1. 在Supabase项目中，进入 Storage > Policies
2. 为 `sync-images` 桶创建策略，允许自动删除过期文件

或者使用Supabase的数据库表来跟踪文件过期时间：

```sql
CREATE TABLE uploaded_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX idx_session_id ON uploaded_images(session_id);
CREATE INDEX idx_expires_at ON uploaded_images(expires_at);

-- 创建自动删除过期文件的函数（可选）
CREATE OR REPLACE FUNCTION delete_expired_files()
RETURNS void AS $$
BEGIN
  DELETE FROM uploaded_images
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 4. 部署上传页面

您需要将 `upload.html` 部署到一个可以通过互联网访问的web服务器。有几个选项：

#### 选项1：使用GitHub Pages
1. 将 `upload.html` 上传到GitHub仓库
2. 启用GitHub Pages
3. 获取页面URL（例如：`https://yourusername.github.io/repo/upload.html`）

#### 选项2：使用Netlify/Vercel
1. 将 `upload.html` 上传到Netlify或Vercel
2. 获取部署URL

#### 选项3：使用自己的服务器
1. 将 `upload.html` 上传到您的web服务器
2. 确保可以通过HTTPS访问

### 5. 配置Chrome扩展

在Chrome扩展中配置以下设置（可以通过扩展的选项页面或直接修改代码）：

```javascript
// 在Chrome DevTools Console中运行，或创建配置页面
chrome.storage.local.set({
  supabaseUrl: 'YOUR_SUPABASE_URL',  // 例如：https://xxxxx.supabase.co
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
  supabaseBucket: 'sync-images',
  uploadPageUrl: 'YOUR_UPLOAD_PAGE_URL'  // 例如：https://yourusername.github.io/repo/upload.html
});
```

### 6. 更新upload.html中的配置

编辑 `upload.html` 文件，更新以下配置：

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const STORAGE_BUCKET = 'sync-images';
```

## 使用方法

1. 点击扩展中的同步图片图标
2. 扫描显示的二维码
3. 在手机上选择要上传的图片/视频（最多5个）
4. 点击上传按钮
5. 上传成功后，图片会显示在扩展的card中
6. 可以点击图片放大查看，或点击下载按钮下载

## 注意事项

- 上传的文件会在1天后自动过期（如果配置了过期机制）
- 单个文件最大50MB
- 每次最多上传5个文件
- 支持图片和视频格式
- 确保上传页面URL可以通过HTTPS访问（手机需要能够访问）

## 故障排除

### 二维码无法生成
- 检查网络连接
- 确认 `uploadPageUrl` 已正确配置

### 上传失败
- 检查Supabase配置是否正确
- 确认存储桶已创建且为公开访问
- 检查文件大小是否超过50MB限制

### 图片无法加载
- 检查Supabase存储桶是否为公开访问
- 确认文件URL是否正确
- 检查网络连接

