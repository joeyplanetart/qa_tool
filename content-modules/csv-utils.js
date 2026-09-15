// PTN CSV 行解析（带引号处理）—— content.js 的 PTN 浮条与 Test Links 模块共用。
// 保留 IIFE + window 命名空间：background.js 的降级注入会重复执行脚本，window 赋值是幂等的。
window.CpqaCsv = (function () {
    'use strict';

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    return { parseCSVLine };
})();
