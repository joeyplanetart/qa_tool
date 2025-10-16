# Test Links 配置说明

## 📋 配置位置

Test Links 的配置在 `config.js` 文件中的 `CONFIG.TEST_LINKS` 部分。

## 🔧 如何添加/修改链接

### 1. 打开配置文件

编辑 `config.js`，找到 `TEST_LINKS` 配置块（文件末尾附近）：

```javascript
TEST_LINKS: {
    categories: [
        {
            name: 'Chatbot',
            links: [...]
        },
        {
            name: 'PLP',
            links: [...]
        }
    ]
}
```

### 2. 添加新分类

```javascript
{
    name: '新分类名称',  // 分类显示名称
    links: [
        // 这里添加链接
    ]
}
```

### 3. 添加新链接

```javascript
{
    title: '链接标题',  // 显示在界面上的标题
    urls: {
        live: 'https://example.com',        // Live 环境 URL
        pre: 'https://example.pre.com',     // Pre 环境 URL
        stage: 'https://example.stage.com'  // Stage 环境 URL
    }
}
```

**注意：** 如果某个环境不需要链接，设置为 `null`：

```javascript
urls: {
    live: 'https://example.com',
    pre: null,      // Pre 环境不显示
    stage: null     // Stage 环境不显示
}
```

## 📖 完整示例

### 示例 1：添加一个新的 Admin 工具分类

```javascript
{
    name: 'Admin Tools',
    links: [
        {
            title: 'User Management',
            urls: {
                live: 'https://admin.planetart.com/users',
                pre: 'https://admin-master.pre.planetart.com/users',
                stage: 'https://admin-master.stage.planetart.com/users'
            }
        },
        {
            title: 'Order Management',
            urls: {
                live: 'https://admin.planetart.com/orders',
                pre: 'https://admin-master.pre.planetart.com/orders',
                stage: 'https://admin-master.stage.planetart.com/orders'
            }
        }
    ]
}
```

### 示例 2：添加只有 Live 环境的链接

```javascript
{
    name: 'External Tools',
    links: [
        {
            title: 'Analytics Dashboard',
            urls: {
                live: 'https://analytics.example.com',
                pre: null,
                stage: null
            }
        }
    ]
}
```

## 🚀 应用配置

修改配置后：

1. 保存 `config.js` 文件
2. 在 Chrome 扩展页面（`chrome://extensions/`）
3. 找到 "Cafepress QA Tools"
4. 点击 **🔄 重新加载** 按钮
5. 刷新测试页面
6. 点击 "Test Links" 查看新配置

## 💡 配置技巧

### 技巧 1：复制现有链接

最简单的方式是复制现有的链接配置，然后修改：

```javascript
// 复制这个模板
{
    title: '链接标题',
    urls: {
        live: 'URL',
        pre: null,
        stage: null
    }
}
```

### 技巧 2：注释掉临时不用的链接

使用 `//` 注释掉暂时不需要的链接：

```javascript
links: [
    {
        title: 'Active Link',
        urls: { ... }
    },
    // {
    //     title: 'Temporarily Disabled',
    //     urls: { ... }
    // }
]
```

### 技巧 3：保持格式整齐

保持 JSON 格式的缩进和逗号，避免语法错误。

## ⚠️ 注意事项

1. **JSON 语法**：确保所有的大括号、方括号、逗号都正确
2. **逗号规则**：最后一项后面不要加逗号
3. **引号使用**：字符串必须用引号包裹
4. **URL 格式**：确保 URL 完整且正确
5. **null 值**：不需要的环境设置为 `null`，不要用空字符串 `''`

## 🐛 常见错误

### 错误 1：缺少逗号

```javascript
// ❌ 错误
{
    name: 'Category1'
    links: []  // 缺少逗号
}

// ✅ 正确
{
    name: 'Category1',  // 添加逗号
    links: []
}
```

### 错误 2：多余的逗号

```javascript
// ❌ 错误
{
    name: 'Category',
    links: [],  // 最后一项不应该有逗号
}

// ✅ 正确
{
    name: 'Category',
    links: []  // 最后一项不加逗号
}
```

### 错误 3：缺少引号

```javascript
// ❌ 错误
title: Link Title

// ✅ 正确
title: 'Link Title'
```

## 📝 当前配置

当前配置包含：

- **Chatbot**
  - View Chat
  
- **PLP**
  - PLP Tool

可以根据需要添加更多分类和链接！

