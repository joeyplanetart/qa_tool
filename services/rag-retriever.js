// Keyword-based retrieval for RAG
const RAGRetriever = {
    tokenize(text) {
        const lower = (text || '').toLowerCase();
        const segments = lower.match(/[\u4e00-\u9fff]+|[a-z0-9]+/g) || [];
        const tokens = [];
        segments.forEach((seg) => {
            if (/^[a-z0-9]+$/.test(seg)) {
                if (seg.length > 1) tokens.push(seg);
                return;
            }
            // 中文没有空格，整段作为一个 token 会导致多词查询永远无法命中。
            // 改用 2 字滑窗（bigram）切分；单字片段保留自身。
            if (seg.length === 1) {
                tokens.push(seg);
                return;
            }
            for (let i = 0; i < seg.length - 1; i++) {
                tokens.push(seg.slice(i, i + 2));
            }
        });
        return [...new Set(tokens)];
    },

    scoreChunk(chunk, queryTokens) {
        const text = (chunk.text || '').toLowerCase();
        let score = 0;
        queryTokens.forEach((token) => {
            const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const matches = text.match(regex);
            if (matches) score += matches.length;
        });
        if (chunk.docName) {
            const docLower = chunk.docName.toLowerCase();
            queryTokens.forEach((token) => {
                if (docLower.includes(token)) score += 2;
            });
        }
        return score;
    },

    async retrieve(query, topK) {
        const k = topK || CONFIG.RAG.TOP_K;
        const queryTokens = this.tokenize(query);
        if (!queryTokens.length) return [];

        const chunks = await AIStorage.getAllChunks();
        const scored = chunks
            .map((chunk) => ({ chunk, score: this.scoreChunk(chunk, queryTokens) }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, k);

        return scored.map((item) => item.chunk);
    },

    buildRAGPrompt(chunks, question) {
        const context = chunks
            .map((c, i) => `[来源 ${i + 1}: ${c.docName}]\n${c.text}`)
            .join('\n\n---\n\n');

        return {
            system: `你是 PlanetArt/Cafepress 内部 QA 助手。请仅根据以下知识库资料回答问题。
如果资料中没有相关信息，请明确说明「知识库中未找到相关内容」，不要编造。
回答时请标注引用来源编号。`,
            context,
            userMessage: `知识库资料：\n${context}\n\n用户问题：${question}`
        };
    },

    formatSources(chunks) {
        return chunks.map((c) => ({
            docName: c.docName,
            preview: (c.text || '').slice(0, 120) + ((c.text || '').length > 120 ? '...' : '')
        }));
    }
};

if (typeof self !== 'undefined') {
    self.RAGRetriever = RAGRetriever;
}
if (typeof window !== 'undefined') {
    window.RAGRetriever = RAGRetriever;
}
