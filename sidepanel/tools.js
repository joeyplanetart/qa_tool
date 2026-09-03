const ToolsModule = {
    init() {
        document.getElementById('tool-open-qa')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_QA_PANEL' });
        });

        document.getElementById('tool-open-handbook')?.addEventListener('click', () => {
            chrome.storage.local.get([CONFIG.KNOWLEDGE_BASE.STORAGE_KEY], (result) => {
                const filePath = result[CONFIG.KNOWLEDGE_BASE.STORAGE_KEY] || CONFIG.KNOWLEDGE_BASE.DEFAULT_PATH;
                chrome.runtime.sendMessage({ type: 'OPEN_KNOWLEDGE_BASE', filePath });
            });
        });
    }
};
