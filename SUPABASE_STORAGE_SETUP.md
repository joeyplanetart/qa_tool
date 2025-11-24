# Supabase 存储桶配置指南

## 错误：new row violates row-level security policy

这个错误表示 Supabase 存储桶的行级安全策略（RLS）阻止了文件上传。需要正确配置存储桶和策略。

## 解决步骤

### 1. 创建存储桶

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Storage** 页面
4. 点击 **New bucket**
5. 配置如下：
   - **Name**: `sync-images`
   - **Public bucket**: ✅ **必须勾选**（允许公开访问）
   - **File size limit**: 50 MB（或根据需要调整）
   - **Allowed MIME types**: 留空（允许所有类型）或填写 `image/*,video/*`

### 2. 配置存储策略（Storage Policies）

创建存储桶后，需要配置策略以允许上传和读取：

#### 方法一：通过 SQL Editor（推荐）

1. 在 Supabase Dashboard 中，进入 **SQL Editor**
2. 运行以下 SQL 来创建策略：

```sql
-- 允许任何人上传文件到 sync-images 存储桶
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'sync-images' AND
  (storage.foldername(name))[1] IS NOT NULL
);

-- 允许任何人读取文件
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'sync-images');

-- 允许任何人删除自己的文件（可选，用于清理）
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'sync-images');
```

#### 方法二：通过 Dashboard UI

1. 进入 **Storage** > **Policies**
2. 选择 `sync-images` 存储桶
3. 点击 **New Policy**
4. 创建以下策略：

**策略 1：允许上传**
- Policy name: `Allow public uploads`
- Allowed operation: `INSERT`
- Target roles: `public`
- Policy definition:
```sql
bucket_id = 'sync-images' AND
(storage.foldername(name))[1] IS NOT NULL
```

**策略 2：允许读取**
- Policy name: `Allow public reads`
- Allowed operation: `SELECT`
- Target roles: `public`
- Policy definition:
```sql
bucket_id = 'sync-images'
```

### 3. 验证配置

运行以下 SQL 检查策略是否正确创建：

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

应该能看到至少两条策略（INSERT 和 SELECT）。

### 4. 测试上传

1. 访问你的上传页面：https://cp-qa-tool.vercel.app/
2. 选择一个文件
3. 点击上传
4. 应该能成功上传

## 如果仍然遇到问题

### 检查存储桶是否公开

```sql
SELECT name, public FROM storage.buckets WHERE name = 'sync-images';
```

`public` 列应该为 `true`。

### 检查 RLS 是否启用

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

如果 `rowsecurity` 为 `true`，则需要配置策略。如果为 `false`，可以临时禁用以测试（不推荐生产环境）。

### 临时禁用 RLS（仅用于测试）

```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**注意**：这会让所有文件公开可访问，仅用于测试。测试完成后应该重新启用 RLS 并配置正确的策略。

## 推荐的完整策略配置

为了更好的安全性，可以使用以下更严格的策略：

```sql
-- 允许上传（限制文件大小和类型）
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sync-images' AND
  (storage.foldername(name))[1] IS NOT NULL AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi')
);

-- 允许匿名用户上传（如果使用 anon key）
CREATE POLICY "Allow anon uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'sync-images' AND
  (storage.foldername(name))[1] IS NOT NULL
);

-- 允许所有人读取
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'sync-images');
```

## 常见错误和解决方案

### 错误：Bucket not found
- 确保存储桶名称正确（区分大小写）
- 确保存储桶已创建

### 错误：new row violates row-level security policy
- 按照上述步骤配置存储策略
- 确保存储桶设置为公开访问

### 错误：Permission denied
- 检查 API key 是否正确
- 确保使用的是 anon key（不是 service role key）
- 检查存储策略是否正确配置

## 验证配置脚本

在 Supabase SQL Editor 中运行以下脚本验证配置：

```sql
-- 检查存储桶
SELECT name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'sync-images';

-- 检查策略
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%sync-images%' OR policyname LIKE '%public%';
```

