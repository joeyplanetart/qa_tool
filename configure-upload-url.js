// Chrome 扩展配置脚本
// 在浏览器 Console 中运行此脚本来配置上传页面 URL

// 配置上传页面 URL
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

// 可选：同时配置 Supabase 设置（如果需要覆盖默认值）
// chrome.storage.local.set({
//   supabaseUrl: 'https://hgjmoyhmlanlrgbvttax.supabase.co',
//   supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnam1veWhtbGFubHJnYnZ0dGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTI2MTIsImV4cCI6MjA3NjgyODYxMn0.iaZarnzuQMBNoPDj4iyhMqmJ08x-OXWiAhZF7RiOleI',
//   supabaseBucket: 'sync-images'
// }, () => {
//   console.log('✅ Supabase 配置成功！');
// });

// 配置本地知识库路径（覆盖 config.js 中的默认值）
// chrome.storage.local.set({
//   knowledgeBasePath: '/Users/joey/Joey_work/Knowledge base/planetart-pc-cpb-cp-handbook.html'
// }, () => {
//   console.log('✅ 知识库路径配置成功！');
// });

