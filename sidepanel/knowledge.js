const KnowledgeModule = {
    init() {
        const pathHint = document.getElementById('kb-default-path');
        if (pathHint) {
            pathHint.textContent = `默认手册路径: ${CONFIG.KNOWLEDGE_BASE.DEFAULT_PATH}`;
        }

        document.getElementById('kb-file-input')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
            e.target.value = '';
        });

        document.getElementById('btn-reindex-all')?.addEventListener('click', () => {
            this.refreshDocList();
        });

        this.refreshDocList();
    },

    async handleFileUpload(files) {
        if (!files?.length) return;

        for (const file of files) {
            try {
                const content = await file.text();
                const response = await chrome.runtime.sendMessage({
                    type: 'RAG_INDEX_DOC',
                    name: file.name,
                    content,
                    fileType: RAGIndexer.detectType(file.name)
                });

                if (!response?.success) {
                    alert(`导入 ${file.name} 失败: ${response?.error || '未知错误'}`);
                }
            } catch (err) {
                alert(`导入 ${file.name} 失败: ${err.message}`);
            }
        }
        this.refreshDocList();
    },

    async refreshDocList() {
        const container = document.getElementById('kb-doc-list');
        if (!container) return;

        try {
            const docs = await AIStorage.getDocuments();
            if (!docs.length) {
                container.innerHTML = '<div class="kb-empty">暂无索引文档，请导入 HTML / MD / TXT 文件</div>';
                return;
            }

            container.innerHTML = '';
            docs.sort((a, b) => (b.indexedAt || 0) - (a.indexedAt || 0)).forEach((doc) => {
                const item = document.createElement('div');
                item.className = 'kb-doc-item';
                const date = doc.indexedAt ? new Date(doc.indexedAt).toLocaleString('zh-CN') : '';
                item.innerHTML = `
                    <div class="kb-doc-info">
                        <div class="kb-doc-name">${this.escapeHtml(doc.name)}</div>
                        <div class="kb-doc-meta">${doc.chunkCount} 个片段 · ${doc.type} · ${date}</div>
                    </div>
                    <button class="kb-doc-delete" data-id="${doc.id}" title="删除">×</button>
                `;
                item.querySelector('.kb-doc-delete').addEventListener('click', () => {
                    this.deleteDoc(doc.id);
                });
                container.appendChild(item);
            });
        } catch (err) {
            container.innerHTML = `<div class="kb-empty">加载失败: ${err.message}</div>`;
        }
    },

    async deleteDoc(docId) {
        if (!confirm('确定删除该文档及其索引？')) return;
        await chrome.runtime.sendMessage({ type: 'RAG_DELETE_DOC', docId });
        this.refreshDocList();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
