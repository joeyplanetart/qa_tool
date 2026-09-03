// IndexedDB storage for AI assistant (documents, chunks, conversations)
const AI_DB_NAME = 'qa_ai_assistant';
const AI_DB_VERSION = 1;

const AIStorage = {
    _db: null,

    async openDB() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(AI_DB_NAME, AI_DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this._db = request.result;
                resolve(this._db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('documents')) {
                    db.createObjectStore('documents', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('chunks')) {
                    const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
                    chunkStore.createIndex('docId', 'docId', { unique: false });
                }
                if (!db.objectStoreNames.contains('conversations')) {
                    const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
                    convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            };
        });
    },

    async _tx(storeName, mode, callback) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const result = callback(store);
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
        });
    },

    async saveDocument(doc) {
        await this._tx('documents', 'readwrite', (store) => store.put(doc));
        return doc;
    },

    async getDocuments() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('documents', 'readonly');
            const request = tx.objectStore('documents').getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteDocument(docId) {
        await this._tx('documents', 'readwrite', (store) => store.delete(docId));
        const chunks = await this.getChunksByDocId(docId);
        const db = await this.openDB();
        const tx = db.transaction('chunks', 'readwrite');
        chunks.forEach((chunk) => tx.objectStore('chunks').delete(chunk.id));
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    async saveChunks(docId, docName, chunks) {
        await this.deleteChunksByDocId(docId);
        const db = await this.openDB();
        const tx = db.transaction('chunks', 'readwrite');
        const store = tx.objectStore('chunks');
        chunks.forEach((text, index) => {
            store.put({
                id: `${docId}_${index}`,
                docId,
                docName,
                text,
                index
            });
        });
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(chunks.length);
            tx.onerror = () => reject(tx.error);
        });
    },

    async getChunksByDocId(docId) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('chunks', 'readonly');
            const index = tx.objectStore('chunks').index('docId');
            const request = index.getAll(docId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteChunksByDocId(docId) {
        const chunks = await this.getChunksByDocId(docId);
        if (!chunks.length) return;
        const db = await this.openDB();
        const tx = db.transaction('chunks', 'readwrite');
        chunks.forEach((chunk) => tx.objectStore('chunks').delete(chunk.id));
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    async getAllChunks() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('chunks', 'readonly');
            const request = tx.objectStore('chunks').getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async saveConversation(conversation) {
        await this._tx('conversations', 'readwrite', (store) => store.put(conversation));
        return conversation;
    },

    async getConversation(id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('conversations', 'readonly');
            const request = tx.objectStore('conversations').get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    async listConversations(limit = 50) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('conversations', 'readonly');
            const request = tx.objectStore('conversations').getAll();
            request.onsuccess = () => {
                const list = (request.result || [])
                    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                    .slice(0, limit);
                resolve(list);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async deleteConversation(id) {
        await this._tx('conversations', 'readwrite', (store) => store.delete(id));
        return true;
    }
};

if (typeof self !== 'undefined') {
    self.AIStorage = AIStorage;
}
if (typeof window !== 'undefined') {
    window.AIStorage = AIStorage;
}
