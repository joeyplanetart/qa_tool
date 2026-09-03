// Multi-provider LLM API adapters with streaming support
const LLMProviders = {
    getProviderConfig(providerId) {
        return CONFIG.LLM.PROVIDERS[providerId];
    },

    async getApiKey(providerId) {
        const settingsKey = CONFIG.LLM.SETTINGS_KEY;
        const result = await chrome.storage.local.get([settingsKey]);
        const settings = result[settingsKey] || {};
        return settings.apiKeys?.[providerId] || '';
    },

    async getSettings() {
        const settingsKey = CONFIG.LLM.SETTINGS_KEY;
        const result = await chrome.storage.local.get([settingsKey]);
        return result[settingsKey] || {
            apiKeys: {},
            defaultProvider: CONFIG.LLM.DEFAULT_PROVIDER,
            defaultModel: CONFIG.LLM.PROVIDERS[CONFIG.LLM.DEFAULT_PROVIDER].models[0]
        };
    },

    isOpenAICompatible(providerId) {
        return providerId === 'deepseek' || providerId === 'openai';
    },

    async streamChat({ providerId, model, messages, onChunk, onDone, onError }) {
        const apiKey = await this.getApiKey(providerId);
        if (!apiKey) {
            onError(new Error(`请先在设置中配置 ${this.getProviderConfig(providerId)?.label || providerId} 的 API Key`));
            return;
        }

        if (this.isOpenAICompatible(providerId)) {
            return this._streamOpenAI({ providerId, model, messages, apiKey, onChunk, onDone, onError });
        }
        if (providerId === 'anthropic') {
            return this._streamAnthropic({ model, messages, apiKey, onChunk, onDone, onError });
        }
        onError(new Error(`不支持的模型提供商: ${providerId}`));
    },

    async _streamOpenAI({ providerId, model, messages, apiKey, onChunk, onDone, onError }) {
        const config = this.getProviderConfig(providerId);
        const url = `${config.baseUrl}/chat/completions`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model, messages, stream: true })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API 错误 ${response.status}: ${errText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let usage = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;
                    const data = trimmed.slice(5).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.usage) usage = TokenUtils.parseUsage(parsed, providerId);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) onChunk(delta);
                    } catch (e) {
                        // skip malformed chunks
                    }
                }
            }
            onDone({ usage });
        } catch (err) {
            onError(err);
        }
    },

    async _streamAnthropic({ model, messages, apiKey, onChunk, onDone, onError }) {
        const config = this.getProviderConfig('anthropic');
        const url = `${config.baseUrl}/messages`;

        const systemMsg = messages.find((m) => m.role === 'system');
        const chatMessages = messages.filter((m) => m.role !== 'system');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    stream: true,
                    system: systemMsg?.content || '',
                    messages: chatMessages.map((m) => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API 错误 ${response.status}: ${errText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let usage = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const data = trimmed.slice(5).trim();
                    if (!data || data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.type === 'content_block_delta') {
                            const text = parsed.delta?.text;
                            if (text) onChunk(text);
                        }
                        if (parsed.type === 'message_delta' && parsed.usage) {
                            usage = TokenUtils.parseUsage({ usage: parsed.usage }, 'anthropic');
                        }
                        if (parsed.type === 'message_stop' && parsed.message?.usage) {
                            usage = TokenUtils.parseUsage(parsed.message, 'anthropic');
                        }
                    } catch (e) {
                        // skip
                    }
                }
            }
            onDone({ usage });
        } catch (err) {
            onError(err);
        }
    },

    async translate({ text, sourceLang, targetLang, providerId, model, onChunk, onDone, onError }) {
        const langMap = { zh: '中文', en: '英文', auto: '自动检测' };
        const src = langMap[sourceLang] || sourceLang;
        const tgt = langMap[targetLang] || targetLang;

        const messages = [
            {
                role: 'system',
                content: `你是专业翻译助手。将文本从${src}翻译为${tgt}。只输出翻译结果，不要解释。`
            },
            { role: 'user', content: text }
        ];

        return this.streamChat({ providerId, model, messages, onChunk, onDone, onError });
    },

    async chatComplete({ providerId, model, messages }) {
        return new Promise((resolve, reject) => {
            let content = '';
            this.streamChat({
                providerId,
                model,
                messages,
                onChunk: (chunk) => { content += chunk; },
                onDone: ({ usage }) => resolve({ content, usage }),
                onError: reject
            });
        });
    }
};

if (typeof self !== 'undefined') {
    self.LLMProviders = LLMProviders;
}
