# 修复存储桶访问问题

## 问题诊断

错误信息 "Bucket not found" 通常表示：
1. 存储桶的 RLS (Row Level Security) 策略阻止了读取操作
2. Anon key 没有足够的权限访问存储桶

## 解决方案

### 步骤 1: 检查存储桶设置

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入你的项目
3. 进入 **Storage** > **Buckets**
4. 找到 `sync-images` 存储桶
5. 确认：
   - ✅ 存储桶名称是 `sync-images`（完全匹配）
   - ✅ **Public bucket** 选项已勾选

### 步骤 2: 配置存储策略（重要！）

即使存储桶是公开的，也需要配置 RLS 策略才能通过 API 访问。

#### 方法一：通过 SQL Editor（推荐）

1. 在 Supabase Dashboard 中，进入 **SQL Editor**
2. 运行以下 SQL 脚本：

```sql
-- 允许任何人读取 sync-images 存储桶中的文件
CREATE POLICY "Allow public reads on sync-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'sync-images');

-- 如果策略已存在，先删除再创建
DROP POLICY IF EXISTS "Allow public reads on sync-images" ON storage.objects;

CREATE POLICY "Allow public reads on sync-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'sync-images');
```

#### 方法二：通过 Dashboard UI

1. 进入 **Storage** > **Policies**
2. 选择 `objects` 表（在 `storage` schema 下）
3. 点击 **New Policy**
4. 配置如下：
   - **Policy name**: `Allow public reads on sync-images`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `public`
   - **Policy definition**:
   ```sql
   bucket_id = 'sync-images'
   ```
5. 点击 **Review** 然后 **Save policy**

### 步骤 3: 验证策略

运行以下 SQL 检查策略是否正确创建：

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%sync-images%';
```

应该能看到至少一条 SELECT 策略。

### 步骤 4: 测试访问

1. 在浏览器中访问：
   ```
   https://hgjmoyhmlanlrgbvttax.supabase.co/storage/v1/object/list/sync-images?limit=1
   ```
2. 应该返回 JSON 数据（可能是空数组 `[]`）
3. 如果返回错误，检查：
   - API key 是否正确
   - 策略是否已保存
   - 存储桶名称是否正确

## 完整的存储策略配置（推荐）

为了完整的功能，建议配置以下策略：

```sql
-- 1. 允许读取文件
DROP POLICY IF EXISTS "Allow public reads on sync-images" ON storage.objects;
CREATE POLICY "Allow public reads on sync-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'sync-images');

-- 2. 允许上传文件（如果还没有）
DROP POLICY IF EXISTS "Allow public uploads to sync-images" ON storage.objects;
CREATE POLICY "Allow public uploads to sync-images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'sync-images');

-- 3. 允许删除文件（可选，用于清理）
DROP POLICY IF EXISTS "Allow public deletes from sync-images" ON storage.objects;
CREATE POLICY "Allow public deletes from sync-images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'sync-images');
```

## 故障排除

### 如果策略创建失败

1. 检查是否有权限创建策略
2. 确认使用的是正确的数据库用户
3. 查看 SQL Editor 中的错误信息

### 如果策略创建成功但仍然无法访问

1. 等待几秒钟让策略生效
2. 清除浏览器缓存
3. 重新加载扩展
4. 检查 API key 是否正确

### 验证 API Key

在浏览器 Console 中运行：

```javascript
fetch('https://hgjmoyhmlanlrgbvttax.supabase.co/storage/v1/object/list/sync-images?limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnam1veWhtbGFubHJnYnZ0dGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTI2MTIsImV4cCI6MjA3NjgyODYxMn0.iaZarnzuQMBNoPDj4iyhMqmJ08x-OXWiAhZF7RiOleI',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnam1veWhtbGFubHJnYnZ0dGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTI2MTIsImV4cCI6MjA3NjgyODYxMn0.iaZarnzuQMBNoPDj4iyhMqmJ08x-OXWiAhZF7RiOleI'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

如果返回空数组 `[]` 或文件列表，说明配置正确。
如果返回错误，说明策略未正确配置。

