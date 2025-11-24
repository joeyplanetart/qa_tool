# 验证 Supabase Storage 策略配置

## 检查策略是否正确配置

即使你已经添加了策略，可能还需要验证以下几点：

### 1. 检查策略是否应用到正确的表

策略应该应用到 `storage.objects` 表，而不是存储桶本身。在 Supabase SQL Editor 中运行：

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (policyname LIKE '%sync-images%' OR policyname LIKE '%public%');
```

应该能看到至少一条 SELECT 策略。

### 2. 验证策略定义

策略应该允许 `public` 角色访问 `sync-images` 存储桶。检查策略定义：

```sql
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND cmd = 'SELECT';
```

`qual` 或 `with_check` 应该包含 `bucket_id = 'sync-images'` 或类似的条件。

### 3. 测试 API 访问

在浏览器 Console 中运行以下代码测试：

```javascript
const supabaseUrl = 'https://hgjmoyhmlanlrgbvttax.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnam1veWhtbGFubHJnYnZ0dGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTI2MTIsImV4cCI6MjA3NjgyODYxMn0.iaZarnzuQMBNoPDj4iyhMqmJ08x-OXWiAhZF7RiOleI';

// 测试1: 列出存储桶根目录
fetch(`${supabaseUrl}/storage/v1/object/list/sync-images?limit=10`, {
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);

// 测试2: 列出特定会话的文件
const sessionId = 'sync_1763962350791_bgor3w6ak';
fetch(`${supabaseUrl}/storage/v1/object/list/sync-images?prefix=${sessionId}/&limit=100`, {
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### 4. 如果策略仍然不工作

尝试创建一个更宽松的策略（仅用于测试）：

```sql
-- 删除现有策略
DROP POLICY IF EXISTS "Allow public reads on sync-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;

-- 创建新的策略（允许读取所有 sync-images 中的文件）
CREATE POLICY "Allow public reads on sync-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'sync-images');
```

### 5. 检查存储桶 ID

确认存储桶的 ID 确实是 `sync-images`：

```sql
SELECT name, id, public FROM storage.buckets WHERE name = 'sync-images';
```

### 6. 临时禁用 RLS（仅用于测试）

如果以上都不行，可以临时禁用 RLS 来测试（**仅用于测试，不要在生产环境使用**）：

```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

测试完成后，记得重新启用：

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## 常见问题

### 策略已创建但 API 仍然返回 "Bucket not found"

这可能是因为：
1. 策略定义不正确（没有正确限制到 sync-images 存储桶）
2. 策略需要时间生效（等待几秒钟）
3. API key 权限不足

### 策略显示在 Dashboard 但不起作用

检查：
1. 策略是否真的保存了（刷新页面查看）
2. 策略的 `USING` 子句是否正确
3. 是否有多条冲突的策略

