// Document chunking and indexing for RAG
const RAGIndexer = {
    stripHtml(html) {
        const tmp = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
        return tmp;
    },

    detectType(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        if (ext === 'html' || ext === 'htm') return 'html';
        if (ext === 'md' || ext === 'markdown') return 'md';
        return 'txt';
    },

    extractText(content, type) {
        if (type === 'html') return this.stripHtml(content);
        return content.trim();
    },

    chunkText(text, chunkSize, overlap) {
        const size = chunkSize || CONFIG.RAG.CHUNK_SIZE;
        const lap = overlap || CONFIG.RAG.CHUNK_OVERLAP;
        const chunks = [];
        let start = 0;
        const cleaned = text.replace(/\s+/g, ' ').trim();
        if (!cleaned) return chunks;

        while (start < cleaned.length) {
            const end = Math.min(start + size, cleaned.length);
            chunks.push(cleaned.slice(start, end));
            if (end >= cleaned.length) break;
            start = Math.max(end - lap, start + 1);
        }
        return chunks;
    },

    generateDocId(name) {
        return `doc_${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    },

    async indexDocument(name, content, type) {
        const docType = type || this.detectType(name);
        const text = this.extractText(content, docType);
        const chunks = this.chunkText(text, CONFIG.RAG.CHUNK_SIZE, CONFIG.RAG.CHUNK_OVERLAP);

        if (!chunks.length) {
            throw new Error('文档内容为空，无法索引');
        }

        const id = this.generateDocId(name);
        const doc = {
            id,
            name,
            type: docType,
            chunkCount: chunks.length,
            indexedAt: Date.now()
        };

        await AIStorage.saveDocument(doc);
        await AIStorage.saveChunks(id, name, chunks);
        return doc;
    }
};

if (typeof self !== 'undefined') {
    self.RAGIndexer = RAGIndexer;
}
if (typeof window !== 'undefined') {
    window.RAGIndexer = RAGIndexer;
}
